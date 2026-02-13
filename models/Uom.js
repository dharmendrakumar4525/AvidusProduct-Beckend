/**
 * UOM (Unit of Measurement) Model
 * Defines the schema for unit of measurement master data including:
 * - UOM name (e.g., "Kilogram", "Litre", "Piece")
 * - Unit abbreviation (e.g., "KG", "L", "PC")
 * - User tracking (created_by, updated_by)
 */

const mongoose = require('mongoose');
const config = require('../config/env');

const UomSchema = new mongoose.Schema({
    companyIdf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "onboardingcompany",
        required: true
    },
    // UOM identification
    uom_name: {
        type: String,
        required: true // Full name (e.g., "Kilogram")
    },
    unit: {
        type: String,
        required: true // Unit abbreviation (e.g., "KG")
    },
    created_by: String,
    updated_by: String
}, {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
})

UomSchema.set('autoIndex', config.db.autoIndex);
module.exports = mongoose.model('uom', UomSchema);