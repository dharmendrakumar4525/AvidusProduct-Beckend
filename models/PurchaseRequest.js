/**
 * Purchase Request Model
 * Schema for storing purchase requests and their approval workflow
 * 
 * This model manages purchase requests from creation through approval stages.
 * It supports PM (Project Manager) and PD (Project Director) approvals,
 * rate approval tracking, and PR history.
 * 
 * PR Types:
 * - Project BOQ (PB): Project Bill of Quantities
 * - Site Establishment (SE): Site establishment items
 * - Assets (P&M): Plant & Machinery assets
 * 
 * Status Values:
 * - pending: Awaiting approval
 * - approved: Approved
 * - rejected: Rejected
 * - revise: Needs revision
 * - revised: Has been revised
 * - draft: Draft state
 * 
 * Key Features:
 * - Multi-stage approval (PM, PD, Rate Approval)
 * - Item attachments support
 * - Vendor selection
 * - Local purchase flag
 * - PR history tracking
 * - Vendor totals with financial breakdown
 * 
 * Fields:
 * - purchase_request_number: Auto-generated PR number
 * - items: Array of items with specifications, quantities, attachments
 * - vendorItems: Vendor item mappings
 * - vendors_total: Financial totals with GST, freight, other charges
 * - prHistory: History of status changes
 */

const mongoose = require("mongoose");
const schema = mongoose.Schema;
const config = require("../config/env");

const PurchaseRequestSchema = new mongoose.Schema(
  {
    companyIdf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "onboardingcompany",
        required: true
    },
    /**
     * Title
     * Purchase request title
     * @type {String}
     * @required
     */
    title: {
      type: String,
      required: true,
    },
    
    /**
     * PR Type
     * Purchase request type
     * @type {String}
     * @enum ["Project BOQ (PB)", "Site Establishment (SE)", "Assets (P&M)"]
     * @required
     */
    prType: {
      type: String,
      enum: ["Project BOQ (PB)", "Site Establishment (SE)", "Assets (P&M)"],
      required: true,
    },
    
    /**
     * Handle By
     * Person handling the purchase request
     * @type {String}
     * @default ""
     */
    handle_by: {
      type: String,
      default: "",
    },
    
    /**
     * PM Approved By
     * Project Manager who approved
     * @type {String}
     * @default ""
     */
    PM_approvedBy: {
      type: String,
      default: "",
    },
    
    /**
     * PD Approved By
     * Project Director who approved
     * @type {String}
     * @default ""
     */
    PD_approvedBy: {
      type: String,
      default: "",
    },
    
    /**
     * PM Approved Date
     * Date when PM approved
     * @type {String}
     * @default ""
     */
    pm_approvedDate: {
      type: String,
      default: "",
    },
    
    /**
     * PD Approved Date
     * Date when PD approved
     * @type {String}
     * @default ""
     */
    pd_approvedDate: {
      type: String,
      default: "",
    },
    
    /**
     * Purchase Rate Approval
     * Rate approval status and details
     * @type {Object}
     */
    purchaseRateApproval: {
      /**
       * Status
       * Rate approval status
       * @type {String}
       * @enum ["", "pending", "approved", "rejected"]
       * @default ""
       */
      status: {
        type: String,
        enum: ["", "pending", "approved", "rejected"],
        default: "",
      },
      
      /**
       * Approved By
       * User who approved/rejected rate approval
       * @type {String}
       * @default ""
       */
      approvedBy: { type: String, default: "" },
      
      /**
       * Approved Date
       * Date of rate approval
       * @type {Date}
       */
      approvedDate: { type: Date },
    },
    date: {
      type: Date,
      required: true,
    },
    expected_delivery_date: {
      type: Date,
      required: true,
    },
    purchase_request_number: {
      type: String,
      required: true,
    },
    site: {
      type: schema.Types.ObjectId,
      required: true,
    },
    local_purchase: {
      type: String,
      enum: ["yes", "no"],
      default: "no",
    },
    vendor: {
      type: schema.Types.ObjectId,
      
    },
    /**
     * Items
     * Array of items in the purchase request
     * @type {Array}
     */
    items: [
      {
        /**
         * Item ID
         * Reference to the item
         * @type {ObjectId}
         * @required
         */
        item_id: {
          type: schema.Types.ObjectId,
          required: true,
        },
        
        /**
         * Item Code
         * Item code
         * @type {String}
         * @default ""
         */
        item_code: {
          type: String,
          default: "",
        },
        
        /**
         * Specification
         * Item specification
         * @type {String}
         * @default ""
         */
        specification: {
          type: String,
          default: "",
        },
        
        /**
         * HSN Code
         * HSN code for the item
         * @type {String}
         * @default ""
         */
        hsnCode: {
          type: String,
          default: "",
        },
        
        /**
         * Quantity
         * Item quantity
         * @type {Number}
         * @required
         * @default 1
         */
        qty: {
          type: Number,
          required: true,
          default: 1,
        },
        
        /**
         * Attachment
         * Array of attachment URLs (uploaded to S3)
         * @type {Array<String>}
         */
        attachment: {
          type: [String],
          required: false,
        },
        
        /**
         * Remark
         * Remarks for the item
         * @type {String}
         * @default ""
         */
        remark: {
          type: String,
          default: "",
        },
        
        /**
         * UOM
         * Unit of measurement
         * @type {String}
         * @default ""
         */
        uom: {
          type: String,
          default: "",
        },
        
        /**
         * Brand Name
         * Array of brand names
         * @type {Array<String>}
         * @default ""
         */
        brandName: {
          type: [String],
          default: "",
        },
        
        /**
         * Rate
         * Item rate
         * @type {String}
         * @default ""
         */
        rate: {
          type: String,
          default: "",
        },
        
        /**
         * GST
         * GST percentage/amount
         * @type {Number}
         * @default ""
         */
        gst: {
          type: Number,
          default: "",
        },
        
        /**
         * Freight
         * Freight charges
         * @type {Number}
         * @default ""
         */
        freight: {
          type: Number,
          default: "",
        },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "revise", "revised", "draft"],
    },
    new_request: {
      type: Boolean,
      default: true,
    },
    remarks: {
      type: String,
    },

    /**
     * PR History
     * History of status changes
     * @type {Array}
     */
    prHistory: [
      {
        _id: false,
        /**
         * Updated By
         * User who made the update
         * @type {ObjectId}
         * @required
         */
        updated_By: { type: schema.Types.ObjectId, required: true },
        
        /**
         * Updated Date
         * Date of the update
         * @type {Date}
         * @default Date.now
         */
        updated_Date: { type: Date, default: Date.now },
        
        /**
         * Status
         * Status at the time of update
         * @type {String}
         * @required
         */
        status: { type: String, required: true },
      },
    ],
    
    /**
     * Vendor Items
     * Vendor item mappings
     * @type {Object}
     */
    vendorItems: {},
    
    /**
     * Vendors Total
     * Financial totals with breakdown
     * @type {Object}
     */
    vendors_total: {
      /**
       * GST Amount
       * Total GST amount
       * @type {Number}
       * @default 0
       */
      gstAmount: { type: Number, default: 0 },
      
      /**
       * GST Details
       * Detailed GST breakdown
       * @type {Object}
       * @default {}
       */
      GSTDetails: { type: Object, default: {} },
      
      /**
       * Freight Total
       * Total freight including tax
       * @type {Number}
       * @default 0
       */
      freightTotal: { type: Number, default: 0 },
      
      /**
       * Freight GST
       * GST on freight
       * @type {Number}
       * @default 0
       */
      freightGST: { type: Number, default: 0 },
      
      /**
       * Freight
       * Base freight charges
       * @type {Number}
       * @default 0
       */
      freight: { type: Number, default: 0 },
      
      /**
       * Sub Total
       * Subtotal before taxes and charges
       * @type {Number}
       * @default 0
       */
      subTotal: { type: Number, default: 0 },
      
      /**
       * Total
       * Grand total including all charges and taxes
       * @type {Number}
       * @default 0
       */
      total: { type: Number, default: 0 },

      /**
       * Other Charges Total
       * Total other charges including tax
       * @type {Number}
       * @default 0
       */
      otherChargesTotal: { type: Number, default: 0 },
      
      /**
       * Other Charges GST
       * GST on other charges
       * @type {Number}
       * @default 0
       */
      otherChargesGST: { type: Number, default: 0 },
      
      /**
       * Other Charges
       * Base other charges
       * @type {Number}
       * @default 0
       */
      otherCharges: { type: Number, default: 0 },
      
      /**
       * Vendor
       * Vendor name
       * @type {String}
       */
      Vendor: { type: String },
      
      /**
       * Category
       * Category name
       * @type {String}
       */
      category: { type: String },
      
      /**
       * Sub Category
       * Subcategory name
       * @type {String}
       */
      subCategory: { type: String },
    },
    created_by: String,
    updated_by: String,
  },

  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

PurchaseRequestSchema.set("autoIndex", config.db.autoIndex);
module.exports = mongoose.model("purchase_request", PurchaseRequestSchema);
