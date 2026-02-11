
/**
 * Notification Type Controller
 * Handles all operations related to Notification Type management including:
 * - Creating multiple notification types in bulk
 * - Updating and deleting notification types
 * - Notification type queries
 * - Caching for performance optimization
 */

const NotificationTypeSchema = require("../../models/NotificationType");
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
 * Create Notification Types
 * POST /api/web/notificationType
 * Creates multiple notification types in bulk
 * 
 * Supports bulk creation:
 * - Accepts array of notification type objects
 * - Processes each notification concurrently
 * - Returns successful and failed saves separately
 * 
 * @param {Array} req.body - Array of notification type objects
 *   - Each object should have notification type fields
 *   - login_user_id: User creating the notification type
 * 
 * @returns {Object} Array of created notification types
 */
async function createData(req, res) {
    try {
      let notifications = req.body;
  
      // Validate input is an array
      if (!Array.isArray(notifications) || notifications.length === 0) {
        return res.status(400).json(
          await Response.errors(
            { message: responseMessage(req.langCode, "INVALID_INPUT") },
            { statusCode: 400 },
            req
          )
        );
      }
  
      // Process each notification with user tracking
      let processedData = notifications.map((notification) => {
        return {
          ...notification,
          created_by: notification.login_user_id,
          updated_by: notification.login_user_id,
        };
      });
  
      // Save all notifications concurrently (parallel processing)
      let savedNotifications = await Promise.all(
        notifications.map(async (data) => {
          try {
            return await new NotificationTypeSchema(data).save();
          } catch (error) {
            return { error, data }; // Return error for failed saves
          }
        })
      );
  
      // Separate successful and failed saves
      let successData = savedNotifications.filter((item) => !item.error);
      let failedData = savedNotifications.filter((item) => item.error);
  
      if (successData.length > 0) {
        return res.status(200).json(
          await Response.success(
            successData,
            responseMessage(req.langCode, "RECORDS_CREATED"),
            req
          )
        );
      } else {
        throw {
          errors: failedData.map((item) => item.error),
          message: responseMessage(req.langCode, "SOMETHING_WRONG"),
          statusCode: 412,
        };
      }
    } catch (error) {
      return res.status(error.statusCode || 422).json(
        await Response.errors(
          {
            errors: error.errors || [],
            message: error.message || responseMessage(req.langCode, "UNKNOWN_ERROR"),
          },
          error,
          req
        )
      );
    }
  }
  

async function updateData(req, res) {
  try {
    let reqObj = req.body;
    let loginUserId = reqObj.login_user_id;

    if (!reqObj._id) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "ID_MISSING"),
        statusCode: 412,
      };
    }

    let requestedData = { ...reqObj, ...{ updated_by: loginUserId } };

    let updatedData = await NotificationTypeSchema.findOneAndUpdate(
      {
        _id: ObjectID(reqObj._id),
      },
      requestedData,
      {
        new: true,
      }
    );

    if (updatedData) {
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

    let getData = await NotificationTypeSchema.findOne({ _id: ObjectID(_id) });

    if (!getData) {
      throw {
        errors: [],
        message: responseMessage(loginData.langCode, "NO_RECORD_FOUND"),
        statusCode: 412,
      };
    }

    const dataRemoved = await NotificationTypeSchema.deleteOne({ _id: ObjectID(_id) });

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

    const recordDetail = await NotificationTypeSchema.findOne({ _id: ObjectID(_id) });

    if (recordDetail) {
      res
        .status(200)
        .json(
          await Response.success(
            recordDetail,
            responseMessage(reqObj.langCode, "SUCCESS")
          )
        );
    } else {
      res
        .status(422)
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


async function getList(req, res) {
  try {
    let reqObj = req.body;

    let { page, per_page, sort_by, sort_order } = req.query;
    let pageData = Response.validationPagination(page, per_page);

    const hasPagination = page > 0;

    // ---------------- CACHE KEY ----------------
    const cacheKey = hasPagination
      ? `notificationType:list:page=${page}:per_page=${per_page}:sort_by=${sort_by || "default"}:sort_order=${sort_order || "desc"}`
      : `notificationType:list:all`;

    // ---------------- CACHE LOOKUP ----------------
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        ...cachedData,
        source: "cache",
      });
    }

    // ---------------- SORT ----------------
    let sort = { _id: -1 };
    if (sort_by) {
      let order = sort_order === "desc" ? -1 : 1;
      sort = { [sort_by]: order };
    }

    let response;

    // ---------------- PAGINATED ----------------
    if (hasPagination) {
      const allRecords = await NotificationTypeSchema.aggregate([
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
      const allRecords = await NotificationTypeSchema.find({}).lean();

      response = await Response.success(
        allRecords,
        responseMessage(reqObj.langCode, "SUCCESS"),
        req
      );
    }

    // ---------------- SAVE CACHE ----------------
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
