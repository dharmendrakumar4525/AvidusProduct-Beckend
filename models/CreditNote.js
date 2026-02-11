/**
 * Credit Note Model
 * Mongoose schema for Credit Notes
 * 
 * A Credit Note is a document issued by a vendor to settle debit notes raised by the buyer.
 * It represents an acknowledgment of the debit and reduces the amount payable to the vendor.
 * 
 * Credit Notes can settle one or more Debit Notes, either fully or partially.
 */

const mongoose = require("mongoose");
const schema = mongoose.Schema;

const creditNoteSchema = new mongoose.Schema(
  {
    /**
     * Credit Note Number
     * Unique identifier for the credit note (provided by vendor)
     */
    creditNoteNumber: { 
      type: String, 
      required: true
    },
    
    /**
     * Credit Note Date
     * Date when the credit note was issued by the vendor
     */
    creditNoteDate: { 
      type: Date, 
      required: true 
    },
    
    /**
     * Credit Note Amount
     * Total amount of the credit note
     */
    creditNoteAmount: { 
      type: Number, 
      required: true 
    },
    
    /**
     * Credit Note Document
     * URL or file path to the credit note document (PDF, image, etc.)
     */
    creditNoteDoc: { 
      type: String, 
      default: "", 
      required: true 
    },

    /**
     * Purchase Order Number
     * PO number this credit note is associated with
     */
    poNumber: {
      type: String,
      required: true,
    },

    /**
     * Vendor ID
     * Reference to the vendor who issued this credit note
     */
    vendorId: {
      type: schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    
    /**
     * Site
     * Reference to the site/location this credit note belongs to
     */
    site: {
      type: schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },

    /**
     * Settled Debit Notes
     * Array of debit notes that this credit note settles
     * A credit note can settle multiple debit notes, either fully or partially
     */
    settledDebitNotes: [
      {
        debitNoteId: {
          type: mongoose.Types.ObjectId,
          ref: "DebitNote",
          required: true,
        },
        debitNoteNumber: {
          type: String,
          required: true,
        },
        settledAmount: { 
          type: Number, 
          default: 0, 
          required: true 
        },
        status: {
          type: String,
          enum: ["pending", "partial", "settled"],
          default: "pending",
          // pending: Not yet applied
          // partial: Partially settled
          // settled: Fully settled
        },
      },
    ],

    /**
     * Created By
     * User who created this credit note record
     */
    created_by: String,
    
    /**
     * Updated By
     * User who last updated this credit note record
     */
    updated_by: String,
  },
  {
    // Enable automatic timestamps (createdAt, updatedAt)
    timestamps: true,
  }
);

// Export the Credit Note model
module.exports = mongoose.model("CreditNote", creditNoteSchema);
