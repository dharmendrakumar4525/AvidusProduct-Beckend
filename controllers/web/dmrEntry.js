/**
 * DMR Entry Controller
 * Handles all operations related to DMR (Delivery Material Receipt) entries including:
 * - Creating DMR entries for invoices and challans
 * - Updating DMR entries and closing challans
 * - Inventory updates when materials are received
 * - DMR number generation and validation
 * - Gate entry validation
 * - Duplicate invoice/challan checking
 */

const dmrEntry = require("../../models/dmrEntry");
const Imprest_Dmr_Entry = require("../../models/ImprestDmrEntry");
const UserSchema = require("../../models/User");
const mongoose = require("mongoose");
const { createInventoryData } = require("../web/inventoryIn");
const { createOrUpdateInventory } = require("../web/inventory");
const Response = require("../../libs/response");
const ObjectID = require("mongodb").ObjectID;
const { responseMessage } = require("../../libs/responseMessages");
const { updateActivityLog } = require("./utilityController");
const {
  getCache,
  setCache,
  invalidateEntity,
  invalidateEntityList,
} = require("../../utils/cache");
const { TRANSACTIONAL } = require("../../libs/cacheConfig");

/**
 * Create DMR Entry
 * POST /api/web/dmr_entry
 * Creates a new DMR entry for invoice or challan
 * Automatically updates inventory when materials are received
 * Closes related challans when invoice is created
 * 
 * @param {Array} req.body.dmritem - Array of items received in this DMR
 * @param {String} req.body.Site - Site ID where materials are received
 * @param {String} req.body.InvoiceNumber - Invoice number (for invoice entries)
 * @param {Array} req.body.closedChallan - Array of challan IDs to close when invoice is created
 * @param {Object} req.body.vendor_detail - Vendor information
 * @param {String} req.body.prType - PR type: "Project BOQ", "Site Establishment", or "Assets"
 * @param {Object} req.body - Other DMR entry fields
 * 
 * @returns {Object} Created DMR entry object
 */
async function createData(req, res) {
  try {
    var dataObject = req.body;
    const {
      dmritem,
      Site,
      InvoiceNumber,
      closedChallan,
      vendor_detail,
      prType,
      order_Type,
    } = req.body;

    // Create and save new DMR entry
    let dmrForm = new dmrEntry({ ...req.body, companyIdf: req.user.companyIdf });
    dmrForm = await dmrForm.save();

    // If invoice is created, close related challans
    // This links challans to their corresponding invoice
    if (closedChallan.length > 0) {
      for (const challanId of closedChallan) {
        await dmrEntry.findOneAndUpdate(
          { _id: ObjectID(challanId), companyIdf: req.user.companyIdf },
          {
            challanStatus: "closed",
            InvoiceNumber: InvoiceNumber, // Link challan to invoice
          }
        );
      }
    }

    // Prepare array for inventory updates
  if(order_Type==="Purchase Order"){

   let dmritemArray = [];

    // Map PR type to inventory type code
    let prTypeValue = "";
    if (prType && prType === "Project BOQ") {
      prTypeValue = "BOQ";
    } else if (prType && prType === "Site Establishment") {
      prTypeValue = "SE";
    } else if (prType && prType === "Assets") {
      prTypeValue = "Asset";
    }
    
    // Process each item in the DMR entry
    for (const itemData of dmritem) {
      const { item, receivedQuantity, DebitNoteQty, Rate } = itemData;
      
      // Validate item data
      if (!item || typeof receivedQuantity !== "number") {
        return res.status(400).json({
          message:
            "Each dmritem must contain valid item_id and receivedQuantity.",
        });
      }

      // Format current date for inventory record
      const date = new Date();
      const formattedDate = `${String(date.getDate()).padStart(
        2,
        "0"
      )}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
      
      // Calculate net quantity (received minus debit note quantity)
      // This represents the actual usable quantity after accounting for defects/shortages
      const netQuantity = receivedQuantity - DebitNoteQty;
      
      // Prepare inventory item object
      const newItem = {
        item_id: item.item_id,
        site_id: Site,
        quantity: netQuantity, // Net quantity after debit adjustments
        remaining_quantity: netQuantity, // Initially same as quantity
        updatedOn: new Date(),
        date: formattedDate,
        vendor_id: vendor_detail._id,
        inventoryType: prTypeValue, // BOQ, SE, or Asset
        rate: Rate,
        source: "Vendor", // Source of inventory
      };

      // Update inventory: add received quantity to stock
      const response = await createOrUpdateInventory(
        {
          body: {
            item_id: item.item_id,
            site_id: Site,
            quantity: netQuantity, // Add net quantity to inventory
            operation: "add", // Add operation increases stock
            inventoryType: prTypeValue,
          },
        },
        {
          status: () => ({ json: () => {} }), // Mocked response object
        }
      );

      // Add to array for inventory record creation
      dmritemArray.push(newItem);
    }

    // Create inventory records for all received items
    const response = await createInventoryData(
      {
        body: {
          data: dmritemArray,
        },
      },
      {
        status: (statusCode) => ({
          json: (responseData) => ({
            statusCode,
            responseData,
          }),
        }),
      }
    );

    // Invalidate cache to ensure fresh data on next request
    await invalidateEntity("DMRENTRY");
    await invalidateEntityList("DMRENTRY");
  }

    // Return created DMR entry
    res.send(dmrForm);
  } catch (error) {
    return res.status(error.statusCode || 422).json(
      await Response.errors(
        {
          errors: error.errors,
          message: error.message,
        },
        error,
        req
      )
    );
  }
}

/**
 * Update Multiple DMR Entries
 * PUT /api/web/dmr_entry/updateDMREntries
 * Updates multiple DMR entries in bulk
 * Used for batch operations like document submission, audit remarks, etc.
 * 
 * @param {Array<String>} req.body.dmrIds - Array of DMR entry IDs to update
 * @param {Object} req.body.updates - Object with fields to update
 *   Example: { DateOfDocSubmissionToHO: '2025-09-01', remarksForAudit: 'Checked' }
 * 
 * @returns {Object} Update result with count of updated documents
 */
async function updateDMREntries(req, res) {
  try {
    const { dmrIds, updates } = req.body;

    // Validate DMR IDs array
    if (!dmrIds || !Array.isArray(dmrIds) || dmrIds.length === 0) {
      return res.status(400).json({ message: "No DMRs selected for update" });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No update data provided" });
    }

    // Iterate to check if status should be updated
    const updatePromises = dmrIds.map(async (id) => {
      const dmr = await dmrEntry.findOne({ _id: id, companyIdf: req.user.companyIdf });
      if (!dmr) return null;

      // Merge updates
      Object.keys(updates).forEach((key) => {
        dmr[key] = updates[key];
      });

      // Automatically update status if all required fields exist
      if (
        dmr.DateOfDocSubmissionToHO &&
        dmr.remarksForAudit &&
        dmr.InvoiceNumber?.length > 0
      ) {
        dmr.status = "completed";
      }

      return dmr.save();
    });

    const results = await Promise.all(updatePromises);
    await invalidateEntity("DMRENTRY");
    await invalidateEntityList("DMRENTRY");

    res.status(200).json({
      message: `${results.filter((r) => r).length} DMR(s) updated successfully`,
      data: results,
    });
  } catch (error) {
    console.error("Error updating DMR:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
}

async function getList(req, res) {
  try {
    const reqObj = req.body;
    let {
      page = 1,
      per_page = 10,
      sort_by,
      sort_order = "desc",
      userId,
      DMR_No,
      gateEntry,
      site,
      local_purchase,
      PONumber,
      item,
      prType,
      startDate,
      endDate,
      vendor,
    } = req.query;

    page = parseInt(page);
    per_page = parseInt(per_page);
    const offset = (page - 1) * per_page;

    const cacheKey = `DMRENTRY:LIST:${JSON.stringify(req.query)}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const sort = sort_by
      ? { [sort_by]: sort_order === "desc" ? -1 : 1 }
      : { _id: -1 };

    // ---- Filters ----
    const filterRequest = { companyIdf: new ObjectID(req.user.companyIdf) };

    if (DMR_No?.trim())
      filterRequest.DMR_No = { $regex: DMR_No.trim(), $options: "i" };

    if (prType) filterRequest.prType = prType;

    if (PONumber?.trim())
      filterRequest.PONumber = {
        $regex: PONumber.trim(),
        $options: "i",
      };

    if (gateEntry?.trim())
      filterRequest.GateRegisterEntry = {
        $regex: gateEntry.trim(),
        $options: "i",
      };

    if (vendor && ObjectId.isValid(vendor))
      filterRequest["vendor_detail._id"] = new ObjectID(vendor);

    if (local_purchase) filterRequest.local_purchase = local_purchase;

    if (item?.trim())
      filterRequest["dmritem.item.item_name"] = {
        $regex: item.trim(),
        $options: "i",
      };

    // ---- Date filter ----
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate)
        dateFilter.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
      if (endDate)
        dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
      filterRequest.created_at = dateFilter;
    }

    // ---- Site Filter ----
    // ---- Site Filter (debug version) ----
    if (site?.trim()) {
      // Use case-insensitive regex for flexibility
      filterRequest.Site = { $regex: `^${site.trim()}$`, $options: "i" };
    } else if (userId) {
      const user = await UserSchema.findById(userId, { role: 1, sites: 1 });
      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.role !== "superadmin") {
        const userSites = (user.sites || []).filter(Boolean);
        // Convert all site ids/names to strings for consistency
        const siteStrings = userSites.map((s) => s.toString());
        filterRequest.Site = { $in: siteStrings };
      }
    }

    const pipeline = [
      { $match: filterRequest },
      { $sort: sort },
      {
        $facet: {
          data: [{ $skip: offset }, { $limit: per_page }],
          totalCount: [{ $count: "total" }],
        },
      },
    ];

    const result = await dmrEntry.aggregate(pipeline);
    const data = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.total || 0;

    const response = {
      current_page: page,
      per_page,
      total,
      total_pages: Math.ceil(total / per_page),
      data,
    };

    await setCache(cacheKey, response, TRANSACTIONAL);

    return res.status(200).json(response);
  } catch (error) {
    console.error("❌ Error in getList:", error);
    return res.status(error.statusCode || 422).json({
      success: false,
      message: error.message,
      errors: error.errors || {},
    });
  }
}

async function updateData(req, res) {
  try {
    let reqObj = req.body;
    //console.log(reqObj._id)
    let loginUserId = reqObj.login_user_id;
    //console.log(loginUserId)
    if (!reqObj._id) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "ID_MISSING"),
        statusCode: 412,
      };
    }

    let requestedData = { ...reqObj, ...{ updated_by: loginUserId } };

    let updatedData = await dmrEntry.findOneAndUpdate(
      {
        _id: ObjectID(reqObj._id),
        companyIdf: req.user.companyIdf,
      },
      requestedData,
      {
        new: true,
      }
    );

    if (updatedData) {
      await invalidateEntity("DMRENTRY");
      await invalidateEntityList("DMRENTRY");
      res
        .status(200)
        .json(
          await Response.success(
            updatedData,
            responseMessage(reqObj.langCode, "RECORD_UPDATED"),
            req
          )
        );
    } else {
      await invalidateEntity("DMRENTRY");
      await invalidateEntityList("DMRENTRY");
      res
        .status(400)
        .json(
          await Response.success(
            {},
            responseMessage(reqObj.langCode, "NO_RECORD_FOUND"),
            req
          )
        );
    }
  } catch (error) {
    return res.status(error.statusCode || 422).json(
      await Response.errors(
        {
          errors: error.errors,
          message: error.message,
        },
        error,
        req
      )
    );
  }
}

async function opneChallan(req, res) {
  try {
    const { ponumber } = req.query;
    const cacheKey = `DMRENTRY:OPENCHALLAN:${JSON.stringify(ponumber)}`;
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    if (!ponumber) {
      return res.status(400).json({ message: "ponumber is required" });
    }

    const entries = await dmrEntry.find({
      PONumber: ponumber,
      entry_type: "ChallanNumber",
      challanStatus: "open",
      companyIdf: req.user.companyIdf,
    });

    if (entries.length === 0) {
      return res.status(404).json({ message: "No Open Challans" });
    }

    await setCache(cacheKey, entries, 900);

    return res.status(200).json(entries);
  } catch (error) {
    //console.error("Error fetching DMR entries:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
}

async function getDMREntryNumber(req, res) {
  try {
    const { site } = req.query;
    //console.log("check site", site);
    // Find the latest entry for the given site, sorted by entryNo in descending order
    const lastEntry = await dmrEntry
      .findOne({ Site: site, companyIdf: req.user.companyIdf })
      .sort({ entryNo: -1 });
    //console.log("check entry_______________",lastEntry);
    let nextEntryNo = 1; // Default if no entry exists for the site
    if (lastEntry) {
      nextEntryNo = lastEntry.entryNo + 1;
    }

    return res.json({ nextEntryNo });
  } catch (error) {
    console.error("Error fetching next DMR number:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
async function getDmrCounts(req, res) {
  try {
    const {
      userId,
      site,
      local_purchase,
      PONumber,
      item,
      prType,
      gateEntry,
      vendor,
      DMR_No,
      startDate,
      endDate,
    } = req.query;

    // Initialize filters
    const dmrFilter = { companyIdf: req.user.companyIdf };
    const imprestFilter = { companyIdf: req.user.companyIdf };
    const cacheKey = `DMRENTRY:STATUS_COUNT:${JSON.stringify(req.query)}`;
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const toObjectId = (id) => (ObjectID.isValid(id) ? new ObjectID(id) : null);

    if (prType) dmrFilter.prType = prType;
    if (PONumber?.trim())
      dmrFilter.PONumber = { $regex: `^${PONumber.trim()}$`, $options: "i" };
    if (vendor && toObjectId(vendor))
      dmrFilter["vendor_detail._id"] = toObjectId(vendor);
    if (gateEntry?.trim()) {
      const gateRegex = { $regex: gateEntry.trim(), $options: "i" };
      dmrFilter.GateRegisterEntry = gateRegex;
      imprestFilter.GateRegisterEntry = gateRegex;
    }
    if (DMR_No?.trim()) {
      const dmrRegex = { $regex: DMR_No.trim(), $options: "i" };
      dmrFilter.DMR_No = dmrRegex;
      imprestFilter.DMR_No = dmrRegex;
    }
    if (item?.trim())
      dmrFilter["dmritem.item.item_name"] = {
        $regex: item.trim(),
        $options: "i",
      };

    // Date filters
    if (startDate || endDate) {
      dmrFilter.created_at = {};
      imprestFilter.created_at = {};
      if (startDate) {
        const start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
        dmrFilter.created_at.$gte = start;
        imprestFilter.created_at.$gte = start;
      }
      if (endDate) {
        const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
        dmrFilter.created_at.$lte = end;
        imprestFilter.created_at.$lte = end;
      }
    }

    // Site filters
    let siteObjectId = site ? toObjectId(site) : null;
    if (siteObjectId) {
      dmrFilter.Site = siteObjectId;
      imprestFilter.Site = siteObjectId;
    } else if (userId && toObjectId(userId)) {
      const user = await UserSchema.findById(userId, { role: 1, sites: 1 });
      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.role !== "superadmin") {
        const userSites = (user.sites || []).map(toObjectId).filter(Boolean);
        const siteFilter = userSites.length
          ? { $in: userSites }
          : { $exists: false };
        dmrFilter.Site = siteFilter;
        imprestFilter.Site = siteFilter;
      }
    }
    console.log("DMR Entry list", dmrFilter);

    //console.log("DMR Entry status",dmrFilter.Site);

    // Count both collections in parallel
    const [dmrEntryCount, imprestDMREntryCount] = await Promise.all([
      dmrEntry.countDocuments(dmrFilter),
      Imprest_Dmr_Entry.countDocuments(imprestFilter),
    ]);

    const finalResponse = {
      success: true,
      message: "Count fetched successfully",
      dmrEntryCount,
      imprestDMREntryCount,
    };

    // 🔹 2. CACHE WRITE (15 mins)
    await setCache(cacheKey, finalResponse, 900);

    return res.status(200).json(finalResponse);
  } catch (error) {
    console.error("Error in getDmrCounts:", error);
    return res.status(error.statusCode || 422).json({
      success: false,
      message: error.message,
      errors: error.errors || {},
    });
  }
}

async function getUniqueDMRNumber(req, res) {
  try {
    const { query = "" } = req.query;

    const allOrders = await dmrEntry.find({ companyIdf: req.user.companyIdf }, { DMR_No: 1 });

    const poLastFourSet = new Set();

    allOrders.forEach((order) => {
      const po = order.DMR_No;
      if (po) {
        // Extract last 4 digits using RegEx
        const match = po.match(/(\d{4})$/);
        if (match && match[1]) {
          poLastFourSet.add(match[1]);
        }
      }
    });

    // Filter based on query
    const filteredPOs = Array.from(poLastFourSet).filter((po) =>
      po.includes(query)
    );

    return res.status(200).json({ uniqueDMRNumbers: filteredPOs });
  } catch (error) {
    console.error("Error fetching filtered PO numbers:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function checkDuplicateInvoice(req, res) {
  try {
    const { po, invoice } = req.query;

    if (!po || !invoice) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: po, or invoice",
      });
    }

    const existingInvoice = await dmrEntry.findOne({
      PONumber: po,
      InvoiceNumber: { $regex: `^${invoice}$`, $options: "i" }, // case-insensitive
      entry_type: "InvoiceNumber",
      companyIdf: req.user.companyIdf,
    });

    //console.log("check existingInvoice", existingInvoice);

    if (existingInvoice) {
      return res.status(200).json({
        exists: true,
        message: `Invoice number '${invoice}' already exists`,
      });
    }

    return res.status(200).json({
      exists: false,
      message: "Invoice number is available.",
    });
  } catch (error) {
    console.error("Error checking invoice duplicate:", error);
    res.status(500).json({
      success: false,
      message: "Server error while checking invoice duplicate",
    });
  }
}

async function checkDuplicateChallan(req, res) {
  try {
    const { po, challan } = req.query;

    if (!po || !challan) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: po, or challan",
      });
    }

    const existingInvoice = await dmrEntry.findOne({
      PONumber: po,
      ChallanNumber: { $regex: `^${challan}$`, $options: "i" }, // case-insensitive
      entry_type: "ChallanNumber",
      companyIdf: req.user.companyIdf,
    });

    //console.log("check existingInvoice", existingInvoice);

    if (existingInvoice) {
      return res.status(200).json({
        exists: true,
        message: `Challan number '${challan}' already exists`,
      });
    }

    return res.status(200).json({
      exists: false,
      message: "Challan number is available.",
    });
  } catch (error) {
    console.error("Error checking challan duplicate:", error);
    res.status(500).json({
      success: false,
      message: "Server error while checking challan duplicate",
    });
  }
}

async function getGateEntryNumber(req, res) {
  try {
    const { site, enteredGateRegisterNumber } = req.query;
    //console.log("check site and number", site, enteredGateRegisterNumber);
    if (!site || !enteredGateRegisterNumber) {
      return res
        .status(400)
        .json({ message: "site and enteredGateRegisterNumber are required" });
    }

    let entries = await dmrEntry
      .find({ Site: site, companyIdf: req.user.companyIdf })
      .select("GateRegisterEntry");

    const imprestEntries = await Imprest_Dmr_Entry.find({ Site: site, companyIdf: req.user.companyIdf }).select(
      "GateRegisterEntry"
    );

    //console.log(entries, imprestEntries, "check entries");

    entries = entries.concat(imprestEntries);

    const numbers = entries
      .map((e) => parseInt(e.GateRegisterEntry, 10))
      .filter((n) => !isNaN(n));

    if (numbers.length === 0) {
      return res.json({
        valid: true,
        expectedNextNumber: enteredGateRegisterNumber,
        message: "Valid first gate entry number",
      });
    }

    // Find the max existing number
    const max = Math.max(...numbers);

    // Check if entered is the immediate next
    console.log(
      "check valid",
      enteredGateRegisterNumber,
      typeof enteredGateRegisterNumber
    );
    console.log("check valid", max + 1, typeof (max + 1));

    if (parseInt(enteredGateRegisterNumber) === max + 1) {
      return res.json({
        valid: true,
        expectedNextNumber: enteredGateRegisterNumber,
        message: `Valid. ${enteredGateRegisterNumber} is the next correct  Gate Entry number`,
      });
    } else {
      return res.json({
        valid: false,
        expectedNextNumber: max + 1,
        message: `Invalid. The next Gate Entry number should be ${max + 1}`,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

module.exports = {
  createData,
  opneChallan,
  getList,
  updateData,
  getDMREntryNumber,
  getDmrCounts,
  getUniqueDMRNumber,
  checkDuplicateInvoice,
  checkDuplicateChallan,
  updateDMREntries,
  getGateEntryNumber,
};
