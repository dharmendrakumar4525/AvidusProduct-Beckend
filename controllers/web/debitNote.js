/**
 * Debit Note Controller
 * Handles all operations related to Debit Notes including:
 * - Creating debit notes from DMR entries
 * - Fetching and filtering debit notes
 * - Updating debit notes with automatic total recalculation
 * - Generating debit note numbers
 * - Finding eligible invoices for debit note creation
 */

// Import required models
const DMROrderSchema = require("../../models/DmrPurchaseOrder");
const UserSchema = require("../../models/User");
const DMREntrySchema = require("../../models/dmrEntry");
const DebitNote = require("../../models/DebitNote");
const Response = require("../../libs/response");
const ItemSchema = require("../../models/Item");
const { responseMessage } = require("../../libs/responseMessages");
const ObjectID = require("mongodb").ObjectID;

/**
 * Create Debit Note
 * POST /api/web/debitNote
 * Creates a new debit note record
 * 
 * @param {String} req.body.poNumber - Purchase order number (required)
 * @param {String} req.body.vendorId - Vendor ID (required)
 * @param {String} req.body.site - Site ID (required)
 * @param {Array} req.body.dmrEntries - Array of DMR entry IDs (required)
 * @param {Object} req.body - Additional debit note data (items, amounts, etc.)
 * 
 * @returns {Object} Created debit note object
 */
const createData = async (req, res) => {
  try {
    const { poNumber, vendorId, site, dmrEntries } = req.body;

    // Log creation attempt for debugging
    console.log(
      "Creating Debit Note with data:",
      req.body.poNumber,
      vendorId,
      site,
      dmrEntries
    );
    
    // Validate required fields
    if (!poNumber || !vendorId || !site || !dmrEntries?.length) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Create new debit note with empty credit note array
    const newDebitNote = await DebitNote.create({
      ...req.body,
      companyIdf: req.user.companyIdf,
      creditNote: [], // Initialize with empty credit notes array
    });

    res.send(newDebitNote);
  } catch (err) {
    console.error("Error creating debit note:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * Get Debit Notes List
 * GET /api/web/debitNote
 * Retrieves a list of debit notes with optional filtering
 * 
 * @param {String} req.query.site - Filter by site ID (optional)
 * @param {String} req.query.vendorId - Filter by vendor ID (optional)
 * @param {String} req.query.poNumber - Filter by purchase order number (optional)
 * @param {String} req.query.status - Filter by status: raised, sent, partial, settled (optional)
 * 
 * @returns {Array} Array of debit note objects with populated references
 */
const getList = async (req, res) => {
  try {
    const { site, vendorId, poNumber, status } = req.query;

    // Build filter object based on query parameters
    const filter = { companyIdf: req.user.companyIdf };
    if (site) filter.site = site;
    if (vendorId) filter.vendorId = vendorId;
    if (poNumber) filter.poNumber = poNumber;
    if (status) filter.status = status;

    // Fetch debit notes with filters, sorted by creation date (newest first)
    // Populate related DMR entries and Site information
    const debitNotes = await DebitNote.find(filter)
      .sort({ createdAt: -1 }) // Sort by creation date descending
      .populate("dmr_Entry") // Populate DMR entry references
      .populate("Site", "name") // Populate Site with only name field
      .lean(); // Return plain JavaScript objects instead of Mongoose documents

    res.send(debitNotes);
  } catch (err) {
    console.error("Error fetching debit notes:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * Update Debit Note
 * PUT /api/web/debitNote/:id
 * Updates an existing debit note and automatically recalculates totals
 * 
 * @param {String} req.params.id - Debit note ID (required)
 * @param {Object} req.body - Update data (items, additionalDebits, etc.)
 * 
 * @returns {Object} Updated debit note object
 */
const updateData = async (req, res) => {
  try {
    const debitNoteId = req.params.id;
    const updateData = req.body;

    // Check if debit note exists
    const debitNote = await DebitNote.findOne({ _id: debitNoteId, companyIdf: req.user.companyIdf });
    if (!debitNote) {
      return Response.error(res, 404, "Debit Note not found");
    }

    // Recalculate totals if items or additional debits are being updated
    if (updateData.items || updateData.additionalDebits) {
      // Use updated items or existing items from database
      const items = updateData.items || debitNote.items;
      const additionalDebits =
        updateData.additionalDebits || debitNote.additionalDebits;

      // Calculate total amount from items
      const itemTotal = items.reduce((sum, i) => sum + (i.amount || 0), 0);
      
      // Calculate total GST from items
      const itemGST = items.reduce((sum, i) => sum + (i.gst || 0), 0);
      
      // Calculate total amount from additional debits
      const otherTotal = additionalDebits.reduce(
        (sum, i) => sum + (i.amount || 0),
        0
      );
      
      // Calculate total GST from additional debits
      const otherGST = additionalDebits.reduce(
        (sum, i) => sum + (i.gst || 0),
        0
      );

      // Set calculated totals
      updateData.totalAmount = itemTotal + otherTotal;
      updateData.totalGST = itemGST + otherGST;
      updateData.grandTotal = updateData.totalAmount + updateData.totalGST;
    }

    // Update debit note and return updated document
    const updated = await DebitNote.findOneAndUpdate({ _id: debitNoteId, companyIdf: req.user.companyIdf }, updateData, {
      new: true, // Return updated document instead of original
    });

    return Response.success(res, 200, "Debit Note Updated", updated);
  } catch (err) {
    console.error("Error updating debit note:", err);
    return Response.error(res, 500, "Server error", err.message);
  }
};

/**
 * Get New Debit Note Number
 * GET /api/web/debitNote/getNewDebitNoteNumber/:siteId
 * Generates the next sequential debit note number for a site
 * Format: DN-YYYY-YYYY-XXXX (e.g., DN-2024-2025-0001)
 * 
 * @param {String} req.params.siteId - Site ID (required)
 * 
 * @returns {Object} Generated debit note number
 */
const getNewDebitNoteNumber = async (req, res) => {
  try {
    const { siteId } = req.params;

    // Validate site ID
    if (!siteId) {
      return Response.error(res, 400, "Site ID is required");
    }

    // Calculate financial year (current year to next year)
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const financialYear = `${currentYear}-${nextYear}`;

    // Find the latest Debit Note for the given site to get the last number
    const lastNote = await DebitNote.find({ site: siteId, companyIdf: req.user.companyIdf })
      .sort({ createdAt: -1 }) // Get most recent
      .limit(1)
      .lean();

    // Extract last number from debit note number string
    let lastNumber = 0;
    if (lastNote.length && lastNote[0].debitNoteNumber) {
      // Match the last sequence of digits in the debit note number
      const match = lastNote[0].debitNoteNumber.match(/(\d+)$/);
      if (match) lastNumber = parseInt(match[1]);
    }

    // Increment to get next number
    const newNumber = lastNumber + 1;
    
    // Format: DN-YYYY-YYYY-XXXX (pad with zeros to 4 digits)
    const debitNoteNumber = `DN-${financialYear}-${String(newNumber).padStart(
      4,
      "0"
    )}`;

    return Response.success(res, 200, "Generated Debit Note Number", {
      debitNoteNumber,
    });
  } catch (err) {
    console.error("Error generating debit note number:", err);
    return Response.error(res, 500, "Server error", err.message);
  }
};

/**
 * Get Eligible Invoices for Debit Note
 * GET /api/web/debitNote/open-debit-invoices
 * Returns DMR entries (invoices) that are eligible for debit note creation
 * Excludes invoices that are already used in other debit notes for the same PO
 * 
 * @param {String} req.query.poNumber - Purchase order number (required)
 * 
 * @returns {Array} Array of eligible DMR entry objects
 */
const getEligibleInvoicesForDebitNote = async (req, res) => {
  try {
    const { poNumber } = req.query;
    
    // Validate PO number
    if (!poNumber) {
      return res.status(400).json({ message: "poNumber is required" });
    }

    // Step 1: Find DMR entry IDs that are already referenced by existing Debit Notes for this PO
    // This prevents duplicate debit notes for the same invoice
    const usedDmrEntries = await DebitNote.find({ poNumber, companyIdf: req.user.companyIdf }).distinct(
      "dmrEntries"
    ); // Returns array of ObjectId strings

    // Step 2: Find invoice DMR entries for the PO that are NOT in the used list
    console.log(usedDmrEntries);
    const eligible = await DMREntrySchema.find({
      PONumber: poNumber,
      entry_type: "InvoiceNumber", // Only invoice entries, not challans
      _id: { $nin: usedDmrEntries || [] }, // Exclude already used DMR entries
      companyIdf: req.user.companyIdf,
    })
      .select(
        "InvoiceNumber PONumber invoice_date vendor_detail vendorInvoiceTotal DebitNoteDetails dmritem DMR_No"
      ) // Select only needed fields for performance
      .lean(); // Return plain objects

    return res.json([{ success: true, data: eligible }]);
  } catch (err) {
    console.error("eligible invoices error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Get Debit Note Data from DMR Entries
 * GET /api/web/debitNote/getDebitNoteFromDmr
 * Generates debit note data structure from selected DMR entries
 * Consolidates items, calculates totals, and prepares debit note for creation
 * 
 * @param {String} req.query.dmrIds - Comma-separated DMR entry IDs (required)
 * 
 * @returns {Object} Complete debit note data structure ready for creation
 */
const getDebitNoteDataFromDMR = async (req, res) => {
  try {
    // Parse comma-separated DMR IDs into array
    const dmrIds = req.query.dmrIds.split(",");

    // Validate DMR IDs
    if (!dmrIds || !Array.isArray(dmrIds) || dmrIds.length === 0) {
      return res.status(400).json({ message: "dmrIds array is required" });
    }

    // Fetch all selected DMR Entries
    const dmrEntries = await DMREntrySchema.find({ _id: { $in: dmrIds }, companyIdf: req.user.companyIdf });

    // Validate that DMR entries exist
    if (dmrEntries.length === 0) {
      return res.status(404).json({ message: "No DMR Entries found" });
    }
    
    // Extract invoice numbers from all DMR entries
    const invoiceNumbers = dmrEntries.map((d) => d.InvoiceNumber);
    
    // Find the highest debit entry number for the site to generate next number
    const dmrNumber = await DebitNote.findOne({
      site: ObjectID(dmrEntries[0].Site),
      companyIdf: req.user.companyIdf,
    })
      .sort({ debitEntryNumber: -1 }) // Sort descending to get highest number
      .select("debitEntryNumber");
    
    // Get the highest entry number or default to 0
    let highestNumber = dmrNumber ? dmrNumber.debitEntryNumber : 0;

    // Fetch DMR Purchase Order details for vendor and address information
    const dmrOrder = await DMROrderSchema.find({
      po_number: dmrEntries[0].PONumber,
      companyIdf: req.user.companyIdf,
    })
      .populate("vendor_detail", "name address") // Populate vendor details
      .populate("billingAddress", "address") // Populate billing address
      .lean();

    // Extract common information from first DMR entry
    // Note: All DMR entries should belong to same PO/vendor/site
    console.log("DMR Entries:", dmrEntries[0]);
    const poNumber = dmrEntries[0].PONumber;
    const vendorId = dmrEntries[0].vendor_detail._id;
    const site = dmrEntries[0].Site;

    // Initialize totals for debit note calculation
    let totalAmount = 0; // Total amount from items
    let totalGST = 0; // Total GST from items
    let AdditionalDebitNoteAmount = 0; // Additional debit amounts (rate differences, etc.)
    let AdditionalDebitNoteGST = 0; // GST on additional debits
    let freightDebit = 0; // Freight debit amount
    let otherChargesDebit = 0; // Other charges debit amount

    // Map to consolidate items by item_id (in case same item appears in multiple DMRs)
    const itemsMap = {};

    // Process each DMR entry to extract items and calculate totals
    dmrEntries.forEach((dmr) => {
      // Extract freight and other charges from DMR
      freightDebit = dmr.Freight.totalfreight;
      otherChargesDebit = dmr.otherCharges.totalotherCharges;
      
      // Process each item in the DMR entry
      dmr.dmritem.forEach((it) => {
        console.log(
          "Processing item:",
          it.Freight,
          "Debit Note Qty:",
          it.otherCharges
        );

        // Use item_id as key for consolidation
        const key = it.item.item_id.toString();

        // If item not seen before, create new entry
        if (!itemsMap[key]) {
          itemsMap[key] = {
            item_id: ObjectID(it.item.item_id),
            item_details: it.item,
            description: it.item.specification,
            po_qty: it.RequiredQuantity || 0,
            invoice_qty: it.invoiceQty || 0,
            received_qty: it.totalReceivedQuantity || 0,
            rate: it.Rate || 0,
            debit_qty: it.totalDebitNoteQty || 0,
            debit_reason: it.debit_reason || "",
            amount: it.totalDebitNoteQty * it.Rate || 0,
            gst_percentage: it.gst,
            gst: (it.totalDebitNoteQty * it.Rate * it.gst) / 100 || 0,
          };
        } else {
          // Consolidate quantities and amounts for duplicate items
          itemsMap[key].invoice_qty += it.invoiceQty || 0;
          itemsMap[key].gst_percentage = it.gst; // Use latest GST percentage
          itemsMap[key].received_qty += it.totalReceivedQuantity || 0;
          itemsMap[key].debit_qty +=
            it.totalDebitNoteQty || it.DebitNoteQty || 0;
          itemsMap[key].amount +=
            (it.totalDebitNoteQty || it.DebitNoteQty) * it.Rate || 0;
          itemsMap[key].gst +=
            ((it.totalDebitNoteQty || it.DebitNoteQty) * it.Rate * it.gst) /
              100 || 0;
        }

        // Accumulate totals
        totalAmount += it.totalDebitNoteQty * it.Rate || 0;
        totalGST += (it.gst * it.totalDebitNoteQty * it.Rate) / 100 || 0;
      });

      // Add additional debit note amounts from DMR
      totalAmount += dmr.DebitNoteDetails.OthertotaldebitNoteAmount;
      totalGST +=
        (dmr.DebitNoteDetails.OthertotaldebitNoteAmount *
          dmr.DebitNoteDetails.otherTotalDebitNoteGST) /
        100 || 0;
      
      // Accumulate additional debit amounts
      AdditionalDebitNoteAmount +=
        dmr.DebitNoteDetails.OthertotaldebitNoteAmount || 0;
      AdditionalDebitNoteGST +=
        (dmr.DebitNoteDetails.OthertotaldebitNoteAmount *
          dmr.DebitNoteDetails.otherTotalDebitNoteGST) /
        100 || 0;
    });

    // Convert items map to array
    console.log("Items Map:", itemsMap);
    const items = Object.values(itemsMap);
    
    // Add freight as a special item if invoice freight exceeds PO freight
    items.push({
      item_id: "",
      item_details: "Freight",
      description: "",
      po_qty: 0,
      invoice_qty: 0,
      received_qty: 0,
      rate: dmrOrder[0].vendors_total[0].freightTotal || 0,
      debit_qty: 0,
      invoice_rate:
        dmrOrder[0].vendors_total[0].invoice_Freight_total.totalfreight >
        dmrOrder[0].vendors_total[0].freightTotal
          ? freightDebit // Debit amount if invoice freight > PO freight
          : 0,
      debit_reason: "",
      amount:
        (dmrOrder[0].vendors_total[0].invoice_Freight_total.totalfreight >
        dmrOrder[0].vendors_total[0].freightTotal
          ? freightDebit
          : 0) || 0,
      gst_percentage: 0,
      gst: 0,
    });

    // Add other charges as a special item if invoice charges exceed PO charges
    items.push({
      item_id: "",
      item_details: "Other Charges",
      description: "",
      po_qty: 0,
      invoice_qty: 0,
      received_qty: 0,
      rate: dmrOrder[0].vendors_total[0].otherChargesTotal || 0,
      debit_qty: 0,
      invoice_rate:
        dmrOrder[0].vendors_total[0].invoice_otherCharges_total.totalotherCharges >
        dmrOrder[0].vendors_total[0].otherChargesTotal
          ? otherChargesDebit // Debit amount if invoice charges > PO charges
          : 0,
      debit_reason: "",
      amount:
        dmrOrder[0].vendors_total[0].invoice_otherCharges_total.totalotherCharges >
        dmrOrder[0].vendors_total[0].otherChargesTotal
          ? otherChargesDebit
          : 0,
      gst_percentage: 0,
      gst: 0,
    });

    // Calculate grand total
    const grandTotal = totalAmount + totalGST;
    
    // Format debit entry number with leading zeros
    const debitNoteNumberFormatted = String(highestNumber + 1).padStart(4, "0");
    
    // Prepare complete Debit Note data structure
    const debitNoteData = {
      debitNoteNumber: `DNN_${dmrOrder[0].delivery_address.site_code}_${debitNoteNumberFormatted}`, // Format: DNN_SITECODE_XXXX
      debitEntryNumber: highestNumber + 1, // Incremented sequential number
      poNumber,
      vendorId,
      vendorDetail: dmrOrder[0].vendor_detail, // Vendor information
      billingAddress: dmrOrder[0].billing_address || "",
      delivery_address: dmrOrder[0].delivery_address || "",
      site,
      dmrEntries: dmrIds.map((id) => new ObjectID(id)), // Convert string IDs to ObjectIDs
      InvoiceNumber: invoiceNumbers, // Array of invoice numbers
      items, // Consolidated items array
      additionalDebits: [
        {
          type: "Rate Difference",
          debit_reason: "",
          amount: AdditionalDebitNoteAmount,
          gst: AdditionalDebitNoteGST,
        },
      ], // Additional debits can be added later from UI
      totalAmount,
      totalGST,
      grandTotal,
      remarks: "",
      status: "raised", // Initial status
      createdBy: req.user?.name || "system", // Creator name (if auth is enabled)
      documentUrl: "",
      creditNote: {}, // Empty credit note object
    };

    res.json([{ data: debitNoteData }]);
  } catch (err) {
    console.error("Error fetching debit note data:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Export all controller functions
module.exports = {
  getList,
  createData,
  updateData,
  getNewDebitNoteNumber,
  getEligibleInvoicesForDebitNote,
  getDebitNoteDataFromDMR,
};
