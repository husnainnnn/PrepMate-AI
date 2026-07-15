const nodemailer = require('nodemailer')

const GMAIL_USER = process.env.GMAIL_USER || ''
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || ''

let transporter = null

function getTransporter() {
  if (transporter) return transporter
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.warn('⚠️  GMAIL_USER / GMAIL_APP_PASSWORD not set — emails will be logged to console instead of sent.')
    console.warn('   To enable email: add GMAIL_USER and GMAIL_APP_PASSWORD to Backend/.env')
    return null
  }
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  })
  return transporter
}

/**
 * Generate a random 6-digit code
 */
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Send verification code (for signup)
 */
async function sendVerificationCode(email, code) {
  const subject = 'Your PrepMate AI Verification Code'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f7f9fc; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #0b3b5c; font-size: 24px; margin: 0;">PrepMate <span style="color: #1a6fa8;">AI</span></h1>
        <p style="color: #667085; font-size: 14px; margin-top: 4px;">Email Verification</p>
      </div>
      <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
        <h2 style="color: #101828; font-size: 18px; margin: 0 0 12px;">Your Verification Code</h2>
        <p style="color: #667085; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
          Thank you for signing up! Use the code below to verify your email address. This code expires in <strong>10 minutes</strong>.
        </p>
        <div style="text-align: center; background: #f0f4ff; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0b3b5c;">${code}</span>
        </div>
        <p style="color: #98A2B3; font-size: 12px; margin: 0;">
          If you did not request this code, you can safely ignore this email.
        </p>
      </div>
    </div>
  `
  return await send(email, subject, html)
}

/**
 * Send password reset code
 */
async function sendPasswordResetCode(email, code) {
  const subject = 'Reset Your PrepMate AI Password'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f7f9fc; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #0b3b5c; font-size: 24px; margin: 0;">PrepMate <span style="color: #1a6fa8;">AI</span></h1>
        <p style="color: #667085; font-size: 14px; margin-top: 4px;">Password Reset</p>
      </div>
      <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
        <h2 style="color: #101828; font-size: 18px; margin: 0 0 12px;">Reset Your Password</h2>
        <p style="color: #667085; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
          We received a request to reset your password. Use the code below to proceed. This code expires in <strong>10 minutes</strong>.
        </p>
        <div style="text-align: center; background: #f0f4ff; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0b3b5c;">${code}</span>
        </div>
        <p style="color: #98A2B3; font-size: 12px; margin: 0;">
          If you did not request a password reset, please ignore this email or contact support.
        </p>
      </div>
    </div>
  `
  return await send(email, subject, html)
}

/**
 * Low-level send function — falls back to console if credentials not set
 */
async function send(to, subject, html) {
  const transport = getTransporter()

  if (!transport) {
    console.log(`[EMAIL LOG] To: ${to}`)
    console.log(`[EMAIL LOG] Subject: ${subject}`)
    console.log(`[EMAIL LOG] Code: ${html.match(/\d{6}/)?.[0] || 'see body'}`)
    console.log('[EMAIL LOG] ⚠️  Email not sent — configure GMAIL_USER and GMAIL_APP_PASSWORD in .env')
    return { id: 'logged', to, subject }
  }

  try {
    const info = await transport.sendMail({
      from: `"PrepMate AI" <${GMAIL_USER}>`,
      to,
      subject,
      html,
    })
    console.log(`[EMAIL] Sent to ${to}: ${info.messageId}`)
    return { id: info.messageId, to, subject }
  } catch (err) {
    console.error('Failed to send email via Gmail:', err.message)
    console.log('[EMAIL LOG] Fallback — email details logged to console.')
    return { id: 'logged-error', to, subject }
  }
}

module.exports = {
  generateCode,
  sendVerificationCode,
  sendPasswordResetCode,
}
