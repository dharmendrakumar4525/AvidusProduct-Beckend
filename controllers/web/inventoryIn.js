/**
 * Inventory In Controller
 * Handles all operations related to Inventory In (stock receipt) including:
 * - Creating inventory in entries
 * - Querying in-stock inventory with advanced filtering
 * - FIFO (First In First Out) inventory management
 * - Caching for performance optimization
 */

const {InventoryIn, InventoryTypes} = require('../../models/InventoryIn');
const Item = require('../../models/Item'); 
const UserSchema = require("../../models/User");
const Response = require('../../libs/response');
const { responseMessage } = require("../../libs/responseMessages");
const ObjectID = require('mongodb').ObjectID;
const mongoose = require("mongoose");
const {
  getCache,
  setCache,
  invalidateEntity,
  invalidateEntityList,
} = require("../../utils/cache");
const { TRANSACTIONAL } = require("../../libs/cacheConfig");



/**
 * Create Inventory In Entry
 * POST /api/web/inventoryIn
 * Creates one or more inventory in entries (stock receipt)
 * 
 * Required Fields:
 * - item_id: Item ID
 * - site_id: Site ID
 * - inventoryType: Type of inventory
 * - updatedOn: Date of receipt
 * - quantity: Quantity received
 * - rate: Rate per unit
 * 
 * @param {Object|Array} req.body.data - Single entry object or array of entry objects
 * 
 * @returns {Object} Created inventory entries
 */
const createInventoryData = async (req, res) => {
  try {
    const { data } = req.body;

    // Validate data exists
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return res.status(400).json({ message: 'No data provided.' });
    }

    // Normalize data into an array (handle both single object and array)
    const entries = Array.isArray(data) ? data : [data];

    // Validate each entry has required fields
    for (const entry of entries) {
      const requiredFields = ['item_id', 'site_id', 'inventoryType', 'updatedOn', 'quantity', 'rate'];
      const missingFields = requiredFields.filter(field => !entry[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({ message: `Missing required fields: ${missingFields.join(', ')}` });
      }
    }

    // Insert entries into the database
    const result = await InventoryIn.insertMany(entries);
    
    // Invalidate inventory cache
    await invalidateEntity("INVENTORY");
    await invalidateEntityList("INVENTORY");

    res.status(201).json({
      message: 'Inventory entries created successfully.',
      data: result
    });

  } catch (error) {
    console.error('Error creating inventory entries:', error);
    res.status(500).json({ message: 'An error occurred while creating inventory entries.', error: error.message });
  }
};

/**
 * Get In Stock Data
 * GET /api/web/inventoryIn/inStock
 * Retrieves paginated in-stock inventory with advanced filtering
 * 
 * Filters:
 * - search: Search by item name
 * - site_id: Filter by site(s) - supports comma-separated or array
 * - userId: Filter by user's assigned sites (if not superadmin)
 * - inventoryType: Filter by inventory type
 * - startDate/endDate: Date range filter
 * - category/subCategory: Filter by category
 * - vendor_id: Filter by vendor
 * 
 * @param {Number} req.query.page - Page number (default: 1)
 * @param {Number} req.query.limit - Items per page (default: 50)
 * @param {String} req.query.sortBy - Field to sort by (default: "updated_at")
 * @param {String} req.query.sortOrder - Sort order: "asc" or "desc" (default: "desc")
 * 
 * @returns {Object} Paginated list of in-stock inventory with aggregated quantities
 */
async function getInStockData(req, res) {
  try {
    const {
      search,
      site_id,
      userId,
      inventoryType,
      startDate,
      endDate,
      category,
      subCategory,
      vendor_id,
      page = 1,
      limit = 50,
      sortBy = "updated_at",
      sortOrder = "desc",
    } = req.query;

    // Convert query params to numbers
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const sortDirection = sortOrder === "desc" ? 1 : -1;

    // Check cache first
    const cacheKey = `INVENTORY:IN:${JSON.stringify(req.query)}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    // Build main filters
    const filters = {};

    // Handle site_id filter (supports comma-separated string or array)
    if (site_id) {
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
    

   
  
  if (vendor_id) {
      filters.vendor_id = vendor_id;
    }

    if (inventoryType) filters.inventoryType = inventoryType;
console.log(startDate, endDate);
    // Handle date filters
   
     if (startDate || endDate) {
      filters.updated_at = {};
      if (startDate) {
        filters.updated_at.$gte = new Date(
          new Date(startDate).setHours(0, 0, 0, 0)
        );
      }
      if (endDate) {
        filters.updated_at.$lte = new Date(
          new Date(endDate).setHours(23, 59, 59, 999)
        );
      }
    }

    //console.log("Applied Filters:", filters);

    // Fetch inventory data
    const inventoryIn = await InventoryIn.find(filters)
      .sort({ [sortBy]: sortDirection })
      .lean(); // Optimized query

      console.log("check it", inventoryIn.length);

    if (!inventoryIn.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    

const itemFilters= {};

// Check if search is provided
if (search && search.trim() !== "") {
  // Apply search filter on item_name (assuming case-insensitive regex search)
  itemFilters.item_name = { $regex: search.trim(), $options: "i" };
} else {
  // If search is blank, filter by itemIds
  const itemIds = [...new Set(inventoryIn.map((io) => io.item_id.toString()))];
  itemFilters._id = { $in: itemIds.map((id) => ObjectID(id)) };
}

    if (mongoose.Types.ObjectId.isValid(category)) {
      itemFilters.category = new mongoose.Types.ObjectId(category);
    }
    if (mongoose.Types.ObjectId.isValid(subCategory)) {
      itemFilters.sub_category = new mongoose.Types.ObjectId(subCategory);
    }

    // Fetch item details
    const items = await Item.find(itemFilters).lean();
    if (!items.length) {
      return res.status(200).json({ success: true, data: [] });
    }


     const itemMap = new Map(items.map((i) => [i._id.toString(), i]));

    /** ---------------------------
     *  STEP 4: Attach item details (no grouping)
     * 
     * --------------------------- */
   const report = inventoryIn
  .map((io) => ({
    itemDetails: itemMap.get(io.item_id.toString()) || null,
    inventoryIn: io,
  })).filter((obj) => obj.itemDetails !== null);


    // Apply pagination using MongoDB skip & limit
    const paginatedData = report.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

   

     const response = {
       data: paginatedData,
      pagination: {
        currentPage: pageNumber,
        limit: pageSize,
        totalItems: report.length,
        totalPages: Math.ceil(report.length / pageSize),
      },
    };

    
    
        await setCache(cacheKey, response, TRANSACTIONAL);
    
        return res.status(200).json(response);
  } catch (error) {
    console.error("Error in getInStockData:", error);
    res.status(500).json({ success: false, message: "An error occurred.", error });
  }
}

module.exports = {
  getInStockData,
  createInventoryData
  //getInventoryList,
  //getInventoryData,
  //createOrUpdateInventory
}
