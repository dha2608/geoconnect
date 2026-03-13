/**
 * Email utility — stub implementation.
 *
 * Replace the console.log calls with a real transport (e.g. nodemailer + SMTP,
 * Resend, SendGrid) when ready. The function signatures stay the same.
 */

const CLIENT_URL = () => process.env.CLIENT_URL || 'http://localhost:5173';

export const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${CLIENT_URL()}/reset-password?token=${resetToken}`;
  // TODO: replace with real email transport
  console.log(`[EMAIL-STUB] Password reset email → ${email}`);
  console.log(`[EMAIL-STUB] Reset URL: ${resetUrl}`);
  return resetUrl; // returned so tests/controllers can reference it
};

export const sendEmailVerification = async (email, verifyToken) => {
  const verifyUrl = `${CLIENT_URL()}/verify-email?token=${verifyToken}`;
  // TODO: replace with real email transport
  console.log(`[EMAIL-STUB] Verification email → ${email}`);
  console.log(`[EMAIL-STUB] Verify URL: ${verifyUrl}`);
  return verifyUrl;
};

export const sendAccountDeletedEmail = async (email, name) => {
  // TODO: replace with real email transport
  console.log(`[EMAIL-STUB] Account deletion confirmation → ${email} (${name})`);
};
