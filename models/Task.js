/**
 * Task Model
 * Schema for storing project tasks
 * 
 * Tasks are associated with projects and can have multiple subtasks
 * 
 * Fields:
 * - taskName: Name of the task
 * - projectId: ID of the project this task belongs to
 * - taskId: Task identifier
 * - createdAt: Timestamp when the task was created
 */

const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    /**
     * Task Name
     * Name of the task
     * @type {String}
     * @required
     */
    taskName: {
        type: String,
        required: true
    },
    
    /**
     * Project ID
     * ID of the project this task belongs to
     * @type {String}
     * @required
     */
    projectId: {
        type: String,
        required: true
    },

    /**
     * Task ID
     * Task identifier
     * @type {String}
     * @required
     */
    taskId: {
        type: String,
        required: true
    },
    
    /**
     * Created At
     * Timestamp when the task was created
     * @type {Date}
     * @default Date.now
     */
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Task', taskSchema);