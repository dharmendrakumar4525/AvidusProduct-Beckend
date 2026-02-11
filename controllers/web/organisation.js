/**
 * Organisation Controller
 * Handles all operations related to Organisation master data including:
 * - Creating and updating organisations
 * - Organisation queries and filtering
 * - Caching for performance optimization
 */

const OrganisationSchema = require('../../models/Organisation');
const Response = require('../../libs/response');
const { responseMessage } = require("../../libs/responseMessages");
const ObjectID = require('mongodb').ObjectID;
const {
  getCache,
  setCache,
  invalidateEntityList,
  invalidateEntity
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
 * Create Organisation
 * POST /api/web/organisation
 * Creates a new organisation in the master data
 * 
 * @param {Object} req.body - Organisation data
 * @param {String} req.body.organisation_name - Organisation name (required)
 * @param {String} req.body.langCode - Language code for response messages
 * @param {String} req.body.login_user_id - User creating the organisation
 * 
 * @returns {Object} Created organisation object
 */
async function createData(req, res) {
    try {
        let reqObj = req.body;
        reqObj.created_by = reqObj.login_user_id;
        reqObj.updated_by = reqObj.login_user_id;

        // Create new organisation record
        let newData = await new OrganisationSchema(reqObj).save();

        if (newData) {
            // Invalidate organisation list cache
            await invalidateEntityList("organisation");

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
 * Update Organisation
 * PUT /api/web/organisation
 * Updates an existing organisation
 * 
 * @param {String} req.body._id - Organisation ID (required)
 * @param {Object} req.body - Organisation fields to update
 * @param {String} req.body.langCode - Language code for response messages
 * @param {String} req.body.login_user_id - User updating the organisation
 * 
 * @returns {Object} Updated organisation object
 */
async function updateData(req, res) {
    try {
        let reqObj = req.body;
        let loginUserId = reqObj.login_user_id;

        // Validate organisation ID
        if (!reqObj._id) {
            throw {
                errors: [],
                message: responseMessage(reqObj.langCode, 'ID_MISSING'),
                statusCode: 412
            };
        }

        // Prepare update data with user tracking
        let requestedData = { ...reqObj, ...{ updated_by: loginUserId } };

        // Update organisation and return updated document
        let updatedData = await OrganisationSchema.findOneAndUpdate({
            _id: ObjectID(reqObj._id)
        }, requestedData, {
            new: true // Return updated document
        });

        if (updatedData) {
            // Invalidate cache for this organisation and organisation list
            await invalidateEntity("organisation");
            await invalidateEntityList("organisation");

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

        let getData = await OrganisationSchema.findOne({ "_id": ObjectID(_id)});

        if (!getData) {
            throw {
                errors: [],
                message: responseMessage(loginData.langCode, 'NO_RECORD_FOUND'),
                statusCode: 412
            }
        }
await invalidateEntity("organisation");
await invalidateEntityList("organisation");

        const dataRemoved = await OrganisationSchema.deleteOne({ "_id": ObjectID(_id)});
        
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
        statusCode: 412
      };
    }

    if (!ObjectID.isValid(_id)) {
      throw {
        errors: [],
        message: "Invalid Organisation ID",
        statusCode: 400
      };
    }

    const cacheKey = `organisation:detail:${_id}`;

    // 🔹 Try cache
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        ...cached,
        source: "cache"
      });
    }

    // 🔹 Fetch from DB
    const recordDetail = await OrganisationSchema.findOne({
      _id: ObjectID(_id)
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

    // 🔹 Save to cache (5 mins)
    await setCache(cacheKey, response, MASTER_DATA);

    return res.status(200).json({
      ...response,
      source: "db"
    });

  } catch (error) {
    console.error("Organisation getDetails error:", error);
    return res.status(error.statusCode || 422).json(
      await Response.errors(
        {
          errors: error.errors,
          message: error.message
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

    page = parseInt(page);
    per_page = parseInt(per_page);

    const hasPagination = page > 0 && per_page > 0;

    // 🔹 Build search query
    let matchQuery = {};
    if (search) {
      matchQuery = {
        companyName: { $regex: search, $options: "i" }
      };
    }

    // 🔹 Sorting
    let sort = { _id: -1 };
    if (sort_by) {
      sort = {
        [sort_by]: sort_order === "desc" ? -1 : 1
      };
    }

    // 🔹 Cache Key
    const cacheKey = `organisation:list:search=${search || "none"}:page=${hasPagination ? page : "all"}:limit=${hasPagination ? per_page : "all"}:sort=${JSON.stringify(sort)}`;

    // 🔹 Cache Lookup
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        ...cached,
        source: "cache"
      });
    }

    // 🔹 Total count (independent)
    const total = await OrganisationSchema.countDocuments(matchQuery);

    // 🔹 Data query
    let query = OrganisationSchema.find(matchQuery).sort(sort);

    if (hasPagination) {
      const skip = (page - 1) * per_page;
      query = query.skip(skip).limit(per_page);
    }

    const data = await query.lean();

    // 🔹 Final response
    const response = {
      success: true,
      message: responseMessage(reqObj.langCode, "SUCCESS"),
      data,
      meta: hasPagination
        ? {
            total,
            page,
            per_page,
            total_pages: Math.ceil(total / per_page)
          }
        : { total }
    };

    // 🔹 Save cache (60 sec)
    await setCache(cacheKey, response, MASTER_DATA);

    return res.status(200).json({
      ...response,
      source: "db"
    });

  } catch (error) {
    console.error("Organisation getList error:", error);
    return res.status(error.statusCode || 422).json(
      await Response.errors(
        {
          errors: error.errors,
          message: error.message
        },
        error,
        req
      )
    );
  }
}
