/**
 * Inventory Out Model
 * Schema for storing inventory issue (stock out) entries
 * 
 * This model tracks stock issued from sites. The rate is calculated using
 * FIFO (First In First Out) method from InventoryIn entries.
 * 
 * Use Types:
 * - intraSite: Used within the same site
 * - interSite: Transferred to another site
 * - Return to Vendor: Returned to vendor
 * 
 * Fields:
 * - item_id: Item ID
 * - site_id: Site ID where stock is issued from
 * - inventoryType: Type of inventory (BOQ, SE, Asset)
 * - date: Date of issue
 * - quantity: Quantity issued
 * - rate: Weighted average rate calculated from FIFO entries
 * - return_type: Type of return (if applicable)
 * - authorized_person: Person who authorized the issue
 * - contractor: Contractor who received the stock
 * - useType: How the stock is being used
 */

const mongoose = require("mongoose");
const schema = mongoose.Schema;
const config = require("../config/env");

const InventoryOutSchema = new mongoose.Schema({
    companyIdf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "onboardingcompany",
        required: true
    },
    /**
     * Item ID
     * Reference to the item
     * @type {ObjectId}
     * @required
     */
    item_id: { 
        type: schema.Types.ObjectId, 
        required: true 
    },
    
    /**
     * Site ID
     * Site where inventory is issued from
     * @type {ObjectId}
     * @required
     */
    site_id: { 
       type: schema.Types.ObjectId, 
       required: true 
    },
    
    /**
     * Inventory Type
     * Type of inventory
     * @type {String}
     * @enum ["BOQ", "SE", "Asset"]
     * @required
     */
    inventoryType: { 
        type: String, 
        enum: ["BOQ", "SE", "Asset"], 
        required: true 
    },
    
    /**
     * Date
     * Date of inventory issue
     * @type {String}
     * @required
     */
    date: { 
        type: String, 
        required: true 
    },
    
    /**
     * Quantity
     * Quantity issued
     * @type {Number}
     * @required
     */
    quantity: { 
        type: Number, 
        required: true 
    },
    
    /**
     * Rate
     * Weighted average rate calculated from FIFO entries
     * @type {Number}
     * @required
     */
    rate: { 
        type: Number, 
        required: true 
    },
    
    /**
     * Return Type
     * Type of return (if applicable)
     * @type {String}
     */
    return_type: { 
        type: String, 
    },
    
    /**
     * Authorized Person
     * Person who authorized the issue
     * @type {ObjectId}
     */
    authorized_person: { 
        type: schema.Types.ObjectId, 
    },
    
    /**
     * Contractor
     * Contractor who received the stock
     * @type {String}
     */
    contractor: { 
        type: String, 
    },
    
    /**
     * Use Type
     * How the stock is being used
     * @type {String}
     * @enum ["intraSite", "interSite", "Return to Vendor"]
     * @required
     */
    useType: { 
        type: String, 
        enum: ["intraSite", "interSite", "Return to Vendor"],
        required: true
    },
},

{
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  });

InventoryOutSchema.set("autoIndex", config.db.autoIndex);
module.exports = mongoose.model("Inventory_Out", InventoryOutSchema);
