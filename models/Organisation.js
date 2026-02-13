/**
 * Organisation Model
 * Defines the schema for organisation master data including:
 * - Company identification (name, code)
 * - Contact information (person, phone)
 * - Business registration (GST, PAN)
 * - Address information
 * - Attachments
 * - User tracking (created_by, updated_by)
 */

const mongoose = require('mongoose');
const config = require('../config/env');

const OrganisationSchema = new mongoose.Schema({
    companyIdf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "onboardingcompany",
        required: true
    },
    // Organisation identification
    companyName: {
        type: String,
        required: true
    },
    
    // Contact information
    contact_person: {
        type: String,
        default: ''
    },
    dialcode: {
        type: Number,
        required: true // Country dial code
    },
    phone_number: {
        type: Number,
        required: true
    },
    
    // Business registration details
    gst_number: {
        type: String,
        default: ''
    },
    pan_number: {
        type: String,
        require: true // PAN card number (required)
    },
    code: {
        type: String,
        required: true // Organisation code
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
    
    // Document attachments
    attachments: {
        type: String,
        default: '' // File path or URL to attachments
    },
    created_by: String,
    updated_by: String
}, {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
})

OrganisationSchema.set('autoIndex', config.db.autoIndex);
module.exports = mongoose.model('organisation', OrganisationSchema)