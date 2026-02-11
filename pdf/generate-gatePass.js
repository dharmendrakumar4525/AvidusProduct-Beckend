/**
 * Generate Gate Pass PDF
 * Generates a PDF document for material gate pass
 * 
 * @param {Object} requestedData - PDF generation data
 * @param {String} requestedData.template - Template name to use for PDF generation (required)
 * @param {Object} requestedData - Other data needed for PDF generation
 * 
 * @returns {Promise<Buffer>} PDF buffer
 */
const pdfObj = require('./index');

function generateGatePass(requestedData) {
    return new Promise(async (resolve, reject) => {
        try {
            // Validate template name
            if (!requestedData.template) {
                reject({
                    message: "Please provide template name"
                });
                return false;
            }
            
            // Validate template exists
            if (!pdfObj[requestedData.template]) {
                reject({
                    message: "Template not found"
                });
                return false;
            }

            // Prepare data for PDF generation
            let finalData = {
                requestedData: requestedData
            };
            
            // Generate PDF using the specified template
            let pdfBuffer = await pdfObj[requestedData.template].generateGatePass(finalData);
            resolve(pdfBuffer);

        } catch ($e) {
            reject($e);
        }
    });
}

module.exports = generateGatePass;