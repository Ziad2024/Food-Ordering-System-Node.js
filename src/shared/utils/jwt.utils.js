import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "default_access_secret_key_32_chars_long";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "default_refresh_secret_key_32_chars_long";

/**
 * Signs an access token containing the user details
 * @param {object} payload 
 * @returns {string} jwt
 */
export const signAccessToken = (payload) => {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
};

/**
 * Signs a refresh token
 * @param {object} payload 
 * @returns {string} jwt
 */
export const signRefreshToken = (payload) => {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
};

/**
 * Verifies an access token
 * @param {string} token 
 * @returns {object} payload
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_SECRET);
};

/**
 * Verifies a refresh token
 * @param {string} token 
 * @returns {object} payload
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_SECRET);
};
