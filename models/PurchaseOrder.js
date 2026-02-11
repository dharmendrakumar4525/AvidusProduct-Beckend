/**
 * Purchase Order Model
 * Mongoose schema for Purchase Orders
 * 
 * A Purchase Order is a commercial document issued by a buyer to a vendor,
 * indicating types, quantities, and agreed prices for products or services.
 * 
 * Purchase Orders go through various statuses: pending, approved, rejected, revised, etc.
 * They track the complete lifecycle from creation to delivery and payment.
 */

const mongoose = require("mongoose");
const schema = mongoose.Schema;
const config = require("../config/env");

const PurchaseOrderSchema = new mongoose.Schema(
  {
    /**
     * Purchase Order Number
     * Unique identifier for the purchase order
     */
    po_number: {
      type: String,
      required: true,
    },
    
    /**
     * PR Type (Purchase Request Type)
     * Type of purchase request this PO is based on
     */
    prType: {
      type: String,
      enum: ["Project BOQ", "Site Establishment", "Assets"],
      required: true,
    },
    /**
     * Purchase Request ID
     * Reference to the purchase request this PO is created from
     */
    purchase_request_id: {
      type: schema.Types.ObjectId,
    },
    
    /**
     * Purchase Request Number
     * PR number for reference
     */
    purchase_request_number: {
      type: String,
      required: true,
    },
    
    /**
     * Order Type
     * Type of order: Purchase Order or Work Order
     */
    order_Type: {
      type: String,
      enum: ["Purchase Order", "Work Order"],
      default: "Purchase Order",
    },
    
    /**
     * Open Order
     * Whether this is an open order (ongoing/recurring) or closed order
     */
    open_order: {
      type: String,
      enum: ["yes", "no"],
      default: "no",
    },
    
    /**
     * Billing Cycle
     * Frequency of billing for open orders
     */
    billing_cycle: {
      type: String,
      enum: [
        "hour",
        "day",
        "week",
        "month",
        "quarter",
        "half_year",
        "one_year",
      ],
    },
    
    /**
     * Title
     * Description or title of the purchase order
     */
    title: {
      type: String,
      required: true,
    },
    
    /**
     * Site
     * Reference to the site/location this PO belongs to
     */
    site: {
      type: schema.Types.ObjectId,
      required: true,
    },
    
    /**
     * Local Purchase
     * Whether this is a local purchase or centralized purchase
     */
    local_purchase: {
      type: String,
      enum: ["yes", "no"],
      default: "yes",
    },
    /**
     * Rate Approval ID
     * Reference to the rate approval document
     */
    rate_approval_id: {
      type: schema.Types.ObjectId,
      required: false,
    },
    
    /**
     * Approved By
     * User who approved this purchase order
     */
    approved_by: {
      type: String,
      required: false,
    },
    
    /**
     * Date
     * PO creation date
     */
    date: {
      type: Date,
      required: true,
    },
    
    /**
     * PO Date
     * Official purchase order date
     */
    poDate: {
      type: Date,
    },
    
    /**
     * PO Start Date
     * Start date for the order (for open orders)
     */
    poStartDate: {
      type: Date,
    },
    
    /**
     * Due Date
     * Expected delivery or completion date
     */
    due_date: {
      type: Date,
    },
    
    /**
     * Vendor Files
     * Files uploaded by vendor (acceptance, quotations, etc.)
     */
    vendor_files: {
      type: Object,
      required: false,
    },

    /**
     * PO Files
     * Purchase order document files (PDFs, etc.)
     */
    po_files: {
      type: [String],
      required: false,
    },

    /**
     * Items
     * Array of items in the purchase order with quantities, rates, specifications
     */
    items: {},

    /**
     * Status
     * Current status of the purchase order
     * - pending: Initial status, awaiting approval
     * - approved: Approved and sent to vendor
     * - rejected: Rejected by approver
     * - revise: Needs revision
     * - revised: Has been revised
     * - ApprovalPending: Awaiting approval
     */
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "revise", "revised", "ApprovalPending"],
      default: "pending",
    },
    remarks: {
      type: String,
      default: "",
    },

    prHistory: [
      {
        _id: false,
        po_number: { type: String }, // Purchase Order Number
        updated_By: { type: schema.Types.ObjectId }, // User ID or Name
        updated_Date: { type: Date, default: Date.now }, // Store as Date, format later
        status: { type: String, required: true }, // Status update
      },
    ],

    billing_address: {
      code: {
        type: String,
        default: "",
      },
      company_name: {
        type: String,
        default: "",
      },
      gst_number: {
        type: String,
        default: "",
      },
      pan_card: {
        type: String,
        default: "",
      },
      contact_person: {
        type: String,
        default: "",
      },
      email: {
        type: String,
        default: "",
      },
      street_address: {
        type: String,
        default: "",
      },
      street_address2: {
        type: String,
        default: "",
      },
      state: {
        type: String,
        default: "",
      },
      city: {
        type: String,
        default: "",
      },
      zip_code: {
        type: String,
        default: "",
      },
      country: {
        type: String,
        default: "",
      },
    },
    delivery_address: {
      company_name: {
        type: String,
        default: "",
      },
      site_code: {
        type: String,
        default: "",
      },
      gst_number: {
        type: String,
        default: "",
      },
      pan_card: {
        type: String,
        default: "",
      },
      contact_person: {
        type: String,
        default: "",
      },
      contact_number: {
        type: String,
        default: "",
      },
      email: {
        type: String,
        default: "",
      },
      street_address: {
        type: String,
        default: "",
      },
      street_address2: {
        type: String,
        default: "",
      },
      state: {
        type: String,
        default: "",
      },
      city: {
        type: String,
        default: "",
      },
      zip_code: {
        type: String,
        default: "",
      },
      country: {
        type: String,
        default: "",
      },
    },
    vendors_total: [
      {
        gstAmount: { type: Number, default: 0 },
        GSTDetails: { type: Object, default: {} },
        freightTotal: { type: Number, default: 0 },
        freightGST: { type: Number, default: 0 },
        freight: { type: Number, default: 0 },
        subTotal: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        _id: { type: String },
        otherChargesTotal: { type: Number, default: 0 },
        otherChargesGST: { type: Number, default: 0 },
        otherCharges: { type: Number, default: 0 },
        Vendor: { type: String },
        category: { type: String },
        subCategory: { type: String },
      },
    ],
    vendor_detail: {
      vendor_name: {
        type: String,
        //required: true
      },
      address: {
        street_address: {
          type: String,
          default: "",
        },
        street_address2: {
          type: String,
          default: "",
        },
        state: {
          type: String,
          default: "",
        },
        city: {
          type: String,
          default: "",
        },
        zip_code: {
          type: String,
          default: "",
        },
        country: {
          type: String,
          default: "",
        },
      },
      contact_person: {
        type: String,
        default: "",
      },
      _id: {
        type: String,
        default: "",
      },
      dialcode: {
        type: Number,
        //required: true
      },
      phone_number: {
        type: [String],
        default: [],
      },
      gst_number: {
        type: String,
        default: "",
      },
      pan_number: {
        type: String,
        //require: true,
        default: "",
      },
      email: {
        type: [String],
        default: [],
      },
      payment_terms: {
        type: String,
        default: "",
      },
      terms_condition: {
        type: String,
        default: "",
      },
    },
    vendor_message_header: {
      type: String,
      default: "",
    },
    vendor_message: {
      type: String,
      default: "",
    },
    sign: {
      type: String,
      default: "",
    },
    terms_condition: {
      type: String,
      default: "",
    },

    purchase_request_numbers: [String],
    rate_Approvals: [String],

    mergedPR: [
      {
        purchase_request_id: {
          type: schema.Types.ObjectId,
        },
        purchase_request_number: {
          type: Number,
        },
        date: {
          type: Date,
        },
      },
    ],
    revision: [
      {
        revisionNo: {
          type: Number,
          default: 0,
        },
        revisionRemarks: {
          type: String,
          default: "",
        },
        po_number: {
          type: String,
          
        },
        poStartDate: {
          type: Date,
          default: Date.now,
        },
        due_Date: {
          type: Date,
          default: Date.now,
        },
        revisionDate: {
          type: Date,
          default: Date.now,
        },
        items: {
          type: [Object],
          default: [],
          required: false,
        },
        terms_condition: {
          type: String,
          default: "",
        },
        vendors_total: [
          {
            gstAmount: { type: Number, default: 0 },
            GSTDetails: { type: Object, default: {} },
            freightTotal: { type: Number, default: 0 },
            freightGST: { type: Number, default: 0 },
            freight: { type: Number, default: 0 },
            subTotal: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
            _id: { type: String },
            otherChargesTotal: { type: Number, default: 0 },
            otherChargesGST: { type: Number, default: 0 },
            otherCharges: { type: Number, default: 0 },
            Vendor: { type: String },
            category: { type: String },
            subCategory: { type: String },
          },
        ],
      },
    ],

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
PurchaseOrderSchema.set("autoIndex", config.db.autoIndex);
module.exports = mongoose.model("purchase_order", PurchaseOrderSchema);
