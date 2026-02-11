/**
 * Debit Note PDF Generator
 * Generates PDF documents for debit notes using template-based generation
 * 
 * This module acts as a wrapper that:
 * 1. Validates template name
 * 2. Loads the appropriate PDF template
 * 3. Generates PDF buffer from template and data
 * 4. Returns PDF buffer for download, email, or S3 upload
 */

const pdfObj = require('./index');

/**
 * Generate Debit Note PDF
 * Creates a PDF document for a debit note using the specified template
 * 
 * @param {Object} requestedData - Data for PDF generation
 * @param {String} requestedData.template - Template name to use for PDF generation (required)
 * @param {Object} requestedData - Other data to populate in the PDF template
 * 
 * @returns {Promise<Buffer>} PDF buffer that can be sent as response or saved
 * @throws {Error} If template name is missing or template not found
 */
function generateDebitNote(requestedData) {
    return new Promise(async (resolve, reject) => {
        try {
            // Validate template name is provided
            if (!requestedData.template) {
                reject({
                    message: "Please provide template name"
                });
                return false;
            }
            
            // Validate template exists in PDF templates object
            if (!pdfObj[requestedData.template]) {
                reject({
                    message: "Template not found"
                });
                return false;
            }

            // Prepare data object for template
            let finalData = {
                requestedData: requestedData
            };

            // Generate PDF buffer using the specified template
            let pdfBuffer = await pdfObj[requestedData.template].generateDebit(finalData);
            
            // Resolve with PDF buffer
            resolve(pdfBuffer);

        } catch ($e) {
            // Reject with error
            reject($e);
        }
    });
}

// Export the PDF generation function
module.exports = generateDebitNote;