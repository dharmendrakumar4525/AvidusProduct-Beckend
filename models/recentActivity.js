/**
 * Recent Activity Model
 * Schema for storing recent activity logs
 * 
 * This model tracks various activities performed in the system for audit and history purposes
 * 
 * Fields:
 * - activity: Activity name/type
 * - description: Detailed description of the activity
 * - createdBy: User who performed the activity
 * - createdAt: Timestamp when activity was logged
 */

const mongoose = require('mongoose');

const recentActivitySchema = new mongoose.Schema({
    companyIdf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "onboardingcompany",
        required: true
    },
    /**
     * Activity
     * Activity name/type
     * @type {String}
     */
    activity: {
        type: String,
    },

    /**
     * Description
     * Detailed description of the activity
     * @type {String}
     * @required
     */
    description: {
        type: String,
        required: true
    },

    /**
     * Created By
     * User who performed the activity
     * @type {String}
     */
    createdBy: {
        type: String,
    },

    /**
     * Created At
     * Timestamp when activity was logged
     * @type {Date}
     * @default Date.now
     */
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('RecentActivity', recentActivitySchema);