/**
 * Mailer Library
 * Email sending utility using Nodemailer with Handlebars template support
 * Supports template-based emails with dynamic content
 */

const env = require("../config/env");
const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');
const { responseMessage } = require("./responseMessages");

/**
 * SMTP Configuration
 * Email server connection options from environment configuration
 */
const options = {
    host: env.smtp.host,
    port: env.smtp.port,
    auth: {
        user: env.smtp.auth_user,
        pass: env.smtp.auth_pass
    }
};

/**
 * Send Email
 * Main function to send emails using configured SMTP settings
 * 
 * @param {Object} opt - Email options object
 * @param {String} opt.to - Recipient email address
 * @param {String} opt.subject - Email subject
 * @param {String} opt.template - Handlebars template name (optional)
 * @param {Object} opt.context - Template variables (optional)
 * @param {String} opt.html - HTML email content (optional, if not using template)
 * @param {String} opt.text - Plain text email content (optional)
 * @param {Array} opt.attachments - Email attachments (optional)
 * @param {String} opt.cc - CC recipient (optional)
 * 
 * @returns {Promise<Object>} Email sending result
 */
async function send(opt) {
    try {     
        let optionsDetail = options;
        // Create Nodemailer transporter with SMTP configuration
        let transporter = await nodemailer.createTransport(optionsDetail);     
          
        // Send email using mailer function
        return await mailer(opt, transporter);
    } catch (err) {
        throw new Error(err);
    }
}


/**
 * Mailer Function
 * Internal function that handles actual email sending with template support
 * 
 * @param {Object} opt - Email options (see send function for details)
 * @param {Object} transporter - Nodemailer transporter instance
 * 
 * @returns {Promise<Object>} Email sending result
 */
async function mailer(opt, transporter) {
    try {
        // Handlebars template engine configuration
        let options = {
            viewEngine: {
                extname: '.hbs', // Template file extension
                layoutsDir: './emails/', // Layout templates directory
                defaultLayout: 'index', // Default layout template
                partialsDir: './emails/partials', // Partials directory
                helpers: {
                    // Custom Handlebars helper for logo URL
                    logo_url: function () {
                        return opt.logo;
                    }
                }
            },
            viewPath: './emails/body/', // Email body templates directory
            extName: '.hbs',
        };

        // Build email object with required fields
        let email_obj = {
            from: env.smtp.from, // Sender email from configuration
            to: opt.to, // Recipient email
            subject: opt.subject, // Email subject
        };

        // Add optional fields if provided
        if (opt.cc) {
            email_obj.cc = opt.cc;
        }

        if (opt.text) {
            email_obj.text = opt.text; // Plain text version
        }
        
        if (opt.html) {
            email_obj.html = opt.html; // HTML version (if not using template)
        }

        if (opt.template) {
            email_obj.template = opt.template; // Handlebars template name
        }

        if (opt.attachments) {
            email_obj.attachments = opt.attachments; // File attachments
        }

        if (opt.context) {
            email_obj.context = opt.context; // Template variables/context
        }

        // Configure transporter to use Handlebars templates
        transporter.use('compile', hbs(options));
        
        // Send email
        let mailsent = await transporter.sendMail(email_obj);
        console.log('mailsent', mailsent);
        return mailsent;
    } catch (err) {
        console.log('err', err);
        throw new Error(err);
    }
}


module.exports = {
    sendMail: send
}