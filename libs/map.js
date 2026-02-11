/**
 * Map Utility Library
 * Utility functions for data formatting and transformation
 * 
 * Provides functions for:
 * - Currency formatting with thousand separators
 * - Date formatting to IST timezone
 */

const env = require("../config/env");

const moment = require("moment");

/**
 * Convert Currency
 * Formats a number as currency with thousand separators and decimal places
 * 
 * Handles negative numbers by adding minus sign prefix.
 * Uses Indian number formatting (comma for thousands, dot for decimals).
 * 
 * @param {Number|String} item - Amount to format
 * @returns {String} Formatted currency string (e.g., "1,23,456.78" or "-1,23,456.78")
 * 
 * @example
 * convertCurrency(123456.789) // Returns "1,23,456.79"
 * convertCurrency(-5000) // Returns "-5,000.00"
 */
function convertCurrency(item) {

    let amount = (item) ? Number(item) : 0;

        let decimalSeperator = '.';
        let thousandseperator = ',';
        let decimalPlaces = 2;
       

        let isMinus = false;
        if (Number(amount) < 0) {
            isMinus = true;
            amount = Number(Math.abs(amount));
        }

        amount = Number(amount);
        amount = (Math.round(amount * 100) / 100).toFixed(decimalPlaces);
        amount = thousandsSeparators(amount.toString(), thousandseperator);
        amount = amount.replace(/\./g, decimalSeperator);

       

            Math.abs(30);

            if (isMinus) {
                amount = `-${amount}`;
            } else {
                amount = `${amount}`;
            }

        

        return amount;
    

}
/**
 * Thousands Separators
 * Adds thousand separators to a number string
 * 
 * Uses Indian numbering system (groups of 2 digits after the first 3).
 * Example: 1234567 becomes "12,34,567"
 * 
 * @param {String|Number} num - Number to format
 * @param {String} separator - Separator character (default: ",")
 * @returns {String} Formatted number string with separators
 * 
 * @example
 * thousandsSeparators("1234567", ",") // Returns "12,34,567"
 * thousandsSeparators("1234.56", ",") // Returns "1,234.56"
 */
function thousandsSeparators(num, separator) {
  let [integerPart, decimalPart] = num.toString().split('.');
  let lastThree = integerPart.slice(-3);
  let otherNumbers = integerPart.slice(0, -3);
  if (otherNumbers !== '') {
    lastThree = separator + lastThree;
  }
  let formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, separator) + lastThree;
  return decimalPart ? formatted + '.' + decimalPart : formatted;
}



/**
 * Format Date
 * Formats a date to DD-MM-YYYY format in IST (Indian Standard Time)
 * 
 * Converts the input date to IST (UTC + 5:30) and formats it as DD-MM-YYYY.
 * Handles both Date objects and date strings.
 * 
 * @param {Date|String} dateTime - Date to format (Date object or ISO string)
 * @returns {String|null} Formatted date string in DD-MM-YYYY format, or null if invalid
 * 
 * @example
 * formatDate(new Date('2024-01-15')) // Returns "15-01-2024"
 * formatDate('2024-12-25T10:30:00Z') // Returns "25-12-2024"
 */
function formatDate(dateTime) {
    // Check if dateTime is valid
    if (!dateTime || (typeof dateTime !== 'string' && !(dateTime instanceof Date))) {
      console.error("Invalid date provided. Expected a string or a Date object.");
      return null;
    }
  
    // Convert to Date object
    const date = new Date(dateTime);
  
    // Convert the date to IST (UTC + 5:30)
    const offsetIST = 5.5 * 60; // IST offset in minutes
    const istDate = new Date(date.getTime() + offsetIST * 60 * 1000);
  
    // Extract day, month, and year in IST
    const day = String(istDate.getUTCDate()).padStart(2, '0');
    const month = String(istDate.getUTCMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    const year = istDate.getUTCFullYear();
  
    // Format the date in DD-MM-YYYY
    return `${day}-${month}-${year}`;
  }
  

  
  
  
  
module.exports = {
    convertCurrency: convertCurrency,
    formatDate: formatDate
}