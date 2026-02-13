/**
 * DMR Entry Model
 * Schema for storing Delivery Material Receipt (DMR) entries
 * 
 * This model tracks material receipts against purchase orders, including
 * gate entry details, challan/invoice information, and debit note tracking.
 * 
 * Purchase Types:
 * - HO Approved: Head office approved purchase
 * - local_purchase: Local purchase
 * - imprest: Imprest purchase
 * 
 * Challan Status:
 * - open: Challan is open (partial receipt)
 * - closed: Challan is closed (fully received)
 * 
 * DMR Status:
 * - open: DMR is open
 * - completed: DMR is completed
 * 
 * Key Features:
 * - Gate entry tracking (date, time, register entry)
 * - Challan and invoice management
 * - Debit note tracking and calculations
 * - Freight and other charges breakdown
 * - Vendor details embedded
 * - Document submission tracking
 * - Audit remarks
 * 
 * Fields:
 * - DMR_No: DMR number
 * - entryNo: Entry number
 * - entry_type: Type of entry
 * - dmritem: Array of DMR items
 * - challanStatus: Status of challan (open/closed)
 * - closedChallan: Array of closed challans
 * - DebitNoteDetails: Debit note financial breakdown
 * - Freight: Freight charges breakdown
 * - otherCharges: Other charges breakdown
 * - vendor_detail: Embedded vendor information
 */

const mongoose = require("mongoose");
const schema = mongoose.Schema;
const config = require("../config/env");

const dmrEntrySchema = new mongoose.Schema(
  {
    companyIdf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "onboardingcompany",
        required: true
    },
    /**
     * PO Number
     * Purchase order number
     * @type {String}
     */
    PONumber: {
      type: String,
    },
    
    /**
     * PR Number
     * Purchase request number
     * @type {String}
     */
    PRNumber: {
      type: String,
    },
    
    /**
     * Name of Organization
     * Organization name
     * @type {String}
     * @required
     */
    NameOfOrg: {
      type: String,
      required: true,
    },
    
    /**
     * PR Type
     * Purchase request type
     * @type {String}
     * @required
     */
    prType: {
      type: String,
      required: true,
    },

    /**
     * Site
     * Site name
     * @type {String}
     * @required
     */
    Site: {
      type: String,
      required: true,
    },
    
    /**
     * PO Date
     * Purchase order date
     * @type {String}
     * @required
     */
    poDate: {
      type: String,
      required: true,
    },
    
    /**
     * Final Delivery Date
     * Expected final delivery date
     * @type {String}
     * @required
     */
    FinalDeliveryDate: {
      type: String,
      required: true,
    },
    
    /**
     * Vendor Name
     * Vendor name
     * @type {String}
     * @required
     */
    VendorName: {
      type: String,
      required: true,
    },
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
     * DMR Number
     * Delivery Material Receipt number
     * @type {String}
     * @required
     */
    DMR_No: {
      type: String,
      required: true,
    },
    
    /**
     * Entry Number
     * Sequential entry number
     * @type {Number}
     * @required
     */
    entryNo: {
      type: Number,
      required: true,
    },
    
    /**
     * Entry Type
     * Type of DMR entry
     * @type {String}
     * @required
     */
    entry_type: {
      type: String,
      required: true,
    },
    
    /**
     * DMR Date
     * Date of DMR
     * @type {String}
     * @required
     */
    dmrdate: {
      type: String,
      required: true,
    },

    /**
     * Gate Register Entry
     * Gate register entry number
     * @type {String}
     * @required
     */
    GateRegisterEntry: {
      type: String,
      required: true,
    },

    /**
     * Special Case
     * Special case identifier
     * @type {String}
     * @default "none"
     */
    specialCase: {
      type: String,
      default: "none",
    },
    
    /**
     * Gate Entry Date
     * Date of gate entry
     * @type {String}
     * @required
     */
    GateEntry_Date: {
      type: String,
      required: true,
    },
    
    /**
     * Gate Entry Time
     * Time of gate entry
     * @type {String}
     * @required
     */
    GateEntry_Time: {
      type: String,
      required: true,
    },
    
    /**
     * Mode
     * Mode of transport
     * @type {String}
     */
    mode: {
      type: String,
    },
    
    /**
     * Vehicle Number
     * Vehicle registration number
     * @type {String}
     */
    VehicleNumber: {
      type: String,
    },
    
    /**
     * Challan Number
     * Challan number
     * @type {String}
     */
    ChallanNumber: {
      type: String,
    },
    
    /**
     * Challan Date
     * Date of challan
     * @type {String}
     */
    challan_date: {
      type: String,
    },

    /**
     * Invoice Number
     * Invoice number
     * @type {String}
     */
    InvoiceNumber: {
      type: String,
    },
    
    /**
     * Invoice Date
     * Date of invoice
     * @type {String}
     */
    invoice_date: {
      type: String,
    },
    
    /**
     * Invoice or Challan Document
     * Document URL/path
     * @type {String}
     * @required
     */
    InvoiceOrChallanDoc: {
      type: String,
      required: true,
    },
    
    /**
     * Challan Status
     * Status of challan
     * @type {String}
     * @enum ["open", "closed"]
     * @default "open"
     */
    challanStatus: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
    
    /**
     * Closed Challan
     * Array of closed challan details
     * @type {Array}
     */
    closedChallan: [],
    
    /**
     * DMR Items
     * Array of items in the DMR
     * @type {Array}
     */
    dmritem: [],

    /*---------*/

    DateOfDocSubmissionToHO: {
      type: Date,
    },

    remarksForAudit: {
      type: String,
    },

    /* 
    DateOfReceivingDocsAtHO:{
        type: Date,
    },
    RemarkByAudit:{
        type: String,
    },
    PaymentStatus:{
        type: String,
        default:'Pending'
    },
    UTR_No:{
        type: String,
    },
    AccountsRemark:{
        type: String,
    }, */

    TotalAmount: {
      type: Number,
    },

    vendorInvoiceTotal: {
      type: Number,
    },

    /**
     * Debit Note Number
     * Debit note number (if applicable)
     * @type {String}
     */
    debitNoteNumber: {
      type: String,
    },
    
    /**
     * Debit Note Details
     * Financial breakdown of debit note
     * @type {Object}
     */
    DebitNoteDetails: {
      /**
       * Item Debit Note Amount
       * Debit note amount for items
       * @type {Number}
       * @default 0
       */
      itemDebitNoteAmount: {
        type: Number,
        default: 0,
      },
      
      /**
       * Item Debit Note GST
       * GST on item debit note
       * @type {Number}
       * @default 0
       */
      itemDebitNoteGst: {
        type: Number,
        default: 0,
      },
      
      /**
       * Other Total Debit Note Amount
       * Debit note amount for other charges
       * @type {Number}
       * @default 0
       */
      OthertotaldebitNoteAmount: {
        type: Number,
        default: 0,
      },
      
      /**
       * Other Total Debit Note GST
       * GST on other charges debit note
       * @type {Number}
       * @default 0
       */
      otherTotalDebitNoteGST: {
        type: Number,
        default: 0,
      },
      
      /**
       * Total Debit Note Amount
       * Total debit note amount
       * @type {Number}
       * @default 0
       */
      totaldebitNoteAmount: {
        type: Number,
        default: 0,
      },
      
      /**
       * Debit Note GST
       * Total GST on debit note
       * @type {Number}
       * @default 0
       */
      debitNoteGST: {
        type: Number,
        default: 0,
      },
    },
    
    /**
     * Freight
     * Freight charges breakdown
     * @type {Object}
     */
    Freight: {
      /**
       * Freight
       * Base freight charges
       * @type {Number}
       */
      freight: {
        type: Number,
      },
      
      /**
       * Freight GST
       * GST on freight
       * @type {Number}
       */
      freightGst: {
        type: Number,
      },
      
      /**
       * Total Freight
       * Total freight including GST
       * @type {Number}
       */
      totalfreight: {
        type: Number,
      },
    },
    
    /**
     * Other Charges
     * Other charges breakdown
     * @type {Object}
     */
    otherCharges: {
      /**
       * Charges
       * Base other charges
       * @type {Number}
       */
      charges: {
        type: Number,
      },
      
      /**
       * Charges GST
       * GST on other charges
       * @type {Number}
       */
      chargesGst: {
        type: Number,
      },
      
      /**
       * Total Other Charges
       * Total other charges including GST
       * @type {Number}
       */
      totalotherCharges: {
        type: Number,
      },
    },
    
    /**
     * TCS Charges
     * Tax Collected at Source charges
     * @type {Number}
     */
    tcsCharges: {
      type: Number,
    },

    /**
     * Purchase Type
     * Type of purchase
     * @type {String}
     * @enum ["HO Approved", "local_purchase", "imprest"]
     * @default "HO Approved"
     */
    purchase_type: {
      type: String,
      enum: ["HO Approved", "local_purchase", "imprest"],
      default: "HO Approved",
    },

    /**
     * Status
     * DMR status
     * @type {String}
     * @enum ["open", "completed"]
     * @default "pending"
     */
    status: {
      type: String,
      enum: ["open", "completed"],
      default: "pending",
    },
    remarks: {
      type: String,
      default: "",
    },

    vendor_detail: {
      vendor_name: {
        type: String,
        required: true,
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
        //required:true
      },
      _id: {
        type: String,
        default: "",
      },
      dialcode: {
        type: Number,
        //required:true
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
        //require:true,
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
dmrEntrySchema.set("autoIndex", config.db.autoIndex);
module.exports = mongoose.model("dmr_Entry", dmrEntrySchema);
