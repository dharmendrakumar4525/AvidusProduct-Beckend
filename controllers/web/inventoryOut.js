/**
 * Inventory Out Controller
 * Handles all operations related to Inventory Out (stock issue) including:
 * - Creating inventory out entries using FIFO (First In First Out) method
 * - Calculating average rates from FIFO entries
 * - Updating remaining quantities in inventory in entries
 * - Inventory out queries with filtering
 * - Caching for performance optimization
 */

const InventoryOut = require("../../models/InventoryOut");
const Item = require("../../models/Item");
const UserSchema = require("../../models/User");
const { Inventory } = require("../../models/Inventory");
const { InventoryIn, InventoryTypes } = require("../../models/InventoryIn");
const mongoose = require("mongoose");
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
 * Add Inventory Out Entry
 * Creates an inventory out entry using FIFO (First In First Out) method
 * 
 * FIFO Logic:
 * - Fetches inventory in entries sorted by date (oldest first)
 * - Consumes from oldest entries first
 * - Calculates weighted average rate based on consumed quantities
 * - Updates remaining_quantity in inventory in entries
 * 
 * @param {String} item_id - Item ID (required)
 * @param {String} site_id - Site ID (required)
 * @param {String} inventory_type - Inventory type (required)
 * @param {Date} date - Date of issue (required)
 * @param {Number} quantity - Quantity to issue (required)
 * @param {String} return_type - Return type (optional)
 * @param {String} useType - Use type (optional)
 * @param {String} authorized_person - Authorized person (optional)
 * @param {String} contractor - Contractor ID (optional)
 * 
 * @returns {Object} Success status and created inventory out entry
 * @throws {Error} If insufficient inventory available
 */
async function addInventoryOutEntry({
  item_id,
  site_id,
  inventory_type,
  date,
  quantity,
  return_type,
  useType,
  authorized_person,
  contractor,
  companyIdf,
}) {
  try {
    let remainingQuantity = quantity;
  
    // Step 1: Fetch FIFO entries sorted by date (oldest first)
    const fifoEntries = await InventoryIn.find({
      item_id: item_id,
      site_id: site_id,
      inventoryType: inventory_type,
      companyIdf: companyIdf,
    }).sort({ date: 1 }); // FIFO based on date (oldest first)

    // Validate sufficient inventory exists
    if (fifoEntries.length === 0) {
      throw new Error(
        "Insufficient inventory available for the requested item and site."
      );
    }

    // Step 2: Calculate total cost and consumed quantity using FIFO
    let totalCost = 0;
    let totalConsumedQuantity = 0;

    for (const entry of fifoEntries) {
      if (remainingQuantity <= 0) break;

      const availableQuantity = entry.remaining_quantity;
      const usedQuantity = Math.min(availableQuantity, remainingQuantity);

      // Calculate cost for this portion
      totalCost += usedQuantity * entry.rate;
      totalConsumedQuantity += usedQuantity;
      remainingQuantity -= usedQuantity;

      // Update remaining quantity in inventory in entry
      entry.remaining_quantity -= usedQuantity;
      await entry.save();
    }

    // Validate all quantity was consumed
    if (remainingQuantity > 0) {
      throw new Error("Not enough inventory to fulfill the request.");
    }

    // Step 3: Calculate weighted average rate
    const averageRate = totalCost / totalConsumedQuantity;

    // Step 4: Create InventoryOut entry with calculated average rate
    const inventoryOutEntry = new InventoryOut({
      item_id,
      site_id,
      inventoryType: inventory_type,
      date,
      quantity,
      useType,
      rate: averageRate, // Weighted average rate from FIFO
      return_type,
      authorized_person,
      contractor,
      companyIdf,
    });

    await inventoryOutEntry.save();
    
    // Invalidate inventory cache
    await invalidateEntity("INVENTORY");
    await invalidateEntityList("INVENTORY");

    return {
      success: true,
      message: "Inventory out entry successfully created.",
      data: inventoryOutEntry,
    };
  } catch (error) {
    console.error("Error in addInventoryOutEntry:", error);
    return {
      success: false,
      message: error.message,
    };
  }
}

async function InventoryData(req, res) {
  try {
    const {
      search,
      site_id,
      inventoryType,
      startDate,
      category,
      subCategory,
      endDate,
      userId,
      page = 1,
      limit = 50,
      sortBy = "updatedOn",
      sortOrder = "desc",
    } = req.query;

    const filters = { companyIdf: ObjectID(req.user.companyIdf) };
    const cacheKey = `INVENTORY:STATS:${req.user.companyIdf}:${JSON.stringify(req.query)}`;
        
            const cached = await getCache(cacheKey);
            if (cached) {
              console.log("RETURNING CACHED DATA");
              return res.status(200).json(cached);
            }

    if (site_id) {
      // If site_id is comma-separated (string) → convert to array
      let siteList = [];
      if (typeof site_id === "string" && site_id.includes(",")) {
        siteList = site_id.split(",").map((id) => id.trim());
      } else {
        siteList = [site_id];
      }

      if (Array.isArray(siteList)) {
        filters.site_id = {
          $in: siteList.map((id) => new ObjectID(id)),
        };
      } else {
        // single string id
        filters.site_id = new ObjectID(site_id);
      }
    }

    if (!site_id && userId) {
      const user = await UserSchema.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== "superadmin") {
        const userSites = user.sites || [];
        console.log(userSites);
        filters.site_id = userSites.length
          ? { $in: userSites.map((id) => new ObjectID(id)) }
          : { $exists: false };
      }
    }

    if (inventoryType) filters.inventoryType = inventoryType;

    let startNormalized, endNormalized;

    if (startDate) {
      startNormalized = new Date(new Date(startDate).setHours(0, 0, 0, 0));
    }
    if (endDate) {
      endNormalized = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }
    console.log("______________________", filters);

    const stockBeforeStartIn = startDate
      ? await InventoryIn.aggregate([
          { $match: { ...filters, updated_at: { $lt: startNormalized } } },
          {
            $group: {
              _id: {
                site_id: "$site_id",
                item_id: "$item_id",
                inventoryType: "$inventoryType",
              },
              totalReceivedBefore: { $sum: "$quantity" },
              inValueBefore: {
                $sum: { $multiply: ["$quantity", "$rate"] },
              },
            },
          },
        ])
      : [];

    const stockBeforeStartOut = startDate
      ? await InventoryOut.aggregate([
          { $match: { ...filters, updated_at: { $lt: startNormalized } } },
          {
            $group: {
              _id: {
                site_id: "$site_id",
                item_id: "$item_id",
                inventoryType: "$inventoryType",
              },
              totalUsedBefore: { $sum: "$quantity" },
              outValueBefore: {
                $sum: { $multiply: ["$quantity", "$rate"] },
              },
            },
          },
        ])
      : [];

    const [inventoryIn, inventoryOut] = await Promise.all([
      InventoryIn.aggregate([
        {
          $match: {
            ...filters,
            updated_at: {
              $gte: startNormalized || new Date(0),
              $lte: endNormalized || new Date(),
            },
          },
        },
        {
          $group: {
            _id: {
              site_id: "$site_id",
              item_id: "$item_id",
              inventoryType: "$inventoryType",
            },
            totalReceived: { $sum: "$quantity" },
            inValue: {
              $sum: { $multiply: ["$quantity", "$rate"] },
            },
          },
        },
      ]),
      InventoryOut.aggregate([
        {
          $match: {
            ...filters,
            updated_at: {
              $gte: startNormalized || new Date(0),
              $lte: endNormalized || new Date(),
            },
          },
        },
        {
          $group: {
            _id: {
              site_id: "$site_id",
              item_id: "$item_id",
              inventoryType: "$inventoryType",
            },
            totalUsed: { $sum: "$quantity" },
            outValue: {
              $sum: { $multiply: ["$quantity", "$rate"] },
            },
          },
        },
      ]),
    ]);
    //console.log("___________________________",inventoryIn, "\n________________________", inventoryOut);
    //console.log("__________________________",stockBeforeStartIn,"\n________________",stockBeforeStartOut);
    const [stockAtEndIn, stockAtEndOut] = await Promise.all([
      InventoryIn.aggregate([
        {
          $match: {
            ...filters,
            updated_at: { $lte: endNormalized || new Date() },
          },
        },
        {
          $group: {
            _id: {
              site_id: "$site_id",
              item_id: "$item_id",
              inventoryType: "$inventoryType",
            },
            totalReceivedTillEnd: { $sum: "$quantity" },
            inValueTillEnd: {
              $sum: { $multiply: ["$quantity", "$rate"] },
            },
          },
        },
      ]),
      InventoryOut.aggregate([
        {
          $match: {
            ...filters,
            updated_at: { $lte: endNormalized || new Date() },
          },
        },
        {
          $group: {
            _id: {
              site_id: "$site_id",
              item_id: "$item_id",
              inventoryType: "$inventoryType",
            },
            totalUsedTillEnd: { $sum: "$quantity" },
            outValueTillEnd: {
              $sum: { $multiply: ["$quantity", "$rate"] },
            },
          },
        },
      ]),
    ]);
    //console.log("__________________________",stockAtEndIn,"\n______________________", stockAtEndOut)
    const combinedData = {};

    function mergeData(source, keyPrefix) {
      source.forEach((entry) => {
        const key = `${entry._id.site_id}_${entry._id.item_id}_${entry._id.inventoryType}`;

        if (!combinedData[key]) {
          combinedData[key] = {
            site_id: entry._id.site_id,
            item_id: entry._id.item_id,
            inventoryType: entry._id.inventoryType,
            totalReceivedBefore: 0,
            totalUsedBefore: 0,
            totalReceived: 0,
            totalUsed: 0,
            totalReceivedTillEnd: 0,
            totalUsedTillEnd: 0,
            inValueBefore: 0,
            outValueBefore: 0,
            inValue: 0,
            outValue: 0,
            inValueTillEnd: 0,
            outValueTillEnd: 0,
          };
        }

        Object.keys(entry).forEach((field) => {
          if (field.startsWith("total")) {
            combinedData[key][`${keyPrefix}${field}`] = entry[field] || 0;
          }

          if (field.includes("inValue")) {
            combinedData[key][field] = entry[field] || 0;
          } else if (field.includes("outValue")) {
            combinedData[key][field] = entry[field] || 0;
          }
        });
      });
    }

    mergeData(stockBeforeStartIn, "");
    //console.log("______________",combinedData);
    mergeData(stockBeforeStartOut, "");
    //console.log("______________",combinedData);
    mergeData(inventoryIn, "");
    //console.log("______________",combinedData);
    mergeData(inventoryOut, "");
    //console.log("______________",combinedData);
    mergeData(stockAtEndIn, "");
    //console.log("______________",combinedData);
    mergeData(stockAtEndOut, "");
    //console.log("______________",combinedData);
    //console.log("check combine______________________",combinedData);

    const uniqueItems = Object.values(combinedData);

  const item_filters= { companyIdf: req.user.companyIdf };

// Check if search is provided
if (search && search.trim() !== "") {
  // Apply search filter on item_name (assuming case-insensitive regex search)
  item_filters.item_name = { $regex: search.trim(), $options: "i" };
} else {
  // If search is blank, filter by itemIds
  const itemIds = [...new Set(uniqueItems.map((io) => io.item_id.toString()))];
  item_filters._id = { $in: itemIds.map((id) => ObjectID(id)) };
}
    if (category) {
      item_filters.category = mongoose.Types.ObjectId(category);
    }

    if (subCategory) {
      item_filters.sub_category = mongoose.Types.ObjectId(subCategory);
    }
    //console.log("_____", item_filters);
    const items = await Item.find(item_filters);

   const report = Object.values(combinedData)
  .map((item) => { 
    const openingStock = startDate
      ? item.totalReceivedBefore - item.totalUsedBefore
      : 0;
    const openingStockValue = startDate
      ? item.inValueBefore - item.outValueBefore
      : 0;

    const itemDetails = items.find((i) => i._id.equals(item.item_id));
    if (!itemDetails) {
      console.log("Skipping item without details:", item.item_id);
      return null; // Return null instead of undefined for clarity
    }

    return {
      site_id: item.site_id,
      item_id: item.item_id,
      itemDetails,
      inventoryType: item.inventoryType,
      openingStock,
      openingStockValue,
      receivedInDateRange: item.totalReceived,
      receivedValueInDateRange: item.inValue,
      usedInDateRange: item.totalUsed,
      usedValueInDateRange: item.outValue,
      closingStock: item.totalReceivedTillEnd - item.totalUsedTillEnd,
      closingStockValue: item.inValueTillEnd - item.outValueTillEnd,
    };
  })
  .filter(Boolean); // Removes null or undefined entries


    const skip = (page - 1) * limit;
    const paginatedData = report.slice(skip, skip + limit);

const response = {
      data: paginatedData,
      pagination: {
        currentPage: Number(page),
        limit: Number(limit),
        totalItems: report.length,
        totalPages: Math.ceil(report.length / limit),
      },
    };

    
    
        await setCache(cacheKey, response, TRANSACTIONAL);
    
        return res.status(200).json(response);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: false, message: error.message });
  }
}


async function getOutStockData(req, res) {
  try {
    const {
      search,
      site_id,
      inventoryType,
      startDate,
      endDate,
      category,
      return_type,
      userId,
      authorized_person,
      contractor,
      subCategory,
      page = 1,
      limit = 50,
      sortBy = "_id",
      sortOrder = "asc",
    } = req.query;

    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };
    const skip = (page - 1) * limit;

     const cacheKey = `INVENTORY:OUT:${req.user.companyIdf}:${JSON.stringify(req.query)}`;
        
            const cached = await getCache(cacheKey);
            if (cached) {
              console.log("RETURNING CACHED DATA");
              return res.status(200).json(cached);
            }

    /** ---------------------------
     *  STEP 1: Build filters
     * --------------------------- */
    const filters = { companyIdf: req.user.companyIdf };

  

    // Handle site filter (can be multiple comma-separated IDs)
    if (site_id) {
      const siteList = site_id.split(",").map((id) => ObjectID(id.trim()));
      filters.site_id = { $in: siteList };
    } else if (userId) {
      const user = await UserSchema.findById(userId, "sites role").lean();
      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.role !== "superadmin") {
        filters.site_id = user.sites?.length
          ? { $in: user.sites }
          : { $exists: false };
      }
    }

    if (authorized_person)
      filters.authorized_person = ObjectID(authorized_person);
    if (inventoryType) filters.inventoryType = inventoryType;
    if (return_type) filters.return_type = return_type;
    if (contractor) filters.contractor = contractor;

    // Date range filter
    if (startDate || endDate) {
      const range = {};
      if (startDate) range.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
      if (endDate) range.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
      filters.updated_at = range;
    }

    /** ---------------------------
     *  STEP 2: Fetch paginated inventory data
     * --------------------------- */
    const [inventoryOut, totalItems] = await Promise.all([
      InventoryOut.find(filters).sort(sort).skip(skip).limit(Number(limit)).lean(),
      InventoryOut.countDocuments(filters),
    ]);

    if (!inventoryOut.length) {
      return res.status(200).json({ success: true, data: [], pagination: { totalItems: 0 } });
    }

    /** ---------------------------
     *  STEP 3: Fetch item details in bulk
     * --------------------------- */
   const itemFilters= { companyIdf: req.user.companyIdf };

// Check if search is provided
if (search && search.trim() !== "") {
  // Apply search filter on item_name (assuming case-insensitive regex search)
  itemFilters.item_name = { $regex: search.trim(), $options: "i" };
} else {
  // If search is blank, filter by itemIds
  const itemIds = [...new Set(inventoryOut.map((io) => io.item_id.toString()))];
  itemFilters._id = { $in: itemIds.map((id) => ObjectID(id)) };
}


    if (category) itemFilters.category = ObjectID(category);
    if (subCategory) itemFilters.sub_category = ObjectID(subCategory);

    const items = await Item.find(itemFilters).lean();

    // Create a quick lookup map
    const itemMap = new Map(items.map((i) => [i._id.toString(), i]));

    /** ---------------------------
     *  STEP 4: Attach item details (no grouping)
     * 
     * --------------------------- */
   let report = inventoryOut
  .map((io) => ({
    itemDetails: itemMap.get(io.item_id.toString()) || null,
    inventoryOut: io,
  })).filter((obj) => obj.itemDetails !== null);

 



  
 
    const response = {
      data: report,
      pagination: {
        currentPage: Number(page),
        limit: Number(limit),
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };

    
    
        await setCache(cacheKey, response, TRANSACTIONAL);
    
        return res.status(200).json(response);
  } catch (error) {
    console.error("Error in getOutStockData:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching stock data.",
      error: error.message,
    });
  }
}

module.exports = {
  addInventoryOutEntry,
  InventoryData,
  getOutStockData,
};
