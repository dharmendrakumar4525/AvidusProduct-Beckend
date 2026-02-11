/**
 * Master SubTask Model
 * Schema for storing master subtask templates
 * 
 * Master subtasks are template subtasks associated with master tasks
 * that can be used across multiple projects
 * 
 * Fields:
 * - subTaskName: Name of the master subtask (must be unique)
 * - taskId: ID of the parent master task
 * - createdAt: Timestamp when the master subtask was created
 */

const mongoose = require('mongoose');

const masterSubTaskSchema = new mongoose.Schema({
    /**
     * SubTask Name
     * Name of the master subtask (must be unique)
     * @type {String}
     * @required
     */
    subTaskName: {
        type: String,
        required: true
    },

    /**
     * Task ID
     * ID of the parent master task
     * @type {String}
     * @required
     */
    taskId: {
        type: String,
        required: true
    },

    /**
     * Created At
     * Timestamp when the master subtask was created
     * @type {Date}
     * @default Date.now
     */
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('MasterSubTask', masterSubTaskSchema);