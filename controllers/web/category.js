/**
 * Category Controller
 * Handles all operations related to Category master data including:
 * - Creating and updating categories
 * - Category queries and filtering
 * - Caching for performance optimization
 */

const CategorySchema = require('../../models/Category');
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
 * Create Category
 * POST /api/web/category
 * Creates a new category in the master data
 * 
 * @param {Object} req.body - Category data
 * @param {String} req.body.category_name - Category name (required)
 * @param {String} req.body.langCode - Language code for response messages
 * @param {String} req.body.login_user_id - User creating the category
 * 
 * @returns {Object} Created category object
 */
async function createData(req, res) {
    try {
        let reqObj = req.body;
        reqObj.companyIdf = req.user.companyIdf;
        reqObj.created_by = reqObj.login_user_id;
        reqObj.updated_by = reqObj.login_user_id;

        // Create new category record
        let newData = await new CategorySchema(reqObj).save();

        if (newData) {
            // Invalidate category list cache
            await invalidateEntityList("category");

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
 * Update Category
 * PUT /api/web/category
 * Updates an existing category
 * 
 * @param {String} req.body._id - Category ID (required)
 * @param {Object} req.body - Category fields to update
 * @param {String} req.body.langCode - Language code for response messages
 * @param {String} req.body.login_user_id - User updating the category
 * 
 * @returns {Object} Updated category object
 */
async function updateData(req, res) {
    try {
        let reqObj = req.body;
        let loginUserId = reqObj.login_user_id;

        // Validate category ID
        if (!reqObj._id) {
            throw {
                errors: [],
                message: responseMessage(reqObj.langCode, 'ID_MISSING'),
                statusCode: 412
            };
        }

        // Prepare update data with user tracking
        let requestedData = { ...reqObj, ...{ updated_by: loginUserId } };

        // Update category and return updated document
        let updatedData = await CategorySchema.findOneAndUpdate({
            _id: ObjectID(reqObj._id),
            companyIdf: req.user.companyIdf
        }, requestedData, {
            new: true // Return updated document
        });

        if (updatedData) {
            // Invalidate cache for this category and category list
            await invalidateEntity("category");
            await invalidateEntityList("category");

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

        let getData = await CategorySchema.findOne({ "_id": ObjectID(_id), companyIdf: req.user.companyIdf });

        if (!getData) {
            throw {
                errors: [],
                message: responseMessage(reqObj.langCode, 'NO_RECORD_FOUND'),
                statusCode: 412
            }
        }

        const dataRemoved = await CategorySchema.deleteOne({ "_id": ObjectID(_id), companyIdf: req.user.companyIdf });
        
        await invalidateEntity("category");
await invalidateEntityList("category");
        res.status(200).json(await Response.success({}, responseMessage(reqObj.langCode,'RECORD_DELETED'),req));

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

    if (!ObjectID.isValid(_id)) {
      throw {
        errors: [],
        message: "Invalid Category ID",
        statusCode: 400,
      };
    }

    const cacheKey = `category:detail:${_id}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        ...cached,
        source: "cache",
      });
    }

    const recordDetail = await CategorySchema.findOne({
      _id: ObjectID(_id),
      companyIdf: req.user.companyIdf,
    }).lean();

    if (!recordDetail) {
      return res.status(422).json(
        await Response.success(
          {},
          responseMessage(reqObj.langCode, "NO_RECORD_FOUND"),
          req
        )
      );
    }

    const response = await Response.success(
      recordDetail,
      responseMessage(reqObj.langCode, "SUCCESS"),
      req
    );

    await setCache(cacheKey, response, MASTER_DATA);

    return res.status(200).json({
      ...response,
      source: "db",
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


async function getList(req, res) {
  try {
    const reqObj = req.body;
    const { page, per_page, sort_by, sort_order, search } = req.query;

    const hasPagination = Number(page) > 0 && Number(per_page) > 0;

    const pageNum = Number(page) || 1;
    const limitNum = Number(per_page) || 0;
    const skip = (pageNum - 1) * limitNum;

    // 🔹 SEARCH QUERY
    const matchQuery = { companyIdf: ObjectID(req.user.companyIdf) };
    if (search) {
      matchQuery.category_name = { $regex: search, $options: "i" };
    }

    // 🔹 SORT
    let sort = { _id: -1 };
    if (sort_by) {
      sort = { [sort_by]: sort_order === "desc" ? -1 : 1 };
    }

    // 🔹 CACHE KEY
    const cacheKey = `category:list:${JSON.stringify({
      page,
      per_page,
      sort_by,
      sort_order,
      search,
    })}`;

    // 🔹 TRY CACHE
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        ...cached,
        source: "cache",
      });
    }

    let data = [];
    let totalItems = 0;

    if (hasPagination) {
      const result = await CategorySchema.aggregate([
        { $match: matchQuery },
        {
          $facet: {
            data: [
              { $sort: sort },
              { $skip: skip },
              { $limit: limitNum },
            ],
            total: [{ $count: "count" }],
          },
        },
      ]);

      data = result[0].data;
      totalItems = result[0].total[0]?.count || 0;

    } else {
      data = await CategorySchema.find(matchQuery).sort(sort).lean();
      totalItems = data.length;
    }

    const response = hasPagination
      ? await Response.success(
          {
            data,
            totalItems,
            currentPage: pageNum,
            per_page: limitNum,
            totalPages: limitNum ? Math.ceil(totalItems / limitNum) : 1,
          },
          responseMessage(reqObj.langCode, "SUCCESS"),
          req
        )
      : await Response.success(
          data,
          responseMessage(reqObj.langCode, "SUCCESS"),
          req
        );

    // 🔹 SAVE CACHE (5 mins)
    await setCache(cacheKey, response, MASTER_DATA);

    return res.status(200).json({
      ...response,
      source: "db",
    });

  } catch (error) {
    console.error("Category getList error:", error);
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
