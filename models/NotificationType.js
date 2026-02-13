/**
 * Notification Type Model
 * Schema for storing notification type configurations
 * 
 * This model stores different types of notifications and their values
 * 
 * Fields:
 * - type: Notification type identifier
 * - value: Notification value/content
 * - created_by: User who created the notification type
 * - updated_by: User who last updated the notification type
 */

const mongoose = require('mongoose');
const config = require('../config/env');

const NotificationTypeSchema = new mongoose.Schema({
    companyIdf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "onboardingcompany",
        required: true
    },
    /**
     * Type
     * Notification type identifier
     * @type {String}
     * @required
     */
    type: {
        type: String,
        required: true
    },
    
    /**
     * Value
     * Notification value/content
     * @type {String}
     * @required
     */
    value: {
        type: String,
        required: true
    },
    
    /**
     * Created By
     * User who created the notification type
     * @type {String}
     */
    created_by: String,
    
    /**
     * Updated By
     * User who last updated the notification type
     * @type {String}
     */
    updated_by: String
}, {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});

NotificationTypeSchema.set('autoIndex', config.db.autoIndex);
module.exports = mongoose.model('NotificationType', NotificationTypeSchema);