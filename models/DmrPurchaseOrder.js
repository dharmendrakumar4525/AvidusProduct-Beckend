/**
 * DMR Purchase Order Model
 * Mongoose schema for DMR (Delivery Material Receipt) Purchase Orders
 * 
 * A DMR Purchase Order tracks the delivery and receipt of materials against a Purchase Order.
 * It maintains details about received quantities, invoices, challans, and tracks
 * the status of material delivery (pending, completed, partial, hold).
 * 
 * This model links Purchase Orders to DMR Entries (invoices/challans) and tracks
 * the complete delivery cycle.
 */

const mongoose = require("mongoose");
const schema = mongoose.Schema;
const config = require("../config/env");

const DmrPurchaseOrderSchema = new mongoose.Schema(
  {
    companyIdf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "onboardingcompany",
        required: true
    },
    /**
     * DMR Number
     * Unique DMR identifier
     */
    DMR_number: {
      type: String,
    },
    
    /**
     * Purchase Order Number
     * Reference to the parent purchase order
     */
    po_number: {
      type: String,
    },
    
    /**
     * PR Type
     * Type of purchase request: "Project BOQ", "Site Establishment", or "Assets"
     */
    prType: {
      type: String,
      required: true,
    },
    
    /**
     * Open Order
     * Whether this is an open/recurring order
     */
    open_order: {
      type: String,
      enum: ['yes', 'no'],
      default: 'no'
    },
      order_Type: {
      type: String,
      enum: ["Purchase Order", "Work Order"],
      default: "Purchase Order",
    },
    
    /**
     * Billing Cycle
     * Frequency of billing for open orders
     */
    billing_cycle: {
      type: String,
      enum: ['hour', 'day', 'week', 'month', 'quarter', 'half_year', 'one_year']
    },
    
    /**
     * Purchase Request Number
     * PR number for reference
     */
    purchase_request_number: {
      type: String,
    },
    
    /**
     * Due Date
     * Expected delivery date
     */
    due_date: {
      type: Date,
      required: true,
    },
    
    /**
     * PO Date
     * Purchase order date
     */
    poDate: {
      type: Date,
      required: true,
    },
    
    /**
     * Title
     * Description or title of the DMR order
     */
    title: {
      type: String,
      required: true,
    },
    
    /**
     * Site
     * Reference to the site where materials are delivered
     */
    site: {
      type: schema.Types.ObjectId,
      required: true,
    },
    
    /**
     * Local Purchase
     * Whether this is a local purchase
     */
    local_purchase: {
      type: String,
      enum: ["yes", "no"],
      default: "yes",
    },
    
    /**
     * Rate Approval ID
     * Reference to rate approval document
     */
    rate_approval_id: {
      type: schema.Types.ObjectId,
    },
    
    /**
     * Date
     * DMR order creation date
     */
    date: {
      type: Date,
      required: true,
    },

    /**
     * Rate Approval Numbers
     * Array of rate approval numbers (for merged approvals)
     */
    rate_approval_numbers: [Number],
    
    /**
     * Purchase Request Numbers
     * Array of PR numbers (for merged PRs)
     */
    purchase_request_numbers: [String],

    /**
     * Merged PR
     * Array of merged purchase requests with their details
     */
    mergedPR: [
      {
        purchase_request_id: {
          type: schema.Types.ObjectId,
        },
        purchase_request_number: {
          type: Number,
        },
        date: {
          type: Date 
        },
        expected_delivery_date: {
          type: Date
        }
      }
    ], 

    /**
     * Items
     * Items with delivery details, received quantities, rates, etc.
     */
    items: {},

    /**
     * Status
     * Current delivery status
     * - pending: Awaiting delivery
     * - completed: Fully delivered
     * - partial: Partially delivered
     * - hold: Delivery on hold
     */
    status: {
      type: String,
      enum: ["pending", "completed", "partial", "hold"],
      default: "pending",
    },
    remarks: {
      type: String,
      default: "",
    },
    purchase_type: {
      type: String,
      enum: ["HO Approved", "local_purchase", "imprest"],
      default: "HO Approved",
    },
    closing_category: {
      type: String,
      default: "", 
    },
    closing_remark :{
      type: String,
      default: "", 
    },
    dmr_entries: [
      {
        type: schema.Types.ObjectId,
        required: true,
      },
    ],
    billing_address: {
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

        invoice_Freight_total: {
          freight: {
            type: Number,
            default: 0,
          },
          freightGst: {
            type: Number,
            default: 0,
          },
          totalfreight: {
            type: Number,
            default: 0,
          },
        },
        invoice_otherCharges_total: {
          charges: {
            type: Number,
            default: 0,
          },
          chargesGst: {
            type: Number,
            default: 0,
          },
          totalotherCharges: {
            type: Number,
            default: 0,
          },
        },
        invoice_tcs_total: {
          type: Number,
          default: 0,
        },
        invoice_total: {
          type: Number,
          default: 0,
        },

        vendorInvoiceTotal:{
          type: Number,
          default:0,
      },
      

        DebitNoteDetails: {
          itemDebitNoteAmount: {
            type: Number,
            default: 0,
          },
          itemDebitNoteGst: {
            type: Number,
            default: 0,
          },
          OthertotaldebitNoteAmount: {
            type: Number,
            default: 0,
          },
          otherTotalDebitNoteGST: {
            type: Number,
            default: 0,
          },
          totaldebitNoteAmount: {
            type: Number,
            default: 0,
          },
          debitNoteGST: {
            type: Number,
            default: 0,
          },
        },
         CreditNoteDetails:{
          type:Number,
          default: 0,
         }
      },
    ],

    DebitNotes:{
type:[schema.Types.ObjectId],
default: [],
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
      email:  {
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

     prHistory: [
        {
          _id: false,
          po_number:{type:String, required:true},
          DMR_entry_number: { type: String}, // Purchase Order Number
          updated_By: { type: schema.Types.ObjectId}, // User ID or Name
          updated_Date: { type: Date, default: Date.now }, // Store as Date, format later
          remark: { type: String}, // Remark or note
          status: { type: String, required: true }, // Status update
          
        }
      ],

    sign: {
      type: String,
      default: "",
    },
    terms_condition: {
      type: String,
      default: "",
    },
    variance_approval: {
      type: String,
      enum: ["","inital_approved", "approved", "rejected", "pending"],
      default: "",
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
DmrPurchaseOrderSchema.set("autoIndex", config.db.autoIndex);
module.exports = mongoose.model("dmr_purchase_order", DmrPurchaseOrderSchema);
