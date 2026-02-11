/**
 * Purchase Request PDF Generator
 * Generates PDF documents for purchase requests
 * 
 * This module acts as a wrapper that:
 * 1. Validates template name
 * 2. Loads the appropriate PDF template
 * 3. Generates PDF buffer from template and data
 * 4. Returns PDF buffer for download, email, or S3 upload
 * 
 * Purchase request PDFs document the items requested, quantities,
 * specifications, and approval status.
 */

const pdfObj = require("./index");

/**
 * Generate Purchase Request PDF
 * Creates a PDF document for a purchase request using the specified template
 * 
 * @param {Object} requestedData - Data for PDF generation
 * @param {String} requestedData.template - Template name to use for PDF generation (required)
 * @param {String} requestedData.id - Purchase request record ID
 * @param {Object} requestedData - Other data to populate in the PDF template
 * 
 * @returns {Promise<Buffer>} PDF buffer that can be sent as response or saved
 * @throws {Error} If template name is missing or template not found
 */
function generatePRPDF(requestedData) {
  return new Promise(async (resolve, reject) => {
    try {
      // Validate template name is provided
      if (!requestedData.template) {
        reject({
          message: "Please provide template name",
        });
        return false;
      }
      
      // Validate template exists in PDF templates object
      if (!pdfObj[requestedData.template]) {
        reject({
          message: "Template not found",
        });
        return false;
      }
      
      // Prepare data object for template
      let finalData = {
        requestedData: requestedData,
      };

      // Generate PDF buffer using the purchase request template
      let pdfBuffer = await pdfObj[requestedData.template].generatePRpdf(
        finalData
      );
      
      // Resolve with PDF buffer
      resolve(pdfBuffer);
    } catch ($e) {
      // Reject with error
      reject($e);
    }
  });
}

module.exports = generatePRPDF;
