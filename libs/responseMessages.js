/**
 * Response Messages Library
 * Provides localized response messages for API responses
 * 
 * This module contains:
 * - Predefined message codes for common scenarios
 * - Function to retrieve messages by language and code
 * - Support for dynamic value replacement in messages
 */

/**
 * Response Code Dictionary
 * Contains message codes organized by language
 * Currently supports English (en), can be extended for other languages
 */
const responseCode = {
    en: {
        "RECORD_CREATED": "Record has been created successfully",
        "RECORD_UPDATED": "Record has been updated successfully",
        "RECORD_DELETED": "Record has been deleted successfully",
        "EMPLOYEE_CODE_EXISTS": "Duplicate Employee Code",
        "SUCCESS": "Success",
        "SOMETHING_WRONG": "Something went wrong.",
        "ID_MISSING": "Id is missing",
        "NO_RECORD_FOUND": "No record found",
        "USER_NOT_FOUND": "User not found",
        "TOKEN_IS_EXPIRED": "Token is expired, Please try to login again",
        "TOKEN_VERIFICATON_FAILED": "Token Verificaton failed",
        "INACTIVE_ACCOUNT": "Inactive account",
        "INVALID_TOKEN": "Invalid token",
        "VENDOR_NOT_EXISTS": "Please add vendors",
        "PAN_ALREADY_EXISTS": "PAN Already Exists",
        "PAN_AND_GST_DUPLICATE": "PAN & GST Both already Exists",
        "GST_ALREADY_EXISTS": "GST Already Exists",
        "DUPLICATE_VENDORS_FOUND": "duplicate vendors found",
        "VENDORS_IMPORTED": "all the vendors imported",
        "FILE_NOT_FOUND": "file not found",
        "GST_IS_EMPTY": "gst is empty"
    }
};



/**
 * Get Response Message
 * Retrieves a localized response message by language and message code
 * Supports dynamic value replacement in messages
 * 
 * @param {String} lang - Language code (default: 'en')
 * @param {String} type - Message code/key (e.g., 'RECORD_CREATED', 'SUCCESS')
 * @param {String} value - Dynamic value to replace {DYNAMIC_VALUE} placeholder (optional)
 * 
 * @returns {String} Localized message string
 */
function responseMessage(lang, type, value = "") {
    try {
        // Default to English if language not provided
        if (!lang) {
            lang = 'en';
        }

        // Get message from dictionary, fallback to SUCCESS if not found
        let message = (responseCode[lang] && responseCode[lang][type])
            ? responseCode[lang][type]
            : "";
        message = message ? message : responseCode[lang]['SUCCESS'];
        
        // Replace dynamic value placeholder if value is provided
        message = (value) ? message.replace("{DYNAMIC_VALUE}", value) : message;
        return message;
    } catch (error) {
        // Fallback to SUCCESS message on error
        let message = (responseCode[lang] && responseCode[lang][type])
            ? responseCode[lang]['SUCCESS']
            : "";
        return message;
    }
}



module.exports = {
    responseMessage,
    responseCode
}
