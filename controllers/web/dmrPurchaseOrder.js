/**
 * DMR Purchase Order Controller
 * Handles all operations related to DMR (Delivery Material Receipt) Purchase Orders including:
 * - Creating and updating DMR orders
 * - Managing DMR order status (pending, partial, hold, completed)
 * - DMR order queries with filtering and pagination
 * - Status counting and reporting
 * - Hold order management
 * - Caching for performance optimization
 */

const PurchaseOrderSchema = require("../../models/DmrPurchaseOrder");
const ImprestOrderSchema = require("../../models/ImprestDmrEntry");
const DMROrderSchema = require("../../models/DmrPurchaseOrder");
const UserSchema = require("../../models/User");
const DMREntrySchema = require("../../models/dmrEntry");
const Response = require("../../libs/response");
const ItemSchema = require("../../models/Item");
const { responseMessage } = require("../../libs/responseMessages");
const ObjectID = require("mongodb").ObjectID;
const {
  getCache,
  setCache,
  invalidateEntity,
  invalidateEntityList,
} = require("../../utils/cache");
const { TRANSACTIONAL } = require("../../libs/cacheConfig");

// Export all controller functions
module.exports = {
  getList,
  createData,
  updateData,
  updateClosingStatus,
  getOpenPOList,
  getDetails,
  updateHoldDMROrder,
  deleteData,
  getDMRDetailsByPO,
  DMRStatusCount,
  GetUniquePR,
  getUniquePONumbers,
};

/**
 * Create DMR Purchase Order
 * POST /api/web/dmrPurchaseOrder
 * Creates a new DMR purchase order with initial history entry
 * 
 * @param {Object} req.body["0"] - DMR order data
 * @param {String} req.body["0"].po_number - Purchase order number
 * @param {String} req.body["0"].login_user_id - User creating the order
 * @param {Object} req.body["0"] - Other DMR order fields
 * 
 * @returns {Object} Created DMR order object
 */
async function createData(req, res) {
  try {
    // Extract DMR order data from request body
    const dataObject = req.body["0"];
    //console.log("Creating DMR Purchase Order:", dataObject);

    // Initialize PR history with creation entry
    dataObject.prHistory = [
      {
        po_number: dataObject.po_number,
        updated_By: dataObject.login_user_id,
        updated_On: new Date(),
        status: "DMR Order Created",
      },

    ];
    
    // Create new DMR order instance
    const dmrForm = new DMROrderSchema(dataObject);

    // Validate the document before saving
    const validationErrors = dmrForm.validateSync();
    if (validationErrors) {
      return res
        .status(422)
        .json({ message: "Validation Failed", errors: validationErrors });
    }

    // Save to the database
    await dmrForm.save();
   
    // Invalidate DMR order cache
    await invalidateEntity("DMRORDER");
    await invalidateEntityList("DMRORDER");

    res.send(dmrForm);
  } catch (error) {
    console.log("Error creating DMR Purchase Order:", error);
    return res.status(error.statusCode || 422).json({
      
      message: "Error saving data",
      error: error.message,
    });
  }
}

/**
 * Update DMR Purchase Order
 * PUT /api/web/dmrPurchaseOrder
 * Updates an existing DMR purchase order
 * 
 * @param {String} req.body._id - DMR order ID (required)
 * @param {Array} req.body.prHistory - PR history array
 * @param {Object} req.body - Other DMR order fields to update
 * @param {String} req.body.langCode - Language code for response messages
 * 
 * @returns {Object} Updated DMR order object
 */
async function updateData(req, res) {
  try {
    let reqObj = req.body;

    // Validate DMR order ID
    if (!reqObj._id) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "ID_MISSING"),
        statusCode: 412,
      };
    }

    // Prepare update data
    let requestedData = { ...reqObj };
    
    // Update DMR order and return updated document
    let updatedData = await DMROrderSchema.findOneAndUpdate(
      {
        _id: ObjectID(reqObj._id),
      },
      requestedData,
      {
        new: true, // Return updated document
      }
    );

    if (updatedData) {
      // Invalidate cache for this order and order list
      await invalidateEntity("DMRORDER");
      await invalidateEntityList("DMRORDER");
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
       await invalidateEntity("DMRORDER");
      await invalidateEntityList("DMRORDER");
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

async function getList(req, res) {
  try {
    const {
      page = 1,
      per_page = 10,
      sort_by,
      sort_order,
      userId,
      status,
      site,
      local_purchase,
      pr,
      po_number,
      item,
      prType,
      startDate,
      endDate,
      vendor,
    } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.max(parseInt(per_page) || 10, 1);
    const offset = (pageNum - 1) * limitNum;

    const cacheKey = `DMRORDER:LIST:${JSON.stringify(req.query)}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    // Filters
    const filterRequest = {};

    if (prType) filterRequest.prType = prType;

    if (pr?.trim()) {
      filterRequest.$or = [
        { purchase_request_number: pr },
        { purchase_request_numbers: pr }, // no need $in with single value
      ];
    }

    if (po_number?.trim()) {
      filterRequest.po_number = {
        $regex: `^${po_number.trim()}$`,
        $options: "i",
      };
    }

    if (local_purchase) filterRequest.local_purchase = local_purchase;

    if (vendor) filterRequest["vendor_detail._id"] = vendor;

    if (site) filterRequest.site = ObjectID(site);

    if (status) filterRequest.status = status;

    if (item?.trim()) {
      filterRequest["items.item.item_name"] = {
        $regex: item.trim(),
        $options: "i",
      };
    }

    // Date filter
    if (startDate || endDate) {
      filterRequest.created_at = {};
      if (startDate)
        filterRequest.created_at.$gte = new Date(
          new Date(startDate).setHours(0, 0, 0, 0)
        );
      if (endDate)
        filterRequest.created_at.$lte = new Date(
          new Date(endDate).setHours(23, 59, 59, 999)
        );
    }

    // User site restriction (only if site not given)
    if (!site && userId) {
      const user = await UserSchema.findById(userId, "role sites").lean();
      if (!user) return res.status(404).json({ message: "User not found" });
      console.log(user);
      if (user.role !== "superadmin") {
        const siteIds = (user.sites || []).map((id) => new ObjectID(id));
        filterRequest.site = siteIds.length
          ? { $in: siteIds }
          : { $exists: false };
      }
    }

    // Sorting
    const sort = sort_by
      ? { [sort_by]: sort_order === "desc" ? -1 : 1 }
      : { _id: -1 };

    // Pipeline
    const basePipeline = [
      { $match: filterRequest },
      {
        $project: {
          po_number: 1,
          DMR_number: 1,
          purchase_request_number: 1,
          date: 1,
          due_date: 1,
          title: 1,
          site: 1,
          local_purchase: 1,
          items: 1,
          status: 1,
          remarks: 1,
          variance_approval: 1,
          billing_address: 1,
          delivery_address: 1,
          vendors_total: 1,
          vendor_detail: 1,
          rate_approval_id: 1,
          updated_by: 1,
          created_by: 1,
          created_at: 1,
          updated_at: 1,
        },
      },
    ];

    const dataPipeline = [
      ...basePipeline,
      { $sort: sort },
      { $skip: offset },
      { $limit: limitNum },
    ];

    const countPipeline = [...basePipeline, { $count: "total" }];

    // Run queries in parallel
    const [data, countResult] = await Promise.all([
      DMROrderSchema.aggregate(dataPipeline),
      DMROrderSchema.aggregate(countPipeline),
    ]);

    const total = countResult[0]?.total || 0;

   
    const response = {
      current_page: pageNum,
      per_page: limitNum,
      total,
      total_pages: Math.ceil(total / limitNum),
      data,
    };

    await setCache(cacheKey, response, TRANSACTIONAL);

    return res.status(200).json(response);
  } catch (error) {
    return res.status(error.statusCode || 422).json({
      success: false,
      message: error.message,
      errors: error.errors || {},
    });
  }
}

async function getOpenPOList(req, res) {
  try {
    let reqObj = req.body;

    let { page, per_page, sort_by, sort_order, site, vendorId } = req.query;

    //console.log("__________________", req.query);
    let pageData = Response.validationPagination(page, per_page);

    let sort = {
      _id: -1,
    };
    if (sort_by) {
      let order = sort_order == "desc" ? -1 : 1;
      sort = {
        [sort_by]: order,
      };
    }

    let filterRequest = {
      $and: [],
    };

    if (site) {
      filterRequest.$and.push({ site: ObjectID(site) });
    }
    if (vendorId) {
      filterRequest.$and.push({ "vendor_detail._id": vendorId });
    }
    filterRequest.$and.push({ status: { $in: ["pending", "partial"] } });

    if (filterRequest.$and.length === 0) {
      delete filterRequest.$and;
    }

    const matchStage = { $match: filterRequest };
    //console.log("Reached here", matchStage);
    const projectStage = {
      $project: {
        po_number: 1,
        DMR_number: 1,

        site: 1,
        status: 1,
        vendor_detail: 1,
      },
    };

    if (page > 0) {
      let allRecords = await DMROrderSchema.aggregate([
        matchStage,
        {
          $facet: {
            data: [
              projectStage,
              { $sort: sort },
              { $skip: pageData.offset },
              { $limit: pageData.limit },
            ],
            total: [{ $count: "total" }],
          },
        },
      ]);
      //console.log("Check____________" ,allRecords);
      res
        .status(200)
        .json(
          await Response.pagination(
            allRecords,
            responseMessage(reqObj.langCode, "SUCCESS"),
            pageData,
            req
          )
        );
    } else {
      let allRecords = await DMROrderSchema.aggregate([
        matchStage,
        projectStage,
        { $sort: sort },
      ]);

      res
        .status(200)
        .json(
          await Response.success(
            allRecords,
            responseMessage(reqObj.langCode, "SUCCESS"),
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

async function getDetails(req, res) {
  try {
    let reqObj = req.body;
    let { _id } = req.query;

      const cacheKey = `DMRORDER:DETAILS:${_id}`;
    
        const cached = await getCache(cacheKey);
        if (cached) {
          return res
            .status(200)
            .json(
              await Response.success(
                cached,
                responseMessage(reqObj.langCode, "SUCCESS")
              )
            );
        }
    

    if (!_id) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "ID_MISSING"),
        statusCode: 412,
      };
    }

    let recordDetail = await DMROrderSchema.find({ _id: ObjectID(_id) });

     await setCache(cacheKey, recordDetail, 900);
    
        return res
          .status(200)
          .json(
            await Response.success(recordDetail, responseMessage(reqObj.langCode, "SUCCESS"))
          );
  
   
   
  } catch (error) {
    //console.log('error', error)
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

async function getDMRDetailsByPO(req, res) {
  try {
    const reqObj = req.body;
    const { po, site } = req.query;
 const cacheKey = `DMRORDER:DETAILSBYPO:${po}:${site}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res
        .status(200)
        .json(
          await Response.success(
            cached,
            responseMessage(reqObj.langCode, "SUCCESS")
          )
        );
    }

    // Validate required parameters
    if (!po || !site) {
      return res
        .status(412)
        .json(
          await Response.errors(
            {
              errors: [],
              message: responseMessage(reqObj.langCode, "MISSING_PARAMETERS"),
            },
            {},
            req
          )
        );
    }

    if (!ObjectID.isValid(site)) {
      return res
        .status(412)
        .json(
          await Response.errors(
            {
              errors: [],
              message: responseMessage(reqObj.langCode, "INVALID_SITE_ID"),
            },
            {},
            req
          )
        );
    }

    // Fetch the DMR record
    const recordDetail = await DMROrderSchema.findOne({
      site: new ObjectID(site),
      po_number: po,
    }).lean();

    if (!recordDetail) {
      return res
        .status(404)
        .json(
          await Response.errors(
            {
              errors: [],
              message: responseMessage(reqObj.langCode, "NO_RECORDS_FOUND"),
            },
            {},
            req
          )
        );
    }

    // Collect all item IDs
    const itemIds = recordDetail.items
      .map((i) => i.item?.item_id)
      .filter((id) => ObjectID.isValid(id));

    let itemDetailsMap = new Map();

    if (itemIds.length > 0) {
      // Fetch all items in a single query
      const itemDetails = await ItemSchema.find({
        _id: { $in: itemIds },
      }).lean();
      itemDetailsMap = new Map(
        itemDetails.map((item) => [String(item._id), item])
      );
    }

    // Merge item details
    const enrichedItems = recordDetail.items.map((itemObj) => ({
      ...itemObj,
      item: {
        ...itemObj.item,
        ...(itemObj.item?.item_id
          ? itemDetailsMap.get(String(itemObj.item.item_id))
          : {}),
      },
    }));

    // Attach enriched items
    const enrichedRecord = { ...recordDetail, items: enrichedItems };
   await setCache(cacheKey, enrichedRecord, 900);
      
          return res
            .status(200)
            .json(
              await Response.success(enrichedRecord, responseMessage(reqObj.langCode, "SUCCESS"))
            );
  } catch (error) {
    console.error("Error in getDMRDetailsByPO:", error);
    return res.status(error.statusCode || 422).json(
      await Response.errors(
        {
          errors: error.errors || [],
          message: error.message || "An unexpected error occurred",
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
    let record = await DMROrderSchema.findOneAndDelete({
      company_id: company_id,
      _id: ObjectID(_id),
    });
 await invalidateEntity("DMRORDER");
      await invalidateEntityList("DMRORDER");
    res
      .status(200)
      .json(
        await Response.success(
          "",
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

async function updateHoldDMROrder(req, res) {
  try {
    let reqObj = req.body;
    //console.log("________!_________reqObj._id,_________!__________");

    if (!reqObj._id) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "ID_MISSING"),
        statusCode: 412,
      };
    }
    const po_number = reqObj.po_number.slice(0, -3);
    // Step 1: Get the DMRItem object with matching po_number and status "hold"
    let dmrItem = await DMREntrySchema.findOne({
      PONumber: po_number,
      status: "hold",
    });

    if (!dmrItem) {
      //console.log("are we here?");
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "DMR_ITEM_NOT_FOUND"),
        statusCode: 404,
      };
    }

    // Step 2: Update the required quantity and rate in the DMRItem
    //console.log("++++++++++++++++++++,", reqObj, "++++++++++++++");
    reqObj.items.forEach((item) => {
      let dmrItemToUpdate = dmrItem.dmritem.find(
        (dmrItem) => dmrItem.item.item_id === item.item.item_id
      );

      if (dmrItemToUpdate) {
        // Update the required quantity and rate for the matched item
        dmrItemToUpdate.RequiredQuantity = item.RequiredQuantity;
        dmrItemToUpdate.Rate = item.Rate;
        updatedItems = true;
      }
    });

    dmrItem.status = "completed";
    dmrItem.PONumber = reqObj.po_number;

    // If items were updated, save the DMRItem
    //console.log('++++++++++check here++', dmrItem);

    // Step 3: Check if requiredQuantity matches invoiceQuantity and totalReceived
    let allItemsMatch = true;

    dmrItem.dmritem.forEach((item) => {
      if (
        item.requiredQuantity === item.invoiceQuantity &&
        item.totalReceivedQuantity === item.invoiceQuantity
      ) {
        allItemsMatch = true;
      } else {
        allItemsMatch = false;
      }
    });

    if (allItemsMatch) {
      // Check if the invoice values match the passed object's vendor_total
      if (
        reqObj.vendors_total[0].invoice_Freight_total.totalfreight ===
          reqObj.vendors_total[0].freightTotal &&
        reqObj.vendors_total[0].invoice_otherCharges_total.totalotherCharges ===
          reqObj.vendors_total[0].otherChargesTotal &&
        reqObj.vendors_total[0].total === invoice_total
      ) {
        reqObj.status = "completed";
      } else {
        reqObj.status = "partial";
      }
    } else {
      reqObj.status = "partial";
    }

    //console.log("_____________1vhecking here too______",)

    await dmrItem.save();

    // Update the passed object status in the DMROrderSchema
    let updatedData = await DMROrderSchema.findOneAndUpdate(
      { _id: reqObj._id },
      { ...reqObj, status: reqObj.status }
    );
    //console.log("_____________3vhecking there too______",updatedData)
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

async function DMRStatusCount(req, res) {
  try {
    const {
      userId,
      site,
      local_purchase,
      pr,
      po_number,
      item,
      prType,
      vendor,
      startDate,
      endDate,
      DMR_No,
    } = req.query;

    let filterRequest = {};
    let imprestFilter = {};
     const cacheKey = `DMRORDER:STATUS_COUNT:${JSON.stringify(req.query)}`;
      const cachedData = await getCache(cacheKey);
         if (cachedData) {
           return res.status(200).json(cachedData);
         }


    // ✅ PR Type filter
    if (prType) filterRequest.prType = prType;

    // ✅ Date filter
    if (startDate || endDate) {
      filterRequest.created_at = {};
      imprestFilter.created_at = {};

      if (startDate) {
        const start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
        filterRequest.created_at.$gte = start;
        imprestFilter.created_at.$gte = start;
      }
      if (endDate) {
        const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
        filterRequest.created_at.$lte = end;
        imprestFilter.created_at.$lte = end;
      }
    }

    // ✅ DMR Number filter for imprest
    if (DMR_No?.trim()) {
      imprestFilter.DMR_No = { $regex: DMR_No.trim(), $options: "i" };
    }

    // ✅ PR filter
    if (pr?.trim()) {
      filterRequest.$or = [
        { purchase_request_number: pr.trim() },
        { purchase_request_numbers: pr.trim() },
      ];
    }

    // ✅ PO Number filter
    if (po_number?.trim()) {
      filterRequest.po_number = {
        $regex: `^${po_number.trim()}$`,
        $options: "i",
      };
    }

    // ✅ Local purchase filter
    if (local_purchase) filterRequest.local_purchase = local_purchase;

    // ✅ Vendor filter
    if (vendor) filterRequest["vendor_detail._id"] = new ObjectID(vendor);

    // ✅ Site filter (direct or via user)
    let user = null;
    if (site) {
      const siteId = new ObjectID(site);
      filterRequest.site = siteId;
      imprestFilter.Site = siteId;
    } else if (userId) {
      user = await UserSchema.findById(userId, { role: 1, sites: 1 });
      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.role !== "superadmin") {
        const userSites = user.sites || [];
        if (!userSites.length) {
          return res.json({
            pending: 0,
            partial: 0,
            hold: 0,
            completed: 0,
            imprestCount: 0,
          });
        }
        const siteObjectIds = userSites.map((id) => new ObjectID(id));
        filterRequest.site = { $in: siteObjectIds };
        imprestFilter.Site = { $in: siteObjectIds };
      }
    }

    // ✅ Allowed statuses only
    const statuses = ["pending", "partial", "hold", "completed"];
    filterRequest.status = { $in: statuses };

    // ✅ Item filter
    if (item?.trim()) {
      filterRequest["items.item.item_name"] = {
        $regex: item.trim(),
        $options: "i",
      };
    }

    // ✅ Aggregate DMR orders
    const filteredDMROrders = await DMROrderSchema.aggregate([
      { $match: filterRequest },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // ✅ Map DMR counts
    const response = Object.fromEntries(
      statuses.map((st) => [
        st,
        filteredDMROrders.find((i) => i._id === st)?.count || 0,
      ])
    );

    // ✅ Count Imprest orders
    const imprestCountResult = await ImprestOrderSchema.countDocuments(
      imprestFilter
    );

    //res.json({ ...response, imprestCount: imprestCountResult });

     const finalResponse = {
          success: true,
          message: "Count fetched successfully",
          ...response, imprestCount: imprestCountResult,
        };
    
        // 🔹 2. CACHE WRITE (15 mins)
        await setCache(cacheKey, finalResponse, 900);
    
        return res.status(200).json(finalResponse);
  } catch (error) {
    console.error("Error in DMRStatusCount:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

async function updateClosingStatus(req, res) {
  try {
    //console.log(req.params);
    const { id } = req.params;
    const {
      prHistory,
      closing_category,
      closing_remark,
      status,
      variance_approval = "",
    } = req.body;
    //console.log(id,closing_category, closing_remark, status)
    // Validate request body
    if (!status) {
      return res.status(400).json({
        message: "Both closing_category and closing_remark are required.",
      });
    }

    // Find and update the document
    const updatedOrder = await DMROrderSchema.findByIdAndUpdate(
      id,
      {
        closing_category,
        closing_remark,
        status,
        variance_approval,
        prHistory,
      },
      { new: true } // Return updated document
    );

    // Check if the document exists
    if (!updatedOrder) {
      return res.status(404).json({ message: "DMR Purchase Order not found." });
    }

     await invalidateEntity("DMRORDER");
      await invalidateEntityList("DMRORDER");

    return res
      .status(200)
      .json({ message: "Updated successfully", updatedOrder });
  } catch (error) {
    console.error("Error updating DMR Purchase Order:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function GetUniquePR(req, res) {
  try {
    const { query = "" } = req.query;
    //console.log("query", query);
    // Fetch only the relevant fields
    const allOrders = await DMROrderSchema.find(
      {},
      {
        purchase_request_number: 1,
        purchase_request_numbers: 1,
        mergedPR: 1,
      }
    );

    const prNumberSet = new Set();

    allOrders.forEach((order) => {
      if (order.purchase_request_number) {
        prNumberSet.add(order.purchase_request_number.toString());
      }

      if (Array.isArray(order.purchase_request_numbers)) {
        order.purchase_request_numbers.forEach((num) => {
          if (num) prNumberSet.add(num.toString());
        });
      }

      if (Array.isArray(order.mergedPR)) {
        order.mergedPR.forEach((pr) => {
          if (pr.purchase_request_number)
            prNumberSet.add(pr.purchase_request_number.toString());
        });
      }
    });

    //console.log("Unique PR Numbers:", prNumberSet);

    // Convert to array and filter using query string (case-insensitive)
    const uniquePRNumbers = Array.from(prNumberSet).filter((pr) =>
      pr.includes(query)
    );

    return res.status(200).json({ uniquePRNumbers });
  } catch (error) {
    console.error("Error fetching filtered PR numbers:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function getUniquePONumbers(req, res) {
  try {
    const { query = "" } = req.query;

    const allOrders = await DMROrderSchema.find({}, { po_number: 1 });

    const poSet = new Set();

    allOrders.forEach((order) => {
      const po = order.po_number?.trim();
      if (po) {
        poSet.add(po);
      }
    });

    // Convert Set back to array
    const uniquePONumbers = Array.from(poSet);

    return res.status(200).json({ uniquePONumbers });
  } catch (error) {
    console.error("Error fetching filtered PO numbers:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
