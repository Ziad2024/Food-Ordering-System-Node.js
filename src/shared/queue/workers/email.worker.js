import { Worker } from "bullmq";
import nodemailer from "nodemailer";
import { redisConfig } from "../../../config/redis.js";

// Setup nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || "mock_user",
    pass: process.env.SMTP_PASS || "mock_pass",
  },
});

const emailWorker = new Worker(
  "email",
  async (job) => {
    const { name, to, otp, expiresInMinutes, resetToken, resetUrl } = job.data;
    console.log(`Processing email job ${job.id} of type "${job.name}" for ${to}`);

    // ── sendOtp ──────────────────────────────────────────────
    if (job.name === "sendOtp") {
      const mailOptions = {
        from: process.env.SMTP_FROM || '"Food Ordering System" <noreply@foodordering.com>',
        to,
        subject: "Your Verification Code",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:8px;">
            <h2 style="color:#ff4757;text-align:center;margin-bottom:4px;">Food Ordering System</h2>
            <p style="text-align:center;color:#a4b0be;margin-top:0;">Email Verification</p>
            <hr style="border:none;border-top:1px solid #eee;" />
            <p>Hello <strong>${name}</strong>,</p>
            <p>Use the verification code below to complete your request:</p>
            <div style="background:#f1f2f6;padding:20px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;color:#2f3542;border-radius:6px;margin:24px 0;">
              ${otp}
            </div>
            <p>This code expires in <strong>${expiresInMinutes || 5} minutes</strong>.</p>
            <p style="color:#a4b0be;font-size:13px;">If you did not request this, you can safely ignore this email.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
            <p style="font-size:11px;color:#ced6e0;text-align:center;">Food Ordering System &copy; 2026</p>
          </div>
        `,
      };

      if (!process.env.SMTP_USER || process.env.SMTP_USER === "mock_user") {
        console.log("-----------------------------------------");
        console.log(`[MOCK EMAIL] OTP for ${to}: ${otp}`);
        console.log("-----------------------------------------");
        return { success: true, mock: true, otp };
      }

      await transporter.sendMail(mailOptions);
      console.log(`OTP email sent to ${to}`);
      return { success: true };
    }

    // ── sendResetPassword ────────────────────────────────────
    if (job.name === "sendResetPassword") {
      const mailOptions = {
        from: process.env.SMTP_FROM || '"Food Ordering System" <noreply@foodordering.com>',
        to,
        subject: "Reset Your Password",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:8px;">
            <h2 style="color:#ff4757;text-align:center;margin-bottom:4px;">Food Ordering System</h2>
            <p style="text-align:center;color:#a4b0be;margin-top:0;">Password Reset</p>
            <hr style="border:none;border-top:1px solid #eee;" />
            <p>Hello <strong>${name}</strong>,</p>
            <p>We received a request to reset your password. Click the button below to set a new password:</p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${resetUrl}" style="background:#ff4757;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:bold;">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break:break-all;color:#747d8c;font-size:13px;">${resetUrl}</p>
            <p>This link expires in <strong>15 minutes</strong>.</p>
            <p style="color:#a4b0be;font-size:13px;">If you did not request a password reset, you can safely ignore this email. Your password will not change.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
            <p style="font-size:11px;color:#ced6e0;text-align:center;">Food Ordering System &copy; 2026</p>
          </div>
        `,
      };

      if (!process.env.SMTP_USER || process.env.SMTP_USER === "mock_user") {
        console.log("-----------------------------------------");
        console.log(`[MOCK EMAIL] Password Reset for ${to}`);
        console.log(`[MOCK EMAIL] Reset URL: ${resetUrl}`);
        console.log(`[MOCK EMAIL] Reset Token: ${resetToken}`);
        console.log("-----------------------------------------");
        return { success: true, mock: true, resetToken };
      }

      await transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${to}`);
      return { success: true };
    }

    // ── orderConfirmation ────────────────────────────────────
    if (job.name === "orderConfirmation") {
      const { name, orderId, totalAmount, items, paymentMethod } = job.data;
      const mailOptions = {
        from: process.env.SMTP_FROM || '"Food Ordering System" <noreply@foodordering.com>',
        to,
        subject: `Order Confirmation #${orderId}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:8px;">
            <h2 style="color:#ff4757;text-align:center;margin-bottom:4px;">Food Ordering System</h2>
            <p style="text-align:center;color:#a4b0be;margin-top:0;">Order Confirmation</p>
            <hr style="border:none;border-top:1px solid #eee;" />
            <p>Hello <strong>${name}</strong>,</p>
            <p>Thank you for your order! Your order <strong>#${orderId}</strong> has been confirmed.</p>
            <h3 style="color:#2f3542;margin-top:24px;">Order Summary</h3>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <thead>
                <tr style="background:#f1f2f6;text-align:left;">
                  <th style="padding:10px;border-bottom:2px solid #eee;">Item</th>
                  <th style="padding:10px;border-bottom:2px solid #eee;text-align:center;">Qty</th>
                  <th style="padding:10px;border-bottom:2px solid #eee;text-align:right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => `
                  <tr>
                    <td style="padding:10px;border-bottom:1px solid #eee;">${item.name}</td>
                    <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
                    <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">$${item.price.toFixed(2)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
            <div style="text-align:right;font-size:18px;font-weight:bold;margin:20px 0;color:#ff4757;">
              Total: $${totalAmount.toFixed(2)}
            </div>
            <p style="margin-top:16px;"><strong>Payment Method:</strong> ${paymentMethod}</p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0 0 0;" />
            <p style="font-size:11px;color:#ced6e0;text-align:center;margin-top:12px;">Food Ordering System &copy; 2026</p>
          </div>
        `,
      };

      if (!process.env.SMTP_USER || process.env.SMTP_USER === "mock_user") {
        console.log("-----------------------------------------");
        console.log(`[MOCK EMAIL] Order Confirmation for ${to}`);
        console.log(`[MOCK EMAIL] Order ID: ${orderId}`);
        console.log(`[MOCK EMAIL] Total Amount: $${totalAmount}`);
        console.log("-----------------------------------------");
        return { success: true, mock: true, orderId };
      }

      await transporter.sendMail(mailOptions);
      console.log(`Order confirmation email sent to ${to}`);
      return { success: true };
    }

    // ── orderStatusUpdate ────────────────────────────────────
    if (job.name === "orderStatusUpdate") {
      const { name, orderId, status, description } = job.data;
      const mailOptions = {
        from: process.env.SMTP_FROM || '"Food Ordering System" <noreply@foodordering.com>',
        to,
        subject: `Order #${orderId} Status Update`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:8px;">
            <h2 style="color:#ff4757;text-align:center;margin-bottom:4px;">Food Ordering System</h2>
            <p style="text-align:center;color:#a4b0be;margin-top:0;">Order Status Update</p>
            <hr style="border:none;border-top:1px solid #eee;" />
            <p>Hello <strong>${name}</strong>,</p>
            <p>Your order <strong>#${orderId}</strong> status has been updated:</p>
            <div style="background:#f1f2f6;padding:20px;text-align:center;border-radius:6px;margin:24px 0;">
              <span style="font-size:12px;color:#747d8c;text-align:center;display:block;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">New Status</span>
              <strong style="color:#ff4757;font-size:20px;">${status.replace(/_/g, " ").toUpperCase()}</strong>
              <p style="margin:8px 0 0 0;font-size:15px;color:#2f3542;">${description}</p>
            </div>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0 0 0;" />
            <p style="font-size:11px;color:#ced6e0;text-align:center;margin-top:12px;">Food Ordering System &copy; 2026</p>
          </div>
        `,
      };

      if (!process.env.SMTP_USER || process.env.SMTP_USER === "mock_user") {
        console.log("-----------------------------------------");
        console.log(`[MOCK EMAIL] Order Status Update for ${to}`);
        console.log(`[MOCK EMAIL] Order ID: ${orderId}`);
        console.log(`[MOCK EMAIL] Status: ${status}`);
        console.log("-----------------------------------------");
        return { success: true, mock: true, orderId };
      }

      await transporter.sendMail(mailOptions);
      console.log(`Order status update email sent to ${to}`);
      return { success: true };
    }
  },
  {
    connection: redisConfig,
    // ── Retry: 3 attempts with exponential backoff (2s → 4s → 8s) ──
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  }
);

emailWorker.on("completed", (job) => {
  console.log(`Email job ${job.id} completed successfully`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`Email job ${job.id} failed with error:`, err);
});

export default emailWorker;
