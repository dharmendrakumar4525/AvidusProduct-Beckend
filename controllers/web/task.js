/**
 * Task Controller
 * Handles all operations related to Task management including:
 * - Creating and updating tasks
 * - Task queries with project filtering
 * - Task-subtask aggregation
 */

const Task = require('../../models/Task');
const Response = require('../../libs/response');

// Export all controller functions
module.exports = {
    getList,
    getDataByID,
    createData,
    updateData,
    deleteData,
    getTasksListData
};

/**
 * Get Task List
 * GET /api/web/task
 * Retrieves all tasks
 * 
 * @returns {Array} List of all tasks
 */
async function getList(req, res) {
    try {
        const tasks = await Task.find({ companyIdf: req.user.companyIdf });
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
 * Get Task Details
 * GET /api/web/task/:id
 * Retrieves detailed information about a specific task
 * 
 * @param {String} req.params.id - Task ID (required)
 * 
 * @returns {Object} Task details
 */
async function getDataByID(req, res) {
    try {
        const task = await Task.findOne({ _id: req.params.id, companyIdf: req.user.companyIdf });

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
 * Create Task
 * POST /api/web/task
 * Creates a new task associated with a project
 * 
 * @param {String} req.body.taskName - Task name (required)
 * @param {Date} req.body.startDate - Task start date (optional)
 * @param {Date} req.body.endDate - Task end date (optional)
 * @param {String} req.body.projectId - Project ID (required)
 * 
 * @returns {Object} Created task object
 */
async function createData(req, res) {
    try {
        // Create new task instance
        let task = new Task({
            companyIdf: req.user.companyIdf,
            taskName: req.body.taskName,
            startDate: req.body.startDate,
            endDate: req.body.endDate,
            projectId: req.body.projectId,
        });

        // Save task to database
        task = await task.save();

        if (!task) return res.send('task not created');

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
 * Update Task
 * PUT /api/web/task/:id
 * Updates an existing task
 * 
 * @param {String} req.params.id - Task ID (required)
 * @param {String} req.body.taskName - Updated task name (required)
 * 
 * @returns {Object} Updated task object
 */
async function updateData(req, res) {
    try {
        // Update task and return updated document
        const task = await Task.findOneAndUpdate({ _id: req.params.id, companyIdf: req.user.companyIdf }, {
            taskName: req.body.taskName,
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
 * Delete Task
 * DELETE /api/web/task/:id
 * Deletes a task by ID
 * 
 * @param {String} req.params.id - Task ID (required)
 * 
 * @returns {Object} Deleted task object
 */
async function deleteData(req, res) {
    try {
        const task = await Task.findOneAndRemove({ _id: req.params.id, companyIdf: req.user.companyIdf });

        if (!task) return res.send('task not deleted');

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
 * Get Tasks List Data by Project
 * GET /api/web/task/project/:id
 * Retrieves all tasks for a specific project with their associated subtasks
 * Uses MongoDB aggregation to join tasks with subtasks
 * 
 * @param {String} req.params.id - Project ID (required)
 * 
 * @returns {Array} Array of tasks with populated subtasks
 */
async function getTasksListData(req, res) {
    try {
        // Aggregate tasks with their subtasks for a specific project
        const task = await Task.aggregate([
            {
                $match: {
                    companyIdf: require('mongodb').ObjectID(req.user.companyIdf),
                    projectId: req.params.id
                }
            },
            {
                // Join with subtasks collection
                $lookup: {
                    from: "subtasks",
                    localField: "taskId",
                    foreignField: "taskId",
                    as: "result" // Array of subtasks
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
