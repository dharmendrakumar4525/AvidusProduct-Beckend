/**
 * Site Inventory Transfer Controller
 * Handles all operations related to inter-site inventory transfers including:
 * - Creating transfer requests
 * - Multi-stage approval workflow (PD, Store Head, Asset Head)
 * - Material receiving and transfer completion
 * - Auto-generating transfer numbers
 * - Inventory updates (out from origin, in to destination)
 * - Caching for performance optimization
 */

const mongoose = require("mongoose");
const InventoryOut = require("../../models/InventoryOut");
const { createInventoryData } = require("../web/inventoryIn");
const Transfer = require("../../models/SiteInventoryTransfer");
const { Inventory } = require("../../models/Inventory");
const Site = require("../../models/Site");
const User = require("../../models/User");
const ObjectID = mongoose.Types.ObjectId;
const { addInventoryOutEntry } = require("../web/inventoryOut");
const { createOrUpdateInventory } = require("../web/inventory");
const {
  getCache,
  setCache,
  invalidateEntity,
  invalidateEntityList,
} = require("../../utils/cache");
const { TRANSACTIONAL } = require("../../libs/cacheConfig");

/**
 * Create Transfer Request
 * POST /api/web/SiteInventoryTransfer
 * Creates a new inter-site inventory transfer request
 * 
 * Process:
 * - Validates required fields
 * - Auto-generates entry number (site-wise incrementing)
 * - Creates timeline entry for tracking
 * - Pre-save hook auto-generates transfer number
 * 
 * @param {String} req.body.origin_site - Origin site ID (required)
 * @param {String} req.body.destination_site - Destination site ID (required)
 * @param {String} req.body.itemType - Item type (required)
 * @param {String} req.body.created_by - User ID creating the transfer (required)
 * @param {Array} req.body.items - Array of items to transfer (required)
 * @param {Object} req.body.approvals - Approval structure (optional)
 * @param {String} req.body.notes - Transfer notes (optional)
 * 
 * @returns {Object} Created transfer request object
 */
exports.createTransfer = async (req, res) => {
  try {
    const {
      origin_site,
      destination_site,
      itemType,
      created_by,
      items,
      approvals,
      notes,
    } = req.body;

    // Validate required fields
    if (
      !origin_site ||
      !destination_site ||
      !itemType ||
      !created_by ||
      !items?.length
    ) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Validate origin site exists
    const originSite = await Site.findOne({ _id: origin_site, companyIdf: req.user.companyIdf });
    if (!originSite) {
      return res.status(404).json({ message: "Origin site not found." });
    }

    // Get last entry number for this site and increment
    const lastTransfer = await Transfer.findOne({ origin_site, companyIdf: req.user.companyIdf })
      .sort({ entry_number: -1 })
      .select("entry_number");

    const newEntryNumber = lastTransfer ? lastTransfer.entry_number + 1 : 1;

    // Create transfer object with timeline
    const transfer = new Transfer({
      origin_site,
      destination_site,
      itemType,
      created_by,
      entry_number: newEntryNumber, // Site-wise auto-increment
      items,
      approvals,
      notes,
      companyIdf: req.user.companyIdf,
      timeline: [
        {
          action: "Created",
          user: created_by,
          date: new Date(),
        },
      ],
    });

    // Save to DB (pre-save hook will auto-fill created_by_name + transfer_number)
    await transfer.save();
    
    // Invalidate inventory cache
    await invalidateEntityList("INVENTORY");
    await invalidateEntity("INVENTORY");
    res.status(201).json({
      success: true,
      message: "Transfer request created successfully.",
      data: transfer,
    });
  } catch (error) {
    console.error("Error creating transfer request:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Internal Server Error",
        error: error.message,
      });
  }
};

/* 2️⃣ Submit Transfer (Draft -> Submitted) */
exports.submitTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { submitted_by } = req.body;

    const transfer = await Transfer.findOne({ _id: id, companyIdf: req.user.companyIdf });
    if (!transfer) throw new Error("Transfer not found");
    if (transfer.status !== "Draft")
      throw new Error("Only Draft transfers can be submitted");

    const user = await User.findById(submitted_by);

    transfer.status = "Submitted";
    transfer.updated_by_name = user?.name;
    await transfer.save();
await invalidateEntityList("INVENTORY");
 await invalidateEntity("INVENTORY");
  
    res.json({
      success: true,
      message: "Transfer submitted successfully",
      data: transfer,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/* 3️⃣ Approve / Reject Transfer */
exports.approveTransfer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { _id, approval_type, userId, status } = req.body;
    console.log(req.body);

    if (!_id || !approval_type || !userId || !status) {
      throw new Error("id, approval_type, userId, and status are required.");
    }

    const validApprovalTypes = ["project_director", "store_Asset_head"];
    if (!validApprovalTypes.includes(approval_type)) {
      throw new Error("Invalid approval_type. Must be project_director or store_Asset_head.");
    }

    const transfer = await Transfer.findOne({ _id: ObjectID(_id), companyIdf: req.user.companyIdf }).session(session);
    if (!transfer) throw new Error("Transfer not found.");

    const user = await User.findById(ObjectID(userId)).session(session);
    if (!user) throw new Error("Approving user not found.");

    // --- Update approvals dynamically ---
    transfer.approvals[approval_type].status = status;
    transfer.approvals[approval_type].approved_by = userId;
    transfer.approvals[approval_type].approved_at = new Date();

    // --- Add to timeline ---
  

    // --- Update overall transfer status ---
    if (status === "Rejected") {
      transfer.status = "Rejected";
    } else {
      const pdStatus = transfer.approvals.project_director.status;
      const storeStatus = transfer.approvals.store_Asset_head.status;

      if (pdStatus === "Approved" && storeStatus === "Approved") {
        transfer.status = "HO Approved";
      } else if (pdStatus === "Approved" || storeStatus === "Approved") {
        transfer.status = "PD Approved";
      } else {
        transfer.status = "Pending";
      }
    }

    transfer.updated_by = userId;
    transfer.updated_by_name = user.name;

    await transfer.save({ session });
    await session.commitTransaction();
    await invalidateEntityList("INVENTORY");
 await invalidateEntity("INVENTORY");
 

    res.status(200).json({
      success: true,
      message: `${approval_type.replace("_", " ")} ${status} successfully.`,
      data: transfer,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("Approval update error:", err);
    res.status(400).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

exports.dispatchTransfer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
  
    const {
      _id,
      dispatched_by,
      received_by,
      dispatch_date,
      vehicle,
      items
    } = req.body;

    // 1. Find the Transfer Request
    const transfer = await Transfer.findOne({ _id: _id, companyIdf: req.user.companyIdf }).session(session);
    if (!transfer) throw new Error("Transfer not found");

    if (transfer.status !== "HO Approved")
      throw new Error("Only Approved transfers can be dispatched");

    const dispatcher = await User.findById(dispatched_by).session(session);

    // 2. Update Transfer main fields
    transfer.status = "Dispatched";
    transfer.dispatched_by = dispatched_by;
    transfer.received_by = received_by || "";
    transfer.dispatch_date = dispatch_date;
    transfer.vehicle = vehicle;
    transfer.updated_by_name = dispatcher?.name;

    // 3. Loop through items for dispatch
    for (const item of items) {
      const {
        item_id,
        dispatched_quantity,
        requested_quantity,
        received_quantity,
        remarks,
      } = item;

      // Find item in transfer record
      const trItem = transfer.items.find(
        (i) => i.item_id.toString() === item_id
      );

      if (!trItem) continue;

      // 3A. Save quantities into Transfer DB
      trItem.dispatched_quantity = dispatched_quantity;
      trItem.requested_quantity = requested_quantity;
      trItem.received_quantity = received_quantity;
      trItem.remarks = remarks;

      // 3B. Deduct inventory from ORIGIN site
      //console.log(transfer) ;
      await createOrUpdateInventory(
        {
          body: {
            item_id: item_id,
            site_id: transfer.origin_site,
            quantity: dispatched_quantity,
            date: dispatch_date,
            operation: "use",
            inventoryType: transfer.itemType,
          },
        },
        { status: () => ({ json: () => {} }) }
      );

      // 3C. Add InventoryOut entry
      const outEntryResponse = await addInventoryOutEntry({
        item_id: ObjectID(item.item_id),
        site_id: transfer.origin_site,
        inventory_type: transfer.itemType,
        date: dispatch_date,
        quantity: dispatched_quantity,
        useType: "interSite",
        authorized_person:dispatched_by,
        
      });

      if (!outEntryResponse.success) {
        throw new Error(
          `Failed to add InventoryOut entry for item ${item_id}`
        );
      }

      // 3D. Fetch rate from latest InventoryOut entry
      const lastOut = await InventoryOut.findOne({
        item_id,
        site_id: transfer.origin_site,
        companyIdf: req.user.companyIdf,
      })
        .sort({ date: -1 })
        .session(session);

      trItem.rate = lastOut?.rate || 0; // save dispatch rate
    }

    // 4. Save Transfer with updated items
    await transfer.save({ session });

    // 5. Commit transaction
    await session.commitTransaction();
    await invalidateEntityList("INVENTORY");
 await invalidateEntity("INVENTORY");
    

    res.status(200).json({
      success: true,
      message: "Transfer dispatched successfully",
      data: transfer,
    });

  } catch (err) {
    await session.abortTransaction();
    console.error("Dispatch Error:", err);

    res.status(400).json({
      success: false,
      message: err.message,
    });
  } finally {
    session.endSession();
  }
};


/* 5️⃣ Receive Transfer */
exports.receiveTransfer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    
    const { _id, received_by, received_date, received_items } = req.body;

    // ==== FETCH TRANSFER ====
    const transfer = await Transfer.findOne({ _id: _id, companyIdf: req.user.companyIdf }).session(session);
    if (!transfer) throw new Error("Transfer not found");

    if (transfer.status !== "Dispatched")
      throw new Error("Only Dispatched transfers can be received");

    const user = await User.findById(received_by).session(session);
    if (!user) throw new Error("Receiver user not found");

    // ==== SET RECEIVED INFO ====
    transfer.received_by = received_by;
    transfer.received_date = received_date || new Date();
    transfer.updated_by = received_by;
    transfer.updated_by_name = user.name;

    let inventoryInArray = [];
    let fullyReceived = true;

    // ========= PROCESS EACH ITEM =========
    for (const item of transfer.items) {
      const receivedObj = received_items.find(
        (i) => i.item_id.toString() === item.item_id.toString()
      );

      if (!receivedObj) {
        fullyReceived = false;
        continue;
      }

      const qty = Number(receivedObj.received_quantity || 0);
      const rate = Number(receivedObj.rate || item.rate || 0);
      const remarks = receivedObj.remarks || "";

      // Update transfer item
      item.received_quantity = qty;
      item.rate = rate;
      item.remarks = remarks;

      // Check if fully received
      if (qty < item.dispatched_quantity) fullyReceived = false;

      // ==== UPDATE INVENTORY ====
      await createOrUpdateInventory(
        {
          body: {
            item_id: item.item_id,
            site_id: transfer.destination_site,
            quantity: qty,
            operation: "add",
            inventoryType: transfer.itemType,
          },
        },
        { status: () => ({ json: () => {} }) }
      );

      // ==== PREPARE InventoryIn ENTRY ====
      const date = new Date();
      const formattedDate = `${String(date.getDate()).padStart(
        2,
        "0"
      )}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}-${date.getFullYear()}`;

      const invIn = {
        item_id: item.item_id,
        site_id: transfer.destination_site,
        quantity: qty,
        remaining_quantity: qty,
        updatedOn: new Date(),
        date: formattedDate,
        vendor_id: null,
        rate: rate,
        inventoryType: transfer.itemType,
        source: "InterSite",
      };

      inventoryInArray.push(invIn);
    }

    // ==== FINALIZE STATUS ====
    transfer.status = fullyReceived ? "Fully Received" : "Partially Received";

    // ==== SAVE INVENTORY-IN DATA ====
    //console.log("Inventory In Data:", inventoryInArray);
      const response = await createInventoryData(
          {
            body: {
              data: inventoryInArray,
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
   console.log("Inventory In Response:", response);

    // ==== TIMELINE ENTRY ====
    transfer.timeline.push({
      action: "Received",
      user: received_by,
      date: new Date(),
    });
    

    await transfer.save({ session });
    await session.commitTransaction();
     await invalidateEntityList("INVENTORY");
 await invalidateEntity("INVENTORY");
    

    return res.json({
      success: true,
      message: "Transfer received successfully",
      data: transfer,
    });
  } catch (err) {
    await session.abortTransaction();
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  } finally {
    session.endSession();
  }
};


/*  6️⃣ Cancel Transfer */
exports.cancelTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const transfer = await Transfer.findOne({ _id: id, companyIdf: req.user.companyIdf });
    if (!transfer) throw new Error("Transfer not found");
    if (!["Draft", "Submitted"].includes(transfer.status)) {
      throw new Error("Only Draft or Submitted transfers can be cancelled");
    }

    transfer.status = "Cancelled";
    await transfer.save();
     await invalidateEntityList("INVENTORY");
 await invalidateEntity("INVENTORY");
    

    res.json({
      success: true,
      message: "Transfer cancelled successfully",
      data: transfer,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getTransfer = async (req, res) => {
  try {
    const { _id } = req.query;
 const cacheKey = `INVENTORY:INTERSITETRANSFER:DETAILS:${_id}:${req.user.companyIdf}`;
            
                const cached = await getCache(cacheKey);
                if (cached) {
                  console.log("RETURNING CACHED DATA");
                  return res.status(200).json(cached);
                }
    const transfer = await Transfer.findOne({ _id: ObjectID(_id), companyIdf: req.user.companyIdf })
      .populate("origin_site") // full site
      .populate("destination_site") // full site
      .populate({
        path: "items.item_id",
        select: "item_name item_code uom category sub_category",
        populate: [
          { path: "uom", select: "uom_name" },
          { path: "category", select: "name" },
          { path: "sub_category", select: "subcategory_name" },
        ],
      })
      .populate("created_by", "name email role")
      .populate("updated_by", "name email role")
      .populate("approvals.project_director.approved_by", "name email role")
      .populate("approvals.store_or_pm_head.approved_by", "name email role")
      .populate("timeline.user", "name email role");

    if (!transfer) {
      return res.status(404).json({ message: "Transfer not found" });
    }


    const response ={
 data: transfer,
    }

     await setCache(cacheKey, response, TRANSACTIONAL);
    
        res.status(200).json(response); 
  } catch (error) {
    console.error("Error fetching transfer details:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching transfer details",
      error: error.message,
    });
  }
};

exports.getTransferList = async (req, res) => {
  try {
    const {
      page = 1,
      per_page = 10,
      sort_by = "created_at",
      sort_order = "desc",
      search = "",
      status,
      origin_site,
      destination_site,
      itemType,
      from_date,
      to_date,
    } = req.query;

    // ─────────────────────────────────────────────
    // BUILD FILTER OBJECT
    // ─────────────────────────────────────────────
    const filter = { is_deleted: false, companyIdf: req.user.companyIdf };
  const cacheKey = `INVENTORY:INTERSITETRANSFER:LIST:${req.user.companyIdf}:${JSON.stringify(req.query)}`;
            
                const cached = await getCache(cacheKey);
                if (cached) {
                  console.log("RETURNING CACHED DATA");
                  return res.status(200).json(cached);
                }

    if (status) filter.status = status;
    if (origin_site) filter.origin_site = origin_site;
    if (destination_site) filter.destination_site = destination_site;
    if (itemType) filter.itemType = itemType;

    // 🔍 Search by transfer_number (partial match)
    if (search) {
      filter.transfer_number = { $regex: search.trim(), $options: "i" };
    }

    // 📅 Date Range Filter (created_at)
    if (from_date || to_date) {
      filter.created_at = {};
      if (from_date) filter.created_at.$gte = new Date(from_date);
      if (to_date) {
        const to = new Date(to_date);
        to.setHours(23, 59, 59, 999); // include entire day
        filter.created_at.$lte = to;
      }
    }

    // ─────────────────────────────────────────────
    // PAGINATION
    // ─────────────────────────────────────────────
    const skip = (parseInt(page) - 1) * parseInt(per_page);
    const limit = parseInt(per_page);

    // ─────────────────────────────────────────────
    // QUERY EXECUTION (with population)
    // ─────────────────────────────────────────────
    const [records, total] = await Promise.all([
      Transfer.find(filter)
        .populate([
          { path: "origin_site", select: "site_name site_code" },
          { path: "destination_site", select: "site_name site_code" },
          { path: "created_by", select: "name email" },
          { path: "updated_by", select: "name email" },
          { path: "items.item_id", select: "item_name item_code unit" },
        ])
        .sort({ [sort_by]: sort_order === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transfer.countDocuments(filter),
    ]);

   
  const response = {
      pagination: {
        total,
        page: parseInt(page),
        per_page: parseInt(per_page),
        total_pages: Math.ceil(total / per_page),
      },
      filters_used: filter,
      data: records,
    };
      await setCache(cacheKey, response, TRANSACTIONAL);
            
                return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching transfer list:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching transfer list",
      error: error.message,
    });
  }
};
