/**
 * Permission Model
 * Schema for storing system permissions
 * 
 * Permissions define what actions users can perform in the system
 * 
 * Fields:
 * - permission: Permission name/identifier
 * - date: Date when permission was created
 */

const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
    companyIdf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "onboardingcompany",
        required: true
    },
    /**
     * Permission
     * Permission name/identifier
     * @type {String}
     * @required
     */
    permission: {
        type: String,
        required: true
    },
    
    /**
     * Date
     * Date when permission was created
     * @type {Date}
     * @default Date.now
     */
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Permission', permissionSchema);