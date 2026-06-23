import * as authService from "./auth.service.js";
import { successResponse } from "../../shared/utils/response.utils.js";
import { maskEmail } from "../../shared/utils/otp.utils.js";

/**
 * Cookie configuration helper for refresh token cookies
 */
const setRefreshTokenCookie = (res, token) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  });
};

/**
 * Handle user registration request
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    const result = await authService.register({ name, email, phone, password });

    return successResponse(
      res,
      { maskedEmail: maskEmail(result.email) },
      "Registration code sent. Please check your email.",
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Handle credentials authentication request (Step 1)
 */
export const login = async (req, res, next) => {
  try {
    const { email, password, deviceIdentifier } = req.body;
    const devId = deviceIdentifier || req.headers["user-agent"] || "web-browser";

    const { accessToken, refreshToken, user } = await authService.login({ 
      email, 
      password, 
      deviceIdentifier: devId 
    });

    setRefreshTokenCookie(res, refreshToken);

    return successResponse(
      res,
      { accessToken, user },
      "Login successful.",
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Handle OTP verification request (Step 2)
 */
export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp, deviceIdentifier } = req.body;
    const devId = deviceIdentifier || req.headers["user-agent"] || "web-browser";

    const { accessToken, refreshToken, user } = await authService.verifyOtp({
      email,
      otp,
      deviceIdentifier: devId,
    });

    setRefreshTokenCookie(res, refreshToken);

    return successResponse(
      res,
      { accessToken, user },
      "Verification successful. Session established.",
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Handle session token refresh request
 */
export const refresh = async (req, res, next) => {
  try {
    const tokenFromCookie = req.cookies.refreshToken;
    const devId = req.headers["user-agent"] || "web-browser";

    const { accessToken, refreshToken } = await authService.refreshAccessToken(
      tokenFromCookie,
      devId
    );

    setRefreshTokenCookie(res, refreshToken);

    return successResponse(
      res,
      { accessToken },
      "Token rotated and refreshed successfully.",
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Handle logout request
 */
export const logout = async (req, res, next) => {
  try {
    const tokenFromCookie = req.cookies.refreshToken;
    await authService.logout(tokenFromCookie);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return successResponse(res, null, "Successfully logged out from session.", 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Handle forgot password request
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    await authService.forgotPassword({ email });

    // Always return same message (prevents user enumeration)
    return successResponse(
      res,
      null,
      "If an account exists for that email, a password reset link has been sent.",
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Handle reset password request
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    await authService.resetPassword({ token, password });

    return successResponse(
      res,
      null,
      "Password has been reset successfully. All active sessions have been revoked. Please log in again.",
      200
    );
  } catch (error) {
    next(error);
  }
};
