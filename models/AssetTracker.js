/**
 * Asset Tracker Model
 * Schema for tracking assets throughout their lifecycle
 * 
 * This model tracks assets from procurement through maintenance, service, and part replacement.
 * Assets have auto-generated codes and voucher numbers based on category and subcategory.
 * 
 * Asset Lifecycle Stages:
 * - Procurement: Initial asset procurement
 * - Maintenance: Asset maintenance activities
 * - Service: Asset servicing
 * - Part Replacement: Replacement of asset parts
 * 
 * Fields:
 * - Auto-filled: PO details, invoice details, asset codes, voucher numbers
 * - Editable: Specifications, make, model, registration, serial numbers
 * - Lifecycle: Array of lifecycle events tracking asset history
 */

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AssetTrackerSchema = new Schema(
  {
    companyIdf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "onboardingcompany",
        required: true
    },
    // ---------- Auto-filled Details ----------
    /**
     * PO Number
     * Purchase order number
     * @type {String}
     * @required
     */
    po_number: { type: String, required: true },
    
    /**
     * PO Date
     * Purchase order date
     * @type {Date}
     * @required
     */
    po_date: { type: Date, required: true },
    
    /**
     * Department
     * Department (default: "Asset")
     * @type {String}
     * @default "Asset"
     */
    department: { type: String, default: "Asset" },
    
    /**
     * Invoice Number
     * Invoice number
     * @type {String}
     */
    invoice_number: { type: String },
    
    /**
     * Invoice Date
     * Invoice date
     * @type {Date}
     */
    invoice_date: { type: Date },
    
    /**
     * Item ID
     * Reference to the item
     * @type {ObjectId}
     * @ref item
     * @required
     */
    item_id: { type: Schema.Types.ObjectId, ref: "item", required: true },
    
    /**
     * Category
     * Reference to the category
     * @type {ObjectId}
     * @ref category
     * @required
     */
    catgeory: { type: Schema.Types.ObjectId, ref: "category", required: true },
    
    /**
     * Sub Category
     * Reference to the subcategory
     * @type {ObjectId}
     * @ref sub_category
     * @required
     */
    subCategory: { type: Schema.Types.ObjectId, ref: "sub_category", required: true },
    
    /**
     * Voucher Number
     * Auto-generated voucher number (e.g., CAT001-0001)
     * @type {String}
     * @required
     */
    voucher_number: { type: String, required: true },
    
    /**
     * Asset Code
     * Auto-generated asset code (e.g., PISL-SUB00100001)
     * @type {String}
     * @required
     */
    asset_code: { type: String, required: true },
    
    /**
     * Rate Per Unit
     * Rate per unit of the asset
     * @type {Number}
     */
    rate_per_unit: { type: Number },
    
    /**
     * Basic Invoice Value
     * Basic invoice value
     * @type {Number}
     */
    basic_invoice_value: { type: Number },
    
    /**
     * Current Location
     * Current site location of the asset
     * @type {ObjectId}
     * @ref site
     */
    current_location: { type: Schema.Types.ObjectId, ref: "site" },

    // ---------- Editable / Additional Details ----------
    /**
     * Specification
     * Asset specifications
     * @type {String}
     */
    specification: { type: String },
    
    /**
     * Make
     * Asset manufacturer/make
     * @type {String}
     */
    make: { type: String },
    
    /**
     * Model
     * Asset model
     * @type {String}
     */
    model: { type: String },
    
    /**
     * Registration Number
     * Vehicle registration number (if applicable)
     * @type {String}
     */
    registration_number: { type: String },
    
    /**
     * Serial Number
     * Asset serial number
     * @type {String}
     */
    serial_number: { type: String },
    
    /**
     * Quantity
     * Quantity of assets
     * @type {Number}
     * @default 1
     */
    quantity: { type: Number, default: 1 },
    
    /**
     * Description
     * Asset description
     * @type {String}
     */
    description: { type: String },

    // ---------- Unified Asset Lifecycle ----------
    /**
     * Asset Lifecycle
     * Array of lifecycle events tracking asset history
     * @type {Array}
     */
    asset_lifecycle: [
      {
        /**
         * Stage Type
         * Type of lifecycle stage
         * @type {String}
         * @enum ["Procurement", "Maintenance", "Service", "Part Replacement"]
         * @default "Procurement"
         */
        stage_type: {
          type: String,
          enum: ["Procurement", "Maintenance", "Service", "Part Replacement"],
          default: "Procurement",
        },
        
        /**
         * Vendor ID
         * Reference to vendor
         * @type {ObjectId}
         * @ref vendor
         */
        vendor_id: { type: Schema.Types.ObjectId, ref: "vendor" },
        
        /**
         * PO Number
         * Purchase order number for this stage
         * @type {String}
         */
        po_number: String,
        
        /**
         * Rate
         * Rate for this stage
         * @type {Number}
         */
        rate: Number,
        
        /**
         * Item
         * Reference to item
         * @type {ObjectId}
         * @ref item
         */
        item: { type: Schema.Types.ObjectId, ref: "item" },
        
        /**
         * Invoice Number
         * Invoice number for this stage
         * @type {String}
         */
        invoice_number: String,
        
        /**
         * Invoice Date
         * Invoice date for this stage
         * @type {Date}
         */
        invoice_date: Date,
        
        /**
         * Remarks
         * Remarks for this lifecycle stage
         * @type {String}
         */
        remarks: String,
        
        /**
         * Uploaded Invoice
         * File link or path to uploaded invoice
         * @type {String}
         */
        uploaded_invoice: String,
        
        /**
         * Date
         * Date of this lifecycle event
         * @type {Date}
         * @default Date.now
         */
        date: { type: Date, default: Date.now },
        
        /**
         * Updated By
         * User who updated this lifecycle stage
         * @type {ObjectId}
         * @ref user
         */
        updated_by: { type: Schema.Types.ObjectId, ref: "user" },
      },
    ],

    /**
     * Created By
     * User who created the asset
     * @type {ObjectId}
     * @ref user
     */
    created_by: { type: Schema.Types.ObjectId, ref: "user" },
    
    /**
     * Updated By
     * User who last updated the asset
     * @type {ObjectId}
     * @ref user
     */
    updated_by: { type: Schema.Types.ObjectId, ref: "user" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AssetTracker", AssetTrackerSchema);
