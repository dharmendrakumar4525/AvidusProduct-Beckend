/**
 * Credit Note Controller
 * Handles all operations related to Credit Notes including:
 * - Creating credit notes from vendor documents
 * - Settling debit notes using credit notes (FIFO method)
 * - Tracking partial and full settlements
 * - Linking credit notes to debit notes
 */

const DMREntrySchema = require("../../models/dmrEntry");
const DebitNote = require("../../models/DebitNote");
const DMRorder = require("../../models/DmrPurchaseOrder");
const CreditNote = require("../../models/CreditNote");
const Response = require("../../libs/response");
const ItemSchema = require("../../models/Item");
const { responseMessage } = require("../../libs/responseMessages");
const ObjectID = require("mongodb").ObjectID;

/**
 * Create Credit Note
 * POST /api/web/creditNote
 * Creates a credit note and automatically settles debit notes using FIFO method
 * 
 * Settlement Logic:
 * - If specific debit note IDs provided, settles only those
 * - If no IDs provided, uses FIFO (First In First Out) to settle oldest pending debit notes
 * - Can partially or fully settle debit notes
 * - Updates debit note status (pending → partial → settled)
 * 
 * @param {String} req.body.creditNoteNumber - Credit note number from vendor (required)
 * @param {Date} req.body.creditNoteDate - Credit note date (required)
 * @param {Number} req.body.creditNoteAmount - Credit note amount (required)
 * @param {String} req.body.creditNoteDoc - Credit note document URL/path (required)
 * @param {String} req.body.poNumber - Purchase order number (required)
 * @param {String} req.body.vendorId - Vendor ID (required)
 * @param {String} req.body.site - Site ID (required)
 * @param {String} req.body.debitNoteIds - Specific debit note IDs to settle (optional, if empty uses FIFO)
 * @param {String} req.body.created_by - User who created the credit note
 * 
 * @returns {Object} Created credit note with settled debit notes
 */
const createData = async (req, res) => {
  try {
    const {
      creditNoteNumber,
      creditNoteDate,
      creditNoteAmount,
      creditNoteDoc,
      poNumber,
      vendorId,
      site,
      debitNoteIds, // Optional: specific debit notes to settle
      created_by,
    } = req.body;

    // Track remaining credit note amount available for settlement
    let remainingAmount = creditNoteAmount;

    // Create credit note record
    const creditNote = await CreditNote.create({
      creditNoteNumber,
      creditNoteDate,
      creditNoteAmount,
      creditNoteDoc,
      poNumber,
      vendorId,
      site,
      created_by,
      debitNoteIds,
      settledDebitNotes: [], // Will be populated during settlement
    });

    let debitNotesToSettle;
    let debitNoteId = [];
    
    // Convert debit note IDs string to array if provided
    if (debitNoteIds !== "") {
      debitNoteId = [ObjectID(debitNoteIds)];
    }
    
    // Step 2: Determine which debit notes to settle
    if (debitNoteId && debitNoteId.length > 0) {
      // Specific debit notes provided - settle only those
      debitNotesToSettle = await DebitNote.find({
        _id: { $in: debitNoteId },
        vendorId,
        site,
        status: { $ne: "settled" }, // Exclude already settled debit notes
      }).sort({ createdAt: 1 }); // Sort by creation date (oldest first)
    } else {
      // FIFO method: Get all pending/partial debit notes for this vendor and site
      // Settle oldest debit notes first
      debitNotesToSettle = await DebitNote.find({
        vendorId,
        site,
        status: { $ne: "settled" }, // Get pending or partial debit notes
      }).sort({ createdAt: 1 }); // Oldest first (FIFO)
    }
    
    console.log("Debit Notes to Settle:", debitNotesToSettle.length);
    
    // Step 3: Loop through debit notes and settle with credit note
    for (const debit of debitNotesToSettle) {
      // Stop if no remaining credit amount
      if (remainingAmount <= 0) break;

      // Calculate outstanding amount for this debit note
      const outstandingAmount = debit.grandTotal - debit.totalSettledAmount;
      
      // Settle the minimum of remaining credit amount and outstanding debit amount
      const settleAmount = Math.min(remainingAmount, outstandingAmount);
      
      // Update DebitNote: Add credit note reference
      debit.creditNote.push({
        creditNoteId: creditNote._id,
        creditNoteNumber: creditNote.creditNoteNumber,
        settledAmount: settleAmount,
        creditNoteDoc: creditNote.creditNoteDoc,
      });

      // Update debit note totals and status
      debit.totalSettledAmount += settleAmount;
      // Update status: settled if fully paid, partial if partially paid
      debit.status =
        debit.totalSettledAmount >= debit.grandTotal ? "settled" : "partial";
      
      console.log(debit);
      await debit.save();

      // Update CreditNote: Add settled debit note reference
      creditNote.settledDebitNotes.push({
        debitNoteId: debit._id,
        debitNoteNumber: debit.debitNoteNumber,
        settledAmount: settleAmount,
        status: debit.status, // pending, partial, or settled
      });

      // Reduce remaining credit amount
      remainingAmount -= settleAmount;
    }

    // Step 4: Save final credit note with updated settledDebitNotes
    await creditNote.save();

    res.status(201).json({
      message: "Credit note created and debit notes settled successfully",
      creditNote,
    });
  } catch (error) {
    console.error("Error creating credit note:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { createData };
