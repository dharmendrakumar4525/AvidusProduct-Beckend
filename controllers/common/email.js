/**
 * Email Controller
 * Handles email sending with PDF attachments
 * 
 * This controller generates PDFs from templates and sends them via email.
 * It's used for sending purchase orders, invoices, and other documents to vendors.
 * 
 * @module controllers/common/email
 */

const { responseMessage } = require("../../libs/responseMessages");
const pdfObj = require('../../pdf/index');
const Response = require("../../libs/response");
const { sendMail } = require("../../libs/mailer");

module.exports = {
    sendTemplateFn
};

/**
 * Send Template Email
 * Generates a PDF from a template and sends it via email
 * 
 * This function:
 * 1. Validates the template name
 * 2. Generates PDF from the template
 * 3. Sends email with PDF attachment
 * 4. Returns success response
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {String} req.body.template - Template name (required)
 * @param {String} req.body.langCode - Language code for response messages
 * @param {Object} req.body - Other template-specific data
 * 
 * @param {Object} res - Express response object
 * 
 * @returns {Promise<Object>} Success response with email sent confirmation
 * @throws {Error} If template name is missing or template not found
 */
async function sendTemplateFn(req, res) {

    try {

        let requestedData = req.body;

        if (!requestedData.template) {
            throw {
                message: "Please provide template name"
            }
        }
        if (!pdfObj[requestedData.template]) {
            throw {
                message: "Template not found"
            }
        }
     

        let finalData = {
            requestedData: requestedData,
            isMailData: true
        }

      
            let getPdfData = await pdfObj[requestedData.template].generatePdf(finalData);
                     
             sendMail({
                logo: getPdfData.companyLogo,
                to: getPdfData.to,
                subject: getPdfData.subject,
                template: requestedData.template,
                context: {
                    receiver_name: getPdfData.receiver_name,
                    sender_name: getPdfData.sender_name,
                    dataObj:getPdfData.dataObj
                },
                attachments: [
                    {
                        filename: getPdfData.fileName,
                        content: Buffer.from(getPdfData.pdfBuffer, 'utf-8')
                    }]
            })

       

        setTimeout(async () => {
            res.status(200).json(await Response.success({}, responseMessage(requestedData.langCode,'EMAIL_SENT'),req));
        }, 1000)


    } catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            },error,req)
        );
    }

}



