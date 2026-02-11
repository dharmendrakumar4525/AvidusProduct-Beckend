/**
 * PDF Templates Index
 * Dynamically loads all PDF template modules from the templates directory
 * 
 * This module scans the pdf/templates directory and automatically loads
 * all template files, making them available through a single object.
 * 
 * Each template file should export functions for generating PDFs:
 * - generatePdf: Generic PDF generation
 * - generateDebit: Debit note PDF generation
 * - generateDMRInventory: DMR inventory PDF generation
 * - generateGatePass: Gate pass PDF generation
 * - issueSlipPdf: Issue slip PDF generation
 * - generateLocalPdf: Local PO PDF generation
 * - generatePRpdf: Purchase request PDF generation
 * - generateRcpdf: Rate comparative PDF generation
 * 
 * Usage:
 * const pdfObj = require('./pdf/index');
 * const pdfBuffer = await pdfObj['templateName'].generatePdf(data);
 */

const fs = require('fs');
const path = require('path');

/**
 * PDF Templates Object
 * Object containing all loaded PDF templates
 * @type {Object}
 */
const pdfObj = {};

// Read all files from the templates directory
fs.readdirSync(path.resolve('./pdf/templates')).forEach(file => {
  // Extract filename without extension (e.g., 'debitNote' from 'debitNote.js')
  let name = file.substr(0, file.indexOf('.'));
  
  // Load and store the template module
  pdfObj[name] = require(path.resolve(`./pdf/templates/${name}`));
});

module.exports = pdfObj;