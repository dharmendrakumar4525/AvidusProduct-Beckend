/**
 * PDF Header Template
 * Generates header HTML for PDF documents
 * 
 * This module provides a reusable header component that can be included
 * in various PDF templates. Currently returns a placeholder header.
 * 
 * @module pdf/templates/Header
 */

const env = require("../../config/env");

/**
 * Generate Header Data
 * Creates HTML content for PDF document header
 * 
 * @param {Object} companySettings - Company settings/configuration
 * @returns {Promise<String>} HTML string for the header
 */
async function HeaderData(companySettings) {
  // TODO: Implement actual header with company logo, name, address, etc.
  return `
   <div style='margin-top:400px, padding-top:400px, height:200px'>
                  abcdef
                </div>
    `;
}

module.exports = {
  HeaderData
};