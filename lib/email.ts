import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "FunBetz <noreply@funbetz.life>";

export async function sendPasswordResetEmail(
  to: string,
  username: string,
  resetUrl: string
) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your FunBetz password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background: #111; color: #eee; padding: 32px; border-radius: 12px;">
        <h1 style="color: #4ade80; margin-top: 0;">FunBetz Password Reset</h1>
        <p>Hey <strong>${username}</strong>,</p>
        <p>Someone requested a password reset for your account. If that was you, click the button below. The link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 28px; background: #4ade80; color: #111; font-weight: bold; border-radius: 8px; text-decoration: none;">
          Reset Password
        </a>
        <p style="color: #888; font-size: 13px;">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
        <hr style="border-color: #333; margin: 24px 0;" />
        <p style="color: #555; font-size: 12px;">FunBetz · Fantasy sports for friends</p>
      </div>
    `,
  });
}

export async function sendUsernameReminderEmail(
  to: string,
  username: string
) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Your FunBetz username",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background: #111; color: #eee; padding: 32px; border-radius: 12px;">
        <h1 style="color: #4ade80; margin-top: 0;">Your FunBetz Username</h1>
        <p>You asked us to remind you of your username. Here it is:</p>
        <p style="font-size: 24px; font-weight: bold; color: #4ade80; margin: 24px 0;">${username}</p>
        <p>Head back to <a href="${process.env.NEXTAUTH_URL}/login" style="color: #4ade80;">funbetz.life</a> and log in.</p>
        <hr style="border-color: #333; margin: 24px 0;" />
        <p style="color: #555; font-size: 12px;">FunBetz · Fantasy sports for friends</p>
      </div>
    `,
  });
}

export async function sendAdminPasswordResetEmail(
  to: string,
  username: string,
  tempPassword: string
) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Your FunBetz password has been reset by an admin",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background: #111; color: #eee; padding: 32px; border-radius: 12px;">
        <h1 style="color: #4ade80; margin-top: 0;">Password Reset by Admin</h1>
        <p>Hey <strong>${username}</strong>,</p>
        <p>An admin has reset your password. Your temporary password is:</p>
        <p style="font-size: 20px; font-weight: bold; color: #4ade80; background: #1a1a1a; padding: 12px 20px; border-radius: 8px; letter-spacing: 2px; margin: 24px 0;">${tempPassword}</p>
        <p>Please log in and change your password as soon as possible.</p>
        <a href="${process.env.NEXTAUTH_URL}/login" style="display: inline-block; margin: 16px 0; padding: 12px 28px; background: #4ade80; color: #111; font-weight: bold; border-radius: 8px; text-decoration: none;">
          Log In
        </a>
        <hr style="border-color: #333; margin: 24px 0;" />
        <p style="color: #555; font-size: 12px;">FunBetz · Fantasy sports for friends</p>
      </div>
    `,
  });
}
