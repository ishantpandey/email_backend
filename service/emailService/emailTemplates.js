
function createWelcomeTemplate(userName) {
  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h2 style="color: #333; text-align: center;">Welcome ${userName}! 🎉</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #555;">
        Thank you for joining our platform! We're excited to have you on board.
      </p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #333;">
          Your account has been successfully created and you can now start exploring all our features.
        </p>
      </div>
      <p style="font-size: 14px; color: #888; text-align: center;">
        If you have any questions, feel free to contact our support team.
      </p>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
      <p style="font-size: 12px; color: #999; text-align: center;">
        Sent at ${new Date().toLocaleString()}
      </p>
    </div>
  `;
}


function createPasswordResetTemplate(userName, resetLink) {
  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h2 style="color: #333; text-align: center;">Password Reset Request 🔐</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #555;">
        Hi ${userName}, you requested to reset your password.
      </p>
      <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <p style="margin: 0; color: #856404;">
          <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email. 
          Your password will remain unchanged.
        </p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" 
           style="background-color: #007bff; color: white; padding: 14px 28px; 
                  text-decoration: none; border-radius: 6px; display: inline-block;
                  font-weight: bold; font-size: 16px;">
          Reset Password
        </a>
      </div>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #6c757d;">
          <strong>Important:</strong> This link will expire in 24 hours for your security.
        </p>
      </div>
      <p style="font-size: 14px; color: #888; text-align: center;">
        Having trouble clicking the button? Copy and paste this link into your browser:
      </p>
      <p style="font-size: 12px; color: #999; word-break: break-all; text-align: center;">
        ${resetLink}
      </p>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
      <p style="font-size: 12px; color: #999; text-align: center;">
        Sent at ${new Date().toLocaleString()}
      </p>
    </div>
  `;
}


function createCustomTemplate(userName, message) {
  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h2 style="color: #333;">Hello ${userName}!</h2>
      <div style="font-size: 16px; line-height: 1.6; color: #555;">
        ${message}
      </div>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
      <p style="font-size: 12px; color: #999; text-align: center;">
        Sent at ${new Date().toLocaleString()}
      </p>
    </div>
  `;
}

function createEmailVerificationTemplate(userName, verificationLink) {
  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h2 style="color: #333; text-align: center;">Verify Your Email Address 📧</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #555;">
        Hi ${userName}, thank you for registering with us!
      </p>
      <p style="font-size: 16px; line-height: 1.6; color: #555;">
        To complete your registration and activate your account, please verify your email address by clicking the button below:
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationLink}" 
           style="background-color: #28a745; color: white; padding: 14px 28px; 
                  text-decoration: none; border-radius: 6px; display: inline-block;
                  font-weight: bold; font-size: 16px;">
          Verify Email Address
        </a>
      </div>
      <div style="background-color: #e7f3ff; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #007bff;">
        <p style="margin: 0; font-size: 14px; color: #004085;">
          <strong>Important:</strong> This verification link will expire in 24 hours for your security.
        </p>
      </div>
      <p style="font-size: 14px; color: #888; text-align: center;">
        Having trouble clicking the button? Copy and paste this link into your browser:
      </p>
      <p style="font-size: 12px; color: #999; word-break: break-all; text-align: center;">
        ${verificationLink}
      </p>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
      <p style="font-size: 12px; color: #999; text-align: center;">
        If you didn't create an account with us, please ignore this email.
      </p>
      <p style="font-size: 12px; color: #999; text-align: center;">
        Sent at ${new Date().toLocaleString()}
      </p>
    </div>
  `;
}

module.exports = {
  createWelcomeTemplate,
  createPasswordResetTemplate,
  createCustomTemplate,
  createEmailVerificationTemplate
};