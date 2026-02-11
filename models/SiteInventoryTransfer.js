/**
 * Site Inventory Transfer Model
 * Schema for managing inter-site inventory transfers
 * 
 * This model handles the complete workflow for transferring inventory between sites,
 * including multi-stage approvals (Project Director, Store/Asset Head), dispatch tracking,
 * and receipt confirmation.
 * 
 * Workflow Statuses:
 * - Draft: Initial creation
 * - Pending: Awaiting approval
 * - PD Approved: Project Director approved
 * - HO Approved: Head Office approved
 * - Dispatched: Items dispatched from origin site
 * - Partially Received: Some items received at destination
 * - Fully Received: All items received
 * - Closed: Transfer completed
 * - Cancelled: Transfer cancelled
 * - Rejected: Transfer rejected
 * 
 * Features:
 * - Auto-generated transfer numbers (MTN_SITE_00001 format)
 * - Site-wise entry number tracking
 * - Multi-stage approval workflow
 * - Timeline tracking for audit
 * - Vehicle and dispatch information
 * - Soft delete support
 */

const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const config = require("../config/env");

const TransferSchema = new Schema(
  {
    /**
     * Transfer Number
     * Auto-generated unique transfer number (e.g., MTN_SITE_00001)
     * Generated in pre-save hook based on site code and entry number
     * @type {String}
     * @unique
     */
    transfer_number: { type: String, unique: true },
    
    /**
     * Entry Number
     * Site-wise sequential entry number
     * @type {Number}
     * @required
     */
    entry_number: { type: Number, required: true },

    // --- Site Details ---
    /**
     * Origin Site
     * Site from which inventory is being transferred
     * @type {ObjectId}
     * @ref site
     * @required
     */
    origin_site: {
      type: Schema.Types.ObjectId,
      ref: "site",
      required: true,
    },
    
    /**
     * Destination Site
     * Site to which inventory is being transferred
     * @type {ObjectId}
     * @ref site
     * @required
     */
    destination_site: {
      type: Schema.Types.ObjectId,
      ref: "site",
      required: true,
    },

    // --- Item Type ---
    /**
     * Item Type
     * Type of items being transferred
     * @type {String}
     * @enum ["BOQ", "SE", "Asset"]
     * @required
     */
    itemType: {
      type: String,
      enum: ["BOQ", "SE", "Asset"],
      required: true,
    },

    // --- Item Details ---
    /**
     * Items
     * Array of items being transferred
     * @type {Array}
     */
    items: [
      {
        /**
         * Item ID
         * Reference to the item
         * @type {ObjectId}
         * @ref item
         * @required
         */
        item_id: { type: Schema.Types.ObjectId, required: true, ref: "item" },
        
        /**
         * Requested Quantity
         * Quantity requested for transfer
         * @type {Number}
         * @required
         * @min 0
         */
        requested_quantity: { type: Number, required: true, min: 0 },
        
        /**
         * Rate
         * Rate per unit
         * @type {Number}
         * @min 0
         */
        rate: { type: Number, min: 0 },
        
        /**
         * Dispatched Quantity
         * Quantity actually dispatched
         * @type {Number}
         * @default 0
         */
        dispatched_quantity: { type: Number, default: 0 },
        
        /**
         * Received Quantity
         * Quantity received at destination (must be <= dispatched_quantity)
         * @type {Number}
         * @default 0
         */
        received_quantity: { type: Number, default: 0 },
        
        /**
         * Remarks
         * Remarks for this item
         * @type {String}
         * @default ""
         */
        remarks: { type: String, default: "" },
      },
    ],

    // --- Approval Flow ---
    /**
     * Approvals
     * Multi-stage approval tracking
     * @type {Object}
     */
    approvals: {
      /**
       * Project Director Approval
       * @type {Object}
       */
      project_director: {
        /**
         * Approved By
         * User who approved/rejected
         * @type {ObjectId}
         * @ref User
         */
        approved_by: { type: Schema.Types.ObjectId, ref: "User" },
        
        /**
         * Approved At
         * Date of approval/rejection
         * @type {Date}
         */
        approved_at: Date,
        
        /**
         * Status
         * Approval status
         * @type {String}
         * @enum ["Pending", "Approved", "Rejected"]
         * @default "Pending"
         */
        status: {
          type: String,
          enum: ["Pending", "Approved", "Rejected"],
          default: "Pending",
        },
      },
      
      /**
       * Store/Asset Head Approval
       * @type {Object}
       */
      store_Asset_head: {
        /**
         * Type
         * Whether this is "Store" or "Asset" head approval
         * @type {String}
         * @enum ["Store", "Asset"]
         */
        type: {
          type: String,
          enum: ["Store", "Asset"],
        },
        
        /**
         * Approved By
         * User who approved/rejected
         * @type {ObjectId}
         * @ref User
         */
        approved_by: { type: Schema.Types.ObjectId, ref: "User" },
        
        /**
         * Approved At
         * Date of approval/rejection
         * @type {Date}
         */
        approved_at: Date,
        
        /**
         * Status
         * Approval status
         * @type {String}
         * @enum ["Pending", "Approved", "Rejected"]
         * @default "Pending"
         */
        status: {
          type: String,
          enum: ["Pending", "Approved", "Rejected"],
          default: "Pending",
        },
      },
    },

    // --- Transfer Status ---
    /**
     * Status
     * Current status of the transfer
     * @type {String}
     * @enum ["Draft", "Pending", "PD Approved", "HO Approved", "Dispatched", "Partially Received", "Fully Received", "Closed", "Cancelled", "Rejected"]
     * @default "Pending"
     */
    status: {
      type: String,
      enum: [
        "Draft",
        "Pending",
        "PD Approved",
        "HO Approved",
        "Dispatched",
        "Partially Received",
        "Fully Received",
        "Closed",
        "Cancelled",
        "Rejected",
      ],
      default: "Pending",
    },

    // --- Workflow Actors ---
    /**
     * Created By
     * User who created the transfer
     * @type {ObjectId}
     * @ref User
     * @required
     */
    created_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    
    /**
     * Created By Name
     * Name of user who created (auto-filled in pre-save hook)
     * @type {String}
     */
    created_by_name: { type: String },
    
    /**
     * Updated By
     * User who last updated the transfer
     * @type {ObjectId}
     * @ref User
     */
    updated_by: { type: Schema.Types.ObjectId, ref: "User" },
    
    /**
     * Updated By Name
     * Name of user who last updated
     * @type {String}
     */
    updated_by_name: { type: String },

    // --- Vehicle & Dispatch Info ---
    /**
     * Vehicle
     * Vehicle information for dispatch
     * @type {Object}
     */
    vehicle: {
      /**
       * Vehicle Number
       * Vehicle registration number
       * @type {String}
       */
      vehicle_number: { type: String },
      
      /**
       * Driver Name
       * Driver name
       * @type {String}
       */
      driver_name: { type: String },
      
      /**
       * Driver Contact
       * Driver contact number
       * @type {String}
       */
      driver_contact: { type: String },
    },

    // --- Dates ---
    /**
     * Dispatch Date
     * Date when items were dispatched
     * @type {Date}
     */
    dispatch_date: { type: Date },
    
    /**
     * Received Date
     * Date when items were received at destination
     * @type {Date}
     */
    received_date: { type: Date },

    // --- Attachments & Notes ---
    /**
     * Attachments
     * Array of attachment files
     * @type {Array}
     */
    attachments: [{ 
      /**
       * Filename
       * @type {String}
       */
      filename: String, 
      
      /**
       * URL
       * File URL/path
       * @type {String}
       */
      url: String 
    }],
    
    /**
     * Notes
     * General notes for the transfer
     * @type {String}
     * @default ""
     */
    notes: { type: String, default: "" },

    // --- Timeline ---
    /**
     * Timeline
     * Array of timeline events for audit trail
     * Auto-populated on status changes
     * @type {Array}
     */
    timeline: [
      {
        /**
         * Action
         * Action performed (e.g., "Created", "Submitted", "Approved", etc.)
         * @type {String}
         */
        action: { type: String },
        
        /**
         * User
         * User who performed the action
         * @type {ObjectId}
         * @ref User
         */
        user: { type: Schema.Types.ObjectId, ref: "User" },
        
        /**
         * Date
         * Date of the action
         * @type {Date}
         * @default Date.now
         */
        date: { type: Date, default: Date.now },
      },
    ],

    // --- Soft Delete Flag ---
    /**
     * Is Deleted
     * Soft delete flag
     * @type {Boolean}
     * @default false
     */
    is_deleted: { type: Boolean, default: false },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// ─────────────────────────────────────────────
// ─── INDEXES ────────────────────────────────
// ─────────────────────────────────────────────
TransferSchema.index({ transfer_number: 1 });
TransferSchema.index({ origin_site: 1 });
TransferSchema.index({ destination_site: 1 });
TransferSchema.index({ status: 1 });

// ─────────────────────────────────────────────
// ─── VALIDATIONS ─────────────────────────────
// ─────────────────────────────────────────────

// Ensure received qty ≤ dispatched qty
TransferSchema.path("items").validate(function (items) {
  return items.every((i) => i.received_quantity <= i.dispatched_quantity);
}, "Received quantity cannot exceed dispatched quantity");

// Ensure origin and destination sites are not same
TransferSchema.pre("validate", function (next) {
  if (this.origin_site?.toString() === this.destination_site?.toString()) {
    return next(new Error("Origin and destination sites cannot be the same."));
  }
  next();
});

// ─────────────────────────────────────────────
// ─── AUTO TIMELINE ON STATUS CHANGE ─────────
// ─────────────────────────────────────────────
TransferSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    this.timeline.push({
      action: this.status,
      user: this.updated_by || this.created_by,
      date: new Date(),
    });
  }
  next();
});

// ─────────────────────────────────────────────
// ─── AUTO ENTRY + TRANSFER NUMBER HOOK ──────
// ─────────────────────────────────────────────
TransferSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  try {
    const TransferModel = mongoose.model("InterSite_Inventory_Transfer");
    const Site = mongoose.model("site");
    const User = mongoose.model("User");

    // Step 1: Increment entry number per origin site
    const lastTransfer = await TransferModel.findOne({ origin_site: this.origin_site })
      .sort({ entry_number: -1 })
      .select("entry_number")
      .lean();

    this.entry_number = lastTransfer ? lastTransfer.entry_number + 1 : 1;

    // Step 2: Get site code
    const site = await Site.findById(this.origin_site).select("code").lean();
    const siteCode = site?.code || "SITE";

    // Step 3: Generate transfer number
    const paddedEntry = String(this.entry_number).padStart(5, "0");
    this.transfer_number = `MTN${siteCode}${paddedEntry}`;

    // Step 4: Auto-fill created_by_name
    if (this.created_by) {
      const user = await User.findById(this.created_by).select("name").lean();
      if (user) this.created_by_name = user.name;
    }

    next();
  } catch (err) {
    console.error("Error generating entry_number or transfer_number:", err);
    next(err);
  }
});

// ─────────────────────────────────────────────
// ─── EXPORT ─────────────────────────────────
// ─────────────────────────────────────────────
TransferSchema.set("autoIndex", config.db.autoIndex);
module.exports = mongoose.model("InterSite_Inventory_Transfer", TransferSchema);
