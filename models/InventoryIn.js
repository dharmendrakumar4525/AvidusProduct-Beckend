/**
 * Inventory In Model
 * Schema for storing inventory receipt (stock in) entries
 * 
 * This model tracks stock received at sites using FIFO (First In First Out) method.
 * The remaining_quantity field is decremented when stock is issued.
 * 
 * Inventory Types:
 * - BOQ: Project BOQ (Bill of Quantities)
 * - SE: Site Establishment
 * - Asset: Assets/Plant & Machinery
 * 
 * Fields:
 * - item_id: Item ID
 * - site_id: Site ID where stock is received
 * - date: Date of receipt
 * - quantity: Initial quantity received
 * - remaining_quantity: Remaining quantity after issues (used for FIFO)
 * - vendor_id: Vendor ID (if from vendor)
 * - rate: Rate per unit
 * - inventoryType: Type of inventory (BOQ, SE, Asset)
 * - source: Source of inventory (Vendor or InterSite)
 */

const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const config = require("../config/env");

/**
 * Inventory Types Enum
 * Defines the types of inventory
 */
const InventoryTypes = {
  PROJECT_BOQ: "BOQ",           // Project Bill of Quantities
  SITE_ESTABLISHMENT: "SE",     // Site Establishment
  ASSETS: 'Asset',              // Assets/Plant & Machinery
};

const Site_InventorySchema = new mongoose.Schema(
  {
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
      type: Schema.Types.ObjectId,
      required: true,
    },
    
    /**
     * Site ID
     * Site where inventory is received
     * @type {ObjectId}
     * @required
     */
    site_id: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    /**
     * Date
     * Date of inventory receipt (used for FIFO sorting)
     * @type {String}
     * @required
     */
    date: { 
      type: String, 
      required: true 
    },
   
    /**
     * Quantity
     * Initial quantity received
     * @type {Number}
     * @required
     * @default 0
     */
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    
    /**
     * Remaining Quantity
     * Remaining quantity after stock issues (used for FIFO calculations)
     * @type {Number}
     */
    remaining_quantity: {
      type: Number,
    },
    
    /**
     * Vendor ID
     * Vendor from whom stock was received (if applicable)
     * @type {String}
     */
    vendor_id: { 
      type: String 
    },
    
    /**
     * Rate
     * Rate per unit
     * @type {Number}
     * @required
     */
    rate: { 
      type: Number, 
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
      enum: Object.values(InventoryTypes),
      required: true,
    },
    
    /**
     * Source
     * Source of inventory
     * @type {String}
     * @enum ["Vendor", "InterSite"]
     */
    source: { 
      type: String,
      enum: ["Vendor", "InterSite"],
    },
    
    /**
     * Created By
     * User who created the entry
     * @type {String}
     */
    createdBy: String,
    
    /**
     * Updated By
     * User who last updated the entry
     * @type {String}
     */
    updatedBy: String,
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

Site_InventorySchema.set("autoIndex", config.db.autoIndex);

module.exports = {
  InventoryIn: mongoose.model("Inventory_In", Site_InventorySchema),
  InventoryTypes,
};
