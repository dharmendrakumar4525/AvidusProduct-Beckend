/**
 * Master Task Model
 * Schema for storing master task templates
 * 
 * Master tasks are template tasks that can be used across multiple projects
 * 
 * Fields:
 * - taskName: Name of the master task (must be unique)
 * - createdAt: Timestamp when the master task was created
 */

const mongoose = require('mongoose');

const masterTaskSchema = new mongoose.Schema({
    /**
     * Task Name
     * Name of the master task (must be unique)
     * @type {String}
     * @required
     */
    taskName: {
        type: String,
        required: true
    },

    /**
     * Created At
     * Timestamp when the master task was created
     * @type {Date}
     * @default Date.now
     */
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('MasterTask', masterTaskSchema);