/**
 * Email utility — Nodemailer transport.
 *
 * Required env vars (in .env):
 *   EMAIL_HOST   — SMTP host (e.g. smtp.gmail.com)
 *   EMAIL_PORT   — SMTP port (587 for TLS, 465 for SSL)
 *   EMAIL_USER   — SMTP username / email address
 *   EMAIL_PASS   — SMTP password or app-specific password
 *   EMAIL_FROM   — Sender address shown to recipients (defaults to EMAIL_USER)
 *   CLIENT_URL   — Frontend URL for links in emails
 *
 * If SMTP vars are missing, falls back to console.log stubs so the server
 * can still start in development without a mail provider.
 */

import nodemailer from 'nodemailer';

const CLIENT_URL = () => process.env.CLIENT_URL || 'http://localhost:5173';

// ---------------------------------------------------------------------------
// Transport setup
// ---------------------------------------------------------------------------

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;

  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
    console.warn(
      '[EMAIL] Missing EMAIL_HOST / EMAIL_USER / EMAIL_PASS — emails will be logged to console only.',
    );
    return null;
  }

  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT) || 587,
    secure: Number(EMAIL_PORT) === 465, // true for 465, false for other ports
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  return transporter;
};

const from = () => process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@geoconnect.app';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Send an email. Falls back to console.log if transporter is unavailable.
 * @returns {Promise<string|null>} messageId on success, null on fallback/failure
 */
const sendMail = async ({ to, subject, html, text }) => {
  const t = getTransporter();

  if (!t) {
    console.log(`[EMAIL-STUB] To: ${to}`);
    console.log(`[EMAIL-STUB] Subject: ${subject}`);
    console.log(`[EMAIL-STUB] Body:\n${text || html}`);
    return null;
  }

  try {
    const info = await t.sendMail({ from: from(), to, subject, html, text });
    console.log(`[EMAIL] Sent "${subject}" → ${to} (${info.messageId})`);
    return info.messageId;
  } catch (err) {
    console.error(`[EMAIL] Failed to send "${subject}" → ${to}:`, err.message);
    // Don't throw — callers should not crash if email delivery fails
    return null;
  }
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${CLIENT_URL()}/reset-password?token=${resetToken}`;

  await sendMail({
    to: email,
    subject: 'GeoConnect — Đặt lại mật khẩu',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#2563eb">GeoConnect</h2>
        <p>Bạn đã yêu cầu đặt lại mật khẩu. Nhấn nút bên dưới để tiếp tục:</p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;
                  border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Đặt lại mật khẩu
        </a>
        <p style="font-size:13px;color:#6b7280">
          Link hết hạn sau 1 giờ.<br/>
          Nếu bạn không yêu cầu, hãy bỏ qua email này.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="font-size:12px;color:#9ca3af">
          Không mở được nút? Sao chép link:<br/>
          <a href="${resetUrl}" style="color:#2563eb;word-break:break-all">${resetUrl}</a>
        </p>
      </div>
    `,
    text: `Đặt lại mật khẩu GeoConnect: ${resetUrl}\n\nLink hết hạn sau 1 giờ.`,
  });

  return resetUrl;
};

export const sendEmailVerification = async (email, verifyToken) => {
  const verifyUrl = `${CLIENT_URL()}/verify-email?token=${verifyToken}`;

  await sendMail({
    to: email,
    subject: 'GeoConnect — Xác thực email',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#2563eb">GeoConnect</h2>
        <p>Chào mừng bạn! Nhấn nút bên dưới để xác thực địa chỉ email:</p>
        <a href="${verifyUrl}"
           style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;
                  border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Xác thực email
        </a>
        <p style="font-size:13px;color:#6b7280">
          Link hết hạn sau 24 giờ.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="font-size:12px;color:#9ca3af">
          Không mở được nút? Sao chép link:<br/>
          <a href="${verifyUrl}" style="color:#2563eb;word-break:break-all">${verifyUrl}</a>
        </p>
      </div>
    `,
    text: `Xác thực email GeoConnect: ${verifyUrl}\n\nLink hết hạn sau 24 giờ.`,
  });

  return verifyUrl;
};

export const sendAccountDeletedEmail = async (email, name) => {
  await sendMail({
    to: email,
    subject: 'GeoConnect — Tài khoản đã bị xoá',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#2563eb">GeoConnect</h2>
        <p>Xin chào <strong>${name}</strong>,</p>
        <p>Tài khoản của bạn đã được xoá thành công. Tất cả dữ liệu cá nhân đã bị xoá
           khỏi hệ thống.</p>
        <p style="font-size:13px;color:#6b7280">
          Nếu bạn không thực hiện yêu cầu này, vui lòng liên hệ hỗ trợ ngay.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="font-size:12px;color:#9ca3af">Cảm ơn bạn đã sử dụng GeoConnect.</p>
      </div>
    `,
    text: `Xin chào ${name},\n\nTài khoản GeoConnect của bạn đã được xoá thành công.\nNếu bạn không thực hiện yêu cầu này, vui lòng liên hệ hỗ trợ.`,
  });
};
