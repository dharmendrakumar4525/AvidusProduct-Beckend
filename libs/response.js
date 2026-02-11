/**
 * Response Utility Library
 * Provides standardized response formatting functions for API responses
 */

/**
 * Success Response Formatter
 * Formats a successful API response with data and message
 * 
 * @param {*} responseObj - The data to be returned in the response
 * @param {String} message - Success message (default: 'success')
 * @param {Object} request - Express request object (optional, currently unused)
 * @returns {Object} Formatted success response object
 */
function success(responseObj, message, request = '') {  
    let respData = {
        data: responseObj,
        message: message || 'success',
    };
    return respData;
}

/**
 * Error Response Formatter
 * Formats an error response with error details and message
 * 
 * @param {Object} errorObj - Error object (typically Mongoose validation errors)
 * @param {Object} fullError - Full error object with status code information
 * @param {Object} request - Express request object (optional, currently unused)
 * @returns {Object} Formatted error response object
 */
function errors(errorObj, fullError = '', request = '') {
    // Extract status code from various error formats
    let statusCode = '';
            
    // Check for axios-style error response
    if(fullError && fullError.response && fullError.response.status){
        statusCode = fullError.response.status;
    }

    // Check for error.code property
    if(fullError && fullError.code){
        statusCode = fullError.code;
    }

    // Check for error.statusCode property
    if(fullError && fullError.statusCode){
        statusCode = fullError.statusCode;
    }

    // Format Mongoose validation errors
    let msgError = {};
    if (errorObj.errors && Object.keys(errorObj.errors).length > 0) {
        for (let er in errorObj.errors) {
            // Extract error messages from Mongoose validation errors
            msgError[er] = [errorObj.errors[er].message];
        }
    }
    
    // Return formatted error response
    let respData = {
        errors: msgError,
        message: errorObj.message || 'Something went wrong.'
    };
    return respData;
}


/**
 * Paginated Response Formatter
 * Formats a paginated API response with data and pagination metadata
 * 
 * @param {Object} responseObj - Response object containing data and total count
 * @param {String} message - Success message (default: 'success')
 * @param {Object} paginationData - Pagination parameters (page, limit, offset)
 * @param {Object} request - Express request object (optional, currently unused)
 * @returns {Object} Formatted paginated response object
 */
function pagination(responseObj, message, paginationData, request = '') {
    console.log('responseObj', responseObj);
    
    // Extract total count from response object (typically from aggregation query)
    const total = responseObj[0]?.total || 0;

    // Handle case where limit is set to maximum (no pagination)
    if(paginationData.limit === Number.MAX_SAFE_INTEGER) {
        paginationData.limit = total;
    }
    
    // Calculate the last item index for current page
    let resultEnd = paginationData.offset === 0
        ? paginationData.limit
        : paginationData.offset + paginationData.limit;

    // Ensure resultEnd doesn't exceed total items
    if (resultEnd > total) {
        resultEnd = total;
    }

    // Prepare paginated response
    const respData = {
        message: message || 'success',
        data: responseObj?.data || [], // Ensure data is an array
        pagination: {
            total: total, // Total count of items across all pages
            per_page: paginationData.limit, // Number of items per page
            current_page: paginationData.page, // Current page number
            result_start: paginationData.offset === 0 ? 1 : paginationData.offset + 1, // First item index on current page
            result_end: resultEnd, // Last item index on current page
        },
    };

    return respData;
}


/**
 * Pagination Parameter Validator
 * Validates and normalizes pagination parameters from request
 * 
 * @param {Number|String} page - Page number (default: 1)
 * @param {Number|String} perPage - Items per page (default: MAX_SAFE_INTEGER for no limit)
 * @returns {Object} Normalized pagination object with page, limit, and offset
 */
function validationPagination(page, perPage) { 
    // Set default page to 1 if not provided
    if(!page){
        page = 1;
    }
    
    // Set default perPage to maximum if not provided (returns all items)
    if(!perPage){
        perPage = Number.MAX_SAFE_INTEGER;
    }
    
    // Convert to numbers
    page = Number(page);
    perPage = Number(perPage);

    // Calculate offset (number of items to skip)
    let offset = (page - 1) * perPage;

    return {
        page: page,
        limit: perPage,
        offset: offset
    };
}

/**
 * Clean Empty Values Utility
 * Removes properties with null, undefined, or falsy values from an object
 * Useful for cleaning request bodies before database operations
 * 
 * @param {Object} obj - Object to clean
 * @returns {Object} Object with empty values removed
 */
function cleanEmptyValues(obj) {
    for (var propName in obj) {
        // Remove properties that are null, undefined, or falsy (empty strings, 0, false)
        if (obj[propName] === null || obj[propName] === undefined || !obj[propName]) {
            delete obj[propName];
        }
    }
    return obj;
}


// Export all response utility functions
module.exports = {
    success,
    errors,
    pagination,
    validationPagination,
    cleanEmptyValues
};