/**
 * Email Service - Batch Email Sending
 * Handles sending emails in batches using Nodemailer with Gmail SMTP
 * Supports dynamic variable replacement and attachments (PDFs, etc.)
 * 
 * Note: SendGrid integration is commented out but can be enabled
 */

// SendGrid integration (currently disabled)
//const sgMail = require('@sendgrid/mail');
//sgMail.setApiKey(process.env.SENDGRID_API_KEY);

require('dotenv').config();
const nodemailer = require('nodemailer');

/**
 * Nodemailer Transporter Configuration
 * Configured to use Gmail SMTP for sending emails
 */
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, // Gmail address
    pass: process.env.SMTP_PASS, // Gmail app password
  },
  tls: {
    rejectUnauthorized: false, // Accept self-signed certificates
  },
});

/**
 * Send Emails in Batches
 * Sends emails to multiple recipients in batches to avoid rate limiting
 * Supports dynamic variable replacement and file attachments
 * 
 * @param {String} subject - Email subject line
 * @param {Array<String>} toRecipients - Array of "To" recipient email addresses
 * @param {Array<String>} ccRecipients - Array of "CC" recipient email addresses (optional)
 * @param {String} htmlContent - HTML email body content
 * @param {Object} variables - Key-value pairs for variable replacement in HTML (e.g., {resetLink: "url"})
 * @param {Array<Object>} attachments - Array of attachment objects (PDFs, images, etc.)
 * 
 * @returns {Promise<void>}
 */
const sendEmailsInBatches = async (
  subject,
  toRecipients,
  ccRecipients = [],
  htmlContent,
  variables,
  attachments = []
) => {
  // Batch configuration to avoid email service rate limits
  const batchSize = 100; // Maximum recipients per batch
  const delayBetweenBatches = 5 * 60 * 1000; // 5-minute delay between batches (in milliseconds)

  // Combine To and CC recipients into single list
  const allRecipients = [...toRecipients, ...ccRecipients];

  // Process recipients in batches
  for (let i = 0; i < allRecipients.length; i += batchSize) {
    const batch = allRecipients.slice(i, i + batchSize);
    
    // Split batch evenly between To and CC recipients
    const splitIndex = Math.floor(batch.length / 2);
    const toBatch = batch.slice(0, splitIndex);
    const ccBatch = batch.slice(splitIndex);

    // Replace template variables in HTML content (e.g., {resetLink}, {userName})
    let parsedHtml = htmlContent;
    if (variables) {
      Object.keys(variables).forEach((key) => {
        const regex = new RegExp(`{${key}}`, "g");
        parsedHtml = parsedHtml.replace(regex, variables[key]);
      });
    }

    // Prepare email options
    const mailOptions = {
      from: '"PISL Infra" <no-reply@yourdomain.com>',
      to: toBatch.join(","), // Comma-separated To recipients
      cc: ccBatch.length > 0 ? ccBatch.join(",") : undefined, // CC recipients if any
      subject,
      html: parsedHtml, // HTML email body with variables replaced
      attachments, // Array of attachments (PDFs, images, etc.)
    };

    try {
      // Send email batch
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Sent batch (To: ${toBatch.length}, CC: ${ccBatch.length}): ${info.messageId}`);
    } catch (error) {
      console.error("❌ Error sending batch:", error);
      // Continue with next batch even if current batch fails
    }

    // Wait before sending next batch (except for the last batch)
    if (i + batchSize < allRecipients.length) {
      console.log(`⏳ Waiting for ${delayBetweenBatches / 60000} minutes before next batch...`);
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
  }
};

module.exports = sendEmailsInBatches;

