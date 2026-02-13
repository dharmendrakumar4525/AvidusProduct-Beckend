/**
 * Inventory Out Record Controller
 * Handles all operations related to Inventory Out Record management including:
 * - Creating inventory out records (issue slips)
 * - Processing multiple items in a single issue
 * - FIFO-based inventory consumption
 * - Inventory updates for each item
 * - Caching for performance optimization
 */

const InventoryOutRecord = require("../../models/InventoryOutRecord");
const { addInventoryOutEntry } = require("../web/inventoryOut");
const { createOrUpdateInventory } = require("../web/inventory");
const mongoose = require("mongoose");
const Response = require("../../libs/response");
const ObjectID = require("mongodb").ObjectID;
const UserSchema = require("../../models/User");
const { responseMessage } = require("../../libs/responseMessages");
const { updateActivityLog } = require("./utilityController");
const {
  getCache,
  setCache,
  invalidateEntity,
  invalidateEntityList,
} = require("../../utils/cache");
const { TRANSACTIONAL } = require("../../libs/cacheConfig");

/*async function createData(req, res) {
  try {
    let inventoryOutRecord = new InventoryOutRecord({ ...req.body });

    inventoryOutRecord = await inventoryOutRecord.save();
    const InventoryItems = inventoryOutRecord.items;
    const Site = inventoryOutRecord.site;
    const type = inventoryOutRecord.itemType;
    res.send(inventoryOutRecord);

    for (const itemData of InventoryItems) {
      const { item_id, issued_Qty } = itemData;
      console.log("code gets here");
      // Validate item_id and receivedQuantity
      if (!item_id || typeof issued_Qty !== "number") {
        return res.status(400).json({
          message: "Invalid item_id and quantity.",
        });
      }
      console.log("code gets now");
      // Call createOrUpdateInventory for each item
      const response = await createOrUpdateInventory(
        {
          body: {
            item_id: item_id,
            site_id: Site, // Use Site as site_id
            quantity: issued_Qty,
            operation: "use",
            inventoryType: type, // Operation is always "add" in this context
          },
        },
        {
          status: () => ({ json: () => {} }), // Mocked response object
        }
      );
      //console.log("________________________", response);
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
} */

/**
 * Create Inventory Out Record
 * POST /api/web/inventoryOutRecord
 * Creates an inventory out record (issue slip) and processes multiple items
 * 
 * Process:
 * 1. Saves the inventory out record
 * 2. For each item in the record:
 *    - Creates inventory out entry using FIFO method
 *    - Updates inventory quantities
 * 
 * @param {String} req.body.site - Site ID (required)
 * @param {String} req.body.itemType - Item type (required)
 * @param {String} req.body.type - Return type (optional)
 * @param {String} req.body.authorizedBy - Authorized person (optional)
 * @param {String} req.body.receivedBy - Received by/contractor (optional)
 * @param {Array} req.body.items - Array of items to issue
 *   - item_id: Item ID (required)
 *   - issued_Qty: Quantity to issue (required)
 *   - remarks: Remarks (optional)
 *   - inventoryType: Inventory type (optional)
 * 
 * @returns {Object} Created inventory out record
 */
async function createData(req, res) {
  try {
    // Step 1: Save data in Inventory_Out_Record schema
    let inventoryOutRecord = new InventoryOutRecord({ ...req.body, companyIdf: req.user.companyIdf });
    inventoryOutRecord = await inventoryOutRecord.save();

    // Extract data from saved record
    const InventoryItems = inventoryOutRecord.items;
    const ReturnType = inventoryOutRecord.type;
    const authorized_person = inventoryOutRecord.authorizedBy;
    const contractor = inventoryOutRecord.receivedBy;
    const Site = inventoryOutRecord.site;
    const type = inventoryOutRecord.itemType;

    // Step 2: Process each item in the record
    for (const itemData of InventoryItems) {
      const { item_id, issued_Qty, remarks, item_code, uom, inventoryType } = itemData;

      // Validate item_id and issued_Qty
      if (!item_id || typeof issued_Qty !== "number") {
        return res
          .status(400)
          .json({ message: "Invalid item_id and quantity." });
      }

      // Update inventory database using FIFO method
      const inventoryResponse = await createOrUpdateInventory(
        {
          body: {
            item_id: item_id,
            site_id: Site, // Use Site as site_id
            quantity: issued_Qty,
            date: inventoryOutRecord.issue_Date,
            operation: "use",
            inventoryType: type, // Operation is "use" in this context
          },
          user: req.user,
        },
        { status: () => ({ json: () => {} }) }, // Mocked response object
      );
      //console.log("checking__________________", inventoryResponse);

      // Step 3: Add data to InventoryOut table
      //console.log("we got here");
      const inventoryOutEntry = {
        item_id,
        site_id: Site,
        inventory_type: inventoryType,
        date: inventoryOutRecord.issue_Date,
        quantity: issued_Qty,
        return_type: ReturnType,
        authorized_person: authorized_person,
        contractor: contractor,
      };

      const outResponse = await addInventoryOutEntry({
        item_id: inventoryOutEntry.item_id,
        site_id: inventoryOutEntry.site_id,
        inventory_type: inventoryOutEntry.inventory_type,
        date: inventoryOutEntry.date,
        quantity: inventoryOutEntry.quantity,
        return_type: inventoryOutEntry.return_type,
        useType: "intraSite",
        authorized_person: inventoryOutEntry.authorized_person,
        contractor: inventoryOutEntry.contractor,
        companyIdf: req.user.companyIdf,
      });

      if (!outResponse.success) {
        throw new Error(
          `Failed to add inventory out entry for item ${item_id}`,
        );
      }
    }

    // Respond with success after all operations

     await invalidateEntityList("INVENTORY");
            await invalidateEntity("INVENTORY");
    res.send({
      success: true,
      message: "Data processed and inventory updated successfully.",
      data: inventoryOutRecord,
    });
  } catch (error) {
    console.error("Error in createData:", error);
    return res.status(error.statusCode || 422).json({
      success: false,
      message: error.message,
      errors: error.errors || {},
    });
  }
}

async function getList(req, res) {
  try {
    const {
      siteId,
      userId,
      date,
      inventoryType,
      page = 1,
      per_page = 10,
      sort_by,
      sort_order,
    } = req.query;

    // Validate pagination parameters
    const limit = parseInt(per_page, 10);
    const skip = (parseInt(page, 10) - 1) * limit;
    const sort = sort_by
      ? { [sort_by]: sort_order === "desc" ? -1 : 1 }
      : { _id: 1 };

       const cacheKey = `INVENTORY:MATERIALRECORD:LIST:${req.user.companyIdf}:${JSON.stringify(req.query)}`;
            
                const cached = await getCache(cacheKey);
                if (cached) {
                  console.log("RETURNING CACHED DATA");
                  return res.status(200).json(cached);
                }
    // Construct the match stage for aggregation based on query parameters
    const matchStage = { companyIdf: ObjectID(req.user.companyIdf) };

    if (siteId) {
      if (!mongoose.Types.ObjectId.isValid(siteId)) {
        return res.status(400).json({ error: "Invalid siteId format" });
      }
      matchStage.site = mongoose.Types.ObjectId(siteId);
    }

    if (!siteId && userId) {
      const user = await UserSchema.findById(userId, "role sites").lean();
      if (!user) return res.status(404).json({ message: "User not found" });
      console.log(user);
      if (user.role !== "superadmin") {
        const siteIds = (user.sites || []).map((id) => new ObjectID(id));
        matchStage.site = siteIds.length
          ? { $in: siteIds }
          : { $exists: false };
      }
    }

    if (date) {
      matchStage.issue_Date = date; // Assuming the date is provided in the correct format
    }

    if (inventoryType) {
      if (!["BOQ", "SE", "P&M"].includes(inventoryType)) {
        return res.status(400).json({ error: "Invalid inventoryType value" });
      }
      matchStage.itemType = inventoryType;
    }

    // Fetch total records
    const totalRecords = await InventoryOutRecord.aggregate([
      { $match: matchStage },
      { $count: "total" },
    ]);
    const totalCount = totalRecords.length > 0 ? totalRecords[0].total : 0;

    // Aggregate pipeline with pagination
    const inventoryRecords = await InventoryOutRecord.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "sites", // Collection name for sites
          localField: "site",
          foreignField: "_id",
          as: "siteDetails",
        },
      },
      {
        $lookup: {
          from: "sitestaffs", // Collection name for users
          localField: "authorizedBy",
          foreignField: "_id",
          as: "authorizedByDetails",
        },
      },

      {
        $lookup: {
          from: "users", // Collection name for users
          localField: "issuedBy",
          foreignField: "_id",
          as: "issuedByDetails",
        },
      },
      {
        $project: {
          siteDetails: { $arrayElemAt: ["$siteDetails", 0] },
          authorizedByDetails: { $arrayElemAt: ["$authorizedByDetails", 0] },
          receivedByName: 1,
          receivedBy: 1,
          issuedByDetails: { $arrayElemAt: ["$issuedByDetails", 0] },
          issueSlip_number: 1,
          entry_number: 1,
          type: 1,
          itemType: 1,
          issue_Date: 1,

          wo_number: 1,
          items: 1,
          created_by: 1,
          updated_by: 1,
          created_at: 1,
          updated_at: 1,
        },
      },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },
    ]);

    const response = {
      data: inventoryRecords,
      total: totalCount,
      current_page: parseInt(page, 10),
      per_page: limit,
    };

      await setCache(cacheKey, response, TRANSACTIONAL);
        
            return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching inventory records:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getEntryNumber(req, res) {
  const { siteId } = req.query; // SiteId passed as a query parameter

  try {
    // Query InventoryOutRecord for the given siteId and sort by entry_number in ascending order
    const records = await InventoryOutRecord.find({ site: siteId, companyIdf: req.user.companyIdf })
      .sort({ entry_number: -1 }) // Sort by entry_number in ascending order
      .exec();

    if (records.length === 0) {
      // If no records found, return 1
      return res.status(200).json({ nextEntryNumber: 1 });
    }

    // Get the last record and increment entry_number by 1
    const lastRecord = records[records.length - 1];
    const nextEntryNumber = lastRecord.entry_number + 1;

    // Return the next entry number
    res.status(200).json({ nextEntryNumber });
  } catch (err) {
    //console.error("Error fetching next entry number:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function getDetails(req, res) {
  //console.log("checking it____________________", req);
  try {
    const id = req.id || req.query.id;
     const cacheKey = `INVENTORY:MATERIALRECORD:DETAILS:${req.user.companyIdf}:${id}`;
            
                const cached = await getCache(cacheKey);
                if (cached) {
                  console.log("RETURNING CACHED DATA");
                  return res.status(200).json(cached);
                }

    // Validate ID
    if (!ObjectID.isValid(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Aggregation pipeline
    const inventoryRecord = await InventoryOutRecord.aggregate([
      {
        $match: {
          _id: ObjectID(id),
          companyIdf: ObjectID(req.user.companyIdf),
        },
      },
      {
        $lookup: {
          from: "sites", // Collection name for SiteStaff
          localField: "site",
          foreignField: "_id",
          as: "site",
        },
      },
      {
        $lookup: {
          from: "sitestaffs", // Collection name for SiteStaff
          localField: "authorizedBy",
          foreignField: "_id",
          as: "authorizedBy",
        },
      },

      {
        $lookup: {
          from: "users", // Collection name for SiteStaff
          localField: "issuedBy",
          foreignField: "_id",
          as: "issuedBy",
        },
      },

      {
        $unwind: {
          path: "$site",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$authorizedBy",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $unwind: {
          path: "$issuedBy",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "items", // Collection name for Item
          localField: "items.item_id",
          foreignField: "_id",
          as: "itemsDetails",
        },
      },
      {
        $project: {
          site: { site_name: 1 }, // Change to site_name
          authorizedBy: 1, // Complete object of authorizedBy
          receivedBy: 1, // Complete object of receivedBy
          issuedBy: 1, // Complete object of issuedBy
          subContractor: 1, // Complete object of subContractor
          issueSlip_number: 1,
          receivedByName: 1,
          entry_number: 1,
          type: 1,
          itemType: 1,
          issue_Date: 1,
          wo_number: 1,
          items: {
            $map: {
              input: "$items",
              as: "item",
              in: {
                issued_Qty: "$$item.issued_Qty",

                inventoryType: "$$item.inventoryType",
                remarks: "$$item.remarks",
                item_details: {
                  $ifNull: [{ $arrayElemAt: ["$itemsDetails", 0] }, {}],
                },
              },
            },
          },
        },
      },
    ]);

    if (!inventoryRecord || inventoryRecord.length === 0) {
      return res.status(404).json({ error: "Inventory record not found" });
    }

      await setCache(cacheKey, inventoryRecord[0], 900);

    res.status(200).json(inventoryRecord[0]); // Return the first (and only) matching record
  } catch (error) {
    //console.error("Error fetching inventory record:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  createData,
  getList,
  getEntryNumber,
  getDetails,
};
