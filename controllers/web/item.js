/**
 * Item Controller
 * Handles all operations related to Item master data including:
 * - Creating and updating items
 * - Item number generation
 * - Bulk item upload via CSV
 * - Item queries with category, subcategory, brand filters
 * - Caching for performance optimization
 */

const ItemSchema = require("../../models/Item");
const CategorySchema = require("../../models/Category");
const SubCategorySchema = require("../../models/SubCategory");
const UOMSchema = require("../../models/Uom");
const BrandSchema = require("../../models/Brand");
const GSTSchema = require("../../models/Gst");
const Response = require("../../libs/response");
const { responseMessage } = require("../../libs/responseMessages");
const ObjectID = require("mongodb").ObjectID;
const csv = require("csv-parser");
const fs = require("fs");
const mongoose = require('mongoose');
const {
  getCache,
  setCache,
  deleteCache,
  invalidateEntity,
  invalidateEntityList,
} = require("../../utils/cache");
const { MASTER_DATA } = require("../../libs/cacheConfig");

// Export all controller functions
module.exports = {
  createData,
  updateData,
  deleteData,
  getDetails,
  getList,
  uploadCSV,
  getNextItemNumber
};

/**
 * Create Item
 * POST /api/web/item
 * Creates a new item in the master data
 * 
 * @param {Object} req.body - Item data
 * @param {String} req.body.item_name - Item name (required)
 * @param {String} req.body.category - Category ID (required)
 * @param {String} req.body.subcategory - Subcategory ID (optional)
 * @param {String} req.body.brand - Brand ID (optional)
 * @param {String} req.body.uom - Unit of measurement (required)
 * @param {String} req.body.specification - Item specification (optional)
 * @param {String} req.body.langCode - Language code for response messages
 * @param {String} req.body.login_user_id - User creating the item
 * 
 * @returns {Object} Created item object
 */
async function createData(req, res) {
  try {
    let reqObj = req.body;
    reqObj.companyIdf = req.user.companyIdf;
    reqObj.created_by = reqObj.login_user_id;
    reqObj.updated_by = reqObj.login_user_id;

    // Create new item record
    let newData = await new ItemSchema(reqObj).save();

    if (newData) {
      // Invalidate item list cache
      await invalidateEntity("item");
      await invalidateEntityList("item");
      
      res
        .status(200)
        .json(
          await Response.success(
            newData,
            responseMessage(reqObj.langCode, "RECORD_CREATED"),
            req
          )
        );
    } else {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "SOMETHING_WRONG"),
        statusCode: 412,
      };
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

/**
 * Update Item
 * PUT /api/web/item
 * Updates an existing item
 * 
 * @param {String} req.body._id - Item ID (required)
 * @param {Object} req.body - Item fields to update
 * @param {String} req.body.langCode - Language code for response messages
 * @param {String} req.body.login_user_id - User updating the item
 * 
 * @returns {Object} Updated item object
 */
async function updateData(req, res) {
  try {
    let reqObj = req.body;
    let loginUserId = reqObj.login_user_id;

    // Validate item ID
    if (!reqObj._id) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "ID_MISSING"),
        statusCode: 412,
      };
    }

    // Prepare update data with user tracking
    let requestedData = { ...reqObj, ...{ updated_by: loginUserId } };

    // Update item and return updated document
    let updatedData = await ItemSchema.findOneAndUpdate(
      {
        _id: ObjectID(reqObj._id),
        companyIdf: req.user.companyIdf,
      },
      requestedData,
      {
        new: true, // Return updated document
      }
    );

    if (updatedData) {
      // Invalidate cache for this item and item list
      await invalidateEntity("item");
      await invalidateEntityList("item");
      await deleteCache(`item:details:${reqObj._id}`);

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

async function deleteData(req, res) {
  try {
    let reqObj = req.body;
    let { _id } = req.query;

    if (!_id) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "ID_MISSING"),
        statusCode: 412,
      };
    }

    let getData = await ItemSchema.findOne({ _id: ObjectID(_id), companyIdf: req.user.companyIdf });

    if (!getData) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "NO_RECORD_FOUND"),
        statusCode: 412,
      };
    }

    const dataRemoved = await ItemSchema.deleteOne({ _id: ObjectID(_id), companyIdf: req.user.companyIdf });
    await ItemSchema.deleteOne({ _id: ObjectID(_id) });

    // Invalidate cache for this item and item list
    await invalidateEntity("item");
    await invalidateEntityList("item");
    await deleteCache(`item:details:${_id}`);


    res
      .status(200)
      .json(
        await Response.success(
          {},
          responseMessage(reqObj.langCode, "RECORD_DELETED"),
          req
        )
      );
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

 
async function getDetails(req, res) {
  try {
    let reqObj = req.body;
    let { _id } = req.query;

    if (!_id) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "ID_MISSING"),
        statusCode: 412,
      };
    }

    /* ---------- CACHE CHECK ---------- */
    const cacheKey = `subCategory:details:${_id}`;
    const cachedData = await getCache(cacheKey);

    if (cachedData) {
      return res.status(200).json(
        await Response.success(
          cachedData,
          responseMessage(reqObj.langCode, "SUCCESS"),
          req
        )
      );
    }

    /* ---------- DB QUERY ---------- */
    const recordDetail = await ItemSchema.aggregate([
      { $match: { _id: ObjectID(_id), companyIdf: ObjectID(req.user.companyIdf) } },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryDetail",
        },
      },
      {
        $lookup: {
          from: "sub_categories",
          localField: "sub_category",
          foreignField: "_id",
          as: "subCategoryDetail",
        },
      },
      {
        $lookup: {
          from: "gsts",
          localField: "gst",
          foreignField: "_id",
          as: "gstDetail",
        },
      },
      {
        $project: {
          item_name: 1,
          item_number: 1,
          item_code: 1,
          brands: 1,
          category: 1,
          sub_category: 1,
          uom: 1,
          HSNcode: 1,
          gst: 1,
          specification: 1,
          categoryDetail: { $arrayElemAt: ["$categoryDetail", 0] },
          subCategoryDetail: { $arrayElemAt: ["$subCategoryDetail", 0] },
          gstDetail: { $arrayElemAt: ["$gstDetail", 0] },
        },
      },
      {
        $project: {
          item_name: 1,
          item_number: 1,
          item_code: 1,
          brands: 1,
          category: 1,
          sub_category: 1,
          uom: 1,
          HSNcode: 1,
          gst: 1,
          specification: 1,
          "categoryDetail._id": 1,
          "categoryDetail.name": 1,
          "categoryDetail.code": 1,
          "subCategoryDetail._id": 1,
          "subCategoryDetail.subcategory_name": 1,
          "gstDetail._id": 1,
          "gstDetail.gst_name": 1,
          "gstDetail.gst_percentage": 1,
        },
      },
    ]);

    if (recordDetail && recordDetail.length > 0) {
      /* ---------- SET CACHE ---------- */
      await setCache(cacheKey, recordDetail, MASTER_DATA);

      return res.status(200).json(
        await Response.success(
          recordDetail,
          responseMessage(reqObj.langCode, "SUCCESS"),
          req
        )
      );
    }

    return res.status(422).json(
      await Response.success(
        {},
        responseMessage(reqObj.langCode, "NO_RECORD_FOUND"),
        req
      )
    );

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


async function getList(req, res) {
  try {
    const reqObj = req.body;
    const { page, per_page, sort_by, sort_order, search, categoryId } = req.query;

  const  pageData = Response.validationPagination(page, per_page);
   
   const cacheKey = `item:getList:${JSON.stringify(req.query)}`;
    const cachedResponse = await getCache(cacheKey);

    if (cachedResponse) {
      return res.status(200).json(cachedResponse); // ✅ EXACT SAME RESPONSE
    }

    const sort = sort_by
      ? { [sort_by]: sort_order === "desc" ? -1 : 1 }
      : { _id: 1 };

    // Build match filter
    const matchFilter = { companyIdf: mongoose.Types.ObjectId(req.user.companyIdf) };
    if (search) {
      matchFilter.item_name = { $regex: search, $options: "i" };
    }
    if (categoryId) {
      matchFilter.category = mongoose.Types.ObjectId(categoryId);
    }

    // Get total count efficiently
    const totalCount = await ItemSchema.countDocuments(matchFilter);

    // Fetch paginated data with optimized lookups
    const allRecords = await ItemSchema.aggregate([
      { $match: matchFilter },
      { $sort: sort },
      { $skip: pageData.offset },
      { $limit: pageData.limit },

      // Category lookup
      {
        $lookup: {
          from: "categories",
          let: { categoryId: "$category" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$categoryId"] } } },
            { $project: { name: 1 } }
          ],
          as: "categoryDetail"
        }
      },

      // Sub-category lookup
      {
        $lookup: {
          from: "sub_categories",
          let: { subCategoryId: "$sub_category" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$subCategoryId"] } } },
            { $project: { subcategory_name: 1 } }
          ],
          as: "subCategoryDetail"
        }
      },

      // GST lookup
      {
        $lookup: {
          from: "gsts",
          let: { gstId: "$gst" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$gstId"] } } },
            { $project: { gst_name: 1 } }
          ],
          as: "gstDetail"
        }
      },

      // Brands lookup (array)
      {
        $lookup: {
          from: "brands",
          let: { brandIds: "$brands" },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$brandIds"] } } },
            { $project: { brand_name: 1 } }
          ],
          as: "brandDetails"
        }
      },

      // UOM lookup (single ID)
      {
        $lookup: {
          from: "uoms",
          let: { uomId: "$uom" },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$uomId"] } } },
            { $project: { uom_name: 1 } }
          ],
          as: "uomDetail"
        }
      },

      // Project required fields
      {
        $project: {
          item_name: 1,
          item_number: 1,
          item_code: 1,
          brands: 1,
          HSNcode: 1,
          category: 1,
          sub_category: 1,
          uom: 1,
          gst: 1,
          specification: 1,
          created_at: 1,
          updated_at: 1,
          created_by: 1,
          updated_by: 1,
          categoryDetail: { $arrayElemAt: ["$categoryDetail", 0] },
          subCategoryDetail: { $arrayElemAt: ["$subCategoryDetail", 0] },
          gstDetail: { $arrayElemAt: ["$gstDetail", 0] },
          brandDetails: 1,
          uomDetail: 1,
        }
      }
    ]);

     const response = {
      success: true,
      message: responseMessage(reqObj.langCode, "SUCCESS"),
      current_page: parseInt(page, 10),
      per_page: parseInt(per_page, 10),
      total: totalCount,
      total_pages: Math.ceil(totalCount / parseInt(per_page, 10)),
      data: allRecords
    };

    /* ================== CACHE SET (ONLY ADDITION) ================== */
    await setCache(cacheKey, response, MASTER_DATA);
    /* =============================================================== */

    return res.status(200).json(response);

  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: "An error occurred",
      error: error.message || error
    });
  }
}



async function uploadCSV(req, res) {
  try {
    if (!req.file) {
      throw {
        errors: [],
        message: responseMessage(req.body.langCode, "FILE_MISSING"),
        statusCode: 412,
      };
    }

    const results = [];
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", async () => {
        try {
          // Process the CSV data
          const processedData = await processCSVData(results);
          //console.log("=====processedData++++++", processedData);

          // Save the processed data to the database
          const savedItems = await ItemSchema.insertMany(processedData);

          // Remove the temporary file
          // fs.unlinkSync(req.file.path);
          fs.unlink(req.file.path, (err) => {
            if (err) {
              //console.error("Error deleting file:", err);
            } else {
              //console.log("File deleted successfully");
            }
          });

          res
            .status(200)
            .json(
              await Response.success(
                savedItems,
                responseMessage(req.body.langCode, "ITEMS_IMPORTED"),
                req
              )
            );
        } catch (error) {
          // Handle any errors that occur during processing
          res.status(422).json(
            await Response.errors(
              {
                errors: error.errors || [],
                message: error.message,
              },
              error,
              req
            )
          );
        }
      });
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

async function processCSVData(data) {
  const processedData = [];
  const errors = [];
  const existingItems = new Set();

  // Fetch the highest item_number and initialize for incrementing
  const highestItem = await ItemSchema.findOne({}, "item_number").sort({ item_number: -1 });
  let nextItemNumber = highestItem ? highestItem.item_number + 1 : 1;

  // Fetch all existing items to avoid duplicates
  const existingItemsArray = await ItemSchema.find({}, "item_name");
  existingItemsArray.forEach(item => existingItems.add(item.item_name.toLowerCase()));

  for (const [index, row] of data.entries()) {
    const itemName = row.item_name?.trim();
    if (!itemName) {
      errors.push(`Row ${index + 1}: Item name is missing or invalid.`);
      continue;
    }

    const itemData = {
      item_name: itemName,
      item_number: nextItemNumber,
      brands: [],
      uom: [],
      item_code: "",
    };

    // Process brands
    const brands = Array.from({ length: 4 }, (_, i) => row[`brand[${i}]`]).filter(Boolean);
    for (const brandName of brands) {
      const brand = await BrandSchema.findOne({ brand_name: new RegExp(`^\\s*${brandName.trim()}\\s*$`, "i") });
      if (brand) {
        itemData.brands.push(brand._id);
      } else {
        errors.push(`Row ${index + 1}: Brand ${brandName} not found for Item ${itemName}.`);
      }
    }

    // Process UOMs
    const uoms = Array.from({ length: 4 }, (_, i) => row[`uom[${i}]`]).filter(Boolean);
    for (const uomName of uoms) {
      const uomItem = await UOMSchema.findOne({ uom_name: new RegExp(`^\\s*${uomName.trim()}\\s*$`, "i") });
      if (uomItem) {
        itemData.uom.push(uomItem._id);
      } else {
        errors.push(`Row ${index + 1}: UOM ${uomName} not found for Item ${itemName}.`);
      }
    }

    // Process category and sub-category
    const categoryName = row.category?.trim();
    if (categoryName) {
      const category = await CategorySchema.findOne({ name: new RegExp(`^${categoryName}$`, "i") });
      if (category) {
        itemData.category = category._id;
        const categoryCode = category.code;

        const subCategoryName = row.sub_category?.trim();
        if (subCategoryName) {
          const subCategory = await SubCategorySchema.findOne({
            subcategory_name: new RegExp(`^${subCategoryName}$`, "i"),
            category: category._id,
          });
          if (subCategory) {
            itemData.sub_category = subCategory._id;
            const subCategoryCode = subCategory.subcategory_code;
            itemData.item_code = `${categoryCode}${subCategoryCode}${String(nextItemNumber).padStart(4, "0")}`;
          } else {
            errors.push(`Row ${index + 1}: Sub-category not found: ${subCategoryName} for category ${categoryName}.`);
          }
        } else {
          errors.push(`Row ${index + 1}: Sub-category is missing for item: ${itemName}.`);
        }
      } else {
        errors.push(`Row ${index + 1}: Category not found: ${categoryName}.`);
      }
    } else {
      errors.push(`Row ${index + 1}: Category is missing for item: ${itemName}.`);
    }

    // Process GST
    const gstValue = row.gst?.trim();
    if (gstValue) {
      const gstPercentage = parseInt(gstValue, 10);
      if (!isNaN(gstPercentage)) {
        const gst = await GSTSchema.findOne({ gst_percentage: gstPercentage });
        if (gst) {
          itemData.gst = gst._id;
        } else {
          errors.push(`Row ${index + 1}: GST not found: ${gstValue}.`);
        }
      } else {
        errors.push(`Row ${index + 1}: Invalid GST value: ${gstValue}.`);
      }
    } else {
      errors.push(`Row ${index + 1}: GST is missing for item: ${itemName}.`);
    }

    processedData.push(itemData);
    existingItems.add(itemName.toLowerCase());
    nextItemNumber++;
  }

  if (errors.length > 0) {
    throw new Error(`Errors encountered during processing:\n${errors.join("\n")}`);
  }

  return processedData;
}


async function getNextItemNumber(req, res) {
  try {
    // Find the item with the highest item_number
    const lastItem = await ItemSchema.findOne({ companyIdf: req.user.companyIdf })
      .sort({ item_number: -1 }) // sort descending
      .select({ item_number: 1 }) // only need item_number
      .lean();

    // Determine the next item number
    const nextItemNumber = lastItem && lastItem.item_number
      ? lastItem.item_number + 1
      : 1; // start from 1 if no items exist

    return res.status(200).json({
      success: true,
      message: "Next item number retrieved successfully",
      nextItemNumber
    });

  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: "An error occurred while fetching next item number",
      error: error.message || error
    });
  }
}
