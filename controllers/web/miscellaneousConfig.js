/**
 * Miscellaneous Config Controller
 * Handles all operations related to Miscellaneous Configuration management including:
 * - Creating and updating configuration entries
 * - Configuration queries by type
 */

const miscellaneousConfig = require('../../models/MiscellaneousConfig');
const Response = require('../../libs/response');

// Export all controller functions
module.exports = {
    createData,
    updateData,
    getList,
    getDetails
};



/**
 * Create Miscellaneous Config
 * POST /api/web/miscellaneousConfig
 * Creates a new miscellaneous configuration entry
 * 
 * @param {String} req.body.type - Configuration type/key (required)
 * @param {String} req.body.value - Configuration value (required)
 * 
 * @returns {Object} Created configuration object
 */
async function createData(req, res) {
    try {
        let reqObj = req.body;

        // Create new miscellaneous config entry
        let miscellaneous = new miscellaneousConfig({
            type: reqObj.type,
            value: reqObj.value,
            companyIdf: req.user.companyIdf,
        });
        
        // Save to database
        data = await miscellaneous.save();
        if (!data) return res.send('data not created');

        res.send(data);
    } catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            }, error, req)
        );
    }
}
/**
 * Update Miscellaneous Config
 * PUT /api/web/miscellaneousConfig/:id
 * Updates an existing miscellaneous configuration entry
 * 
 * @param {String} req.params.id - Configuration ID (required)
 * @param {String} req.body.type - Updated configuration type/key (required)
 * @param {String} req.body.value - Updated configuration value (required)
 * 
 * @returns {Object} Updated configuration object
 */
async function updateData(req, res) {
    try {
        let { id } = req.params;
        let reqObj = req.body;

        // Update configuration and return updated document
        const miscellaneous = await miscellaneousConfig.findOneAndUpdate(
            { _id: id, companyIdf: req.user.companyIdf },
            { type: reqObj.type, value: reqObj.value },
            { new: true }
        );

        res.send(miscellaneous);
    } catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            }, error, req)
        );
    }
}
/**
 * Get Miscellaneous Config List
 * GET /api/web/miscellaneousConfig
 * Retrieves all miscellaneous configuration entries
 * 
 * @returns {Array} List of all configuration entries
 */
async function getList(req, res) {
    try {
        let reqObj = req.body;
        const miscellaneous = await miscellaneousConfig.find({ companyIdf: req.user.companyIdf });
        res.send(miscellaneous);
    } catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            }, error, req)
        );
    }
}

/**
 * Get Miscellaneous Config Details By Type
 * GET /api/web/miscellaneousConfig/:type
 * Retrieves a specific configuration entry by type
 * 
 * @param {String} req.params.type - Configuration type/key (required)
 * 
 * @returns {Object} Configuration details for the specified type
 */
async function getDetails(req, res) {
    try {
        let reqObj = req.params;  // Get request parameters

        // Find configuration by type
        const miscellaneous = await miscellaneousConfig.findOne({ type: reqObj.type, companyIdf: req.user.companyIdf });

        if (!miscellaneous) return res.status(404).send('No data found for this type');

        res.send(miscellaneous);
    } catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            }, error, req)
        );
    }
}



