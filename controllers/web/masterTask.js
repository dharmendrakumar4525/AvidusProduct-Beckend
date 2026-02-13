/**
 * Master Task Controller
 * Handles all operations related to Master Task management including:
 * - Creating and updating master tasks
 * - Duplicate task name validation
 * - Activity logging
 * - Task-subtask aggregation queries
 */

const MasterTask = require('../../models/MasterTasks');
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
 * Get Master Task List
 * GET /api/web/masterTask
 * Retrieves all master tasks
 * 
 * @returns {Array} List of all master tasks
 */
async function getList(req, res) {
    try {
        const tasks = await MasterTask.find({ companyIdf: req.user.companyIdf });
        res.send(tasks);
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
 * Create Master Task
 * POST /api/web/masterTask
 * Creates a new master task with duplicate name validation
 * 
 * Validation:
 * - Task name must be unique
 * 
 * @param {String} req.body.taskName - Task name (required, must be unique)
 * 
 * @returns {Object} Created master task object
 */
async function createData(req, res) {
    try {
        // Check if task name already exists
        const mtaskExits = await MasterTask.findOne({ taskName: req.body.taskName, companyIdf: req.user.companyIdf });

        if (mtaskExits) return res.status(400).send({ status: 'faild', message: "this activity already exits" });

        // Create new master task
        let task = new MasterTask({
            companyIdf: req.user.companyIdf,
            taskName: req.body.taskName,
        });

        // Save task to database
        task = await task.save();

        if (!task) return res.send('task not created');

        // Log activity
        let recentActivity = new RecentActivity({
            companyIdf: req.user.companyIdf,
            description: `new activity ${task.taskName} created`
        });
        recentActivity = await recentActivity.save();

        res.send(task);
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
 * Update Master Task
 * PUT /api/web/masterTask/:id
 * Updates an existing master task with duplicate name validation
 * 
 * Validation:
 * - Task name must be unique (excluding current task)
 * 
 * @param {String} req.params.id - Master Task ID (required)
 * @param {String} req.body.taskName - Updated task name (required, must be unique)
 * 
 * @returns {Object} Updated master task object
 */
async function updateData(req, res) {
    try {
        // Check if task name already exists (excluding current task)
        const mtaskExits = await MasterTask.findOne({ taskName: req.body.taskName, companyIdf: req.user.companyIdf });

        if (mtaskExits) return res.status(400).send({ status: 'faild', message: "this activity already exits" });

        // Update master task
        const task = await MasterTask.findOneAndUpdate({ _id: req.params.id, companyIdf: req.user.companyIdf }, {
            taskName: req.body.taskName
        }, { new: true });
        
        if (!task) return res.send('task not updated');
        
        res.send(task);
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
 * Get Master Task Details
 * GET /api/web/masterTask/:id
 * Retrieves detailed information about a specific master task
 * 
 * @param {String} req.params.id - Master Task ID (required)
 * 
 * @returns {Object} Master task details
 */
async function getDetails(req, res) {
    try {
        const task = await MasterTask.findOne({ _id: req.params.id, companyIdf: req.user.companyIdf });

        if (!task) return res.send('no task exits');

        res.send(task);
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
 * Delete Multiple Master Tasks
 * DELETE /api/web/masterTask/deleteMany
 * Deletes multiple master tasks by their IDs
 * 
 * @param {Array} req.body.selUsers - Array of master task IDs to delete (required)
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
        
        // Delete multiple master tasks
        let deleteProductsResponse = await MasterTask.remove({ _id: { $in: kk }, companyIdf: req.user.companyIdf });

        if (!deleteProductsResponse) return res.send('role not deleted');

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
 * Get Master Task By ID with SubTasks
 * GET /api/web/masterTask/withSubtasks/:id
 * Retrieves a master task with its associated master subtasks
 * Uses MongoDB aggregation to join master tasks with master subtasks
 * 
 * @param {String} req.params.id - Master Task ID (required)
 * 
 * @returns {Object} Master task with populated subtasks array
 */
async function deleteById(req, res) {
    try {
        // Aggregate master task with its subtasks
        const task = await MasterTask.aggregate([
            { $match: { companyIdf: require('mongodb').ObjectID(req.user.companyIdf) } },
            // Convert _id to string for lookup
            { "$addFields": { "taskId": { "$toString": "$_id" }}},
            // Join with master subtasks collection
            { 
                $lookup: {
                    from: "mastersubtasks",
                    localField: "taskId",
                    foreignField: "taskId",
                    as: "result" // Array of master subtasks
                }
            }
        ]);

        if (!task) return res.send('no task exits');

        res.send(task);
    } catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            }, error, req)
        );
    }
}


