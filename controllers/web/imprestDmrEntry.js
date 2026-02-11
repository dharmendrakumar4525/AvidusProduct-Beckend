/**
 * Imprest DMR Entry Controller
 * Handles all operations related to Imprest DMR (Delivery Material Receipt) entries including:
 * - Creating imprest DMR entries
 * - Querying imprest DMR entries with filtering and pagination
 * - Site-based access control
 * - Caching for performance optimization
 */

const ImprestdmrEntry = require("../../models/ImprestDmrEntry");
const category = require("../../models/Category");
const SubCategorySchema = require("../../models/Subcategory");
const mongoose = require("mongoose");
const Response = require("../../libs/response");
const ObjectID = require("mongodb").ObjectID;
const UserSchema = require("../../models/User");
const { responseMessage } = require("../../libs/responseMessages");
const { updateActivityLog } = require("./utilityController");
const ImprestDmrEntry = require("../../models/ImprestDmrEntry");
const {
  getCache,
  setCache,
  invalidateEntity,
  invalidateEntityList,
} = require("../../utils/cache");
const { TRANSACTIONAL } = require("../../libs/cacheConfig");

/**
 * Create Imprest DMR Entry
 * POST /api/web/imprestDmrEntry
 * Creates a new imprest DMR entry
 * 
 * @param {Object} req.body - Imprest DMR entry data
 * @param {String} req.body.DMR_No - DMR number (required)
 * @param {String} req.body.Site - Site ID (required)
 * @param {Object} req.body - Other imprest DMR fields
 * 
 * @returns {Object} Created imprest DMR entry object
 */
async function createData(req, res) {
  try {
    var dataObject = req.body;

    // Create new imprest DMR entry
    let dmrForm = new ImprestdmrEntry({ ...req.body });

    // Save to database
    dmrForm = await dmrForm.save();
    
    // Invalidate related caches
    await invalidateEntityList("DMRIMPREST");
    await invalidateEntityList("DMRORDER");
    await invalidateEntityList("DMRENTRY");
    await invalidateEntity("DMRIMPREST");
    await invalidateEntity("DMRORDER");
    await invalidateEntity("DMRENTRY");
    
    res.send(dmrForm);
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
 * Get Imprest DMR Entry List
 * GET /api/web/imprestDmrEntry
 * Retrieves a paginated and filterable list of imprest DMR entries
 * 
 * Filters:
 * - site: Filter by site ID
 * - DMR_No: Filter by DMR number (matches last 4 digits)
 * - gateEntry: Filter by gate register entry
 * - startDate/endDate: Date range filter
 * - userId: Filter by user's assigned sites (if not superadmin)
 * 
 * @param {Number} req.query.page - Page number (default: 1)
 * @param {Number} req.query.per_page - Items per page (default: 10)
 * @param {String} req.query.sort_by - Field to sort by
 * @param {String} req.query.sort_order - Sort order: "asc" or "desc"
 * 
 * @returns {Object} Paginated list of imprest DMR entries
 */
async function getList(req, res) {
  try {
    const {
      userId,
      page = 1,
      per_page = 10,
      sort_by,
      sort_order,
      gateEntry,
      site,
      DMR_No,
      startDate,
      endDate,
    } = req.query;

    // Calculate pagination
    const currentPage = parseInt(page);
    const perPage = parseInt(per_page);
    const offset = (currentPage - 1) * perPage;

    // Build sort criteria
    const sort = sort_by
      ? { [sort_by]: sort_order === "desc" ? -1 : 1 }
      : { _id: -1 };

    // Check cache first
    const cacheKey = `DMRIMPREST:LIST:${JSON.stringify(req.query)}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    // Build filters
    const filterRequest = {};

    // Site filter
    if (site && ObjectID.isValid(site)) filterRequest.Site = new ObjectID(site);

    // DMR number filter (matches last 4 digits)
    if (DMR_No?.trim()) {
      const last4 = DMR_No.trim().slice(-4);
      filterRequest.DMR_No = { $regex: `${last4}$`, $options: "i" };
    }

    // Date range filter
    if (startDate || endDate) {
      filterRequest.created_at = {};
      if (startDate) filterRequest.created_at.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
      if (endDate) filterRequest.created_at.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    // Gate entry filter
    if (gateEntry?.trim()) {
      filterRequest.GateRegisterEntry = { $regex: gateEntry.trim(), $options: "i" };
    }

    // User site fallback (if user is not superadmin, filter by their assigned sites)
if (site?.trim()) {
  // Use case-insensitive regex for flexibility
  filterRequest.Site = { $regex: `^${site.trim()}$`, $options: "i" };
} else if (userId) {
  const user = await UserSchema.findById(userId, { role: 1, sites: 1 });
  if (!user) return res.status(404).json({ message: "User not found" });

  if (user.role !== "superadmin") {
    const userSites = (user.sites || []).filter(Boolean);
    // Convert all site ids/names to strings for consistency
    const siteStrings = userSites.map((s) => s.toString());
    filterRequest.Site = { $in: siteStrings };
  }
}

console.log("🧭 SITE FILTER APPLIED:", filterRequest.Site);

    // Aggregation pipeline with $facet to get both data and total count
    const pipeline = [
      { $match: filterRequest },
      { $sort: sort },
      {
        $facet: {
          data: [{ $skip: offset }, { $limit: perPage }],
          totalCount: [{ $count: "total" }],
        },
      },
    ];

    const aggResult = await ImprestdmrEntry.aggregate(pipeline);
    const data = aggResult[0]?.data || [];
    const total = aggResult[0]?.totalCount[0]?.total || 0;

    // ====== Populate category and subCategory efficiently ======
    const allItems = data.flatMap(e => e.dmritem || []);
    const categoryIds = [...new Set(allItems.map(i => i.category).filter(Boolean))];
    const subCategoryIds = [...new Set(allItems.map(i => i.subCategory).filter(Boolean))];

    const [categories, subCategories] = await Promise.all([
      category.find({ _id: { $in: categoryIds } }).lean(),
      SubCategorySchema.find({ _id: { $in: subCategoryIds } }).lean(),
    ]);

    const categoryMap = new Map(categories.map(c => [String(c._id), c]));
    const subCategoryMap = new Map(subCategories.map(s => [String(s._id), s]));

    const finalData = data.map(entry => ({
      ...entry,
      dmritem: (entry.dmritem || []).map(item => ({
        ...item,
        category: categoryMap.get(String(item.category)) || item.category,
        subCategory: subCategoryMap.get(String(item.subCategory)) || item.subCategory,
      })),
    }));

   
    const response = {
           current_page: currentPage,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
      data: finalData,
        };
    
        await setCache(cacheKey, response, TRANSACTIONAL);
    
        return res.status(200).json(response);
  } catch (error) {
    console.error("getList error:", error);
    return res.status(error.statusCode || 422).json({
      success: false,
      message: error.message,
      errors: error.errors || {},
    });
  }
}

async function updateData(req, res) {
  try {
    let reqObj = req.body;
    //console.log(reqObj._id)
    let loginUserId = reqObj.login_user_id;
    //console.log(loginUserId)
    if (!reqObj._id) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "ID_MISSING"),
        statusCode: 412,
      };
    }

    let requestedData = { ...reqObj, ...{ updated_by: loginUserId } };

    let updatedData = await ImprestDmrEntry.findOneAndUpdate(
      {
        _id: ObjectID(reqObj._id),
      },
      requestedData,
      {
        new: true,
      }
    );

    if (updatedData) {
       await invalidateEntity("DMRIMPREST");
      await invalidateEntityList("DMRIMPREST");
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
       await invalidateEntity("DMRIMPREST");
      await invalidateEntityList("DMRIMPREST");
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

async function getDataById(req, res) {
  try {
    const { _id } = req.query; // Extract id from the request parameters
     let reqObj = req.body;
console.log("_id", _id);
    if (!_id) {
      return res.status(400).json({
        message: "ID is required.",
      });
    }

     const cacheKey = `DMRIMPREST:DETAILS:${_id}`;
        
            const cached = await getCache(cacheKey);
            console.log("cached", cached);
            if (cached) {
              res.send(cached);
              return;
            }
        

    // Fetch the object by its ID
    const object = await ImprestdmrEntry.findById(ObjectID(_id));

    if (!object) {
      return res.status(404).json({
        message: "Object not found.",
      });
    }

      await setCache(cacheKey, object, 400);

    res.send(object);
  } catch (error) {
    console.error("Error fetching DMR by ID:", error);
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

async function getDMRNumberBYSite(req, res) {
  try {
    const { site } = req.query; // Extract site from the query parameters

    if (!site) {
      return res.status(400).json({
        message: "Site ID is required.",
      });
    }

    // Fetch objects with the given site ID and sort them by imprestNumber in descending order
    const objects = await ImprestdmrEntry.find({ Site: site })
      .sort({ imprestNumber: -1 }) // Sort in descending order
      .exec();

    let nextImprestNumber;

    if (objects.length === 0) {
      // If no objects found, start with 1
      nextImprestNumber = 1;
    } else {
      // Get the imprestNumber of the last object and add 1
      //console.log("checking objects________________________", objects);
      //console.log("checking imprestNumber________________________", objects[0].imprestNumber);
      nextImprestNumber = objects[objects.length - 1].imprestnumber + 1;
    }

    // Send the next imprest number as the response
    return res.status(200).json({ nextImprestNumber });
  } catch (error) {
    //console.error("Error fetching DMR number:", error);
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

async function getUniqueDMRNumber(req, res) {
  try {
    const { query = "" } = req.query;

    const allOrders = await ImprestdmrEntry.find({}, { DMR_No: 1 });

    const poLastFourSet = new Set();

    allOrders.forEach((order) => {
      const po = order.DMR_No;
      if (po) {
        // Extract last 4 digits using RegEx
        const match = po.match(/(\d{4})$/);
        if (match && match[1]) {
          poLastFourSet.add(match[1]);
        }
      }
    });

    // Filter based on query
    const filteredPOs = Array.from(poLastFourSet).filter((po) =>
      po.includes(query)
    );

    return res.status(200).json({ uniqueDMRNumbers: filteredPOs });
  } catch (error) {
    console.error("Error fetching filtered PO numbers:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}


async function checkDuplicateBill (req, res) {
  try {
    const { site, bill } = req.query;

    if (!site || !bill) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: site, or bill',
      });
    }

    const existingBill = await ImprestDmrEntry.findOne({
      Site: site,
      BillNumber: { $regex: `^${bill}$`, $options: 'i' }, // case-insensitive
      
    });

    //console.log("check existingInvoice", existingInvoice);

    if (existingBill) {
      return res.status(200).json({
        exists: true,
        message: `Bill number '${bill}' already exists`,
      });
    }

    return res.status(200).json({
      exists: false,
      message: 'Bill number is available.',
    });

  } catch (error) {
    console.error('Error checking Bill duplicate:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking Bill duplicate',
    });
  }
};



// imprestPurchase.controller.js


async function  updateDocSubmissionAndRemark (req, res)  {
  try {
    const { id, DateOfDocSubmissionToHO, remarksForAudit } = req.body; 
   
  

    if (!DateOfDocSubmissionToHO && !remarksForAudit) {
      return res.status(400).json({ message: "At least one field is required" });
    }

    const updatedEntry = await ImprestdmrEntry.findByIdAndUpdate(
      id,
      {
        ...(DateOfDocSubmissionToHO && { DateOfDocSubmissionToHO }),
        ...(remarksForAudit && { remarksForAudit }),
      },
      { new: true } // return updated doc
    );

    if (!updatedEntry) {
      return res.status(404).json({ message: "Entry not found" });
    }

    res.status(200).json({
      message: "Entry updated successfully",
      data: updatedEntry,
    });
  } catch (error) {
    console.error("Error updating Imprest Purchase entry:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};


module.exports = {
  createData,
  getList,
  updateData,
  getDataById,
  getDMRNumberBYSite,
  getUniqueDMRNumber,
  checkDuplicateBill,
  updateDocSubmissionAndRemark
};
