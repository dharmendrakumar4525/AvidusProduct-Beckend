/**
 * Debit Note Model
 * Mongoose schema for Debit Notes
 * 
 * A Debit Note is a document raised by a buyer to a vendor indicating:
 * - Short supply of materials
 * - Rate differences
 * - Quality issues
 * - Other charges discrepancies
 * 
 * It tracks the financial impact and can be linked to credit notes for settlement
 */

const mongoose = require("mongoose");
const schema = mongoose.Schema;
const config = require("../config/env");

const debitNoteSchema = new schema(
  {
    companyIdf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "onboardingcompany",
        required: true
    },
    /**
     * Debit Note Number
     * Unique identifier for the debit note
     * Format: DN-YYYY-YYYY-XXXX or DNN_SITECODE_XXXX
     */
    debitNoteNumber: {
      type: String,
      required: true,
    },
    
    /**
     * Debit Entry Number
     * Sequential number for tracking entries per site
     * Used for generating debit note numbers
     */
    debitEntryNumber: {
      type: Number,
      required: true,
    },

    /**
     * Purchase Order Number
     * PO number this debit note is associated with
     */
    poNumber: {
      type: String,
      required: true,
    },

    /**
     * Vendor ID
     * Reference to the vendor this debit note is raised against
     */
    vendorId: {
      type: schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    
    /**
     * Vendor Details
     * Snapshot of vendor information at the time of debit note creation
     * Stored as object to preserve historical data
     */
    vendorDetail: {
      type: Object,
      required: true,
    },
    
    /**
     * Billing Address
     * Company billing address information
     */
    billingAddress: {
      type: Object,
      required: true,
    },
    
    /**
     * Delivery Address
     * Site delivery address where materials were received
     */
    delivery_address: {
      type: Object,
      required: true,
    },
    
    /**
     * Site
     * Reference to the site/location this debit note belongs to
     */
    site: {
      type: schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },

    /**
     * DMR Entries
     * Array of DMR (Delivery Material Receipt) entry references
     * These are the invoices/challans that this debit note is based on
     */
    dmrEntries: [
      {
        type: schema.Types.ObjectId,
        ref: "dmrEntry",
        required: true,
      },
    ],

    /**
     * Invoice Numbers
     * Array of invoice numbers associated with this debit note
     * Extracted from the DMR entries
     */
    InvoiceNumber: {
      type: [String],
      default: [],
    },

    /**
     * Items
     * Array of items with debit quantities and amounts
     * Each item includes quantities, rates, GST, and debit reasons
     */
    items: [
      {
        item_id: String, // Item reference ID
        item_name: String, // Item name
        uom: String, // Unit of measurement
        description: String, // Item description/specification
        po_qty: Number, // Quantity ordered in PO
        received_qty: Number, // Quantity actually received
        invoice_qty: Number, // Quantity mentioned in invoice
        rate: Number, // Rate per unit
        debit_qty: Number, // Quantity being debited
        invoice_rate: Number, // Rate mentioned in invoice
        debit_reason: String, // Reason for debit: short supply, rate mismatch, quality issue, etc.
        amount: Number, // Debit amount (debit_qty * rate)
        gst: Number, // GST amount on debit
        gst_percentage: Number, // GST percentage applied
      },
    ],

    /**
     * Additional Debits
     * Additional charges beyond item-level debits
     * Examples: freight differences, other charges, quality penalties, late delivery charges
     */
    additionalDebits: [
      {
        type: {
          type: String, // Type: freight, other, quality, late delivery, etc.
        },
        label: String, // Display label for the debit
        debit_reason: String, // Reason for additional debit
        amount: Number, // Debit amount
        gst: Number, // GST on additional debit
      },
    ],

    /**
     * Total Amount
     * Sum of all item amounts and additional debit amounts (excluding GST)
     */
    totalAmount: {
      type: Number,
      default: 0,
    },
    
    /**
     * Total GST
     * Sum of all GST amounts from items and additional debits
     */
    totalGST: {
      type: Number,
      default: 0,
    },
    
    /**
     * Grand Total
     * Total amount including GST (totalAmount + totalGST)
     */
    grandTotal: {
      type: Number,
      default: 0,
    },

    /**
     * Remarks
     * Additional notes or comments about the debit note
     */
    remarks: {
      type: String,
      default: "",
    },

    /**
     * Status
     * Current status of the debit note
     * - raised: Initial status when created
     * - sent: Sent to vendor via email
     * - partial: Partially settled via credit notes
     * - settled: Fully settled via credit notes
     */
    status: {
      type: String,
      enum: ["raised", "sent", "partial", "settled"],
      default: "raised",
    },

    /**
     * Vendor Status
     * Tracks communication status with vendor
     */
    vendorStatus: {
      emailed: {
        type: Boolean,
        default: false, // Whether debit note has been emailed to vendor
      },
      date: {
        type: Date, // Date when emailed to vendor
      },
    },

    /**
     * Created By
     * Reference to the user who created this debit note
     */
    createdBy: {
      type: schema.Types.ObjectId,
      required: true,
      ref: "User",
    },

    /**
     * Total Settled Amount
     * Sum of all amounts settled via credit notes
     */
    totalSettledAmount: { 
      type: Number, 
      default: 0 
    },

    /**
     * Credit Notes
     * Array of credit notes linked to this debit note for settlement
     * Tracks which credit notes have been used to settle this debit note
     */
    creditNote: [
      {
        creditNoteId: {
          type: mongoose.Types.ObjectId,
          ref: "CreditNote",
        },
        creditNoteNumber: { 
          type: String 
        },
        settledAmount: { 
          type: Number 
        },
        settledOn: { 
          type: Date, 
          default: Date.now 
        },
        creditNoteDoc: { 
          type: String // URL or path to credit note document
        },
      },
    ],
  },
  {
    // Enable automatic timestamps (createdAt, updatedAt)
    timestamps: true,
  }
);

// Export the Debit Note model
module.exports = mongoose.model("debitNote", debitNoteSchema);
