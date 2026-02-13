/**
 * Structure Model
 * Schema for storing structure master data
 * 
 * Structures are used in project structure hierarchy (Location -> Structure -> Activity)
 * 
 * Fields:
 * - structure_name: Name of the structure
 * - created_by: User who created the structure
 * - updated_by: User who last updated the structure
 */

const mongoose = require('mongoose');
const schema = mongoose.Schema;
const config = require('../config/env');

const StructureSchema = new mongoose.Schema({
    companyIdf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "onboardingcompany",
        required: true
    },
    /**
     * Structure Name
     * Name of the structure
     * @type {String}
     * @required
     */
    structure_name: {
        type: String,
        required: true
    },
    
    /**
     * Created By
     * User who created the structure
     * @type {String}
     */
    created_by: String,
    
    /**
     * Updated By
     * User who last updated the structure
     * @type {String}
     */
    updated_by: String
}, {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});
StructureSchema.set('autoIndex', config.db.autoIndex);
module.exports = mongoose.model('structure',StructureSchema)