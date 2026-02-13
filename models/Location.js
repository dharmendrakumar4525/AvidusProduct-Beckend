/**
 * Location Model
 * Schema for storing location master data
 * 
 * Locations are used in project structure hierarchy (Location -> Structure -> Activity)
 * 
 * Fields:
 * - location_name: Name of the location
 * - created_by: User who created the location
 * - updated_by: User who last updated the location
 */

const mongoose = require('mongoose');
const schema = mongoose.Schema;
const config = require('../config/env');

const LocationSchema = new mongoose.Schema({
    /**
     * Location Name
     * Name of the location
     * @type {String}
     * @required
     */
    location_name: {
        type: String,
        required: true
    },
    companyIdf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "onboardingcompany", // must match model name EXACTLY
        required: true
        },
    /**
     * Created By
     * User who created the location
     * @type {String}
     */
    created_by: String,
    
    /**
     * Updated By
     * User who last updated the location
     * @type {String}
     */
    updated_by: String
}, {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});
LocationSchema.set('autoIndex', config.db.autoIndex);
module.exports = mongoose.model('location',LocationSchema)