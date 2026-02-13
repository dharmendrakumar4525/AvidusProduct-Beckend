/**
 * Imprest DMR Entry Model
 * Schema for storing Imprest Delivery Material Receipt (DMR) entries
 * 
 * Imprest DMR entries track material receipts with gate entry details,
 * bill information, and audit tracking
 * 
 * Fields:
 * - Site, SiteCode: Site information
 * - imprestnumber: Imprest number
 * - DMR_No, dmrdate: DMR number and date
 * - Gate entry details: GateRegisterEntry, GateEntry_Date, GateEntry_Time
 * - Vehicle and mode information
 * - Bill details: BillNumber, bill_date, BillDoc
 * - dmritem: Array of DMR items
 * - Audit tracking: DateOfDocSubmissionToHO, remarksForAudit
 * - Financial: TotalAmount, otherCharges
 * - Status and remarks
 */

const mongoose = require("mongoose");
const schema = mongoose.Schema;
const config = require("../config/env");

const ImprestDmrEntrySchema = new mongoose.Schema(
  {
    companyIdf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "onboardingcompany",
        required: true
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
     * Site Code
     * Site code
     * @type {String}
     * @required
     */
    SiteCode: {
      type: String,
      required: true,
    },

    /**
     * Imprest Number
     * Imprest number for tracking
     * @type {Number}
     * @required
     * @default 1
     */
    imprestnumber: {
      type: Number,
      required: true,
      default: 1,
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
     * Bill Number
     * Bill/invoice number
     * @type {String}
     * @required
     */
    BillNumber: {
      type: String,
      required: true,
    },
    
    /**
     * Bill Date
     * Date of bill
     * @type {String}
     * @required
     */
    bill_date: {
      type: String,
      required: true,
    },

    /**
     * Bill Document
     * Bill document URL/path
     * @type {String}
     * @required
     */
    BillDoc: {
      type: String,
      required: true,
    },

    /**
     * DMR Items
     * Array of items in the DMR
     * @type {Array}
     */
    dmritem: [],

    /**
     * Date of Document Submission to HO
     * Date when documents were submitted to head office
     * @type {Date}
     */
    DateOfDocSubmissionToHO: {
      type: Date,
    },

    /**
     * Remarks for Audit
     * Remarks for audit purposes
     * @type {String}
     */
    remarksForAudit: {
      type: String,
    },

    /**
     * Total Amount
     * Total amount of the DMR
     * @type {Number}
     */
    TotalAmount: {
      type: Number,
    },
    
    /**
     * Other Charges
     * Additional charges breakdown
     * @type {Object}
     */
    otherCharges: {
      /**
       * Charges
       * Base charges amount
       * @type {Number}
       */
      charges: {
        type: Number,
      },
      
      /**
       * Charges GST
       * GST on charges
       * @type {Number}
       */
      chargesGst: {
        type: Number,
      },
      
      /**
       * Total Other Charges
       * Total of other charges including GST
       * @type {Number}
       */
      totalotherCharges: {
        type: Number,
      },
    },

    /**
     * Status
     * Status of the DMR entry
     * @type {String}
     * @default "completed"
     */
    status: {
      type: String,
      default: "completed",
    },
    
    /**
     * Remarks
     * General remarks
     * @type {String}
     * @default ""
     */
    remarks: {
      type: String,
      default: "",
    },

    /**
     * Created By
     * User who created the entry
     * @type {String}
     */
    created_by: String,
    
    /**
     * Updated By
     * User who last updated the entry
     * @type {String}
     */
    updated_by: String,
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);
ImprestDmrEntrySchema.set("autoIndex", config.db.autoIndex);
module.exports = mongoose.model("Imprest_Dmr_Entry", ImprestDmrEntrySchema);
