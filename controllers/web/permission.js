/**
 * Permission Controller
 * Handles all operations related to Permission management including:
 * - Creating and updating permissions
 * - Permission queries
 */

const Permission = require('../../models/Permission');
const RecentActivity = require('../../models/recentActivity');
const mongoose = require('mongoose');
const Response = require('../../libs/response');
const ObjectId = mongoose.Types.ObjectId;

// Export all controller functions
module.exports = {
    getList,
    createData,
    updateData,
    getDetails,
    deleteById
};

/**
 * Get Permission List
 * GET /api/web/permission
 * Retrieves all permissions
 * 
 * @returns {Array} List of all permissions
 */
async function getList(req, res) {
    try {
        const permissions = await Permission.find();
        res.send(permissions);
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
 * Get Permission Details
 * GET /api/web/permission/:id
 * Retrieves detailed information about a specific permission
 * 
 * @param {String} req.params.id - Permission ID (required)
 * 
 * @returns {Object} Permission details
 */
async function getDetails(req, res) {
    try {
        const permission = await Permission.findById(req.params.id);
        if (!permission) return res.send('no permission exits');
        res.send(permission);
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
 * Create Permission
 * POST /api/web/permission
 * Creates a new permission
 * 
 * @param {String} req.body.permission - Permission name (required)
 * 
 * @returns {Object} Created permission object
 */
async function createData(req, res) {
    try {
        // Create new permission
        let permission = new Permission({
            permission: req.body.permission,
        });
        
        // Save permission to database
        permission = await permission.save();
        if (!permission) return res.send('permission not created');
        
        res.send(permission);
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
 * Update Permission
 * PUT /api/web/permission/:id
 * Updates an existing permission
 * 
 * @param {String} req.params.id - Permission ID (required)
 * @param {String} req.body.permission - Updated permission name (required)
 * 
 * @returns {Object} Updated permission object
 */
async function updateData(req, res) {
    try {
        // Update permission and return updated document
        const permission = await Permission.findByIdAndUpdate(req.params.id, {
            permission: req.body.permission,
        }, { new: true });
        
        if (!permission) return res.send('permission not updated');
        
        res.send(permission);
    } catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            }, error, req)
        );
    }
}



async function deleteById(req, res) {
    try {
        const permission = await Permission.findByIdAndRemove(req.params.id)

        if(!permission) return res.send('permission not deleted')
     
        res.send(permission)
    }
    catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            }, error, req)
        );

    }
}




