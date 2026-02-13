/**
 * Project Activity Data Model
 * Schema for storing daily project activity data
 * 
 * This model tracks daily progress for activities within the project hierarchy:
 * Project -> Location -> Structure -> Activity
 * 
 * Each record represents activity data for a specific date and location/structure/activity combination.
 * Used for progress tracking and cumulative quantity calculations.
 * 
 * Fields:
 * - project_id: Project ID
 * - location_id, location_ref_id: Location references
 * - structure_id, structure_ref_id: Structure references
 * - activity_id, activity_ref_id: Activity references
 * - daily_quantity: Daily quantity completed
 * - date: Date of the activity
 * - remark: Remarks for the activity
 */

const mongoose = require('mongoose');
const schema = mongoose.Schema;
const config = require('../config/env');

const projectActivityDataSchema = new mongoose.Schema({
    companyIdf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "onboardingcompany",
        required: true
    },
    /**
     * Project ID
     * Reference to the project
     * @type {ObjectId}
     * @required
     */
    project_id: {
        type: schema.Types.ObjectId,
        required: true,
    },
    
    /**
     * Location ID
     * Reference to the location
     * @type {ObjectId}
     * @required
     */
    location_id: {
        type: schema.Types.ObjectId,
        required: true,
    },
    
    /**
     * Location Reference ID
     * Reference ID for the location
     * @type {ObjectId}
     * @required
     */
    location_ref_id: {
        type: schema.Types.ObjectId,
        required: true,
    },
    
    /**
     * Structure ID
     * Reference to the structure
     * @type {ObjectId}
     * @required
     */
    structure_id: {
        type: schema.Types.ObjectId,
        required: true,
    },
    
    /**
     * Structure Reference ID
     * Reference ID for the structure
     * @type {ObjectId}
     * @required
     */
    structure_ref_id: {
        type: schema.Types.ObjectId,
        required: true,
    },
    
    /**
     * Activity ID
     * Reference to the activity
     * @type {ObjectId}
     * @required
     */
    activity_id: {
        type: schema.Types.ObjectId,
        required: true,
    },
    
    /**
     * Activity Reference ID
     * Reference ID for the activity
     * @type {ObjectId}
     * @required
     */
    activity_ref_id: {
        type: schema.Types.ObjectId,
        required: true,
    },
    
    /**
     * Daily Quantity
     * Quantity completed on this date
     * @type {Number}
     * @default 0
     */
    daily_quantity: {
        type: Number,
        default: 0
    },
    
    /**
     * Date
     * Date of the activity
     * @type {Date}
     * @default null
     */
    date: {
        type: Date,
        default: null
    },
    
    /**
     * Remark
     * Remarks for the activity
     * @type {String}
     * @default ""
     */
    remark: {
        type: String,
        default: ""
    },
    
    /**
     * Created By
     * User who created the record
     * @type {String}
     */
    created_by: String,
    
    /**
     * Updated By
     * User who last updated the record
     * @type {String}
     */
    updated_by: String
},
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at"
        }
    })
projectActivityDataSchema.set('autoIndex', config.db.autoIndex);
module.exports = mongoose.model('project_activity_data', projectActivityDataSchema)