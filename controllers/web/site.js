/**
 * Site Controller
 * Handles all operations related to Site master data including:
 * - Creating and updating sites
 * - Managing site roles (store manager, project manager, project director)
 * - Automatically updating user-site associations when roles change
 * - Site queries and filtering
 * - Caching for performance optimization
 */

const SiteSchema = require('../../models/Site');
const User = require('../../models/User');
const Response = require('../../libs/response');
const { responseMessage } = require("../../libs/responseMessages");
const ObjectID = require('mongodb').ObjectID;
const { getCache, setCache, deleteCache, invalidateEntity, invalidateEntityList } = require("../../utils/cache");
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
 * Create Site
 * POST /api/web/site
 * Creates a new site and automatically associates users based on assigned roles
 * 
 * When a site is created with role assignments (store_manager, project_manager, project_director),
 * those users are automatically added to the site's user list.
 * 
 * @param {Object} req.body - Site data
 * @param {String} req.body.name - Site name (required)
 * @param {Object} req.body.roles - Role assignments
 *   - store_manager: User ID for store manager
 *   - project_manager: User ID for project manager
 *   - project_director: User ID for project director
 * @param {String} req.body.langCode - Language code for response messages
 * @param {String} req.body.login_user_id - User creating the site
 * 
 * @returns {Object} Created site object
 */
async function createData(req, res) {
    try {
        let reqObj = req.body;
        reqObj.companyIdf = req.user.companyIdf;
        reqObj.created_by = reqObj.login_user_id;
        reqObj.updated_by = reqObj.login_user_id;

        // Create new site
        let newData = await new SiteSchema(reqObj).save();

        if (newData) {
            // Extract role IDs from newData.roles
            const roles = newData.roles || {};
            const userIdsToUpdate = [];

            // Collect all user IDs assigned to roles
            if (roles.store_manager) userIdsToUpdate.push(roles.store_manager);
            if (roles.project_manager) userIdsToUpdate.push(roles.project_manager);
            if (roles.project_director) userIdsToUpdate.push(roles.project_director);

            // Update users to add this site ID to their sites array
            // $addToSet ensures no duplicates if site already exists in user's sites
            await User.updateMany(
                { _id: { $in: userIdsToUpdate } },
                { $addToSet: { sites: newData._id } }
            );
            
            // Invalidate site list cache
            await invalidateEntityList("site");

            res.status(200).json(
                await Response.success(newData, responseMessage(reqObj.langCode, 'RECORD_CREATED'), req)
            );
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
 * Update Site
 * PUT /api/web/site
 * Updates an existing site and manages user-site associations based on role changes
 * 
 * When roles are updated:
 * - Users removed from roles are removed from site's user list
 * - Users added to roles are added to site's user list
 * 
 * @param {String} req.body._id - Site ID (required)
 * @param {Object} req.body - Site fields to update
 * @param {Object} req.body.roles - Updated role assignments (optional)
 * @param {String} req.body.langCode - Language code for response messages
 * @param {String} req.body.login_user_id - User updating the site
 * 
 * @returns {Object} Updated site object
 */
async function updateData(req, res) {
    try {
        let reqObj = req.body;
        let loginUserId = reqObj.login_user_id;

        // Validate site ID
        if (!reqObj._id) {
            throw {
                errors: [],
                message: responseMessage(reqObj.langCode, 'ID_MISSING'),
                statusCode: 412
            };
        }

        // Get existing site data before update (needed for role comparison)
        const existingSite = await SiteSchema.findOne({ _id: reqObj._id, companyIdf: req.user.companyIdf });
        if (!existingSite) {
            throw {
                errors: [],
                message: responseMessage(reqObj.langCode, 'NO_RECORD_FOUND'),
                statusCode: 404
            };
        }

        // Prepare update data with user tracking
        const requestedData = {
            ...reqObj,
            updated_by: loginUserId
        };

        // Update site and return updated document
        const updatedData = await SiteSchema.findOneAndUpdate(
            { _id: ObjectID(reqObj._id), companyIdf: req.user.companyIdf },
            requestedData,
            { new: true }
        );

        if (updatedData) {
            // Get old roles for comparison
            const oldRoles = existingSite.roles || {};
            const newRoles = updatedData.roles || {};
            const siteId = updatedData._id;

            const oldUserIds = new Set([
                oldRoles.store_manager?.toString(),
                oldRoles.project_manager?.toString(),
                oldRoles.project_director?.toString()
            ].filter(Boolean));

            const newUserIds = new Set([
                newRoles.store_manager?.toString(),
                newRoles.project_manager?.toString(),
                newRoles.project_director?.toString()
            ].filter(Boolean));

            const usersToRemove = [...oldUserIds].filter(id => !newUserIds.has(id));
            const usersToAdd = [...newUserIds].filter(id => !oldUserIds.has(id));

            // Remove site ID from users no longer assigned
            if (usersToRemove.length > 0) {
                await User.updateMany(
                    { _id: { $in: usersToRemove } },
                    { $pull: { sites: siteId } }
                );
            }

            // Add site ID to new assigned users
            if (usersToAdd.length > 0) {
                await User.updateMany(
                    { _id: { $in: usersToAdd } },
                    { $addToSet: { sites: siteId } }
                );
            }
await deleteCache(`site:details:${reqObj._id}`);
await invalidateEntityList("site");

            return res.status(200).json(
                await Response.success(updatedData, responseMessage(reqObj.langCode, 'RECORD_UPDATED'), req)
            );
        } else {
            return res.status(400).json(
                await Response.success({}, responseMessage(reqObj.langCode, 'NO_RECORD_FOUND'), req)
            );
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

        let getData = await SiteSchema.findOne({ "_id": ObjectID(_id), companyIdf: req.user.companyIdf });

        if (!getData) {
            throw {
                errors: [],
                message: responseMessage(reqObj.langCode, 'NO_RECORD_FOUND'),
                statusCode: 412
            }
        }

        const dataRemoved = await SiteSchema.deleteOne({ "_id": ObjectID(_id), companyIdf: req.user.companyIdf });
        await deleteCache(`site:details:${_id}`);
await invalidateEntityList("site");

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
        message: responseMessage(reqObj.langCode, 'ID_MISSING'),
        statusCode: 412
      };
    }

    const cacheKey = `site:details:${_id}`;

    // 1️⃣ Redis first
    const cachedSite = await getCache(cacheKey);
    if (cachedSite) {
      return res.status(200).json(
        await Response.success(
          cachedSite,
          responseMessage(reqObj.langCode, 'SUCCESS'),
          req
        )
      );
    }

    // 2️⃣ DB fetch
    const recordDetail = await SiteSchema.findOne({ _id: ObjectID(_id), companyIdf: req.user.companyIdf }).lean();

    if (!recordDetail) {
      return res.status(422).json(
        await Response.success({}, responseMessage(reqObj.langCode, 'NO_RECORD_FOUND'), req)
      );
    }

    // 3️⃣ Cache for 5 minutes
    await setCache(cacheKey, recordDetail, MASTER_DATA);

    return res.status(200).json(
      await Response.success(recordDetail, responseMessage(reqObj.langCode, 'SUCCESS'), req)
    );

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
    // ---------------- PARAMS ----------------
    const search = req.query.search?.trim();
    const page = Number(req.query.page);
    const limit = Number(req.query.per_page);
    const sortOrder = req.query.order === "desc" ? -1 : 1;

    const hasPagination =
      Number.isInteger(page) && page > 0 &&
      Number.isInteger(limit) && limit > 0;

    // ---------------- CACHE KEY ----------------
    const cacheKey = `site:list:search=${search || "none"}:page=${hasPagination ? page : "all"}:limit=${hasPagination ? limit : "all"}:order=${sortOrder}`;

    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        ...cachedData,
        source: "cache",
      });
    }

    // ---------------- QUERY (SEARCH AWARE) ----------------
    const query = { companyIdf: req.user.companyIdf };
    if (search) {
      query.site_name = { $regex: search, $options: "i" };
    }

    // ---------------- TOTAL COUNT (NO PAGINATION) ----------------
    const totalItems = await SiteSchema.countDocuments(query);

    // ---------------- BASE QUERY ----------------
    let sitesQuery = SiteSchema.find(query)
      .populate("roles.store_manager", "name email role")
      .populate("roles.project_manager", "name email role")
      .populate("roles.project_director", "name email role")
      .sort({ site_name: sortOrder })
      .lean();

    let data;

    // ---------------- APPLY PAGINATION ONLY TO DATA ----------------
    if (hasPagination) {
      const skip = (page - 1) * limit;
      data = await sitesQuery.skip(skip).limit(limit);
    } else {
      data = await sitesQuery;
    }

    // ---------------- RESPONSE ----------------
    const response = hasPagination
      ? {
          data,
          currentPage: page,
          totalPages: Math.ceil(totalItems / limit),
          totalItems,
        }
      : { data, totalItems };

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
