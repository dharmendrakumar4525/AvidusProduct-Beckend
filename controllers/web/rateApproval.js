/**
 * Rate Approval Controller
 * Handles all operations related to Rate Approval management including:
 * - Creating and updating rate approvals
 * - Rate approval workflow (rate_comparitive -> rate_approval -> approved)
 * - Initial and final approval stages
 * - PR history tracking
 * - Rate approval splitting and combining
 * - Local purchase order creation
 * - Email notifications
 * - Caching for performance optimization
 */

const RateApprovalSchema = require("../../models/RateApproval");
const PurchaseOrderSchema = require("../../models/PurchaseOrder");
const PurchaseRequest = require("../../models/PurchaseRequest");
const UserSchema = require("../../models/User");
const Response = require("../../libs/response");
const SiteSchema = require("../../models/Site");
const User = require("../../models/User");
const Role = require("../../models/Role");
const { responseMessage } = require("../../libs/responseMessages");
const ObjectID = require("mongodb").ObjectID;
const VendorSchema = require("../../models/Vendor");
const {
  getVendorListByLocation,
  addPurchaseOrder,
  addRateApproval,
} = require("./utilityController");
require("dotenv").config();
const sendEmailsInBatches = require("../../emails/sendEmail");
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
  getDetails,
  updateData,
  LocalPurchaseComparative,
  deleteData,
  updateFiles,
  getPendingPRNumbers,
  rateApprovalSummary,
  DashboardRateApprovalStats,
  getDetailsByPRNumber,
  getUniqueOpenRCTitle,
  combineRateApprovals,
  rejectRateApprovals,
  getPendingRateApprovalList,
  GetUniquePR,
  CreateSplitRateApproval,
};

const accessPath = process.env.ACCESS_PATH;
/**
 * Update Rate Approval
 * PUT /api/web/rateApproval
 * Updates a rate approval and manages workflow stages
 * 
 * Workflow Stages:
 * - rate_comparitive: Rate comparison stage
 * - rate_approval: Rate approval stage (initial/final)
 * - approved: Final approval
 * 
 * Special Handling:
 * - Local purchase: Automatically sets stage to "rate_approval" and status to "approved"
 * - PR Splitting: Creates history entry when splitting for rate comparative
 * - Initial Approval: Tracks initial approval separately from final approval
 * 
 * @param {String} req.body._id - Rate Approval ID (required)
 * @param {String} req.body.stage - Current workflow stage
 * @param {String} req.body.status - Approval status
 * @param {Boolean} req.body.initial_approved - Initial approval flag
 * @param {String} req.body.local_purchase - "yes" for local purchase
 * @param {String} req.body.langCode - Language code for response messages
 * @param {String} req.body.login_user_id - User updating the rate approval
 * 
 * @returns {Object} Updated rate approval object
 */
async function updateData(req, res) {
  try {
    let reqObj = req.body;
    let loginUserId = reqObj.login_user_id;

    // Validate rate approval ID
    if (!reqObj._id) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "ID_MISSING"),
        statusCode: 412,
      };
    }

    // Prepare update data with user tracking
    let requestedData = { ...reqObj, ...{ updated_by: loginUserId } };

    // Special handling for local purchase
    if (requestedData.local_purchase === "yes") {
      requestedData.stage = "rate_approval";
      requestedData.status = "approved";
    }

    // Get existing PR to preserve history
    const existingPR = await RateApprovalSchema.findById(reqObj._id).lean();

    // Build PR history array
    let prHistory = Array.isArray(existingPR.prHistory)
      ? [...existingPR.prHistory]
      : [];
    
    // Create history entry based on status and stage
    let historyEntry = {};
    
    // Special case: PR splitting for rate comparative
    if (
      requestedData.status === "pending" &&
      requestedData.stage === "rate_comparitive"
    ) {
      historyEntry = {
        rate_approval_number: requestedData.rate_approval_number,
        updated_By: ObjectID(requestedData.login_user_id),
        updated_Date: new Date(),
        status: "PR Splitted for Rate Comparative",
        stage: requestedData.stage,
      };
    } else {
      // Standard history entry
      historyEntry = {
        rate_approval_number: requestedData.rate_approval_number,
        updated_By: ObjectID(requestedData.login_user_id),
        updated_Date: new Date(),
        status:
          requestedData.initial_approved === true &&
          requestedData.status === "pending"
            ? "Initially Approved" // Track initial approval separately
            : requestedData.status,
        stage: requestedData.stage,
      };
    }

    // Add new history entry
    prHistory.push(historyEntry);
    requestedData.prHistory = prHistory;

    let updatedData = await RateApprovalSchema.findOneAndUpdate(
      {
        _id: ObjectID(reqObj._id),
      },
      requestedData,
      {
        new: true,
      }
    );

    if (updatedData) {
      /*const users = await UserSchema.find({ sites: ObjectID(updatedData.site)}).lean();
      console.log(updatedData);
      if(updatedData.status === "pending" && updatedData.stage=== 'rate_approval' && updatedData.initial_approved===false){
      const filteredEmails = users
          .filter((user) => user.notifications?.includes("RC_initial_approval"))
          .map((user) => user.email);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>",filteredEmails)
        if (filteredEmails) {
          
          const payload = {
            subject: `New Rate Comparative Created for Requisition Request ${updatedData.purchase_request_number} -Approve Rates`,
            to: [filteredEmails],
            cc: [""],
            htmlContent:
              "<h2>Hello, User</h2><p>Click <a href='{resetLink}'>here</a> to Initially Approve the Rates for RR.</p>",
            variables: {
              resetLink: `${accessPath}/rate-approval/update/${updatedData._id}`,
            },
          };

          console.log("checking email payload", payload);

          const { subject, to, cc, htmlContent, variables } = payload;
          await sendEmailsInBatches(
            subject,
            to,
            cc || [],
            htmlContent,
            variables
          );
        }
      }

     else if(updatedData.status === "pending" && updatedData.stage=== 'rate_approval' && updatedData.initial_approved===true){
        const filteredEmails = users
            .filter((user) => user.notifications?.includes("RC_final_approval"))
            .map((user) => user.email);
  
          console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>",filteredEmails)
          if (filteredEmails) {
            
            const payload = {
              subject: `Rate Comparative initially Approved for Requisition Request ${updatedData.purchase_request_number} -Final Approval Needed`,
              to: [filteredEmails],
              cc: [""],
              htmlContent:
                "<h2>Hello, User</h2><p>Click <a href='{resetLink}'>here</a> to finally Approve the Rates for RR.</p>",
              variables: {
                resetLink: `${accessPath}/rate-approval/final/${updatedData._id}`,
              },
            };
  
            console.log("checking email payload", payload);
  
            const { subject, to, cc, htmlContent, variables } = payload;
            await sendEmailsInBatches(
              subject,
              to,
              cc || [],
              htmlContent,
              variables
            );
          }
        }
        else if(updatedData.status === "revise" && updatedData.stage=== 'rate_comparitive'){
          const filteredEmails = users
              .filter((user) => user.notifications?.includes("RC_revise_initial"))
              .map((user) => user.email);
    
            console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>",filteredEmails)
            if (filteredEmails) {
              
              const payload = {
                subject: ` Revise Rate Comparative for Requisition Request ${updatedData.purchase_request_number}`,
                to: [filteredEmails],
                cc: [""],
                htmlContent:
                  "<h2>Hello, User</h2><p>Click <a href='{resetLink}'>here</a> to Revise the Rate Comparative for Approved RR.</p>",
                variables: {
                  resetLink: `${accessPath}/rate-comparative/update/${updatedData._id}`,
                },
              };
    
              console.log("checking email payload", payload);
    
              const { subject, to, cc, htmlContent, variables } = payload;
              await sendEmailsInBatches(
                subject,
                to,
                cc || [],
                htmlContent,
                variables
              );
            }
          }
          else if(updatedData.status === "rejected" && updatedData.stage=== 'rate_approval'){
            const filteredEmails = users
                .filter((user) => user.notifications?.includes("RC_reject_initial"))
                .map((user) => user.email);
      
              console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>",filteredEmails)
              if (filteredEmails) {
                
                const payload = {
                  subject: ` Rate Comparative for Requisition Request ${updatedData.purchase_request_number} Rejected`,
                  to: [filteredEmails],
                  cc: [""],
                  htmlContent:
                    "<h2>Hello, User!</h2><p>Rate Comparative is Rejected. Click <a href='{resetLink}'>here</a> to view the Rate Comparative.</p>",
                  variables: {
                    resetLink: `${accessPath}/rate-comparative/details/${updatedData._id}`,
                  },
                };
      
                console.log("checking email payload", payload);
      
                const { subject, to, cc, htmlContent, variables } = payload;
                await sendEmailsInBatches(
                  subject,
                  to,
                  cc || [],
                  htmlContent,
                  variables
                );
              }
            }
            else if(updatedData.status === "revise" && updatedData.stage=== 'rate_approval'){
              const filteredEmails = users
                    .filter((user) => user.notifications?.includes("RC_initial_approval"))
                    .map((user) => user.email);
          
                  console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>",filteredEmails)
                  if (filteredEmails) {
                    
                    const payload = {
                      subject: `Rate Comparative Revised for Requisition Request ${updatedData.purchase_request_number} -Approve Rates`,
                      to: [filteredEmails],
                      cc: [""],
                      htmlContent:
                        "<h2>Hello, User</h2><p>Click <a href='{resetLink}'>here</a> to Initially Approve the Rates for RR.</p>",
                      variables: {
                        resetLink: `${accessPath}/rate-approval/update/${updatedData._id}`,
                      },
                    };
          
                    console.log("checking email payload", payload);
          
                    const { subject, to, cc, htmlContent, variables } = payload;
                    await sendEmailsInBatches(
                      subject,
                      to,
                      cc || [],
                      htmlContent,
                      variables
                    );
                  }
                
            } */

      if (updatedData.status && updatedData.status === "approved") {
    
        await addPurchaseOrder(
          updatedData.toObject(),
          reqObj.langCode,
          loginUserId,
          reqObj
        );
      }

        await invalidateEntityList("rc");
       await invalidateEntity("rc");

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
             await invalidateEntityList("rc");
       await invalidateEntity("rc");
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

async function updateFiles(req, res) {
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

    let updatedData = await RateApprovalSchema.findOneAndUpdate(
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

async function getList(req, res) {
  try {
    let {
      page = 1,
      per_page = 20,
      sort_by,
      sort_order,
      list_type,
      filter_by,
      itemId,
      prType,
      filter_value,
      purchase_request_number,
      stage,
      userId,
      site,
      title,
      initial_approved,
      finalApproved,
      startDate,
      endDate,
    } = req.query;

    const cacheKey = `rc:list:${JSON.stringify(req.query)}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    page = parseInt(page) || 1;
    per_page = parseInt(per_page) || 20;

    const sort = sort_by
      ? { [sort_by]: sort_order === "desc" ? -1 : 1 }
      : { purchase_request_number: -1 };

    const filterRequest = {};

    // Date filter
    if (startDate || endDate) {
      filterRequest.updated_at = {};
      if (startDate)
        filterRequest.updated_at.$gte = new Date(
          new Date(startDate).setHours(0, 0, 0, 0)
        );
      if (endDate)
        filterRequest.updated_at.$lte = new Date(
          new Date(endDate).setHours(23, 59, 59, 999)
        );
    }

    // Basic filters
    if (filter_by && filter_value) filterRequest[filter_by] = filter_value;
    if (stage) filterRequest.stage = stage;
    if (prType?.trim()) filterRequest.prType = prType;
    if (title) filterRequest.title = title;
    if (initial_approved) filterRequest.initial_approved = false;
    if (finalApproved) {
      filterRequest.initial_approved = true;
      filterRequest.final_approved = false;
    }

    // Purchase request number filter
    if (purchase_request_number) {
      filterRequest.$expr = {
        $regexMatch: {
          input: { $toString: "$purchase_request_number" },
          regex: "^" + purchase_request_number,
          options: "i",
        },
      };
    }

    // Site / user-based filtering
    if (site) {
      filterRequest.site = ObjectID(site);
    } else if (userId) {
      const user = await UserSchema.findById(userId, "role sites").lean();
      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.role !== "superadmin") {
        const siteIds = user.sites?.map((id) => new ObjectID(id)) || [];
        filterRequest.site = siteIds.length
          ? { $in: siteIds }
          : { $exists: false };
      }
    }

    const keyword = (itemId ?? "").trim();

    // Base aggregation pipeline
    const basePipeline = [
      { $match: filterRequest },

      {
        $lookup: {
          from: "sites",
          localField: "site",
          foreignField: "_id",
          as: "sitesData",
        },
      },

      { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "items",
          localField: "items.item_id",
          foreignField: "_id",
          as: "itemDetail",
        },
      },

      {
        $addFields: {
          "items.itemDetail": { $arrayElemAt: ["$itemDetail", 0] },
        },
      },

      {
        $group: {
          _id: "$_id",
          doc: { $first: "$$ROOT" },
          items: { $push: "$items" },
        },
      },

      { $addFields: { "doc.items": "$items" } },
      { $replaceRoot: { newRoot: "$doc" } },
    ];

    // Keyword filter on item name
    if (keyword) {
      basePipeline.push({
        $match: {
          $expr: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: "$items",
                    as: "item",
                    cond: {
                      $regexMatch: {
                        input: "$$item.itemDetail.item_name",
                        regex: keyword,
                        options: "i",
                      },
                    },
                  },
                },
              },
              0,
            ],
          },
        },
      });
    }

    // Count pipeline
    const countPipeline = [...basePipeline, { $count: "total" }];

    // Data pipeline with pagination
    const dataPipeline = [
      ...basePipeline,
      {
        $project: {
          title: 1,
          local_purchase: 1,
          rate_approval_numbers: 1,
          purchase_request_numbers: 1,
          initial_approved: 1,
          final_approved: 1,
          rate_approval_number: 1,
          site: 1,
          status: 1,
          purchase_request_number: 1,
          created_at: 1,
          updated_at: 1,
          siteData: { $arrayElemAt: ["$sitesData", 0] },
        },
      },
      { $sort: sort },
      { $skip: (page - 1) * per_page },
      { $limit: per_page },
    ];

    // Run queries in parallel
    const [data, countResult] = await Promise.all([
      RateApprovalSchema.aggregate(dataPipeline),
      RateApprovalSchema.aggregate(countPipeline),
    ]);

    const totalCount = countResult[0]?.total || 0;

    const response = {
      data,
      total: totalCount,
      current_page: page,
      per_page,
      result_start: (page - 1) * per_page + 1,
      result_end: (page - 1) * per_page + data.length,
    };

    await setCache(cacheKey, response, TRANSACTIONAL);

    return res.status(200).json(response);
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

async function getPendingRateApprovalList(req, res) {
  try {
    let {
      page = 1,
      per_page = 20,
      sort_by,
      sort_order,
      list_type,
      itemId,
      startDate,
      endDate,
      prType,
      userId,
      site,
      title,
      pr_number,
    } = req.query;

    const cacheKey = `rc:pendinglist:${JSON.stringify(req.query)}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    page = parseInt(page) || 1;
    per_page = parseInt(per_page) || 20;

    const sort = sort_by
      ? { [sort_by]: sort_order === "desc" ? -1 : 1 }
      : { purchase_request_number: -1 };

    const filterRequest = {
      status: { $in: ["revise", "pending"] },
      stage: "rate_approval",
    };
    console.log("coming here");
    if (startDate || endDate) {
      filterRequest.updated_at = {};
      if (startDate)
        filterRequest.updated_at.$gte = new Date(
          new Date(startDate).setHours(0, 0, 0, 0)
        );
      if (endDate)
        filterRequest.updated_at.$lte = new Date(
          new Date(endDate).setHours(23, 59, 59, 999)
        );
    }

    // Basic filters
    filterRequest.$expr = {
      $regexMatch: {
        input: { $toString: "$purchase_request_number" },
        regex: "^" + pr_number,
        options: "i",
      },
    };

    console.log(filterRequest);
    if (prType?.trim()) filterRequest.prType = prType;
    if (title) filterRequest.title = title;

    // Site / user-based filtering
    if (site) {
      filterRequest.site = ObjectID(site);
    } else if (userId) {
      const user = await UserSchema.findById(userId, "role sites").lean();
      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.role !== "superadmin") {
        const siteIds = user.sites?.map((id) => new ObjectID(id)) || [];
        filterRequest.site = siteIds.length
          ? { $in: siteIds }
          : { $exists: false };
      }
    }

    const keyword = (itemId ?? "").trim();

    // Base aggregation pipeline
    const basePipeline = [
      { $match: filterRequest },

      {
        $lookup: {
          from: "sites",
          localField: "site",
          foreignField: "_id",
          as: "sitesData",
        },
      },

      { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "items",
          localField: "items.item_id",
          foreignField: "_id",
          as: "itemDetail",
        },
      },

      {
        $addFields: {
          "items.itemDetail": { $arrayElemAt: ["$itemDetail", 0] },
        },
      },

      {
        $group: {
          _id: "$_id",
          doc: { $first: "$$ROOT" },
          items: { $push: "$items" },
        },
      },

      { $addFields: { "doc.items": "$items" } },
      { $replaceRoot: { newRoot: "$doc" } },
    ];

    // Keyword filter on item name
    if (keyword) {
      basePipeline.push({
        $match: {
          $expr: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: "$items",
                    as: "item",
                    cond: {
                      $regexMatch: {
                        input: "$$item.itemDetail.item_name",
                        regex: keyword,
                        options: "i",
                      },
                    },
                  },
                },
              },
              0,
            ],
          },
        },
      });
    }

    // Count pipeline
    const countPipeline = [...basePipeline, { $count: "total" }];

    // Data pipeline with pagination
    const dataPipeline = [
      ...basePipeline,
      {
        $project: {
          title: 1,
          local_purchase: 1,
          rate_approval_numbers: 1,
          purchase_request_numbers: 1,
          initial_approved: 1,
          final_approved: 1,
          rate_approval_number: 1,
          site: 1,
          status: 1,
          purchase_request_number: 1,
          created_at: 1,
          updated_at: 1,
          siteData: { $arrayElemAt: ["$sitesData", 0] },
        },
      },
      { $sort: sort },
      { $skip: (page - 1) * per_page },
      { $limit: per_page },
    ];

    // Execute in parallel
    const [allRecords, countResult] = await Promise.all([
      RateApprovalSchema.aggregate(dataPipeline),
      RateApprovalSchema.aggregate(countPipeline),
    ]);

    const totalCount = countResult[0]?.total || 0;

   
     const response = {
      data: allRecords,
      total: totalCount,
      current_page: page,
      per_page,
      result_start: (page - 1) * per_page + 1,
      result_end: (page - 1) * per_page + allRecords.length,
    };
    
    await setCache(cacheKey, response, TRANSACTIONAL);
    
    return res.status(200).json(response);
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

async function getDetails(req, res) {
  try {
    const reqObj = req.body;
    const { _id } = req.query;
    //console.log("getting details for id:", _id);
    if (!_id) {
      return res.status(412).json(
        await Response.errors(
          {
            errors: [],
            message: responseMessage(reqObj.langCode, "ID_MISSING"),
          },
          {},
          req
        )
      );
    }

    const cacheKey = `rc:details:${_id}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const rateApprovalData = await RateApprovalSchema.aggregate([
      { $match: { _id: ObjectID(_id) } },

      { $unwind: "$items" },

      {
        $lookup: {
          from: "items",
          localField: "items.item_id",
          foreignField: "_id",
          as: "itemDetail",
        },
      },
      { $unwind: "$itemDetail" },

      {
        $lookup: {
          from: "categories",
          localField: "itemDetail.category",
          foreignField: "_id",
          as: "categoryDetail",
        },
      },
      { $unwind: "$categoryDetail" },

      {
        $lookup: {
          from: "sub_categories",
          localField: "itemDetail.sub_category",
          foreignField: "_id",
          as: "subCategoryDetail",
        },
      },
      {
        $unwind: {
          path: "$subCategoryDetail",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "uoms",
          localField: "itemDetail.uom",
          foreignField: "_id",
          as: "uomDetail",
        },
      },
      { $unwind: "$uomDetail" },

      {
        $lookup: {
          from: "sites",
          localField: "site",
          foreignField: "_id",
          as: "siteDetails",
        },
      },
      {
        $addFields: {
          siteDetails: { $arrayElemAt: ["$siteDetails", 0] },
        },
      },

      {
        $group: {
          _id: "$_id",

          title: { $first: "$title" },
          handle_by: { $first: "$handle_by" },
          date: { $first: "$date" },
          order_Type: { $first: "$order_Type" },
          open_order: { $first: "$open_order" },
          billing_cycle: { $first: "$billing_cycle" },
          prType: { $first: "$prType" },
          status: { $first: "$status" },
          site: { $first: "$site" },
          siteDetails: { $first: "$siteDetails" },
          expected_delivery_date: { $first: "$expected_delivery_date" },
          local_purchase: { $first: "$local_purchase" },
          purchase_request_number: { $first: "$purchase_request_number" },
          rate_approval_number: { $first: "$rate_approval_number" },
          vendorItems: { $first: "$vendorItems" },
          purchase_request_id: { $first: "$purchase_request_id" },
          rate_approval_numbers: { $first: "$rate_approval_numbers" },
          purchase_request_numbers: { $first: "$purchase_request_numbers" },
          mergedPR: { $first: "$mergedPR" },
          initial_approved: { $first: "$initial_approved" },
          final_approved: { $first: "$final_approved" },
          initial_approvedBy: { $first: "$initial_approvedBy" },
          final_approvedBy: { $first: "$final_approvedBy" },
          stage: { $first: "$stage" },
          prHistory: { $first: "$prHistory" },
          vendorRatesVendorWise: { $first: "$vendorRatesVendorWise" },
          vendors_total: { $first: "$vendors_total" },
          remarks: { $first: "$remarks" },
          files: { $first: "$files" },

          created_by: { $first: "$created_by" },
          updated_by: { $first: "$updated_by" },
          created_at: { $first: "$created_at" },
          updated_at: { $first: "$updated_at" },

          /* Collect categories for vendor filtering */
          categories: { $addToSet: "$categoryDetail._id" },

          items: {
            $push: {
              _id: "$items._id",
              qty: "$items.qty",
              tax: "$items.tax",
              hsnCode: "$items.hsnCode",
              item_code: "$items.item_code",
              specification: "$items.specification",
              brand: "$items.brand",
              vendors: "$items.vendors",
              item_id: "$items.item_id",

              itemDetail: {
                _id: "$itemDetail._id",
                item_name: "$itemDetail.item_name",
              },

              category: {
                _id: "$categoryDetail._id",
                name: "$categoryDetail.name",
                code: "$categoryDetail.code",
              },

              subCategory: {
                _id: "$subCategoryDetail._id",
                subcategory_name: "$subCategoryDetail.subcategory_name",
              },

              uom: {
                _id: "$uomDetail._id",
                uom_name: "$uomDetail.uom_name",
              },
            },
          },
        },
      },
    ]);

    //console.log("Fetched Rate Approval:", rateApprovalData);

    if (!rateApprovalData.length) {
      return res
        .status(422)
        .json(
          await Response.success(
            {},
            responseMessage(reqObj.langCode, "NO_RECORD_FOUND"),
            req
          )
        );
    }

    const rateApproval = rateApprovalData[0];

    /* ==============================
       STEP 2: FETCH VENDORS BY CATEGORY
    =============================== */

    let vendorsList = await VendorSchema.find({
      category: { $in: rateApproval.categories }, // array vs array match
    })
      .select(
        "_id vendor_name code Uniquecode category SubCategory contact_person phone_number email"
      )
      .lean();

    if (
      rateApproval.status === "pending" &&
      rateApproval.stage === "rate_comparitive"
    ) {
      vendorsList = vendorsList;
    } else {
      const details = rateApproval.vendorRatesVendorWise[0].totals;
      //const vendorIds = details.map((vendor: any) => vendor.vendor_id);

      const vendorIds = Object.keys(details);
      const vendorsData = await VendorSchema.find({
        _id: { $in: vendorIds.map((id) => ObjectID(id)) },
      })
        .select(
          "_id vendor_name code Uniquecode category SubCategory contact_person phone_number email"
        )
        .lean();

      const existingVendorIds = new Set(vendorsList.map((v) => String(v._id)));

      const uniqueVendors = vendorsData.filter(
        (v) => !existingVendorIds.has(String(v._id))
      );
      vendorsList = [...vendorsList, ...uniqueVendors];
    }

    /* ==============================
       STEP 3: FINAL RESPONSE
    =============================== */

    const response = await Response.success(
      {
        details: rateApproval,
        vendorsList,
      },
      responseMessage(reqObj.langCode, "SUCCESS")
    );

    await setCache(cacheKey, response, TRANSACTIONAL);

    return res.status(200).json(response);
  } catch (error) {
    console.log("Error in getDetails:", error);
    return res.status(error.statusCode || 500).json(
      await Response.errors(
        {
          errors: error.errors || [],
          message: error.message || "Something went wrong",
        },
        error,
        req
      )
    );
  }
}

async function LocalPurchaseComparative(req, res) {
  const { _id, login_user_id, purchase_request_id } = req.query;
  //console.log(req.query);
  if (!_id || !purchase_request_id) {
    return res
      .status(400)
      .json({ message: "Both _id and purchase_request_id are required" });
  }

  try {
    // 1. Delete the RateApproval document
    const deletedRateApproval = await RateApprovalSchema.findByIdAndDelete(
      ObjectID(_id)
    );

    if (!deletedRateApproval) {
      return res.status(404).json({ message: "RateApproval entry not found" });
    }

    // 2. Update the corresponding PurchaseRequest document

    const existingPR = await PurchaseRequest.findById(
      ObjectID(purchase_request_id)
    ).lean();

    let prHistory = Array.isArray(existingPR.prHistory)
      ? [...existingPR.prHistory]
      : [];
    // Add the current status update to prHistory

    const historyEntry = {
      updated_By: ObjectID(login_user_id),
      updated_Date: new Date(),
      status: "Revision by Purchase Department as local purchase",
    };

    prHistory.push(historyEntry);

    const updatedPurchaseRequest = await PurchaseRequest.findOneAndUpdate(
      { _id: ObjectID(purchase_request_id) },
      {
        prHistory: prHistory,
        status: "revise",
        local_purchase: "yes",
        PM_approvedBy: "",
        PD_approvedBy: "",
        pm_approvedDate: "",
        pd_approvedDate: "",
      }
    );

    await sendRevisionPREmail(updatedPurchaseRequest, accessPath);

    if (!updatedPurchaseRequest) {
      return res
        .status(404)
        .json({ message: "PurchaseRequest entry not found" });
    }

     await invalidateEntityList("rc");
       await invalidateEntity("rc");
       await invalidateEntityList("pr");
        await invalidateEntity("pr");
    return res.status(200).json({
      message: "RateApproval deleted and PurchaseRequest updated successfully",
      updatedPurchaseRequest,
    });
  } catch (error) {
    console.error("Error in deleting rate approval:", error);
    return res.status(500).json({ message: "Internal Server Error", error });
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
    let record = await RateApprovalSchema.findOneAndDelete({
      company_id: company_id,
      _id: ObjectID(_id),
    });

      await invalidateEntityList("rc");
       await invalidateEntity("rc");
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

async function rateApprovalSummary(req, res) {
  try {
    const {
      userId,
      site,
      title,
      prType,
      itemId,
      startDate,
      endDate,
      purchase_request_number,
    } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const cacheKey = `rc:statusCounts:${JSON.stringify(req.query)}`;
    const cached = await getCache(cacheKey);
    if (cached) {
   
      return res.status(200).json(cached);
    }

    // ---- Build match criteria ----
    let matchCriteria = {};

    if (prType?.trim()) {
      matchCriteria.prType = prType;
    }

    if (purchase_request_number) {
      matchCriteria.$expr = {
        $regexMatch: {
          input: { $toString: "$purchase_request_number" },
          regex: "^" + purchase_request_number,
          options: "i",
        },
      };
    }

    if (startDate || endDate) {
      matchCriteria.updated_at = {};
      if (startDate) {
        matchCriteria.updated_at.$gte = new Date(
          new Date(startDate).setHours(0, 0, 0, 0)
        );
      }
      if (endDate) {
        matchCriteria.updated_at.$lte = new Date(
          new Date(endDate).setHours(23, 59, 59, 999)
        );
      }
    }

    if (title?.trim()) {
      matchCriteria.title = title;
    }

    if (site) {
      matchCriteria.site = new ObjectID(site);
    } else {
      const user = await UserSchema.findById(userId).lean();
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== "superadmin") {
        const assignedSites = user.sites || [];
        if (assignedSites.length === 0) {
          return res.status(200).json({ pairs: [] });
        }
        matchCriteria.site = {
          $in: assignedSites.map((id) => new ObjectID(id)),
        };
      }
    }

    // ---- Build pipeline ----
    const pipeline = [{ $match: matchCriteria }];

    // Only do lookup if filtering by itemId
    if (itemId?.trim()) {
      pipeline.push(
        { $unwind: "$items" },
        {
          $lookup: {
            from: "items",
            localField: "items.item_id",
            foreignField: "_id",
            as: "itemDetail",
          },
        },
        {
          $match: {
            "itemDetail.item_name": { $regex: itemId, $options: "i" },
          },
        }
      );
    }

    pipeline.push({
      $group: {
        _id: {
          stage: "$stage",
          status: "$status",
        },
        count: { $sum: 1 },
        initialFalse: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$stage", "rate_approval"] },
                  { $eq: ["$status", "pending"] },
                  { $eq: ["$initial_approved", false] },
                ],
              },
              1,
              0,
            ],
          },
        },
        finalFalse: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$stage", "rate_approval"] },
                  { $eq: ["$status", "pending"] },
                  { $eq: ["$initial_approved", true] },
                  { $eq: ["$final_approved", false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    });

    pipeline.push({
      $project: {
        stage: "$_id.stage",
        status: "$_id.status",
        count: 1,
        initialFalse: 1,
        finalFalse: 1,
        _id: 0,
      },
    });

    const aggregatedData = await RateApprovalSchema.aggregate(pipeline);

    // ---- Build result for all pairs ----
    const stages = ["rate_comparitive", "rate_approval"];
    const statuses = [
      "pending",
      "partial",
      "approved",
      "rejected",
      "draft",
      "revise",
      "revised",
    ];

    const allPairs = [];

    for (const stage of stages) {
      for (const status of statuses) {
        allPairs.push({ stage, status });
      }
    }

    allPairs.push(
      { stage: "rate_approval", status: "pending", initial_approved: false },
      {
        stage: "rate_approval",
        status: "pending",
        initial_approved: true,
        final_approved: false,
      }
    );

    const result = allPairs.map((pair) => {
      const match = aggregatedData.find(
        (data) => data.stage === pair.stage && data.status === pair.status
      );

      if (pair.initial_approved === false) {
        return {
          stage: pair.stage,
          status: pair.status,
          initial_approved: false,
          final_approved: null,
          count: match ? match.initialFalse : 0,
        };
      }

      if (pair.initial_approved === true && pair.final_approved === false) {
        return {
          stage: pair.stage,
          status: pair.status,
          initial_approved: true,
          final_approved: false,
          count: match ? match.finalFalse : 0,
        };
      }

      return {
        stage: pair.stage,
        status: pair.status,
        initial_approved: null,
        final_approved: null,
        count: match ? match.count : 0,
      };
    });

  

    const response = {
      pairs: result}

    await setCache(cacheKey, response, TRANSACTIONAL);

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function getDetailsByPRNumber(req, res) {
  try {
    const { site, purchase_request_number, rate_approval_number } = req.query;
    const prNumber = Number(purchase_request_number);

    //console.log(req.query);

    if (!site || !purchase_request_number) {
      return res
        .status(400)
        .json({ message: "site and purchase_request_number are required" });
    }

    if (!ObjectID.isValid(site)) {
      return res.status(400).json({ message: "Invalid site ObjectID" });
    }

    // Build query object
    const query = {
      site: ObjectID(site),
      purchase_request_number: prNumber,
    };

    if (rate_approval_number) {
      query.rate_approval_number = rate_approval_number; // Add this field only if provided
    }

    const rateApproval = await RateApprovalSchema.findOne(query)
      .populate("items.item_id")
      .lean(); // return plain JS object

    if (!rateApproval) {
      return res
        .status(404)
        .json({ message: "Request not Editable, Contact SuperAdmin" });
    }

    // Add itemDetails inside each item
    rateApproval.items = rateApproval.items.map((item) => ({
      ...item,
      itemDetails: item.item_id,
      item_id: item.item_id?._id, // keep item_id as id only
    }));

    res.status(200).json(rateApproval);
  } catch (error) {
    console.error("Error fetching rate approval:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function getUniqueOpenRCTitle(req, res) {
  try {
    const { siteId, prType } = req.query;
    //console.log(req.query);
    // Validate required query params
    if (!siteId || !prType) {
      return res.status(400).json({ error: "site and prType are required" });
    }

    const titles = await RateApprovalSchema.distinct("title", {
      site: ObjectID(siteId),
      prType: prType,
      purchase_request_numbers: [],
      status: { $in: ["pending", "revise"] },
      stage: "rate_comparitive",
    });

    res.json({ unique_titles: titles });
  } catch (error) {
    console.error("Error fetching unique titles:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getPendingPRNumbers(req, res) {
  try {
    const { siteId, title, prType } = req.query;

    // Validate required query params
    if (!siteId || !title || !prType) {
      return res
        .status(400)
        .json({ error: "site, title, and prType are required" });
    }

    const rateApprovals = await RateApprovalSchema.find({
      site: ObjectID(siteId),
      title: title,
      prType: prType,
      purchase_request_numbers: { $size: 0 }, // match empty array
      status: { $in: ["pending", "revise"] },
      stage: "rate_comparitive",
    }).select("purchase_request_number rate_approval_number");

    const prNumbers = rateApprovals.map((doc) => doc.purchase_request_number);

    res.json({ pr_numbers: rateApprovals });
  } catch (error) {
    console.error("Error fetching PR numbers:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

async function sendRevisionPREmail(newData, accessPath) {
  try {
    const site = await SiteSchema.findById(ObjectID(newData.site)).populate(
      "roles.store_manager roles.project_manager roles.project_director"
    );

    const users = await getUsersBySiteId(ObjectID(newData.site));

    const filteredEmails = users
      .filter((user) => user.notifications?.includes("PR_revise_reject_PM"))
      .map((user) => user.email);

    if (!filteredEmails.length) {
      //console.log("No users found with the required permissions.");
      return;
    }

    // Utility function to format dates
    const formatDate = (date) =>
      date
        ? new Date(date).toLocaleDateString("en-GB").replace(/\//g, "-")
        : "N/A";

    // Revision details
    const revisionDetails = {
      purchaseRequestNumber: newData.purchase_request_number,
      purchaseType: newData.prType || "N/A",
      localpurchase: newData.local_purchase || "N/A",
      projectDirectorName:
        site.roles?.project_director?.name || "Project Director",
      projectManagerName:
        site.roles?.project_manager?.name || "Project Manager",
      storeInchargeName: site.roles?.store_manager?.name || "Store Incharge",
      rrCategory: newData.title || "N/A",
      requestedDate: formatDate(newData.created_at),
      updatedDate: formatDate(newData.updated_at),
      remarks: newData.remarks || "N/A",
      projectLocation: site.site_name || "N/A",
      resetLink: `${accessPath}/procurement/revise/${newData._id}`,
    };

    const htmlContent = `
      <p>Dear ${revisionDetails.storeInchargeName},</p>
      <p> Procurement Department has submitted purchase request- <strong>${revisionDetails.purchaseRequestNumber}</strong>, for your revision to be revised as a local Purchase.</p>
      <p>Here are the request details:</p>
      <ul>
        <li><strong>RR Category:</strong> ${revisionDetails.rrCategory}</li>
        <li><strong>Requested Date:</strong> ${revisionDetails.requestedDate}</li>
         <li><strong>Project Location:</strong> ${revisionDetails.projectLocation}</li>
         <li><strong>Purchase Type:</strong> {purchaseType}</li>
          <li><strong>Local Purchase:</strong> {localpurchase}</li>
       <li><strong>Revision Request By :</strong>Procuremnt Department </li>
        <li><strong>Revision Requested On:</strong> ${revisionDetails.updatedDate}</li>
        <li><strong>RR Revision Remarks:</strong> To be revised as a Local Purchase </li>
      </ul>
      <p>To revise the request and take action, <a href='${revisionDetails.resetLink}'>Click Here</a></p>
      <p>Your prompt attention to this matter is appreciated.</p>
       <p style="margin-top:20px">Thank you.</p>

         <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 100px; padding-right: 15px;">
          <img src="https://gamerji-dharmendra.s3.amazonaws.com/PISL+Logo.jpg" alt="pisl infra" style="width: 100px;" />
        </td>
        <td style="vertical-align: middle; font-family: Arial, sans-serif; color: #333;">
          <p style="margin: 0; font-weight: bold; font-size: 14px;">Pragati Infra Solutions Pvt Ltd</p>
          <p style="margin: 0; font-size: 12px;">31P, Sector 38, Gurugram (HR)</p>
         
          <p style="margin: 0; font-size: 12px;">
            Website: <a href="https://www.pislinfra.com" style="color: #007bff; text-decoration: none;">www.pislinfra.com</a>
          </p>
        </td>
      </tr>
    </table>
    `;

    const payload = {
      subject: `Purchase Request - ${revisionDetails.purchaseRequestNumber} for ${site.site_name}, waiting for Revision, requested by Procurement Department`,
      to: filteredEmails,
      cc: [],
      htmlContent,
      variables: revisionDetails,
    };

    //console.log("Checking email payload:", payload);

    await sendEmailsInBatches(
      payload.subject,
      payload.to,
      payload.cc,
      payload.htmlContent,
      payload.variables
    );
  } catch (error) {
    console.error("Error sending purchase request email:", error);
  }
}

async function getUsersBySiteId(siteId) {
  // console.log(">>>>>>>>>>>>>>>____________________>>>>>>>>>>>>>>", siteId);
  try {
    let users = await User.find({ sites: siteId }).lean(); // Use .lean() for better performance
    let roles = await Role.find({ role: { $in: users.map((u) => u.role) } });
    //console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>", users);
    users = users.map((user) => ({
      ...user,
      roleDetails: roles.find((r) => r.role === user.role) || null,
    }));

    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}

async function combineRateApprovals(req, res) {
  try {
    const { _ids, loginUserId } = req.body;
    //console.log(_ids);

    if (!Array.isArray(_ids) || _ids.length === 0) {
      return res.status(400).json({ error: "_ids must be a non-empty array." });
    }

    // Step 1: Find matched docs
    const matchedDocs = await RateApprovalSchema.find({
      _id: { $in: _ids.map((id) => ObjectID(id)) },
      status: { $in: ["pending", "revise"] },
      stage: "rate_comparitive",
    });

    if (matchedDocs.length === 0) {
      return res
        .status(404)
        .json({ error: "No matching rate approvals found." });
    }

    // Step 2: Combine base
    const base = matchedDocs[0].toObject();

    // Step 3: Combine items (no deduplication)
    base.items = matchedDocs.flatMap((doc) => doc.items);

    // Step 4: Add mergedPR info
    base.mergedPR = matchedDocs.map((doc) => ({
      purchase_request_id: doc.purchase_request_id,
      purchase_request_number: doc.purchase_request_number,
      date: doc.date,
      expected_delivery_date: doc.expected_delivery_date,
    }));

    // Step 5: Add traceability info
    base.rate_approval_numbers = matchedDocs.map(
      (doc) => doc.rate_approval_number
    );
    base.purchase_request_numbers = matchedDocs.map(
      (doc) => doc.purchase_request_number
    );

    // Step 6: Clean up old fields that shouldn't carry over
    delete base._id;
    delete base.created_at;
    delete base.updated_at;
    delete base.__v;

    // Optional: Set new timestamps and any field updates
    base.created_at = new Date();
    base.updated_at = new Date();

    const combinedString = (base.purchase_request_numbers || []).join(", ");

    base.status = "pending";
    base.stage = "rate_comparitive";
    base.prHistory = [
      {
        updated_By: ObjectID(loginUserId),
        updated_Date: new Date(),
        stage: "rate_comparitive",
        status: `PR Merged with ${combinedString} by Purchase Department`,
      },
    ]; // Reset history for new document

    // Step 7: Save new combined document
    const newRateApproval = new RateApprovalSchema(base);
    await newRateApproval.save();

    // Step 8: Delete old documents
    await RateApprovalSchema.deleteMany({
      _id: { $in: _ids.map((id) => ObjectID(id)) },
    });

     await invalidateEntityList("rc");
       await invalidateEntity("rc");

    res.json({
      message: "Rate approvals merged successfully.",
      newRateApproval,
    });
  } catch (err) {
    console.error("Error combining rate approvals:", err);
    res.status(500).json({ error: "Internal server error." });
  }
}

async function rejectRateApprovals(req, res) {
  const { siteId, purchaseRequestNumber } = req.body;

  if (!siteId || purchaseRequestNumber === undefined) {
    return res
      .status(400)
      .json({ error: "Both siteId and purchaseRequestNumber are required." });
  }

  try {
    const batchSize = 100;
    let updatedCount = 0;
    let hasMore = true;

    const parsedPR = parseInt(purchaseRequestNumber);

    const totalDocuments = await PurchaseRequest.countDocuments({
      $expr: {
        $and: [
          { $eq: ["$site", ObjectID(siteId)] },
          { $eq: ["$status", "approved"] },
          { $lte: [{ $toInt: "$purchase_request_number" }, parsedPR] },
          { $eq: ["$pd_approvedDate", ""] },
        ],
      },
    });

    //console.log(`Total documents to approve: ${totalDocuments}`);

    while (hasMore) {
      const documents = await PurchaseRequest.find(
        {
          $expr: {
            $and: [
              { $eq: ["$site", ObjectID(siteId)] },
              { $eq: ["$status", "approved"] },
              { $lte: [{ $toInt: "$purchase_request_number" }, parsedPR] },
              { $eq: ["$pd_approvedDate", ""] },
            ],
          },
        },
        { _id: 1 }
      ).limit(batchSize);

      if (documents.length > 0) {
        const ids = documents.map((doc) => doc._id);

        const result = await PurchaseRequest.updateMany(
          { _id: { $in: ids } },
          {
            $set: {
              pd_approvedDate: new Date(),
            },
          }
        );
        //console.log("checking", result);
        updatedCount += result.modifiedCount;
        /*console.log(
          `Batch approved: ${result.modifiedCount} documents. Total approved: ${updatedCount}/${totalDocuments}`
        ); */
      }

      hasMore = documents.length === batchSize;
    }

     await invalidateEntityList("rc");
       await invalidateEntity("rc");

    res.status(200).json({
      message: "Rate approvals approved successfully.",
      updatedCount,
      totalDocuments,
    });
  } catch (error) {
    console.error("Error approving rate approvals:", error);
    res.status(500).json({ error: "Failed to approve rate approvals." });
  }
}

async function GetUniquePR(req, res) {
  try {
    const { site, query = "" } = req.query;
    //console.log("Query parameters:", site);

    if (!site) {
      return res.status(400).json({ message: "Site is required" });
    }

    // Fetch only orders matching the site
    const allOrders = await RateApprovalSchema.find(
      {
        site: ObjectID(site),
        status: "pending",
        purchase_request_numbers: [], // Is this supposed to be purchase_request_number ?
        stage: "rate_comparitive",
      },
      {
        purchase_request_number: 1,
        rate_approval_number: 1,
      }
    ).lean();

    //console.log("All orders fetched:", allOrders);

    const resultArray = [];

    for (const order of allOrders) {
      const pr = order.purchase_request_number?.toString();

      if (pr && pr.includes(query)) {
        resultArray.push({
          purchase_request_number: pr,
          rate_approval_number: order.rate_approval_number,
        });
      }
    }

    return res.status(200).json({ result: resultArray });
  } catch (error) {
    console.error("Error fetching filtered PR numbers:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
async function CreateSplitRateApproval(req, res) {
  try {
    let reqObj = req.body;
    let loginUserId = reqObj.login_user_id;

    let result = await addRateApproval(
      {
        ...reqObj,
      },
      reqObj.langCode,
      loginUserId
    );

     await invalidateEntityList("rc");
       await invalidateEntity("rc");

    // Send success response
    return res.status(200).json({
      success: true,
      message: "Rate approval created successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in CreateSplitRateApproval:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while creating rate approval",
      error: error.message,
    });
  }
}

async function DashboardRateApprovalStats (req, res) {
  try {
    const { userId, site } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // ---- Cache ----
    const cacheKey = `RA:STATUS_COUNT:${JSON.stringify({ userId, site: site || null })}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    // ---- Build match ----
    const match = {};

    if (site?.trim()) {
      match.site = new ObjectID(site);
    } else {
      const user = await UserSchema.findById(userId).lean();
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== "superadmin") {
        const sites = user.sites || [];
        if (sites.length === 0) {
          const empty = {
            comparative_pending: 0,
            comparative_draft: 0,
            approval_pending: 0,
            approval_approved: 0,
            approval_revised: 0,
          };
          await setCache(cacheKey, empty, 900);
          return res.status(200).json(empty);
        }

        match.site = { $in: sites.map((id) => new ObjectID(id)) };
      }
    }

    // ---- Aggregate ----
    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: null,

          comparative_pending: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$stage", "rate_comparitive"] },
                    { $eq: ["$status", "pending"] },
                  ],
                },
                1,
                0,
              ],
            },
          },

          comparative_draft: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$stage", "rate_comparitive"] },
                    { $eq: ["$status", "draft"] },
                  ],
                },
                1,
                0,
              ],
            },
          },

          approval_pending: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$stage", "rate_approval"] },
                    { $eq: ["$status", "pending"] },
                  ],
                },
                1,
                0,
              ],
            },
          },

          approval_approved: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$stage", "rate_approval"] },
                    { $eq: ["$status", "approved"] },
                  ],
                },
                1,
                0,
              ],
            },
          },

          approval_revised: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$stage", "rate_approval"] },
                    { $eq: ["$status", "revised"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          comparative_pending: 1,
          comparative_draft: 1,
          approval_pending: 1,
          approval_approved: 1,
          approval_revised: 1,
        },
      },
    ];

    const [counts] = await RateApprovalSchema.aggregate(pipeline);

    const response =
      counts || {
        comparative_pending: 0,
        comparative_draft: 0,
        approval_pending: 0,
        approval_approved: 0,
        approval_revised: 0,
      };

    await setCache(cacheKey, response, 900);

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
