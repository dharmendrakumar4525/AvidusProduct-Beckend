/**
 * Activity Model
 * Schema for storing activity master data
 * 
 * Activities are used in project structure for tracking work activities
 * 
 * Fields:
 * - activity_name: Name of the activity
 * - created_by: User who created the activity
 * - updated_by: User who last updated the activity
 */

const mongoose = require('mongoose');
const schema = mongoose.Schema;
const config = require('../config/env');

const ActivitySchema = new mongoose.Schema({
    /**
     * Activity Name
     * Name of the activity
     * @type {String}
     * @required
     */
    activity_name: {
        type: String,
        required: true
    },
    
    /**
     * Created By
     * User who created the activity
     * @type {String}
     */
    created_by: String,
    
    /**
     * Updated By
     * User who last updated the activity
     * @type {String}
     */
    updated_by: String
}, {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});
ActivitySchema.set('autoIndex', config.db.autoIndex);
module.exports = mongoose.model('activity',ActivitySchema)