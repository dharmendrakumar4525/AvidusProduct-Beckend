/**
 * Role Controller
 * Handles all operations related to Role management including:
 * - Creating and updating roles
 * - Role-based permission management
 * - User-role associations
 * - Dashboard permissions configuration
 * - Caching for performance optimization
 */

const router = require("express").Router();
const Role = require("../../models/Role");
const RecentActivity = require("../../models/recentActivity");
const User = require("../../models/User");
const mongoose = require("mongoose");
const Response = require("../../libs/response");
const { ModuleList } = require("../../libs/constant");
const { responseMessage } = require("../../libs/responseMessages");
const ObjectId = mongoose.Types.ObjectId;
const {
  getCache,
  setCache,
  invalidateEntity,
  invalidateEntityList,
} = require("../../utils/cache");
const { MASTER_DATA } = require("../../libs/cacheConfig");

// Export all controller functions
module.exports = {
  getList,
  getDataByID,
  getDataByRole,
  createData,
  updateData,
  deleteList,
  updatePermData,
  deleteData,
  getUserPermission,
};

/**
 * Get Role List
 * GET /api/web/role
 * Retrieves a paginated and searchable list of roles
 * Uses caching for performance optimization
 * 
 * @param {Number} req.query.page - Page number (optional)
 * @param {Number} req.query.limit - Items per page (optional)
 * @param {String} req.query.search - Search term for role name (optional)
 * @param {String} req.query.order - Sort order: "asc" or "desc" (default: "asc")
 * 
 * @returns {Object} Paginated list of roles with metadata
 */
async function getList(req, res) {
  try {
    const { page, limit, search, order = "asc" } = req.query;

    // Determine if pagination is requested
    const isPagination = page && limit;

    // Calculate pagination parameters
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = isPagination ? (pageNum - 1) * limitNum : 0;
    const sortOrder = order === "desc" ? -1 : 1;

    // Build cache key that reflects all query parameters
    const cacheKey = `role:list:page=${page || "all"}:limit=${
      limit || "all"
    }:search=${search || "none"}:order=${order}`;

    // Check cache first
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json({ ...cached, source: "cache" });
    }

    // Build search query
    const query = {};
    if (search && search.trim()) {
      query.role = { $regex: search, $options: "i" }; // Case-insensitive search
    }

    // Get total count (irrespective of search filter)
    const totalItems = await Role.countDocuments({});

    // Build data query with sorting
    let roleQuery = Role.find(query).sort({ role: sortOrder });

    // Apply pagination if requested
    if (isPagination) {
      roleQuery = roleQuery.skip(skip).limit(limitNum);
    }

    // Execute query
    const data = await roleQuery.lean();

    // Build response
    const response = {
      success: true,
      data,
      totalItems, // Always full count
      filteredCount: data.length,
      currentPage: isPagination ? pageNum : null,
      totalPages: isPagination ? Math.ceil(totalItems / limitNum) : null,
    };

    // Cache response for 1000 seconds (~16 minutes)
    await setCache(cacheKey, response, MASTER_DATA);

    return res.status(200).json({ ...response, source: "db" });
  } catch (error) {
    console.error("Get Role List Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function getDataByID(req, res) {
  try {
    const { id } = req.params;
    const cacheKey = `role:id:${id}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json({ ...cached, source: "cache" });
    }

    const role = await Role.findById(id).lean();
    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    await setCache(cacheKey, role, 1000);

    return res.status(200).json({ ...role, source: "db" });
  } catch (error) {
    console.error("Get Role By ID Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function getDataByRole(req, res) {
  try {
    const { role } = req.params;
    const cacheKey = `role:name:${role}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json({ ...cached, source: "cache" });
    }

    const roleData = await Role.findOne({ role }).lean();
    if (!roleData) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    await setCache(cacheKey, roleData, 1000);

    return res.status(200).json({ ...roleData, source: "db" });
  } catch (error) {
    console.error("Get Role By Name Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * Create Role
 * POST /api/web/role
 * Creates a new role
 * 
 * @param {String} req.body.role - Role name (required)
 * @param {Array} req.body.notifications - Notification settings
 * @param {Object} req.body.dashboard_permissions - Dashboard permissions object
 * 
 * @returns {Object} Created role object
 */
async function createData(req, res) {
  try {
    // Create new role
    const role = await Role.create(req.body);

    // Invalidate role cache to ensure fresh data
    await invalidateEntity("role");

    return res.status(201).json({
      success: true,
      data: role,
      message: "Role created successfully",
    });
  } catch (error) {
    console.error("Create Role Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * Update Role
 * PUT /api/web/role/:id
 * Updates a role and automatically updates all users with that role
 * 
 * When a role name is changed, all users with the previous role name
 * are automatically updated to use the new role name.
 * 
 * @param {String} req.params.id - Role ID (required)
 * @param {String} req.body.role - New role name (required)
 * @param {String} req.body.prevRole - Previous role name (required for user updates)
 * @param {Array} req.body.notifications - Notification settings (required)
 * 
 * @returns {Object} Updated role and count of users updated
 */
async function updateData(req, res) {
  const { role: newRole, notifications, prevRole } = req.body;

  // Validate required fields
  if (!newRole || !notifications || !Array.isArray(notifications)) {
    return res
      .status(400)
      .json({ message: "Invalid role or notifications data" });
  }

  try {
    // Step 1: Check if another role with the same name exists (excluding current role)
    const existingRole = await Role.findOne({
      role: { $regex: new RegExp("^" + newRole + "$", "i") }, // Case-insensitive exact match
      _id: { $ne: req.params.id },
    }).exec();

    if (existingRole) {
      return res
        .status(400)
        .json({ message: "A role with the same name already exists." });
    }

    // Step 2: Update role in the Role collection
    const updatedRole = await Role.findByIdAndUpdate(
      req.params.id,
      {
        role: newRole,
        notifications,
      },
      { new: true } // Return updated document
    );

    // Step 3: Update all users who have the previous role
    // This ensures role name changes are reflected in user records
    const updatedUsers = await User.updateMany(
      { role: prevRole }, // Find users with the previous role
      { role: newRole, notifications } // Update role and notifications
    );

    // Invalidate role cache
    await invalidateEntity("role");

    return res.json({
      message: "Role and associated users updated successfully",
      updatedRole,
      usersUpdated: updatedUsers.modifiedCount,
    });
  } catch (error) {
    console.error("Error Updating Role:", error);
    return res.status(error.statusCode || 500).json({
      message: "Error updating role",
      error: error.message,
    });
  }
}

async function deleteList(req, res) {
  try {
    let kk = [];
    for (let single of req.body.selUsers) {
      kk.push(new ObjectId(single));
    }
    let deleteProductsResponse = await Role.remove({ _id: { $in: kk } });

    if (!deleteProductsResponse) return res.send("role not deleted");
    await invalidateEntity("role");

    res.send(deleteProductsResponse);
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

/*async function updatePermData(req, res) {
  try {
    const { role } = req.params;
    const { dashboard_permissions } = req.body;

    // 1️⃣ Validation
    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role is required",
      });
    }

    console.log("dashboard_permission", dashboard_permissions);

    // 2️⃣ Update role permissions
    const updatedRole = await Role.findOneAndUpdate(
      { role },
      { $set: { dashboard_permissions } },
      { new: true }
    );

    if (!updatedRole) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    // 3️⃣ Invalidate Redis Cache
    await invalidateEntityList("role"); // role:list:*
    await invalidateEntity(`role:${role}`); // role:<role>

    return res.status(200).json({
      success: true,
      message: "Permissions updated successfully",
      data: updatedRole,
    });
  } catch (error) {
    console.error("Update Permission Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
} */

async function updatePermData(req, res) {
  try {
    const role = await Role.findOneAndUpdate(
      { role: req.params.role },
      { $set: { dashboard_permissions: req.body.dashboard_permissions } },
      { new: true }
    );
    if (!role) return res.send("role not updated");
     await invalidateEntityList("role"); // role:list:*
    await invalidateEntity(`role:${role}`); // role:<role>
    res.send(role);
  } catch (error) {
    return res
      .status(error.statusCode || 422)
      .json(
        await Response.errors(
          { errors: error.errors, message: error.message },
          error,
          req
        )
      );
  }
}

async function deleteData(req, res) {
  try {
    const role = await Role.findByIdAndRemove(req.params.id);

    if (!role) return res.send("role not deleted");
    await invalidateEntity("role");
    res.send(role);
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

async function getUserPermission(req, res) {
  try {
    const { user_id } = req.query;
    const cacheKey = `role:user-permission:${user_id}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json({ ...cached, source: "cache" });
    }

    const user = await User.findById(user_id).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const role = await Role.findOne({ role: user.role }).lean();
    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    // ⛔ DO NOT CHANGE YOUR EXISTING PERMISSION BUILD LOGIC
    const response = {
      success: true,
      permissions: role.dashboard_permissions,
    };

    await setCache(cacheKey, response, MASTER_DATA);

    return res.status(200).json({ ...response, source: "db" });
  } catch (error) {
    console.error("Get User Permission Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
