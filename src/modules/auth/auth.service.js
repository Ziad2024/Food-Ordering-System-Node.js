import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "./user.model.js";
import RefreshToken from "./refreshToken.model.js";
import redisClient from "../../config/redis.js";
import emailQueue from "../../shared/queue/email.queue.js";
import { generateOtp } from "../../shared/utils/otp.utils.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../shared/utils/jwt.utils.js";
import { OTP_TTL, OTP_COOLDOWN, OTP_MAX_ATTEMPTS } from "../../shared/constants/auth.constants.js";
import { ApiError } from "../../shared/utils/api-error.js";

/**
 * Register a new user and send verification OTP
 */
export const register = async ({ name, email, phone, password }) => {
  // Check if email or phone already exists
  const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
  if (existingUser) {
    if (existingUser.isVerified) {
      throw new ApiError("Email or phone number is already registered", 409, "USER_ALREADY_VERIFIED");
    }
    // If user exists but is not verified, we can let them trigger OTP again.
    // We will update their details in case they changed name/phone/password.
    existingUser.name = name;
    existingUser.phone = phone;
    existingUser.password = password; // Pre-save hook will re-hash if modified
    await existingUser.save();
  } else {
    // Create new unverified user
    await User.create({ name, email, phone, password, isVerified: false });
  }

  // Handle OTP sending logic
  await sendOtpLogic(email, name);

  return { email };
};

/**
 * Login user (Step 1 - verify email and password, send 2FA OTP)
 */
export const login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  if (!user.isActive) {
    throw new ApiError("Your account has been deactivated", 403, "USER_INACTIVE");
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  // Send 2FA OTP
  await sendOtpLogic(email, user.name);

  return { email };
};

/**
 * Verify OTP (Step 2 - Complete register or login, issue session tokens)
 */
export const verifyOtp = async ({ email, otp, deviceIdentifier }) => {
  const otpKey = `otp:${email}`;
  const cooldownKey = `otp:cooldown:${email}`;

  const otpDataStr = await redisClient.get(otpKey);
  if (!otpDataStr) {
    throw new ApiError("OTP has expired or not found. Please try requesting a new one.", 400, "OTP_EXPIRED");
  }

  const otpData = JSON.parse(otpDataStr);

  if (otpData.attempts >= OTP_MAX_ATTEMPTS) {
    await redisClient.del(otpKey);
    await redisClient.del(cooldownKey);
    throw new ApiError("Maximum verification attempts exceeded. Please login or register again.", 429, "OTP_MAX_ATTEMPTS");
  }

  if (otpData.code !== otp) {
    // Increment attempts
    otpData.attempts += 1;
    const remainingTtl = await redisClient.ttl(otpKey);
    
    if (otpData.attempts >= OTP_MAX_ATTEMPTS) {
      await redisClient.del(otpKey);
      await redisClient.del(cooldownKey);
      throw new ApiError("Maximum verification attempts exceeded. Please login or register again.", 429, "OTP_MAX_ATTEMPTS");
    }

    await redisClient.set(otpKey, JSON.stringify(otpData), "EX", remainingTtl > 0 ? remainingTtl : OTP_TTL);
    throw new ApiError(`Invalid verification code. ${OTP_MAX_ATTEMPTS - otpData.attempts} attempts remaining.`, 400, "OTP_INVALID");
  }

  // Clean up OTP Redis states
  await redisClient.del(otpKey);
  await redisClient.del(cooldownKey);

  // Verify and activate user
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError("User not found", 404, "USER_NOT_FOUND");
  }

  if (!user.isVerified) {
    user.isVerified = true;
    await user.save();
  }

  // Generate tokens
  const accessToken = signAccessToken({ sub: user._id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ sub: user._id, deviceIdentifier });

  // Store hashed refresh token in database (Multi-device)
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Upsert session details for the specific deviceIdentifier
  await RefreshToken.findOneAndUpdate(
    { user: user._id, deviceIdentifier },
    { token: hashedRefreshToken, expiresAt },
    { upsert: true, new: true }
  );

  return { accessToken, refreshToken, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, isVerified: user.isVerified } };
};

/**
 * Rotate refresh token (Multi-device session update)
 */
export const refreshAccessToken = async (tokenFromCookie, deviceIdentifier) => {
  if (!tokenFromCookie) {
    throw new ApiError("Authentication token required", 401, "NO_REFRESH_TOKEN");
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(tokenFromCookie);
  } catch (err) {
    throw new ApiError("Session token is expired or invalid", 401, "INVALID_REFRESH_TOKEN");
  }

  const userId = decoded.sub;
  const tokenDevice = decoded.deviceIdentifier || deviceIdentifier;

  if (!tokenDevice) {
    throw new ApiError("Device identification context missing", 400, "BAD_REQUEST");
  }

  // Find user
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw new ApiError("User account is inactive or not found", 401, "USER_INACTIVE");
  }

  // Find active session for this device
  const session = await RefreshToken.findOne({ user: userId, deviceIdentifier: tokenDevice });
  if (!session) {
    throw new ApiError("Session expired or token is invalid", 401, "INVALID_REFRESH_TOKEN");
  }

  // Compare cookie token with stored hashed token
  const isMatch = await bcrypt.compare(tokenFromCookie, session.token);
  if (!isMatch) {
    // REUSE DETECTION VIOLATION: Someone presented a valid signed token but it does not match the active session.
    // Invalidate ALL sessions for this user/device for security reasons.
    await RefreshToken.deleteMany({ user: userId, deviceIdentifier: tokenDevice });
    throw new ApiError("Security violation: Session token reuse detected. Revoking access.", 401, "TOKEN_REUSE_DETECTED");
  }

  // Generate new tokens (Token rotation)
  const newAccessToken = signAccessToken({ sub: user._id, email: user.email, role: user.role });
  const newRefreshToken = signRefreshToken({ sub: user._id, deviceIdentifier: tokenDevice });

  // Update session record
  const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
  session.token = hashedRefreshToken;
  session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await session.save();

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

/**
 * Log out user from a specific device
 */
export const logout = async (tokenFromCookie) => {
  if (!tokenFromCookie) return; // Silent return if no token

  try {
    const decoded = verifyRefreshToken(tokenFromCookie);
    const userId = decoded.sub;
    const deviceIdentifier = decoded.deviceIdentifier;

    if (userId && deviceIdentifier) {
      await RefreshToken.findOneAndDelete({ user: userId, deviceIdentifier });
    }
  } catch (error) {
    // Ignore invalid JWT tokens on logout
  }
};


/**
 * Forgot Password — generate reset token, store in Redis, send email
 */
export const forgotPassword = async ({ email }) => {
  // Always return the same response to prevent user enumeration
  const user = await User.findOne({ email, isVerified: true });

  if (user && user.isActive) {
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetKey = `reset:${resetToken}`;
    const RESET_TTL = 15 * 60; // 15 minutes in seconds

    // Store email against this token in Redis
    await redisClient.set(resetKey, JSON.stringify({ email: user.email }), "EX", RESET_TTL);

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

    await emailQueue.add("sendResetPassword", {
      to: user.email,
      name: user.name,
      resetToken,
      resetUrl,
    });
  }

  // Always return success to avoid user enumeration
  return {};
};

/**
 * Reset Password — validate token from Redis, set new password, revoke all sessions
 */
export const resetPassword = async ({ token, password }) => {
  const resetKey = `reset:${token}`;
  const dataStr = await redisClient.get(resetKey);

  if (!dataStr) {
    throw new ApiError("Password reset link is invalid or has expired", 400, "RESET_TOKEN_INVALID");
  }

  const { email } = JSON.parse(dataStr);

  const user = await User.findOne({ email, isVerified: true, isActive: true });
  if (!user) {
    throw new ApiError("User account not found or inactive", 404, "USER_NOT_FOUND");
  }

  // Update password (pre-save hook will bcrypt hash it)
  user.password = password;
  await user.save();

  // Delete reset token from Redis (one-time use)
  await redisClient.del(resetKey);

  // Revoke ALL active sessions across all devices for security
  await RefreshToken.deleteMany({ user: user._id });

  return {};
};

const sendOtpLogic = async (email, name) => {
  const cooldownKey = `otp:cooldown:${email}`;
  const otpKey = `otp:${email}`;

  // Check cooldown
  const cooldownExists = await redisClient.get(cooldownKey);
  if (cooldownExists) {
    const ttl = await redisClient.ttl(cooldownKey);
    throw new ApiError(`Please wait ${ttl} seconds before requesting another code`, 429, "OTP_COOLDOWN_ACTIVE");
  }

  // Generate OTP
  const otp = generateOtp();

  // Store in Redis (attempts set to 0)
  await redisClient.set(otpKey, JSON.stringify({ code: otp, attempts: 0 }), "EX", OTP_TTL);
  // Set cooldown
  await redisClient.set(cooldownKey, "1", "EX", OTP_COOLDOWN);

  // Add job to BullMQ queue
  await emailQueue.add("sendOtp", {
    to: email,
    name,
    otp,
    expiresInMinutes: Math.round(OTP_TTL / 60),
  });
};
