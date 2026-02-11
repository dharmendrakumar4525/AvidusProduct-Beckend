/**
 * Site Model
 * Defines the schema for site master data including:
 * - Site identification (name, location, code)
 * - Role assignments (store manager, project manager, project director)
 * - Address information
 * - Auto-incrementing number sequences for purchase requests and orders
 */

const mongoose = require('mongoose');
const schema = mongoose.Schema;
const config = require('../config/env');

const SiteSchema = new mongoose.Schema({
    // Site identification
    site_name: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    
    // Role assignments - links to User model for site-specific roles
    roles: {
        store_manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
        project_manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
        project_director: { type: mongoose.Schema.Types.ObjectId, ref: 'User'}
    },
    
    // Address information
    address: {
        street_address: {
            type: String,
            default: ''
        },
        street_address2: {
            type: String,
            default: ''
        },
        state: {
            type: String,
            default: ''
        },
        city: {
            type: String,
            default: ''
        },
        zip_code: {
            type: String,
            default: ''
        },
        country: {
            type: String,
            default: ''
        },
    },
    
    // Auto-incrementing number sequences for document generation
    purchase_request_number: {
        type: Number,
        default: 1
    },
    local_purchase_order_number: {
        type: Number,
        default: 1
    },
    ho_purchase_order_number: {
        type: Number,
        default: 1
    },

   
    created_by: String,
    updated_by: String
},{
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
})






SiteSchema.set('autoIndex', config.db.autoIndex);
module.exports = mongoose.model('site',SiteSchema)
