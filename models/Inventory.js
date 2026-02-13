/**
 * Inventory Model
 * Schema for storing current inventory stock at sites
 * 
 * This model tracks the current stock quantity for items at each site.
 * It's updated when inventory is received (InventoryIn) or issued (InventoryOut).
 * 
 * Inventory Types:
 * - BOQ: Project BOQ (Bill of Quantities)
 * - SE: Site Establishment
 * - Asset: Assets/Plant & Machinery
 * 
 * Fields:
 * - item_id: Item ID
 * - site_id: Site ID
 * - stock_quantity: Current stock quantity
 * - inventoryType: Type of inventory
 * - date: Date of last update
 * - updated_at: Timestamp of last update
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
     * Site where inventory is stored
     * @type {ObjectId}
     * @required
     */
    site_id: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    /**
     * Stock Quantity
     * Current stock quantity at the site
     * @type {Number}
     * @required
     * @default 0
     */
    stock_quantity: {
      type: Number,
      required: true,
      default: 0,
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
     * Date
     * Date of last stock update
     * @type {String}
     * @required
     */
    date: { 
      type: String, 
      required: true 
    },
    
    /**
     * Updated At
     * Timestamp of last update
     * @type {Date}
     * @required
     */
    updated_at: {
      type: Date,
      required: true,
    },
    
    /**
     * Created By
     * User who created the inventory record
     * @type {String}
     */
    createdBy: String,
    
    /**
     * Updated By
     * User who last updated the inventory record
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
  Inventory: mongoose.model("Site_Inventory", Site_InventorySchema),
  InventoryTypes,
};
