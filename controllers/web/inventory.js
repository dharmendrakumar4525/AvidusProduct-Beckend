/**
 * Inventory Controller
 * Handles inventory management operations including:
 * - Creating and updating inventory records
 * - Adding stock (from DMR entries, transfers, etc.)
 * - Using stock (for issue slips, consumption, etc.)
 * - Inventory queries and reports
 * - Stock quantity tracking by site and inventory type
 */

const { Inventory, InventoryTypes } = require("../../models/Inventory");
const Item = require("../../models/Item");
const Response = require("../../libs/response");
const { responseMessage } = require("../../libs/responseMessages");
const ObjectID = require("mongodb").ObjectID;
const {
  getCache,
  setCache,
  invalidateEntity,
  invalidateEntityList,
} = require("../../utils/cache");
const { TRANSACTIONAL } = require("../../libs/cacheConfig");

// Export all controller functions
module.exports = {
  getInventoryList,
  getInventoryData,
  createOrUpdateInventory,
};

/*async function handleInventoryOperation(req, res) {
  try {
    //console.log("Request Body:", req.body);

    const result = await handleInventoryOperation(req.body);

    //console.log("Operation Result:", result);

    return res.status(200).json(result);
  } catch (error) {
    //console.error('Error in createOrUpdateInventory:', error);
    return res.status(400).json({ message: error.message });
  }
} */

/**
 * Create or Update Inventory
 * Internal function to add or use inventory stock
 * Creates new inventory record if it doesn't exist, or updates existing one
 * 
 * @param {Object} req.body - Request body with inventory operation details
 * @param {String} req.body.item_id - Item ID (required)
 * @param {String} req.body.site_id - Site ID (required)
 * @param {Number} req.body.quantity - Quantity to add or use (required)
 * @param {String} req.body.operation - Operation type: "add" or "use" (required)
 * @param {String} req.body.inventoryType - Inventory type: "BOQ", "SE", or "Asset" (required)
 * 
 * @returns {Object} Success message and updated inventory data
 * @throws {Error} If parameters are invalid or insufficient stock for "use" operation
 */
async function createOrUpdateInventory(req) {
  console.log("checking body________________", req.body);
  const { item_id, site_id, quantity, operation, inventoryType } = req.body;

  // Validate input parameters
  if (
    !item_id ||
    !site_id ||
    typeof quantity !== "number" ||
    !["add", "use"].includes(operation) ||
    !inventoryType
  ) {
    throw new Error("Invalid input parameters.");
  }

  // Validate inventory type
  if (!Object.values(InventoryTypes).includes(inventoryType)) {
    throw new Error(
      `Invalid inventoryType. Allowed values are: ${Object.values(
        InventoryTypes
      ).join(", ")}.`
    );
  }

  // Find existing inventory record for this item, site, and type
  const existingInventory = await Inventory.findOne({
    item_id,
    site_id,
    inventoryType,
  });
  
  // Format current date
  const date = new Date();
  const formattedDate = `${String(date.getDate()).padStart(2, "0")}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${date.getFullYear()}`;

  // If inventory record exists, update it
  if (existingInventory) {
    if (operation === "add") {
      // Add quantity to existing stock
      existingInventory.stock_quantity += quantity;
      existingInventory.inventoryType = inventoryType;
      existingInventory.updated_at = new Date();
      existingInventory.date = formattedDate;

      await existingInventory.save();

      return {
        message: "Inventory updated successfully.",
        data: existingInventory,
      };
    } else if (operation === "use") {
      // Use quantity from existing stock
      const date = new Date();
      const formattedDate = `${String(date.getDate()).padStart(
        2,
        "0"
      )}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;

      // Check if sufficient stock is available
      if (existingInventory.stock_quantity < quantity) {
        throw new Error("Insufficient quantity to use.");
      }

      // Reduce stock quantity
      existingInventory.stock_quantity -= quantity;
      existingInventory.updated_at = new Date();
      existingInventory.date = formattedDate;

      await existingInventory.save();

      return {
        message: "Inventory used successfully.",
        data: existingInventory,
      };
    }
  } else {
    if (operation === "use") {
      throw new Error("Cannot use inventory as it does not exist.");
    } else if (operation === "add") {
      const date = new Date();
      const formattedDate = `${String(date.getDate()).padStart(
        2,
        "0"
      )}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;

      const newInventory = new Inventory({
        item_id,
        site_id,
        stock_quantity: quantity,
        inventoryType,
        date: formattedDate,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await newInventory.save();
      //.log("Created New Inventory:", newInventory);
        await invalidateEntity("INVENTORY");
      await invalidateEntityList("INVENTORY");

      return {
        message: "Inventory created successfully.",
        data: newInventory,
      };
    }
  }
}

async function getInventoryList(req, res) {
  const { site_id, inventoryType, searchString = "" } = req.query;
    const cacheKey = `INVENTORY:LIST:${JSON.stringify(req.query)}`;
      
          const cached = await getCache(cacheKey);
          if (cached) {
            console.log("RETURNING CACHED DATA");
            return res.status(200).json(cached);
          }

  try {
    // 🔐 Validation
    if (!site_id) {
      return res.status(400).json({ message: "Site is mandatory." });
    }

    if (!inventoryType) {
      return res.status(400).json({ message: "Inventory Type is mandatory." });
    }

    // Fetch Inventory items first
    let inventoryItems = await Inventory.find({ site_id, inventoryType });

    // Fetch related Item details
    const itemIds = inventoryItems.map((item) => item.item_id);
    const items = await Item.find({ _id: { $in: itemIds } });

    // Map item details to inventory items
    inventoryItems = inventoryItems.map((item) => {
      const itemDetails = items.find(
        (i) => i._id.toString() === item.item_id.toString()
      );
      return {
        ...item.toObject(),
        itemDetails: {
          item_name: itemDetails?.item_name || "",
          item_code: itemDetails?.item_code || "",
          uom: itemDetails?.uom || "",
        },
      };
    });

    // Filter items based on searchString matching item_name
    inventoryItems = inventoryItems.filter((item) =>
      item.itemDetails.item_name
        .toLowerCase()
        .includes(searchString.toLowerCase())
    );

    // Return filtered inventory items
   
        
            await setCache(cacheKey, inventoryItems, TRANSACTIONAL);
        
            return res.status(200).json(inventoryItems);
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ message: "Error fetching inventory list.", error: err });
  }
}

//-------------------------------------------------------

async function getInventoryData(req, res) {
  //console.log("are we in central inventory", req.query);
  try {
    const {
      type,
      itemId,
      siteId,
      page = 1,
      per_page,
      sort_by,
      sort_order,
      categoryId,
      subCategoryId,
    } = req.query;

    // Validate pagination
    //console.log("page____________________", req.query);
      const cacheKey = `INVENTORY:SEARCH:${JSON.stringify(req.query)}`;
        
            const cached = await getCache(cacheKey);
            if (cached) {
              console.log("RETURNING CACHED DATA");
              return res.status(200).json(cached);
            }

    const pageData = Response.validationPagination(page, per_page);
    const sort = sort_by
      ? { [sort_by]: sort_order === "desc" ? -1 : 1 }
      : { _id: 1 };

    // Build initial match filter for type and itemId
    
    const matchFilter = {
      ...(type && { inventoryType: type }),
      ...(itemId && { item_id: ObjectID(itemId) }),
      ...(siteId && { site_id: ObjectID(siteId) }),
    };

    // Fetch total records
    const totalRecords = await Inventory.aggregate([
      { $match: matchFilter },
      { $count: "total" },
    ]);
    const totalCount = totalRecords.length > 0 ? totalRecords[0].total : 0;

    // Fetch inventory data with item details, category, subcategory, and UOM
    let inventoryData = await Inventory.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: "items", // Replace with the actual name of the Items collection
          localField: "item_id",
          foreignField: "_id",
          as: "itemDetails",
        },
      },
      {
        $unwind: "$itemDetails", // Unwind to get a single itemDetails object
      },
      {
        $lookup: {
          from: "categories", // Replace with the actual name of the Categories collection
          localField: "itemDetails.category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $unwind: {
          path: "$categoryDetails",
          preserveNullAndEmptyArrays: true, // If no category is found, preserve the item
        },
      },
      {
        $lookup: {
          from: "sub_categories", // Replace with the actual name of the Subcategories collection
          localField: "itemDetails.sub_category",
          foreignField: "_id",
          as: "subCategoryDetails",
        },
      },
      {
        $unwind: {
          path: "$subCategoryDetails",
          preserveNullAndEmptyArrays: true, // If no subcategory is found, preserve the item
        },
      },
      {
        $lookup: {
          from: "uoms", // Replace with the actual name of the UOM collection
          localField: "itemDetails.uom",
          foreignField: "_id",
          as: "uomDetails",
        },
      },
      {
        $addFields: {
          "itemDetails.item_name": { $ifNull: ["$itemDetails.item_name", ""] },
          "itemDetails.item_code": { $ifNull: ["$itemDetails.item_code", ""] },
          "itemDetails.uom": {
            $arrayElemAt: ["$uomDetails.uom_name", 0], // Get the uom_name from the uomId array
          },
          "itemDetails.category_name": {
            $ifNull: ["$categoryDetails.category_name", ""],
          },
          "itemDetails.subcategory_name": {
            $ifNull: ["$subCategoryDetails.subcategory_name", ""],
          },
        },
      },

      { $sort: sort },
      { $skip: pageData.offset },
      { $limit: pageData.limit },
    ]);
    //console.log("check inventory__________________", categoryId, subCategoryId)
    if (categoryId || subCategoryId) {
      inventoryData = inventoryData.filter((item) => {
        return (
          (categoryId
            ? item.itemDetails.category.toString() === categoryId
            : true) &&
          (subCategoryId
            ? item.itemDetails.sub_category.toString() === subCategoryId
            : true)
        );
      });
    }

    // If no type, itemId, categoryId, or subCategoryId is provided, fetch all data
    if (!type && !itemId && !categoryId && !siteId && !subCategoryId) {
      inventoryData = await Inventory.aggregate([
        { $match: {} },
        {
          $lookup: {
            from: "items",
            localField: "item_id",
            foreignField: "_id",
            as: "itemDetails",
          },
        },
        {
          $unwind: "$itemDetails",
        },
        {
          $lookup: {
            from: "categories",
            localField: "itemDetails.category",
            foreignField: "_id",
            as: "categoryDetails",
          },
        },
        {
          $unwind: {
            path: "$categoryDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "sub_categories",
            localField: "itemDetails.sub_category",
            foreignField: "_id",
            as: "subCategoryDetails",
          },
        },
        {
          $unwind: {
            path: "$subCategoryDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "uoms",
            localField: "itemDetails.uom",
            foreignField: "_id",
            as: "uomDetails",
          },
        },
        {
          $addFields: {
            "itemDetails.item_name": {
              $ifNull: ["$itemDetails.item_name", ""],
            },
            "itemDetails.item_code": {
              $ifNull: ["$itemDetails.item_code", ""],
            },
            "itemDetails.uom": {
              $arrayElemAt: ["$uomDetails.uom_name", 0],
            },
            "itemDetails.category_name": {
              $ifNull: ["$categoryDetails.category_name", ""],
            },
            "itemDetails.subcategory_name": {
              $ifNull: ["$subCategoryDetails.subcategory_name", ""],
            },
          },
        },
        { $sort: sort },
      ]);
    }

    //console.log("inventoryData_________________________", inventoryData);

    const responseObj = {
      data: inventoryData || [],
      total: totalCount || 0,
      current_page: parseInt(page, 10),
      per_page: parseInt(per_page, 10),
    };

    
    const response = {
           responseObj,
          pageData,
          req,
        };
    
        await setCache(cacheKey, response, 900);
    
        return res.status(200).json(response);

   
  } catch (error) {
    //console.error(error);
    return res.status(500).json({ message: error });
  }
}
