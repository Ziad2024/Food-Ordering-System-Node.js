import crypto from "crypto";

/**
 * Generates a cryptographically secure 6-digit OTP
 * @returns {string} OTP code
 */
export const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Masks an email address for privacy (e.g., ziad@example.com -> z***d@example.com)
 * @param {string} email 
 * @returns {string} masked email
 */
export const maskEmail = (email) => {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
};
