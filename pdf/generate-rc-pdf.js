/**
 * Rate Comparative PDF Generator
 * Generates PDF documents for rate comparative/rate approval documents
 * 
 * This module acts as a wrapper that:
 * 1. Validates template name
 * 2. Loads the appropriate PDF template
 * 3. Generates PDF buffer from template and data
 * 4. Returns PDF buffer for download, email, or S3 upload
 * 
 * Rate comparative PDFs show vendor-wise rate comparisons for items,
 * helping in vendor selection and rate approval decisions.
 */

const pdfObj = require("./index");

/**
 * Generate Rate Comparative PDF
 * Creates a PDF document for a rate comparative using the specified template
 * 
 * @param {Object} requestedData - Data for PDF generation
 * @param {String} requestedData.template - Template name to use for PDF generation (required)
 * @param {String} requestedData.id - Rate approval record ID
 * @param {Object} requestedData - Other data to populate in the PDF template
 * 
 * @returns {Promise<Buffer>} PDF buffer that can be sent as response or saved
 * @throws {Error} If template name is missing or template not found
 */
function generateRCPDF(requestedData) {
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

      // Generate PDF buffer using the rate comparative template
      let pdfBuffer = await pdfObj[requestedData.template].generateRcpdf(
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

module.exports = generateRCPDF;
