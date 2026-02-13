/**
 * Number Group Model
 * Schema for managing sequential numbering for different modules
 * 
 * This model tracks the next available ID for auto-generating numbers
 * for purchase requests, rate approvals, and purchase orders
 * 
 * Fields:
 * - next_id: Next available ID number
 * - module: Module name (purchase_request, rate_approval, purchase_order)
 */

const mongoose = require("mongoose");
const schema = mongoose.Schema;
const config = require('../config/env');

const NumberingGroupSchema = new schema({
    companyIdf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "onboardingcompany",
        required: true
    },
    /**
     * Next ID
     * Next available ID number for the module
     * @type {Number}
     * @default 0
     */
    next_id: {
        type: Number,
        default: 0
    },
    
    /**
     * Module
     * Module name for which numbering is tracked
     * @type {String}
     * @enum ['purchase_request', 'rate_approval', 'purchase_order']
     * @default ''
     */
    module: {
        type: String,
        enum: ['purchase_request', 'rate_approval', 'purchase_order'],
        default: ''
    }
}, {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});

NumberingGroupSchema.set('autoIndex', config.db.autoIndex);

module.exports = mongoose.model("numbering_group", NumberingGroupSchema);
