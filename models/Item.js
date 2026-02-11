/**
 * Item Model
 * Defines the schema for item master data including:
 * - Item identification (name, number, code, HSN code)
 * - Category and subcategory associations
 * - Brand associations
 * - Unit of measurement (UOM)
 * - GST information
 * - Item specifications
 */

const mongoose = require('mongoose');
const schema = mongoose.Schema;
const config = require('../config/env');

const ItemSchema = new mongoose.Schema({
    // Item identification
    item_name: {
        type: String,
        required: true
    },
    item_number: {
        type: Number,
        required: true
    },
    item_code: {
        type: String,
        default: '',
        required: true
    },
    HSNcode: {
        type: String,
    },
    
    // Brand associations - items can have multiple brands
    brands: [
        {
          type: schema.Types.ObjectId,
          ref: "Brand",
        },
      ],
    
    // Category associations
    category: {
        type: schema.Types.ObjectId,
        ref: 'category',
        required: true
    },
    sub_category: {
        type: schema.Types.ObjectId,
        ref: 'sub_category',
        required: true
    },
    
    // Unit of measurement - items can have multiple UOMs
    uom: [{
        type: schema.Types.ObjectId,
        ref: 'uom',
        required: true
    }],
    
    // GST information
    gst: {
        type: schema.Types.ObjectId,
        ref: 'GST',
        required: true
    },
    
    // Item specifications
    specification: {
        type: String,
        default: ''
    },
    created_by: String,
    updated_by: String
},{
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
})
ItemSchema.set('autoIndex', config.db.autoIndex);
module.exports = mongoose.model('item',ItemSchema)