const nodemailer = require("nodemailer");

// Email template generator function
function generateEmailTemplate(templateData) {
  const { title, name, details, actionText, actionUrl } = templateData || {};
  
  // Handle details object (for match notifications)
  let detailsHtml = '';
  if (details && typeof details === 'object') {
    detailsHtml = `
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #2c3e50; margin-top: 0;">📋 Match Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${Object.entries(details).map(([key, value]) => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 30%;">${key}:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">${value}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3498db, #2980b9); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #27ae60; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #7f8c8d; font-size: 14px; }
        h2 { color: #2c3e50; margin-top: 0; }
        p { margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔍 SherLock</h1>
        <p>Lost & Found System</p>
      </div>
      
      <div class="content">
        <h2>${title || "Sherlock Notification"}</h2>
        <p>Hello ${name || "Student"},</p>
        
        ${detailsHtml}
        
        <p>${templateData?.message || "Please visit the admin office for further assistance."}</p>
        
        ${actionText && actionUrl ? 
          `<div style="text-align: center;">
             <a href="${actionUrl}" class="button">${actionText}</a>
           </div>` : ''
        }
      </div>
      
      <div class="footer">
        <p>This is an automated message from SherLock System</p>
        <p>Do not reply to this email</p>
      </div>
    </body>
    </html>
  `;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  debug: true,
  logger: true
});

// Verify SMTP connection function
exports.verifyConnection = async () => {
  try {
    // Test the connection
    await transporter.verify();
    console.log("✅ SMTP Connection Verified Successfully");
    return true;
  } catch (error) {
    console.error("❌ SMTP Connection Failed:", error.message);
    return false;
  }
};

exports.sendEmail = async ({
  email,
  subject,
  message,
  templateData,
  type,
  triggeredBy,
  attachments
}) => {
  try {
    const mailOptions = {
      from: `"Sherlock Lost & Found" <${process.env.SMTP_USER}>`,
      to: email,
      subject: subject,
      html: message
        ? `<p>${message}</p>`
        : generateEmailTemplate(templateData),
      attachments: attachments || []
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent:", info.messageId);

    return info;

  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    console.error("❌ Full error details:", error);
    // More descriptive error for frontend
    if (error.code === 'EAUTH') {
      throw new Error('SMTP authentication failed - check credentials');
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('SMTP connection refused - check host and port');
    } else if (error.code === 'ENOTFOUND') {
      throw new Error('SMTP host not found - check SMTP_HOST');
    }
    throw error;
  }
};
