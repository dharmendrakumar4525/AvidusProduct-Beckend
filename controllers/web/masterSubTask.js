/**
 * Master SubTask Controller
 * Handles all operations related to Master SubTask management including:
 * - Creating and updating master subtasks
 * - Duplicate subtask name validation
 * - Activity logging
 * - Master task association
 */

const MasterSubTask = require('../../models/MasterSubTasks');
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
    deleteDetails,
    deleteById
};

/**
 * Get Master SubTask List
 * GET /api/web/masterSubTask
 * Retrieves all master subtasks
 * 
 * @returns {Array} List of all master subtasks
 */
async function getList(req, res) {
    try {
        const subTasks = await MasterSubTask.find({ companyIdf: req.user.companyIdf });
        res.send(subTasks);
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
 * Create Master SubTask
 * POST /api/web/masterSubTask
 * Creates a new master subtask with duplicate name validation
 * 
 * Validation:
 * - SubTask name must be unique
 * 
 * @param {String} req.body.subTaskName - SubTask name (required, must be unique)
 * @param {String} req.body.taskId - Master Task ID (required)
 * 
 * @returns {Object} Created master subtask object
 */
async function createData(req, res) {
    try {
        // Check if subtask name already exists
        const mstaskExits = await MasterSubTask.findOne({ subTaskName: req.body.subTaskName, companyIdf: req.user.companyIdf });

        if (mstaskExits) return res.status(400).send({ status: 'faild', message: "this sub activity already exits" });

        // Create new master subtask
        let subTask = new MasterSubTask({
            companyIdf: req.user.companyIdf,
            subTaskName: req.body.subTaskName,
            taskId: req.body.taskId,
        });

        // Save subtask to database
        subTask = await subTask.save();

        if (!subTask) return res.send('subtask not created');

        // Log activity
        let recentActivity = new RecentActivity({
            companyIdf: req.user.companyIdf,
            description: `new sub activity ${subTask.subTaskName} created`
        });
        recentActivity = await recentActivity.save();

        res.send(subTask);
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
 * Update Master SubTask
 * PUT /api/web/masterSubTask/:id
 * Updates an existing master subtask with duplicate name validation
 * 
 * Validation:
 * - SubTask name must be unique (excluding current subtask)
 * 
 * @param {String} req.params.id - Master SubTask ID (required)
 * @param {String} req.body.subTaskName - Updated subtask name (required, must be unique)
 * @param {String} req.body.taskId - Master Task ID (required)
 * 
 * @returns {Object} Updated master subtask object
 */
async function updateData(req, res) {
    try {
        // Check if subtask name already exists (excluding current subtask)
        const mstaskExits = await MasterSubTask.findOne({ subTaskName: req.body.subTaskName, companyIdf: req.user.companyIdf });

        if (mstaskExits) return res.status(400).send({ status: 'faild', message: "this sub activity already exits" });
        
        // Update master subtask
        const subTask = await MasterSubTask.findOneAndUpdate({ _id: req.params.id, companyIdf: req.user.companyIdf }, {
            subTaskName: req.body.subTaskName,
            taskId: req.body.taskId,
        }, { new: true });

        if (!subTask) return res.send('subTask not updated');

        res.send(subTask);
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
 * Get Master SubTask Details
 * GET /api/web/masterSubTask/:id
 * Retrieves detailed information about a specific master subtask
 * 
 * @param {String} req.params.id - Master SubTask ID (required)
 * 
 * @returns {Object} Master subtask details
 */
async function getDetails(req, res) {
    try {
        const subTask = await MasterSubTask.findOne({ _id: req.params.id, companyIdf: req.user.companyIdf });

        if (!subTask) return res.send('no subTask exits');

        res.send(subTask);
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
 * Delete Multiple Master SubTasks
 * DELETE /api/web/masterSubTask/deleteMany
 * Deletes multiple master subtasks by their IDs
 * 
 * @param {Array} req.body.selUsers - Array of master subtask IDs to delete (required)
 * 
 * @returns {Object} Deletion result
 */
async function deleteDetails(req, res) {
    try {
        // Convert string IDs to ObjectIds
        let kk = [];
        for (let single of req.body.selUsers) {
            kk.push(new ObjectId(single));
        }
        
        // Delete multiple master subtasks
        let deleteProductsResponse = await MasterSubTask.remove({ _id: { $in: kk }, companyIdf: req.user.companyIdf });

        if (!deleteProductsResponse) return res.send('subTask not deleted');

        res.send(deleteProductsResponse);
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
 * Delete Master SubTask By ID
 * DELETE /api/web/masterSubTask/:id
 * Deletes a master subtask by ID
 * 
 * @param {String} req.params.id - Master SubTask ID (required)
 * 
 * @returns {Object} Deleted master subtask object
 */
async function deleteById(req, res) {
    try {
        // Delete master subtask
        const subTask = await MasterSubTask.findOneAndRemove({ _id: req.params.id, companyIdf: req.user.companyIdf });

        if (!subTask) return res.send('subTask not deleted');

        res.send(subTask);
    } catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            }, error, req)
        );
    }
}


