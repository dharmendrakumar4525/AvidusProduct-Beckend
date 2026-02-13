/**
 * User Controller
 * Handles all user-related operations including:
 * - User CRUD operations
 * - User authentication (login, registration)
 * - User role and permission management
 * - Site assignment to users
 * - Caching for performance optimization
 */

const router = require("express").Router();
const User = require("../../models/User");
const Role = require("../../models/Role");
const RecentActivity = require("../../models/recentActivity");
const { MongoClient } = require("mongodb");
const { getCache, setCache, deleteCache, invalidateEntity, invalidateEntityList } = require("../../utils/cache");
const { MASTER_DATA } = require("../../libs/cacheConfig");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Response = require("../../libs/response");
const jwt = require("jsonwebtoken");
require('dotenv').config();

// Export all controller functions
module.exports = {
  getList,
  getDataByID,
  createData,
  updateData,
  deleteData,
  deleteAllData,
  createUser,
  loginUser,
  addSiteToUsers
};




/**
 * Get Users List
 * GET /api/web/users
 * Retrieves a paginated or complete list of users with optional search
 * Uses Redis caching for performance optimization
 * 
 * @param {String} req.query.search - Search term for user name (optional)
 * @param {Number} req.query.page - Page number for pagination (optional)
 * @param {Number} req.query.per_page - Items per page (optional)
 * @param {String} req.query.order - Sort order: "asc" or "desc" (optional, default: asc)
 * 
 * @returns {Object} Users list with pagination metadata or complete list
 */
async function getList(req, res) {
  try {
    // Extract and parse query parameters
    const search = req.query.search?.trim();
    const page = Number(req.query.page);
    const limit = Number(req.query.per_page);
    const sortOrder = req.query.order === "desc" ? -1 : 1;

    // Check if pagination parameters are valid
    const hasPagination =
      Number.isInteger(page) && page > 0 &&
      Number.isInteger(limit) && limit > 0;

    // Generate cache key based on query parameters
    const cacheKey = `user:list:search=${search || "none"}:page=${hasPagination ? page : "all"}:limit=${hasPagination ? limit : "all"}:order=${sortOrder}`;

    // Try to get data from cache first
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        ...cachedData,
        source: "cache", // Indicate data came from cache
      });
    }

    // Build MongoDB query
    const query = {};
    if (search) {
      // Case-insensitive regex search on user name
      query.name = { $regex: search, $options: "i" };
    }

    // Build base query with population and sorting
    let usersQuery = User.find(query)
      .populate("sites") // Populate site references
      .populate("companyId")
      .sort({ name: sortOrder }) // Sort by name
      .lean(); // Return plain objects

    let response;

    // Handle paginated response
    if (hasPagination) {
      const skip = (page - 1) * limit;

      // Execute paginated query
      const users = await usersQuery.skip(skip).limit(limit);
      const total = await User.countDocuments(query); // Get total count

      response = {
        data: users,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      };
    }
    // Handle non-paginated response (return all users)
    else {
      const users = await usersQuery;
      response = { data: users };
    }

    // Cache the response for 1000 seconds (~16 minutes)
    await setCache(cacheKey, response, MASTER_DATA);

    return res.status(200).json({
      ...response,
      source: "db", // Indicate data came from database
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




/**
 * Get User by ID
 * GET /api/web/users/:id
 * Retrieves a single user by ID with populated sites and role details
 * Uses Redis caching for performance
 * 
 * @param {String} req.params.id - User ID (required)
 * 
 * @returns {Object} User object with populated sites and role details
 */
async function getDataByID(req, res) {
  try {
    const userId = req.params.id;
    const cacheKey = `user:details:${userId}`;

    // Step 1: Try to get from Redis cache first
    const cachedUser = await getCache(cacheKey);
    if (cachedUser) {
      return res.status(200).json({
        ...cachedUser,
        source: "cache",
      });
    }

    // Step 2: Fetch from MongoDB if not in cache
    let user = await User.findById(userId)
      .populate("sites") // Populate site references
      .populate("companyId")
      .lean();

    if (!user) return res.send("no user exists");

    // Step 3: Fetch and attach role details if user has a role
    if (user.role) {
      const roleDoc = await Role.findOne({ role: user.role }).lean();
      user.roleDetails = roleDoc; // Attach role details to user object
    }

    // Step 4: Cache user data for 1000 seconds
    await setCache(cacheKey, user, 1000);

    return res.status(200).json({
      ...user,
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



async function createData(req, res) {
  try {
    let user = new User({
      name: req.body.name,
      email: req.body.email,
      role: req.body.role,
    });
    user = await user.save();

    if (!user) return res.send("user not created");
await invalidateEntityList("user");
    res.send(user);
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

async function updateData(req, res) {
  try {
    let updatedata;
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(req.body.password, salt);
      updatedata = {
        name: req.body.name,
        email: req.body.email,
        role: req.body.role,
        phone: req.body.phone,
        password: hashedPassword,
        sites: req.body.sites,
        notifications: req.body.notifications,
        companyId:req.body.companyId
      };
    } else {
      updatedata = {
        name: req.body.name,
        email: req.body.email,
        role: req.body.role,
        phone: req.body.phone,
        sites: req.body.sites,
        notifications: req.body.notifications,
        companyId:req.body.companyId,
        // password:req.body.password,
      };
    }
    const user = await User.findByIdAndUpdate(req.params.id, updatedata, {
      new: true,
    }).populate("sites");

    if (!user) return res.send("user not updated");
await deleteCache(`user:details:${req.params.id}`);
await invalidateEntityList("user");

    res.send(user);
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
    const user = await User.findByIdAndRemove(req.params.id);

    if (!user) return res.send("user not deleted");
await deleteCache(`user:details:${req.params.id}`);
await invalidateEntityList("user");


    res.send(user);
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

async function deleteAllData(req, res) {
  try {
    let kk = [];
    for (let single of req.body.selUsers) {
      kk.push(new ObjectId(single));
    }
    let deleteProductsResponse = await User.remove({ _id: { $in: kk } });

    if (!deleteProductsResponse) return res.send("user not deleted");
await invalidateEntityList("user");

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

/**
 * Create User (Registration)
 * POST /api/web/users/register
 * Creates a new user account with hashed password
 * 
 * @param {String} req.body.name - User's full name (required)
 * @param {String} req.body.email - User's email address (required, must be unique)
 * @param {String} req.body.password - User's password (required, will be hashed)
 * @param {String} req.body.phone - User's phone number (optional)
 * @param {String} req.body.role - User's role (required)
 * @param {Array} req.body.sites - Array of site IDs assigned to user (optional)
 * @param {Object} req.body.notifications - Notification preferences (optional)
 * 
 * @returns {Object} Created user object with populated sites
 */
async function createUser(req, res) {
  try {
    // Check if user with this email already exists
    const userExists = await User.findOne({ email: req.body.email });
    if (userExists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash password using bcrypt with salt rounds of 10
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    // Create new user instance
    const user = new User({
      name: req.body.name,
      phone: req.body.phone,
      role: req.body.role,
      email: req.body.email,
      password: hashedPassword, // Store hashed password, never plain text
      sites: req.body.sites,
      notifications: req.body.notifications,
       companyId: req.body.companyId
    });

    // Save user to database
    const savedUser = await user.save();
    
    // Fetch user with populated sites for response
    const populatedUser = await User.findById(savedUser._id).populate("sites");

    // Create recent activity log entry
    let recentActivity = new RecentActivity({
      description: `New user ${savedUser.name} created`,
    });
    recentActivity = await recentActivity.save();

    // Invalidate user list cache to ensure fresh data
    await invalidateEntityList("user");

    res.send({ user: populatedUser });
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
 * User Login
 * POST /api/web/users/login
 * Authenticates user and returns JWT token with permissions
 * 
 * @param {String} req.body.email - User's email address (required)
 * @param {String} req.body.password - User's password (required)
 * 
 * @returns {Object} JWT token, user object, and permission structure
 */
async function loginUser(req, res) {
  try {
    // Find user by email and populate sites
    const userExits = await User.findOne({ email: req.body.email }).populate(
      "sites"
    );
    // Validate user exists
    if (!userExits) return res.status(400).send("email not exit");

    // Verify password using bcrypt
    const validPassword = await bcrypt.compare(
      req.body.password,
      userExits.password
    );

    // Validate password
    if (!validPassword) return res.status(400).send("wrong password");

    // Generate JWT token with user ID and name
    // Note: In production, use environment variable for secret key
    const token = jwt.sign(
      { id: userExits._id, name: userExits.name,companyId: userExits.companyId },
       process.env.JWT_SECRET,
    );

    // Fetch user's role to get permissions
    let role = await Role.findOne({ role: userExits.role });

    // Initialize permission structures
    let permission = {};
    let modulesArray = [];

    // Process role permissions if they exist
    if (
      role &&
      role.dashboard_permissions &&
      role.dashboard_permissions[0] &&
      role.dashboard_permissions[0]["ParentChildchecklist"] &&
      role.dashboard_permissions[0]["ParentChildchecklist"]["length"] > 0
    ) {
      // Extract module names and permissions from role structure
      role.dashboard_permissions[0]["ParentChildchecklist"].map((moduleObj) => {
        if (moduleObj) {
          modulesArray.push(moduleObj.moduleName);
          permission[moduleObj.moduleName] = [];

          // Extract child permissions (create, read, update, delete, etc.)
          if (moduleObj.childList && moduleObj.childList.length > 0) {
            moduleObj.childList.map((permisObj) => {
              if (permisObj.isSelected) {
                permission[moduleObj.moduleName].push(permisObj.value);
              }
            });
          }
        }

        return moduleObj;
      });
    }

    // Return token, user data, and permission structure
    res.send({
      token: token,
      user: userExits,
      permissions: role.dashboard_permissions,
      modules: modulesArray,
      module_permissions: permission,
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


async function addSiteToUsers(req, res) {
  try {
    const { userIds, siteId } = req.body;
 //console.log("check here now ")
    // ---------------- VALIDATION ----------------
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "userIds must be a non-empty array",
      });
    }

    if (!siteId) {
      return res.status(400).json({
        success: false,
        message: "siteId is required",
      });
    }

    // ---------------- OBJECTID VALIDATION ----------------
    const invalidUserIds = userIds.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );

    if (invalidUserIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid user IDs found",
        invalidUserIds,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(siteId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid siteId",
      });
    }

    // ---------------- CONVERT TO ObjectId ----------------
    const userObjectIds = userIds.map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    //const siteObjectId = new mongoose.Types.ObjectId(siteId);
console.log(userObjectIds);
    // ---------------- UPDATE USERS ----------------
    const result = await User.updateMany(
      { _id: { $in: userObjectIds } },
      {
        $addToSet: {
          sites: siteId, // no duplicates
        },
      }
    );

    // ---------------- CACHE INVALIDATION ----------------
    await invalidateEntityList("user");

    return res.status(200).json({
      success: true,
      message: "Site added to users successfully",
      matchedUsers: result.matchedCount,
      modifiedUsers: result.modifiedCount,
    });

  } catch (error) {
    console.error("Error adding site to users:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
