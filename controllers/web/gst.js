/**
 * GST Controller
 * Handles all operations related to GST (Goods and Services Tax) master data including:
 * - Creating and updating GST rates
 * - GST queries and filtering
 * - Caching for performance optimization
 */

const GstSchema = require("../../models/Gst");
const Response = require("../../libs/response");
const { responseMessage } = require("../../libs/responseMessages");
const ObjectID = require("mongodb").ObjectID;
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
  getList,
};

/**
 * Create GST
 * POST /api/web/gst
 * Creates a new GST rate in the master data
 * 
 * @param {Object} req.body - GST data
 * @param {Number} req.body.gst_rate - GST rate percentage (e.g., 5, 12, 18, 28) (required)
 * @param {String} req.body.gst_name - GST name/description (optional)
 * @param {String} req.body.langCode - Language code for response messages
 * @param {String} req.body.login_user_id - User creating the GST
 * 
 * @returns {Object} Created GST object
 */
async function createData(req, res) {
  try {
    let reqObj = req.body;
    reqObj.companyIdf = req.user.companyIdf;
    reqObj.created_by = reqObj.login_user_id;
    reqObj.updated_by = reqObj.login_user_id;

    // Create new GST record
    let newData = await new GstSchema(reqObj).save();

    if (newData) {
      // Invalidate GST list cache
      await invalidateEntityList("gst");

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
 * Update GST
 * PUT /api/web/gst
 * Updates an existing GST rate
 * 
 * @param {String} req.body._id - GST ID (required)
 * @param {Object} req.body - GST fields to update
 * @param {String} req.body.langCode - Language code for response messages
 * @param {String} req.body.login_user_id - User updating the GST
 * 
 * @returns {Object} Updated GST object
 */
async function updateData(req, res) {
  try {
    let reqObj = req.body;
    let loginUserId = reqObj.login_user_id;

    // Validate GST ID
    if (!reqObj._id) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "ID_MISSING"),
        statusCode: 412,
      };
    }

    // Prepare update data with user tracking
    let requestedData = { ...reqObj, ...{ updated_by: loginUserId } };

    // Update GST and return updated document
    let updatedData = await GstSchema.findOneAndUpdate(
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
      // Invalidate GST cache
      await invalidateEntity("gst");

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

    let getData = await GstSchema.findOne({ _id: ObjectID(_id), companyIdf: req.user.companyIdf });

    if (!getData) {
    

      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "NO_RECORD_FOUND"),
        statusCode: 412,
      };
    }

    const dataRemoved = await GstSchema.deleteOne({ _id: ObjectID(_id), companyIdf: req.user.companyIdf });

  await invalidateEntity("gst");
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

    const cacheKey = `gst:detail:${_id}`;

    // -------- CACHE LOOKUP --------
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        ...cachedData,
        source: "cache",
      });
    }

    const recordDetail = await GstSchema.findOne({ _id: ObjectID(_id), companyIdf: req.user.companyIdf });

    let response;

    if (recordDetail) {
      response = await Response.success(
        recordDetail,
        responseMessage(reqObj.langCode, "SUCCESS")
      );
    } else {
      response = await Response.success(
        {},
        responseMessage(reqObj.langCode, "NO_RECORD_FOUND"),
        req
      );
    }

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
    let reqObj = req.body;
    let { page, per_page, sort_by, sort_order } = req.query;

    let pageData = Response.validationPagination(page, per_page);
    const hasPagination = page > 0;

    // ---------------- CACHE KEY ----------------
    const cacheKey = hasPagination
      ? `gst:list:page=${page}:per_page=${per_page}:sort_by=${sort_by || "default"}:sort_order=${sort_order || "desc"}`
      : `gst:list:all`;

    // ---------------- CACHE LOOKUP ----------------
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        ...cachedData,
        source: "cache",
      });
    }

    let sort = { _id: -1 };
    if (sort_by) {
      let order = sort_order === "desc" ? -1 : 1;
      sort = { [sort_by]: order };
    }

    let response;

    // ---------------- PAGINATED ----------------
    if (hasPagination) {
      const allRecords = await GstSchema.aggregate([
        { $match: { companyIdf: ObjectID(req.user.companyIdf) } },
        {
          $facet: {
            data: [
              { $sort: sort },
              { $skip: pageData.offset },
              { $limit: pageData.limit },
            ],
            total: [{ $count: "total" }],
          },
        },
      ]);

      response = await Response.pagination(
        allRecords,
        responseMessage(reqObj.langCode, "SUCCESS"),
        pageData,
        req
      );
    }
    // ---------------- NON-PAGINATED ----------------
    else {
      const allRecords = await GstSchema.find({ companyIdf: req.user.companyIdf }).lean();

      response = await Response.success(
        allRecords,
        responseMessage(reqObj.langCode, "SUCCESS"),
        req
      );
    }

    // ---------------- SAVE CACHE ----------------
    await setCache(cacheKey, response, MASTER_DATA); // 5 minutes

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
