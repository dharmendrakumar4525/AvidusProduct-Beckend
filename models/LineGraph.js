/**
 * Line Graph Model
 * Schema for storing line graph data points for project progress visualization
 * 
 * This model stores data points that are used to generate line graphs
 * showing project progress over time
 * 
 * Fields:
 * - subTaskName: Name of the subtask
 * - subTaskId: ID of the subtask
 * - projectId: ID of the project
 * - value: Data point value for the graph
 * - date: Date of the data point
 * - createdAt: Timestamp when the data point was created
 */

const mongoose = require('mongoose');

const lineGraphSchema = new mongoose.Schema({
    companyIdf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "onboardingcompany",
        required: true
    },
    /**
     * SubTask Name
     * Name of the subtask
     * @type {String}
     */
    subTaskName: {
        type: String,
    },
    
    /**
     * SubTask ID
     * ID of the subtask
     * @type {String}
     */
    subTaskId: {
        type: String,
    },

    /**
     * Project ID
     * ID of the project
     * @type {String}
     */
    projectId: {
        type: String,
    },

    /**
     * Value
     * Data point value for the line graph
     * @type {Number}
     */
    value: {
        type: Number,
    },

    /**
     * Date
     * Date of the data point
     * @type {Date}
     */
    date: {
        type: Date
    },

    /**
     * Created At
     * Timestamp when the data point was created
     * @type {Date}
     * @default Date.now
     */
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('LineGraph', lineGraphSchema);