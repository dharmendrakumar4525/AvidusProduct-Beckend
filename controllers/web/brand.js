/**
 * Brand Controller
 * Handles all operations related to Brand master data including:
 * - Creating and updating brands
 * - Brand queries and filtering
 * - Caching for performance optimization
 */

const BrandSchema = require('../../models/Brand');
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
 * Create Brand
 * POST /api/web/brand
 * Creates a new brand in the master data
 * 
 * @param {Object} req.body - Brand data
 * @param {String} req.body.brand_name - Brand name (required)
 * @param {String} req.body.langCode - Language code for response messages
 * @param {String} req.body.login_user_id - User creating the brand
 * 
 * @returns {Object} Created brand object
 */
async function createData(req, res) {
    try {
        let reqObj = req.body;
        reqObj.created_by = reqObj.login_user_id;
        reqObj.updated_by = reqObj.login_user_id;

        // Create new brand record
        let newData = await new BrandSchema(reqObj).save();

        if (newData) {
            // Invalidate brand list cache
            await invalidateEntityList("brand");

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
 * Update Brand
 * PUT /api/web/brand
 * Updates an existing brand
 * 
 * @param {String} req.body._id - Brand ID (required)
 * @param {Object} req.body - Brand fields to update
 * @param {String} req.body.langCode - Language code for response messages
 * @param {String} req.body.login_user_id - User updating the brand
 * 
 * @returns {Object} Updated brand object
 */
async function updateData(req, res) {
    try {
        let reqObj = req.body;
        let loginUserId = reqObj.login_user_id;

        // Validate brand ID
        if (!reqObj._id) {
            throw {
                errors: [],
                message: responseMessage(reqObj.langCode, 'ID_MISSING'),
                statusCode: 412
            };
        }

        // Prepare update data with user tracking
        let requestedData = { ...reqObj, ...{ updated_by: loginUserId } };

        // Update brand and return updated document
        let updatedData = await BrandSchema.findOneAndUpdate({
            _id: ObjectID(reqObj._id)
        }, requestedData, {
            new: true // Return updated document
        });

        if (updatedData) {
            // Invalidate brand cache
            await invalidateEntity("brand");

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

        let getData = await BrandSchema.findOne({ "_id": ObjectID(_id)});

        if (!getData) {
            throw {
                errors: [],
                message: responseMessage(loginData.langCode, 'NO_RECORD_FOUND'),
                statusCode: 412
            }
        }

        const dataRemoved = await BrandSchema.deleteOne({ "_id": ObjectID(_id)});
        await invalidateEntity("brand");

        
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
    let reqObj = req.body;
    let { _id } = req.query;

    if (!_id) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "ID_MISSING"),
        statusCode: 412,
      };
    }

    const cacheKey = `brand:detail:${_id}`;

    // ---------------- CACHE LOOKUP ----------------
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        ...cachedData,
        source: "cache",
      });
    }

    const recordDetail = await BrandSchema.findOne({ _id: ObjectID(_id) });

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
    const reqObj = req.body;

    let {
      page,
      per_page,
      sort_by,
      sort_order,
      search
    } = req.query;

    // 1️⃣ Convert to numbers safely
    page = parseInt(page);
    per_page = parseInt(per_page);

    const hasPagination = page > 0 && per_page > 0;

    /* ---------- CACHE KEY ---------- */
    const cacheKey = `brand:list:page:${page || "all"}:per:${per_page || "all"}:search:${search || "none"}:sort:${sort_by || "_id"}:${sort_order || "desc"}`;

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

    // 2️⃣ Build search query
    let matchQuery = {};
    if (search) {
      matchQuery.brand_name = { $regex: search, $options: "i" };
    }

    // 3️⃣ Sorting
    let sort = { _id: -1 };
    if (sort_by) {
      sort = {
        [sort_by]: sort_order === "desc" ? -1 : 1,
      };
    }

    // 4️⃣ TOTAL COUNT
    const total = await BrandSchema.countDocuments(matchQuery);

    // 5️⃣ Fetch data
    let dataQuery = BrandSchema.find(matchQuery).sort(sort);

    if (hasPagination) {
      const skip = (page - 1) * per_page;
      dataQuery = dataQuery.skip(skip).limit(per_page);
    }

    const data = await dataQuery.lean();

    /* ---------- FINAL RESPONSE PAYLOAD ---------- */
    const responsePayload = {
      data,
      meta: hasPagination
        ? {
            total,
            page,
            per_page,
            total_pages: Math.ceil(total / per_page),
          }
        : { total },
    };

    /* ---------- SET CACHE (5 min) ---------- */
    await setCache(cacheKey, responsePayload, 1000);

    return res.status(200).json(
      await Response.success(
        responsePayload,
        responseMessage(reqObj.langCode, "SUCCESS"),
        req
      )
    );

  } catch (error) {
    console.error("getList error:", error);
    return res.status(422).json(
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
