/**
 * Generic PDF Generator
 * Generates PDF documents using template-based generation
 * 
 * This is a generic PDF generator that can be used for various document types
 * (Purchase Orders, DMRs, Gate Passes, etc.) by specifying different templates
 */

const pdfObj = require('./index');

/**
 * Generate PDF
 * Creates a PDF document using the specified template
 * 
 * @param {Object} requestedData - Data for PDF generation
 * @param {String} requestedData.template - Template name to use for PDF generation (required)
 * @param {Object} requestedData - Other data to populate in the PDF template
 * 
 * @returns {Promise<Buffer>} PDF buffer that can be sent as response or saved
 * @throws {Error} If template name is missing or template not found
 */
function generatePDF(requestedData) {
    console.log("Generating PDF for template: ", requestedData);
    return new Promise(async (resolve, reject) => {
        try {
            // Validate template name is provided
            if (!requestedData.template) {
                console.log(requestedData);
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

            // Generate PDF buffer using the specified template's generatePdf method
            let pdfBuffer = await pdfObj[requestedData.template].generatePdf(finalData);
            resolve(pdfBuffer);

        } catch ($e) {
            reject($e);
        }
    });
}

// Export the PDF generation function
module.exports = generatePDF;