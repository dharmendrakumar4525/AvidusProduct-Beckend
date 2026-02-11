/**
 * Brand Model
 * Defines the schema for brand master data including:
 * - Brand name
 * - User tracking (created_by, updated_by)
 */

const mongoose = require('mongoose');
const schema = mongoose.Schema;
const config = require('../config/env');

const BrandSchema = new mongoose.Schema({
    // Brand identification
    brand_name: {
        type: String,
        required: true
    },
    created_by: String,
    updated_by: String
},{
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
})
BrandSchema.set('autoIndex', config.db.autoIndex);
module.exports = mongoose.model('brand',BrandSchema)