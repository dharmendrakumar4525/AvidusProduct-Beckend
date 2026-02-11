/**
 * Local Purchase Order PDF Generator
 * Generates PDF documents for local purchase orders
 * 
 * This module acts as a wrapper that:
 * 1. Validates template name
 * 2. Loads the appropriate PDF template
 * 3. Generates PDF buffer from template and data
 * 4. Returns PDF buffer for download, email, or S3 upload
 * 
 * Local purchase orders are used for local purchases that don't require
 * the full approval workflow of regular purchase orders.
 */

const pdfObj = require('./index');

/**
 * Generate Local PO PDF
 * Creates a PDF document for a local purchase order using the specified template
 * 
 * @param {Object} requestedData - Data for PDF generation
 * @param {String} requestedData.template - Template name to use for PDF generation (required)
 * @param {String} requestedData.id - Local PO record ID
 * @param {Object} requestedData - Other data to populate in the PDF template
 * 
 * @returns {Promise<Buffer>} PDF buffer that can be sent as response or saved
 * @throws {Error} If template name is missing or template not found
 */
function generateLocalPDF(requestedData) {
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
            
            // Generate PDF buffer using the local PO template
            let pdfBuffer = await pdfObj[requestedData.template].generateLocalPdf(finalData);
            
            // Resolve with PDF buffer
            resolve(pdfBuffer);

        } catch ($e) {
            // Reject with error
            reject($e);
        }
    });
}

module.exports = generateLocalPDF; 