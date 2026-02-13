/**
 * SubCategory Controller
 * Handles all operations related to SubCategory master data including:
 * - Creating and updating subcategories
 * - Subcategory queries and filtering
 * - Caching for performance optimization
 */

const SubCategorySchema = require('../../models/SubCategory');
const Response = require('../../libs/response');
const { responseMessage } = require("../../libs/responseMessages");
const ObjectID = require('mongodb').ObjectID;
const {
  getCache,
  setCache,
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
    getList
};

/**
 * Create SubCategory
 * POST /api/web/subCategory
 * Creates a new subcategory in the master data
 * 
 * @param {Object} req.body - SubCategory data
 * @param {String} req.body.subcategory_name - Subcategory name (required)
 * @param {String} req.body.category - Parent category ID (required)
 * @param {String} req.body.langCode - Language code for response messages
 * @param {String} req.body.login_user_id - User creating the subcategory
 * 
 * @returns {Object} Created subcategory object
 */
async function createData(req, res) {
    try {
        let reqObj = req.body;
        reqObj.companyIdf = req.user.companyIdf;
        reqObj.created_by = reqObj.login_user_id;
        reqObj.updated_by = reqObj.login_user_id;

        // Create new subcategory record
        let newData = await new SubCategorySchema(reqObj).save();

        if (newData) {
            // Invalidate subcategory list cache
            await invalidateEntityList("subcategory");

            res.status(200).json(await Response.success(newData, responseMessage(reqObj.langCode, 'RECORD_CREATED'), req));
        } else {
            throw {
                errors: [],
                message: responseMessage(reqObj.langCode, 'SOMETHING_WRONG'),
                statusCode: 412
            };
        }
    } catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            }, error, req)
        );
    }
}


/**
 * Update SubCategory
 * PUT /api/web/subCategory
 * Updates an existing subcategory
 * 
 * @param {String} req.body._id - SubCategory ID (required)
 * @param {Object} req.body - SubCategory fields to update
 * @param {String} req.body.langCode - Language code for response messages
 * @param {String} req.body.login_user_id - User updating the subcategory
 * 
 * @returns {Object} Updated subcategory object
 */
async function updateData(req, res) {
    try {
        let reqObj = req.body;
        let loginUserId = reqObj.login_user_id;

        // Validate subcategory ID
        if (!reqObj._id) {
            throw {
                errors: [],
                message: responseMessage(reqObj.langCode, 'ID_MISSING'),
                statusCode: 412
            };
        }

        // Prepare update data with user tracking
        let requestedData = { ...reqObj, ...{ updated_by: loginUserId } };

        // Update subcategory and return updated document
        let updatedData = await SubCategorySchema.findOneAndUpdate({
            _id: ObjectID(reqObj._id),
            companyIdf: req.user.companyIdf
        }, requestedData, {
            new: true // Return updated document
        });

        if (updatedData) {
            // Invalidate cache for this subcategory and subcategory list
            await invalidateEntity("subcategory", reqObj._id);
            await invalidateEntityList("subcategory");

            res.status(200).json(await Response.success(updatedData, responseMessage(reqObj.langCode, 'RECORD_UPDATED'), req));
        } else {
            res.status(400).json(await Response.success({}, responseMessage(reqObj.langCode, 'NO_RECORD_FOUND'), req));
        }
    } catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            }, error, req)
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
                message: responseMessage(reqObj.langCode, 'ID_MISSING'),
                statusCode: 412
            }
        }

        let getData = await SubCategorySchema.findOne({ "_id": ObjectID(_id), companyIdf: req.user.companyIdf });

        if (!getData) {
            throw {
                errors: [],
                message: responseMessage(reqObj.langCode, 'NO_RECORD_FOUND'),
                statusCode: 412
            }
        }

        const dataRemoved = await SubCategorySchema.deleteOne({ "_id": ObjectID(_id), companyIdf: req.user.companyIdf });
        await invalidateEntity("subcategory", reqObj._id);
await invalidateEntityList("subcategory");


        res.status(200).json(await Response.success({}, responseMessage(reqObj.langCode, 'RECORD_DELETED'), req));

    } catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            }, error, req)
        );

    }
}


async function getDetails(req, res) {
  try {
    const reqObj = req.body;
    const { _id } = req.query;

    if (!_id) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "ID_MISSING"),
        statusCode: 412,
      };
    }

    /* ---------- CACHE ---------- */
    const cacheKey = `subcategory:details:${_id}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return res.status(200).json(cached);
    }

    /* ---------- DB ---------- */
    const recordDetail = await SubCategorySchema.aggregate([
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
        $addFields: {
          categoryDetail: { $arrayElemAt: ["$categoryDetail", 0] },
        },
      },
      {
        $project: {
          subcategory_name: 1,
          subcategory_code: 1,
          category: 1,
          created_at: 1,
          updated_at: 1,
          "categoryDetail._id": 1,
          "categoryDetail.name": 1,
          "categoryDetail.code": 1,
        },
      },
    ]);

    if (!recordDetail || recordDetail.length === 0) {
      return res.status(422).json(
        await Response.success(
          {},
          responseMessage(reqObj.langCode, "NO_RECORD_FOUND"),
          req
        )
      );
    }

    const response = await Response.success(
      recordDetail[0],
      responseMessage(reqObj.langCode, "SUCCESS"),
      req
    );

    /* ---------- SET CACHE ---------- */
    await setCache(cacheKey, response, MASTER_DATA);

    return res.status(200).json(response);

  } catch (error) {
    return res.status(error.statusCode || 422).json(
      await Response.errors(
        { errors: error.errors, message: error.message },
        error,
        req
      )
    );
  }
}




async function getList(req, res) {
  try {
    const reqObj = req.body;

    const {
      page,
      per_page,
      sort_by = "_id",
      sort_order = "desc",
      searchByCategory,
      searchBySubCategory
    } = req.query;

    const hasPagination = page && per_page;
    const pageNum = Number(page);
    const limit = Number(per_page);
    const offset = hasPagination ? (pageNum - 1) * limit : 0;

    /* ---------------- SORT ---------------- */
    const sort = {};
    sort[sort_by] = sort_order === "desc" ? -1 : 1;

    /* ---------------- SEARCH ---------------- */
    let andConditions = [];

    if (searchBySubCategory?.trim()) {
      const regex = new RegExp(searchBySubCategory.trim(), "i");
      andConditions.push({
        $or: [
          { subcategory_name: regex },
          { subcategory_code: regex }
        ]
      });
    }

    if (searchByCategory?.trim()) {
      const regex = new RegExp(searchByCategory.trim(), "i");
      andConditions.push({
        $or: [
          { "categoryDetail.name": regex },
          { "categoryDetail.code": regex }
        ]
      });
    }

    const matchQuery =
      andConditions.length > 0 ? { $and: andConditions } : {};

    /* ---------------- CACHE KEY ---------------- */
    const cacheKey = `subcategory:list:${JSON.stringify({
      page,
      per_page,
      sort_by,
      sort_order,
      searchByCategory,
      searchBySubCategory
    })}`;

    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    /* ---------------- AGGREGATION ---------------- */
    const records = await SubCategorySchema.aggregate([
      { $match: { companyIdf: ObjectID(req.user.companyIdf) } },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryDetail"
        }
      },
      {
        $addFields: {
          categoryDetail: { $arrayElemAt: ["$categoryDetail", 0] }
        }
      },
      { $match: matchQuery },
      { $sort: sort },
      {
        $project: {
          subcategory_name: 1,
          subcategory_code: 1,
          category: 1,
          created_at: 1,
          updated_at: 1,
          "categoryDetail._id": 1,
          "categoryDetail.name": 1,
          "categoryDetail.code": 1
        }
      }
    ]);

    /* ---------------- MANUAL PAGINATION ---------------- */
    const total = records.length;

    let data = records;
    if (hasPagination) {
      data = records.slice(offset, offset + limit);
    }

    /* ---------------- RESPONSE ---------------- */
    const response = hasPagination
      ? await Response.success(
          {
            data,
            total,
            page: pageNum,
            per_page: limit
          },
          responseMessage(reqObj.langCode, "SUCCESS"),
          req
        )
      : await Response.success(
          {
            data,
            total
          },
          responseMessage(reqObj.langCode, "SUCCESS"),
          req
        );

    /* ---------------- CACHE ---------------- */
    await setCache(cacheKey, response, MASTER_DATA);

    return res.status(200).json(response);

  } catch (error) {
    return res.status(error.statusCode || 422).json(
      await Response.errors(
        { errors: error.errors, message: error.message },
        error,
        req
      )
    );
  }
}

