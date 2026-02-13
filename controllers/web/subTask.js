/**
 * SubTask Controller
 * Handles all operations related to SubTask management including:
 * - Creating and updating subtasks
 * - Daily cumulative total updates
 * - Progress tracking with line graphs
 * - Activity logging
 * - Remark management
 */

const SubTask = require('../../models/SubTask');
const RecentActivity = require('../../models/recentActivity');
const LineGraph = require('../../models/LineGraph');
const Response = require('../../libs/response');

// Export all controller functions
module.exports = {
    getList,
    getDataByID,
    getActivitesDataByID,
    createData,
    updateData,
    deleteData,
    deleteManyData,
    updatedailyTotalUpdateData,
    TotalUpdateData,
    remarkUpdateData,
    updateRemarkData
};

/**
 * Get SubTask List
 * GET /api/web/subTask
 * Retrieves all subtasks
 * 
 * @returns {Array} List of all subtasks
 */
async function getList(req, res) {
    try {
        const subTasks = await SubTask.find({ companyIdf: req.user.companyIdf });
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
 * Get SubTask Details
 * GET /api/web/subTask/:id
 * Retrieves detailed information about a specific subtask
 * 
 * @param {String} req.params.id - SubTask ID (required)
 * 
 * @returns {Object} SubTask details
 */
async function getDataByID(req, res) {
    try {
        const subTask = await SubTask.findOne({ _id: req.params.id, companyIdf: req.user.companyIdf });

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
 * Get Activities Data By Project ID
 * GET /api/web/subTask/project/:id
 * Retrieves all subtasks for a specific project
 * 
 * @param {String} req.params.id - Project ID (required)
 * 
 * @returns {Array} Array of subtasks for the project
 */
async function getActivitesDataByID(req, res) {
    try {
        const subTasks = await SubTask.find({ projectId: req.params.id, companyIdf: req.user.companyIdf });
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
 * Create SubTask
 * POST /api/web/subTask
 * Creates a new subtask
 * 
 * @param {Object} req.body - SubTask data
 * 
 * @returns {Object} Created subtask object
 */
async function createData(req, res) {
    try {
        // Create new subtask instance
        let subTask = new SubTask({
            // SubTask fields from req.body
        });

        // Save subtask to database
        subTask = await subTask.save();

        if (!subTask) return res.send('project not created');

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
 * Update SubTask
 * PUT /api/web/subTask/:id
 * Updates an existing subtask with progress tracking data and logs activity
 * 
 * Updates include:
 * - Revised dates and working days
 * - Baseline dates and working days
 * - Milestone dates (R1, R2, R3)
 * - Daily asking rates
 * - UOM and total quantities
 * 
 * @param {String} req.params.id - SubTask ID (required)
 * @param {Object} req.body - SubTask fields to update
 * 
 * @returns {Object} Updated subtask object
 */
async function updateData(req, res) {
    try {
        // Update subtask with progress data
        const subTask = await SubTask.findOneAndUpdate({ _id: req.params.id, companyIdf: req.user.companyIdf }, {
            addRevisesDates: req.body.addRevisesDates,
            actualRevisedStartDate: req.body.actualRevisedStartDate,
            workingDaysRevised: req.body.workingDaysRevised,
            baseLineStartDate: req.body.baseLineStartDate,
            baseLineEndDate: req.body.baseLineEndDate,
            baseLineWorkingDays: req.body.baseLineWorkingDays,
            uom: req.body.uom,
            total: req.body.total,
            r1EndDate: req.body.r1EndDate,
            r2EndDate: req.body.r2EndDate,
            r3EndDate: req.body.r3EndDate,
            noofDaysBalanceasperrevisedEnddate: req.body.noofDaysBalanceasperrevisedEnddate,
            dailyAskingRateasperRevisedEndDate: req.body.dailyAskingRateasperRevisedEndDate,
            noofDaysBalanceasperbaseLine: req.body.noofDaysBalanceasperbaseLine,
            dailyAskingRateasperbaseLine: req.body.dailyAskingRateasperbaseLine
        }, { new: true });

        if (!subTask) return res.send('subtask not updated');

        // Log activity
        let recentActivity = new RecentActivity({
            description: `${subTask.subTaskName} sub activity progress sheet updated`
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
 * Update Daily Total Update Data
 * PUT /api/web/subTask/dailyTotal/:id
 * Updates the daily cumulative total for a subtask and creates a line graph entry
 * 
 * This function:
 * - Adds the new cumulative value to the existing total
 * - Creates a line graph entry for progress tracking
 * - Logs the activity
 * 
 * @param {String} req.params.id - SubTask ID (required)
 * @param {Number} req.body.cumTotal - Cumulative total value to add (required)
 * @param {Date} req.body.addedDate - Date of the update (required)
 * @param {String} req.body.dateStr - Date string representation (required)
 * @param {String} req.body.projectId - Project ID (required)
 * @param {String} req.body._id - SubTask ID (required)
 * 
 * @returns {Object} Updated subtask object
 */
async function updatedailyTotalUpdateData(req, res) {
    try {
        // Get existing subtask record
        const record = await SubTask.findOne({ _id: req.params.id, companyIdf: req.user.companyIdf });

        if (!record) return res.send('no subTask exits');

        // Calculate new cumulative total (add to existing)
        let totalUpdate = Number(record.dailyCumulativeTotal) + Number(req.body.cumTotal);

        // Update subtask with new cumulative total
        const subTask = await SubTask.findOneAndUpdate({ _id: req.params.id, companyIdf: req.user.companyIdf }, {
            dailyCumulativeTotal: totalUpdate,
            previousValue: Number(req.body.cumTotal),
            totalDate: req.body.addedDate,
            dateStr: req.body.dateStr
        }, { new: true });

        // Create line graph entry for progress visualization
        let lineGraph = new LineGraph({
            companyIdf: req.user.companyIdf,
            value: Number(req.body.cumTotal),
            date: req.body.addedDate,
            projectId: req.body.projectId,
            subTaskId: req.body._id
        });
        lineGraph = await lineGraph.save();

        // Log activity
        let recentActivity = new RecentActivity({
            description: `${subTask.subTaskName} sub activity cumulative total value updated`
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
 * Total Update Data
 * PUT /api/web/subTask/total/:id
 * Updates the cumulative total by replacing the previous value
 * 
 * This function:
 * - Replaces the previous value with a new value (not adding)
 * - Updates the corresponding line graph entry for the same date
 * 
 * @param {String} req.params.id - SubTask ID (required)
 * @param {Number} req.body.cumTotal - New cumulative total value (required)
 * @param {Date} req.body.addedDate - Date of the update (required)
 * @param {String} req.body.dateStr - Date string representation (required)
 * @param {String} req.body._id - SubTask ID (required)
 * 
 * @returns {Object} Updated subtask object
 */
async function TotalUpdateData(req, res) {
    try {
        // Get existing subtask record
        const record = await SubTask.findOne({ _id: req.params.id, companyIdf: req.user.companyIdf });

        if (!record) return res.send('no subTask exits');

        // Calculate new total: remove previous value and add new value
        let totalUpdate = (Number(record.dailyCumulativeTotal) - Number(record.previousValue)) + Number(req.body.cumTotal);

        // Update subtask with new cumulative total
        const subTask = await SubTask.findOneAndUpdate({ _id: req.params.id, companyIdf: req.user.companyIdf }, {
            dailyCumulativeTotal: totalUpdate,
            previousValue: Number(req.body.cumTotal),
            totalDate: req.body.addedDate,
            dateStr: req.body.dateStr
        }, { new: true });
        
        // Update existing line graph entry for the same date
        let lineRecord = await LineGraph.findOneAndUpdate(
            { subTaskId: req.body._id, "date": new Date(req.body.addedDate) },
            {
                value: Number(req.body.cumTotal),
            },
            { new: true }
        );

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
 * Remark Update Data
 * PUT /api/web/subTask/remark/:id
 * Updates remarks for a subtask
 * 
 * @param {String} req.params.id - SubTask ID (required)
 * @param {String} req.body.remarks - Remarks text (required)
 * 
 * @returns {Object} Updated subtask object
 */
async function remarkUpdateData(req, res) {
    try {
        // Update subtask remarks
        const subTask = await SubTask.findOneAndUpdate({ _id: req.params.id, companyIdf: req.user.companyIdf }, {
            remarks: req.body.remarks,
        }, { new: true });

        if (!subTask) return res.send('subtask not updated');

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
 * Update Remark Data
 * PUT /api/web/subTask/updateRemark/:id
 * Updates remarks for a subtask (alternative endpoint)
 * 
 * @param {String} req.params.id - SubTask ID (required)
 * @param {String} req.body.remarks - Remarks text (required)
 * 
 * @returns {Object} Updated subtask object
 */
async function updateRemarkData(req, res) {
    try {
        // Check if subtask exists
        const record = await SubTask.findOne({ _id: req.params.id, companyIdf: req.user.companyIdf });
        if (!record) return res.send('no subTask exits');
        
        // Update subtask remarks
        const subTask = await SubTask.findOneAndUpdate({ _id: req.params.id, companyIdf: req.user.companyIdf }, {
            remarks: req.body.remarks
        }, { new: true });
        
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
 * Delete SubTask
 * DELETE /api/web/subTask/:id
 * Deletes a subtask and its associated line graph entries
 * 
 * @param {String} req.params.id - SubTask ID (required)
 * 
 * @returns {Object} Deleted subtask object
 */
async function deleteData(req, res) {
    try {
        // Delete subtask
        const subTask = await SubTask.findOneAndRemove({ _id: req.params.id, companyIdf: req.user.companyIdf });

        if (!subTask) return res.send('subTask not deleted');

        // Delete associated line graph entries
        const lineDelete = await LineGraph.deleteMany({ "subTaskId": req.params.id });

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
 * Delete Many SubTasks
 * DELETE /api/web/subTask/deleteMany
 * Deletes multiple subtasks by task name
 * 
 * @param {String} req.body.name - Task name to match subtasks for deletion (required)
 * 
 * @returns {Object} Deletion result
 */
async function deleteManyData(req, res) {
    try {
        // Delete all subtasks matching the task name
        const subTask = await SubTask.deleteMany({ "taskName": req.body.name, companyIdf: req.user.companyIdf });

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



