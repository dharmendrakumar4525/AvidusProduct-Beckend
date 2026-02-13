/**
 * Purchase Request Controller
 * Handles all operations related to Purchase Requests (PR) including:
 * - Creating purchase requests with file uploads
 * - PR approval workflow
 * - Rate approval generation
 * - Purchase order creation from approved PRs
 * - File management (S3 uploads)
 * - Email notifications for PR status changes
 */

const PurchaseRequest = require("../../models/PurchaseRequest");
const RateApprovalSchema = require("../../models/RateApproval");
const PurchaseOrderSchema = require("../../models/PurchaseOrder");
const DMROrderSchema = require("../../models/DmrPurchaseOrder");
const Response = require("../../libs/response");
const UserSchema = require("../../models/User");
const SiteSchema = require("../../models/Site");
const User = require("../../models/User");
require("dotenv").config();
const sendEmailsInBatches = require("../../emails/sendEmail");
const { responseMessage } = require("../../libs/responseMessages");
const ObjectID = require("mongodb").ObjectID;
const accessPath = process.env.ACCESS_PATH;
const {
  getCache,
  setCache,
  invalidateEntity,
  invalidateEntityList,
} = require("../../utils/cache");
const { TRANSACTIONAL } = require("../../libs/cacheConfig");

const {
  updateNextNumberGroupId,
  addRateApproval,
  addLocalPurchaseOrder,
  checkVendorCount,
} = require("./utilityController");
const AWS = require("aws-sdk");
const mime = require("mime-types");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const util = require("util");
const unlinkFile = util.promisify(fs.unlink);
const Role = require("../../models/Role");

/**
 * AWS S3 Configuration
 * Configured for file uploads (quotations, documents, etc.)
 * Note: In production, credentials should be in environment variables
 */
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

module.exports = {
  getList,
  getDetails,
  createData,
  updateData,
  deleteData,
  RejectApprovedPR,
  getPurchaseRequestList,
  getPurchaseRequestStatus,
  EditApprovedData,
  getLocalPurchaseCounts,
  getLocalRateApprovals,
  getPRWithLinkedData,
};

/**
 * Create Purchase Request
 * POST /api/web/purchase-request
 * Creates a new purchase request with file uploads
 * Handles multiple file uploads to S3 and maps them to PR items
 * 
 * @param {Object} req.body - Purchase request data
 * @param {Array} req.files - Uploaded files (quotations, specifications, etc.)
 * @param {String} req.body.login_user_id - User creating the PR
 * 
 * @returns {Object} Created purchase request object
 */
async function createData(req, res) {
  try {
    let reqObj = req.body;
    reqObj.created_by = reqObj.login_user_id;
    reqObj.updated_by = reqObj.login_user_id;
    
    // Handle multiple file uploads
    if (req.files && req.files.length > 0) {
      const bucketName = "gamerji-dharmendra";
      if (!bucketName) {
        throw new Error(
          "S3_BUCKET_NAME is not defined in the environment variables"
        );
      }

      // Map files to their corresponding items based on fieldname
      // Fieldname format: items[0][attachment], items[1][attachment], etc.
      const uploadedFilesMap = {};

      // Process each uploaded file
      for (let file of req.files) {
        // Read file content
        const fileContent = fs.readFileSync(file.path);
        
        // Determine file MIME type
        const fileType =
          mime.lookup(file.originalname) || "application/octet-stream";
        
        // Generate unique filename
        const fileName = `${uuidv4()}-${file.originalname}`;
        
        // Prepare S3 upload parameters
        const params = {
          Bucket: bucketName,
          Key: `uploads/${fileName}`, // Store in uploads/ directory
          Body: fileContent,
          ContentType: fileType,
        };

        try {
          // Upload file to S3
          const s3UploadResult = await s3.upload(params).promise();

          // Remove temporary file from local filesystem
          fs.unlinkSync(file.path);

          // Extract the item index from the fieldname (e.g., 'items[0][attachment]')
          const fieldName = file.fieldname;
          const match = fieldName.match(/items\[(\d+)\]\[attachment\]/);
          if (match) {
            const itemIndex = match[1];
            if (!uploadedFilesMap[itemIndex]) {
              uploadedFilesMap[itemIndex] = [];
            }
            uploadedFilesMap[itemIndex].push(s3UploadResult.Location);
          }
        } catch (uploadError) {
          //console.error('S3 upload error:', uploadError);
          throw {
            errors: [],
            message: responseMessage(
              reqObj.langCode,
              "keep the Total File Size less than 1.5MB"
            ),
            statusCode: 500,
          };
        }
      }

      // Attach uploaded files to the corresponding items
      reqObj.items.forEach((item, index) => {
        const attachments = uploadedFilesMap[index];
        if (attachments) {
          item.attachment = attachments;
        }
      });
    }

    if (!Array.isArray(reqObj.prHistory)) {
      reqObj.prHistory = [];
    }

    // Add the current status update to prHistory
    reqObj.prHistory.push({
      updated_By: ObjectID(reqObj.login_user_id), //loginUserId,
      updated_Date: new Date(), // or moment().toDate()
      status: "Created by Store Manager",
    });

    //console.log("checking________________", reqObj);
    reqObj.companyIdf = req.user.companyIdf;
    let newData = await new PurchaseRequest(reqObj).save();

    /* Update numbering group */
    await updateNextNumberGroupId("", "purchase_request", req.user.companyIdf);

    if (newData) {
      //const site = await SiteSchema.findById(ObjectID(newData.site)).populate("roles.store_manager roles.project_manager roles.project_director");
      //console.log("Check Site", site);
      if (newData.status === "pending") {
        await sendPurchaseRequestEmail(newData, accessPath, "pm_level");
      }

      await invalidateEntityList("pr");

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
    //console.error('Error in createData:', error);
    return res.status(error.statusCode || 422).json(
      await Response.errors(
        {
          errors: error.errors || {},
          message: error.message || "An unexpected error occurred",
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

    if (reqObj.status && reqObj.status == "approved") {
      let isVendorExists = await checkVendorCount(req.user.companyIdf);
      if (!isVendorExists) {
        throw {
          errors: [],
          message: responseMessage(reqObj.langCode, "VENDOR_NOT_EXISTS"),
          statusCode: 412,
        };
      }
    }

    // Process file uploads
    if (req.files && req.files.length > 0) {
      const bucketName = "gamerji-dharmendra";
      const uploadedFilesMap = {};

      for (let file of req.files) {
        const fileContent = fs.readFileSync(file.path);
        const fileType =
          mime.lookup(file.originalname) || "application/octet-stream";
        const fileName = `${uuidv4()}-${file.originalname}`;
        const params = {
          Bucket: bucketName,
          Key: `uploads/${fileName}`,
          Body: fileContent,
          ContentType: fileType,
        };

        try {
          const s3UploadResult = await s3.upload(params).promise();
          fs.unlinkSync(file.path); // Remove the temporary file

          const fieldName = file.fieldname;
          const match = fieldName.match(/items\[(\d+)\]\[attachment\]/);
          if (match) {
            const itemIndex = match[1];
            if (!uploadedFilesMap[itemIndex]) {
              uploadedFilesMap[itemIndex] = [];
            }
            uploadedFilesMap[itemIndex].push(s3UploadResult.Location);
          }
        } catch (uploadError) {
          //console.error('S3 upload error:', uploadError);
          throw {
            errors: [],
            message: responseMessage(reqObj.langCode, "FILE_UPLOAD_FAILED"),
            statusCode: 500,
          };
        }
      }

      //console.log("Here checking all the file", reqObj);

      // Attach uploaded files to the corresponding items
      reqObj.items.forEach((item, index) => {
        const attachments = uploadedFilesMap[index];
        if (attachments) {
          item.attachment = (item.attachment || []).concat(attachments);
        }
      });
    }

    if (reqObj.status === "revised") {
      reqObj.items.forEach((item, index) => {
        const attachments = item.attachment || []; // Get attachments or default to empty array
        const fileLinks = item.file || []; // Get the file links or default to empty array

        // Merge the existing attachments with the new ones from uploadedFilesMap and fileLinks
        item.attachment = [...attachments, ...fileLinks];
      });
    }

    const existingPR = await PurchaseRequest.findOne({ _id: reqObj._id, companyIdf: req.user.companyIdf }).lean();

    let prHistory = Array.isArray(existingPR.prHistory)
      ? [...existingPR.prHistory]
      : [];
    // Add the current status update to prHistory
    let historyEntry = {};
    //console.log(reqObj);

    if (
      existingPR.local_purchase === "yes" &&
      reqObj.purchaseRateApproval &&
      reqObj.purchaseRateApproval?.status === "approved"
    ) {
      //console.log("check if we r getting here");
      historyEntry = {
        updated_By: ObjectID(reqObj.login_user_id),
        updated_Date: new Date(),
        status: `Rate Approved by purchase department`,
      };
    } else if (
      existingPR.local_purchase === "yes" &&
      reqObj.purchaseRateApproval &&
      reqObj.purchaseRateApproval?.status === "rejected"
    ) {
      //console.log("check if we r getting here or not_--------");
      historyEntry = {
        updated_By: ObjectID(reqObj.login_user_id),
        updated_Date: new Date(),
        status: `Rate Rejected by purchase department`,
      };

      reqObj.status = "rejected";
    } else if (reqObj.status === "revised") {
      historyEntry = {
        updated_By: ObjectID(reqObj.login_user_id),
        updated_Date: new Date(),
        status: "Revised by Store Manager",
      };
    } else if (reqObj.PM_approvedBy !== "" && reqObj.status === "pending") {
      historyEntry = {
        updated_By: ObjectID(reqObj.login_user_id),
        updated_Date: new Date(),
        status: "Approved by Project Manager",
      };
    } else if (reqObj.PM_approvedBy === "" && reqObj.status !== "pending") {
      historyEntry = {
        updated_By: ObjectID(reqObj.login_user_id),
        updated_Date: new Date(),
        status: `${reqObj.status} by Project Manager`,
      };
    } else if (reqObj.status === "approved") {
      historyEntry = {
        updated_By: ObjectID(reqObj.login_user_id),
        updated_Date: new Date(),
        status: `Approved by Project Director`,
      };
    } else if (
      reqObj.PM_approvedBy !== "" &&
      reqObj.PD_approvedBy === "" &&
      reqObj.status !== "pending"
    ) {
      historyEntry = {
        updated_By: ObjectID(reqObj.login_user_id),
        updated_Date: new Date(),
        status: `${reqObj.status} by Project Director`,
      };

      reqObj.PM_approvedBy = "";
    } else if (reqObj.PD_approvedBy !== "" && reqObj.status === "revise") {
      historyEntry = {
        updated_By: ObjectID(reqObj.login_user_id),
        updated_Date: new Date(),
        status: `${reqObj.status} by Purchase Department`,
      };

      reqObj.PM_approvedBy = "";
      reqObj.PD_approvedBy = "";
    }

    prHistory.push(historyEntry);
    reqObj.prHistory = prHistory;

    let requestedData = { ...reqObj, ...{ updated_by: loginUserId } };

    let updatedData = await PurchaseRequest.findOneAndUpdate(
      {
        _id: ObjectID(reqObj._id),
        companyIdf: req.user.companyIdf,
      },
      { $set: requestedData },
      {
        new: true,
      }
    );

    if (updatedData) {
      if (
        updatedData.status === "pending" &&
        updatedData.PM_approvedBy !== ""
      ) {
        await sendPurchaseRequestEmail(updatedData, accessPath, "pd_level");
      } else if (
        updatedData.status === "revise" &&
        updatedData.PM_approvedBy === ""
      ) {
        await sendRevisionPREmail(updatedData, accessPath, "pm_level");
      } else if (
        updatedData.status === "revise" &&
        updatedData.PM_approvedBy !== ""
      ) {
        await sendRevisionPREmail(updatedData, accessPath, "pd_level");
      } else if (updatedData.status === "revised") {
        await sendPurchaseRequestEmail(updatedData, accessPath, "revised");
      } else if (
        updatedData.status === "rejected" &&
        updatedData.pm_approvedDate === ""
      ) {
        await sendPurchaseRequestDetailsEmail(
          updatedData,
          accessPath,
          "pm_level_reject"
        );
      } else if (
        updatedData.status === "rejected" &&
        updatedData.pm_approvedDate !== ""
      ) {
        await sendPurchaseRequestDetailsEmail(
          updatedData,
          accessPath,
          "pd_level_reject"
        );
      } else if (updatedData.status === "approved") {
        await sendPurchaseRequestDetailsEmail(
          updatedData,
          accessPath,
          "approved"
        );
      }

      if (
        updatedData.status &&
        updatedData.status == "approved" &&
        updatedData.local_purchase === "no"
      ) {
        //console.log("check if we r getting here");
        await addRateApproval(
          {
            ...updatedData.toObject(),
          },
          reqObj.langCode,
          loginUserId
        );
      } else if (
        updatedData.status &&
        updatedData.status == "approved" &&
        updatedData.local_purchase === "yes" &&
        updatedData.purchaseRateApproval.status === "approved"
      ) {
        await addLocalPurchaseOrder(
          {
            ...updatedData.toObject(),
          },
          reqObj.langCode,
          loginUserId
        );
      }

      await invalidateEntityList("pr");
      await invalidateEntity("pr");

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
      await invalidateEntityList("pr");

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
    //console.log(error);
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
      prType,
      local_purchase,
      purchase_request_number,
      filter_by,
      filter_value,
      userId,
      site,
      title,
      startDate,
      endDate,
      itemId,
      PM_approvedBy,
      PD_approvedBy,
    } = req.query;

    const cacheKey = `pr:list:${JSON.stringify(req.query)}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    page = parseInt(page) || 1;
    per_page = parseInt(per_page) || 20;

    // Sorting
    const sort = sort_by
      ? { [sort_by]: sort_order === "desc" ? -1 : 1 }
      : { created_at: -1 };

    // Filters
    const filterRequest = { companyIdf: ObjectID(req.user.companyIdf) };

    if (filter_by && filter_value) filterRequest[filter_by] = filter_value;

    if (purchase_request_number) {
      filterRequest.purchase_request_number = {
        $regex: "^" + purchase_request_number,
        $options: "i",
      };
    }

    if (prType) filterRequest.prType = prType;
    if (local_purchase) filterRequest.local_purchase = local_purchase;

    // Site or User-Site filter
    if (site) {
      filterRequest.site = ObjectID(site);
    } else if (userId) {
      const user = await UserSchema.findById(userId, "role sites").lean();
      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.role !== "superadmin") {
        const siteIds = user.sites?.map((id) => new ObjectID(id)) || [];
        if (!siteIds.length)
          return res
            .status(403)
            .json({ message: "User has no assigned sites" });

        filterRequest.site = { $in: siteIds };
      }
    }

    // Date filter
    if (startDate || endDate) {
      filterRequest.created_at = {};
      if (startDate) {
        filterRequest.created_at.$gte = new Date(
          new Date(startDate).setHours(0, 0, 0, 0)
        );
      }
      if (endDate) {
        filterRequest.created_at.$lte = new Date(
          new Date(endDate).setHours(23, 59, 59, 999)
        );
      }
    }

    // Title filter
    if (title) {
      filterRequest.title = { $regex: title, $options: "i" };
    }

    // Approval filters
    if (PM_approvedBy) {
      filterRequest.PM_approvedBy = "";
      filterRequest.PD_approvedBy = "";
    }
    if (PD_approvedBy) {
      filterRequest.PM_approvedBy = { $ne: "" };
      filterRequest.PD_approvedBy = "";
    }

    const keyword = (itemId ?? "").trim();

    // Common base pipeline
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

    // Data pipeline
    const dataPipeline = [
      ...basePipeline,
      {
        $project: {
          title: 1,

          PM_approvedBy: 1,
          PD_approvedBy: 1,
          pd_approvedDate: 1,
          pm_approvedDate: 1,
          prType: 1,
          date: 1,
          expected_delivery_date: 1,
          purchase_request_number: 1,
          site: 1,
          status: 1,

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
      PurchaseRequest.aggregate(dataPipeline),
      PurchaseRequest.aggregate(countPipeline),
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

async function getDetails(req, res) {
  try {
    let reqObj = req.body;
    let { _id } = req.query;

    if (!_id) {
      //console.log("nehaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "ID_MISSING"),
        statusCode: 412,
      };
    }

    const cacheKey = `pr:details:${_id}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    let recordDetail = await PurchaseRequest.aggregate([
      { $match: { _id: ObjectID(_id), companyIdf: ObjectID(req.user.companyIdf) } },

      { $unwind: "$items" },

      // Lookup for item details
      {
        $lookup: {
          from: "items",
          localField: "items.item_id",
          foreignField: "_id",
          as: "items.itemDetail",
        },
      },

      // Lookup for site details

      {
        $lookup: {
          from: "sites",
          localField: "site",
          foreignField: "_id",
          as: "siteData",
        },
      },
      {
        $lookup: {
          from: "vendors",
          localField: "vendor",
          foreignField: "_id",
          as: "vendorData",
        },
      },

      // Lookup for categories, subcategories, and UOMs
      {
        $lookup: {
          from: "categories",
          localField: "items.itemDetail.category",
          foreignField: "_id",
          as: "items.categoryDetail",
        },
      },
      {
        $lookup: {
          from: "sub_categories",
          localField: "items.itemDetail.sub_category",
          foreignField: "_id",
          as: "items.subCategoryDetail",
        },
      },
      {
        $lookup: {
          from: "uoms",
          localField: "items.itemDetail.uom",
          foreignField: "_id",
          as: "items.uomDetail",
        },
      },
      {
        $lookup: {
          from: "brands",
          localField: "items.itemDetail.brands",
          foreignField: "_id",
          as: "items.brandDetail",
        },
      },

      // Add site data and detailed items to the final output
      {
        $project: {
          title: 1,
          prType: 1,
          handle_by: 1,
          prHistory: 1,
          PM_approvedBy: 1,
          PD_approvedBy: 1,
          pd_approvedDate: 1,
          pm_approvedDate: 1,
          date: 1,
          expected_delivery_date: 1,
          purchase_request_number: 1,
          site: 1,
          local_purchase: 1,
          status: 1,
          remarks: 1,
          vendor: 1,
          vendorItems: 1,
          updated_by: 1,
          created_by: 1,
          created_at: 1,
          updated_at: 1,
          vendors_total: 1,
          purchaseRateApproval: 1,
          siteData: { $arrayElemAt: ["$siteData", 0] },
          vendorData: { $arrayElemAt: ["$vendorData", 0] },
          items: {
            _id: 1,
            item_id: 1,
            qty: 1,
            attachment: 1,
            remark: 1,
            hsnCode: 1,
            item_code: 1,
            specification: 1,
            brandName: 1,
            rate: 1,
            gst: 1,
            freight: 1,

            item_name: { $arrayElemAt: ["$items.itemDetail.item_name", 0] },
            categoryDetail: { $arrayElemAt: ["$items.categoryDetail", 0] },
            subCategoryDetail: {
              $arrayElemAt: ["$items.subCategoryDetail", 0],
            },
            uomDetail: { $arrayElemAt: ["$items.uomDetail", 0] },
            brandDetail: "$items.brandDetail",
          },
        },
      },

      // Group data to include all items in one array
      {
        $group: {
          _id: "$_id",
          title: { $first: "$title" },
          prType: { $first: "$prType" },
          handle_by: { $first: "$handle_by" },
          prHistory: { $first: "$prHistory" },
          PM_approvedBy: { $first: "$PM_approvedBy" },
          PD_approvedBy: { $first: "$PD_approvedBy" },
          pd_approvedDate: { $first: "$pd_approvedDate" },
          pm_approvedDate: { $first: "$pm_approvedDate" },
          date: { $first: "$date" },
          expected_delivery_date: { $first: "$expected_delivery_date" },
          purchase_request_number: { $first: "$purchase_request_number" },
          site: { $first: "$site" },
          siteData: { $first: "$siteData" },
          vendorData: { $first: "$vendorData" },
          local_purchase: { $first: "$local_purchase" },
          status: { $first: "$status" },
          remarks: { $first: "$remarks" },
          vendor: { $first: "$vendor" },
          vendorItems: { $first: "$vendorItems" },
          vendors_total: { $first: "$vendors_total" },
          purchaseRateApproval: { $first: "$purchaseRateApproval" },
          updated_by: { $first: "$updated_by" },
          created_by: { $first: "$created_by" },
          created_at: { $first: "$created_at" },
          updated_at: { $first: "$updated_at" },
          items: { $push: "$items" },
        },
      },
    ]);

    const response = await Response.success(
      recordDetail,
      responseMessage(reqObj.langCode, "SUCCESS")
    );

    await setCache(cacheKey, response, TRANSACTIONAL);

    return res.status(200).json(response);
  } catch (error) {
    //console.log(error,"checking");
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
    let record = await PurchaseRequest.findOneAndDelete({
      companyIdf: req.user.companyIdf,
      _id: ObjectID(_id),
    });

await invalidateEntityList("pr");
      await invalidateEntity("pr");

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

async function getLocalRateApprovals(req, res) {
  try {
    const {
      status,
      site,
      startDate,
      endDate,
      prType,
      title,
      page = 1,
      per_page = 10,
      userId,
    } = req.query;

    // Basic validation for status
    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status provided." });
    }

    const cacheKey = `pr:localRateApprovals:${JSON.stringify(req.query)}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const filter = { "purchaseRateApproval.status": status, companyIdf: ObjectID(req.user.companyIdf) };
    filter.status = { $in: ["pending", "approved"] };

    // Apply site filter if provided
    if (startDate || endDate) {
      filter.updated_at = {};
      if (startDate) {
        filterRequest.updated_at.$gte = new Date(
          new Date(startDate).setHours(0, 0, 0, 0)
        );
      }
      if (endDate) {
        filter.updated_at.$lte = new Date(
          new Date(endDate).setHours(23, 59, 59, 999)
        );
      }
    }

    // Apply title filter if provided
    if (title) {
      filter.title = { $regex: title, $options: "i" };
    }

    filter.local_purchase = "yes";
    if (prType) {
      filter.prType = prType;
    }

    // Apply user ID filter if provided (non-superadmin logic)
    if (site) {
      filter.site = ObjectID(site);
    } else if (userId) {
      const user = await UserSchema.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== "superadmin") {
        const userSites = user.sites || [];

        if (userSites.length > 0) {
          // Convert site IDs to ObjectId format
          const siteIds = userSites.map((id) => new ObjectID(id));

          // If request already has a site filter, use it; otherwise, restrict to user's sites
          if (!filter.site) {
            filter.site = { $in: siteIds };
          }
        } else {
          return resv
            .status(403)
            .json({ message: "User has no assigned sites" });
        }
      }
    }

    // Pagination logic
    const offset = (page - 1) * per_page;
    const limit = parseInt(per_page);

    // Aggregation with $lookup for sites
    const [data, total] = await Promise.all([
      PurchaseRequest.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: "sites",
            localField: "site",
            foreignField: "_id",
            as: "siteData",
          },
        },
        {
          $unwind: {
            path: "$siteData",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            title: 1,
            date: 1,
            site: 1,

            status: 1,
            local_purchase: 1,
            purchase_request_number: 1,
            created_at: 1,
            updated_at: 1,
            "siteData.site_name": 1,
            "siteData.location": 1,
            "purchaseRateApproval.status": 1,
          },
        },
        { $skip: offset },
        { $limit: limit },
        { $sort: { date: -1 } },
      ]),
      PurchaseRequest.countDocuments(filter),
    ]);

    // Send response
    const response = {
      message: "Success",
      data,
      pagination: {
        total,
        current_page: parseInt(page),
        per_page: limit,
        result_start: offset + 1,
        result_end: offset + data.length,
      },
    };

    await setCache(cacheKey, response, TRANSACTIONAL);

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching purchase requests:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function getPurchaseRequestList(req, res) {
  try {
    const { siteId } = req.query;

    // Validate siteId
    if (!siteId) {
      return res
        .status(400)
        .json(
          Response.errors(
            { message: "Site ID is required." },
            { statusCode: 400 }
          )
        );
    }

    // Find all purchase requests for the given site
    const purchaseRequests = await PurchaseRequest.find({
      site: siteId,
      companyIdf: req.user.companyIdf,
      status: { $ne: "draft" }, // Exclude documents with status "draft"
    })
      .sort({ purchase_request_number: -1 })
      .lean();

    const sortedRequests = purchaseRequests.sort(
      (a, b) => b.purchase_request_number - a.purchase_request_number
    );
    // Calculate the next purchase_request_number
    let nextRequestNumber = 1;
    //console.log("checkna______________", purchaseRequests[purchaseRequests.length-1]);
    if (
      purchaseRequests.length > 0 &&
      purchaseRequests[0].purchase_request_number
    ) {
      nextRequestNumber =
        parseInt(purchaseRequests[0].purchase_request_number, 10) + 1;
    }

    // Send response
    return res.status(200).json(
      Response.success(
        {
          nextPurchaseRequestNumber: nextRequestNumber,
        },
        "Purchase requests fetched successfully."
      )
    );
  } catch (error) {
    //console.error("Error fetching purchase requests:", error);
    return res
      .status(500)
      .json(
        Response.errors(
          { message: "Internal Server Error." },
          { statusCode: 500 }
        )
      );
  }
}
async function getLocalPurchaseCounts(req, res) {
  try {
    const {
      userId,
      site,
      itemId,
      prType,
      title,
      startDate,
      endDate,
      purchase_request_number,
    } = req.query;

    const cacheKey = `pr:localCounts:${JSON.stringify(req.query)}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    let filter = { companyIdf: ObjectID(req.user.companyIdf) };

    if (title?.trim()) {
      filter.title = { $regex: title, $options: "i" };
    }

    if (prType?.trim()) {
      filter.prType = prType;
    }

    if (purchase_request_number?.trim()) {
      filter.purchase_request_number = {
        $regex: "^" + purchase_request_number,
        $options: "i",
      };
    }

    // ✅ Fix: consistently use created_at or updated_at
    if (startDate || endDate) {
      filter.updated_at = {};
      if (startDate) {
        filter.updated_at.$gte = new Date(
          new Date(startDate).setHours(0, 0, 0, 0)
        );
      }
      if (endDate) {
        filter.updated_at.$lte = new Date(
          new Date(endDate).setHours(23, 59, 59, 999)
        );
      }
    }

    // Handle site restrictions
    if (site?.trim()) {
      filter.site = new ObjectID(site);
    } else {
      if (!userId) {
        return res
          .status(400)
          .json(
            Response.errors(
              { message: "User ID is required." },
              { statusCode: 400 }
            )
          );
      }

      const user = await UserSchema.findById(userId).lean();
      if (!user) {
        return res
          .status(404)
          .json(
            Response.errors({ message: "User not found." }, { statusCode: 404 })
          );
      }

      if (user.role !== "superadmin") {
        const siteIds = user.sites || [];
        if (siteIds.length === 0) {
          return res
            .status(400)
            .json(
              Response.errors(
                { message: "No sites assigned to this user." },
                { statusCode: 400 }
              )
            );
        }
        filter.site = { $in: siteIds.map((id) => new ObjectID(id)) };
      }
    }

    // Build aggregation pipeline
    let pipeline = [
      { $match: filter },
      {
        $match: {
          local_purchase: "yes",
          purchaseRateApproval: { $exists: true },
        },
      },
    ];

    // If itemId filter provided, only then unwind + lookup
    if (itemId?.trim()) {
      pipeline.push(
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
          $match: {
            "itemDetail.item_name": { $regex: itemId, $options: "i" },
          },
        }
      );
    }

    // Group by purchaseRateApproval.status
    pipeline.push({
      $group: {
        _id: "$purchaseRateApproval.status",
        count: { $sum: 1 },
      },
    });

    const results = await PurchaseRequest.aggregate(pipeline);

    // Prepare counts object with defaults
    const localPurchaseCounts = { pending: 0, approved: 0, rejected: 0 };
    results.forEach((r) => {
      if (localPurchaseCounts.hasOwnProperty(r._id)) {
        localPurchaseCounts[r._id] = r.count;
      }
    });

    const response = Response.success(
      localPurchaseCounts,
      "Local purchase counts fetched successfully."
    );

    await setCache(cacheKey, response, TRANSACTIONAL);

    return res.status(200).json(response);
  } catch (error) {
    return res
      .status(500)
      .json(
        Response.errors(
          { message: "Internal Server Error." },
          { statusCode: 500 }
        )
      );
  }
}

async function getPurchaseRequestStatus(req, res) {
  try {
    const {
      userId,
      site,
      itemId,
      prType,
      title,
      startDate,
      endDate,
      purchase_request_number,
    } = req.query;

    const cacheKey = `pr:statusCounts:${JSON.stringify(req.query)}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    let filter = { companyIdf: ObjectID(req.user.companyIdf) };

    if (title?.trim()) {
      filter.title = { $regex: title, $options: "i" };
    }

    if (prType?.trim()) {
      filter.prType = prType;
    }

    // Handle date filters
    if (startDate || endDate) {
      filter.created_at = {};
      if (startDate) {
        filter.created_at.$gte = new Date(
          new Date(startDate).setHours(0, 0, 0, 0)
        );
      }
      if (endDate) {
        filter.created_at.$lte = new Date(
          new Date(endDate).setHours(23, 59, 59, 999)
        );
      }
    }

    if (purchase_request_number) {
      filter.purchase_request_number = {
        $regex: "^" + purchase_request_number,
        $options: "i",
      };
    }

    // Handle site / user site restriction
    if (site?.trim()) {
      filter.site = new ObjectID(site);
    } else {
      if (!userId) {
        return res
          .status(400)
          .json(
            Response.errors(
              { message: "User ID is required." },
              { statusCode: 400 }
            )
          );
      }

      const user = await UserSchema.findById(userId).lean();
      if (!user) {
        return res
          .status(404)
          .json(
            Response.errors({ message: "User not found." }, { statusCode: 404 })
          );
      }

      if (user.role !== "superadmin") {
        const siteIds = user.sites || [];
        if (siteIds.length === 0) {
          return res
            .status(400)
            .json(
              Response.errors(
                { message: "No sites assigned to this user." },
                { statusCode: 400 }
              )
            );
        }
        filter.site = { $in: siteIds.map((id) => new ObjectID(id)) };
      }
    }

    // Build aggregation
    let pipeline = [{ $match: filter }];

    // If item filter is needed, add minimal $lookup
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

    // Group directly by status
    pipeline.push({
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        pmPending: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "pending"] },
                  { $eq: ["$PM_approvedBy", ""] },
                ],
              },
              1,
              0,
            ],
          },
        },
        pdPending: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "pending"] },
                  { $ne: ["$PM_approvedBy", ""] },
                  { $eq: ["$PD_approvedBy", ""] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    });

    const result = await PurchaseRequest.aggregate(pipeline);

    // Convert into required format
    const statusTypes = [
      "pending",
      "approved",
      "rejected",
      "draft",
      "revise",
      "revised",
      "pending_PM",
      "pending_PD",
    ];

    const statusCounts = statusTypes.reduce((acc, st) => {
      if (st === "pending_PM") {
        acc[st] = result.reduce((sum, r) => sum + (r.pmPending || 0), 0);
      } else if (st === "pending_PD") {
        acc[st] = result.reduce((sum, r) => sum + (r.pdPending || 0), 0);
      } else {
        acc[st] = result.find((r) => r._id === st)?.count || 0;
      }
      return acc;
    }, {});

    const response = Response.success(
      statusCounts,
      "Status counts fetched successfully."
    );

    await setCache(cacheKey, response, TRANSACTIONAL);

    return res.status(200).json(response);
  } catch (error) {
    return res
      .status(500)
      .json(
        Response.errors(
          { message: "Internal Server Error." },
          { statusCode: 500 }
        )
      );
  }
}

async function EditApprovedData(req, res) {
  //console.log("~~~~~~~req.files Start~~~~~~~~~~");
  //console.log(req.files);
  //console.log("~~~~~~~req.files end~~~~~~~~~~");

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

    // Process file uploads
    if (req.files && req.files.length > 0) {
      const bucketName = "gamerji-dharmendra";
      const uploadedFilesMap = {};

      for (let file of req.files) {
        const fileContent = fs.readFileSync(file.path);
        const fileType =
          mime.lookup(file.originalname) || "application/octet-stream";
        const fileName = `${uuidv4()}-${file.originalname}`;
        const params = {
          Bucket: bucketName,
          Key: `uploads/${fileName}`,
          Body: fileContent,
          ContentType: fileType,
        };

        try {
          const s3UploadResult = await s3.upload(params).promise();
          fs.unlinkSync(file.path); // Remove the temporary file

          const fieldName = file.fieldname;
          const match = fieldName.match(/items\[(\d+)\]\[attachment\]/);
          if (match) {
            const itemIndex = match[1];
            if (!uploadedFilesMap[itemIndex]) {
              uploadedFilesMap[itemIndex] = [];
            }
            uploadedFilesMap[itemIndex].push(s3UploadResult.Location);
          }
        } catch (uploadError) {
          //console.error('S3 upload error:', uploadError);
          throw {
            errors: [],
            message: responseMessage(reqObj.langCode, "FILE_UPLOAD_FAILED"),
            statusCode: 500,
          };
        }
      }

      //console.log("Here checking all the file", reqObj);

      // Attach uploaded files to the corresponding items
      reqObj.items.forEach((item, index) => {
        const attachments = uploadedFilesMap[index];
        if (attachments) {
          item.attachment = (item.attachment || []).concat(attachments);
        }
      });
    }

    reqObj.items.forEach((item, index) => {
      const attachments = item.attachment || []; // Get attachments or default to empty array
      const fileLinks = item.file || []; // Get the file links or default to empty array

      // Merge the existing attachments with the new ones from uploadedFilesMap and fileLinks
      item.attachment = [...attachments, ...fileLinks];
    });

    const existingPR = await PurchaseRequest.findOne({ _id: reqObj._id, companyIdf: req.user.companyIdf }).lean();

    let prHistory = Array.isArray(existingPR.prHistory)
      ? [...existingPR.prHistory]
      : [];
    // Add the current status update to prHistory

    let historyEntry = {
      updated_By: ObjectID(reqObj.login_user_id),
      updated_Date: new Date(),
      status: `Revised by SuperAdmin`,
    };

    prHistory.push(historyEntry);
    reqObj.prHistory = prHistory;

    let requestedData = { ...reqObj, ...{ updated_by: loginUserId } };

    let updatedData = await PurchaseRequest.findOneAndUpdate(
      {
        _id: ObjectID(reqObj._id),
        companyIdf: req.user.companyIdf,
      },
      { $set: requestedData },
      {
        new: true,
      }
    );

    if (updatedData) {
      await sendEditedApprovedPREmail(updatedData, accessPath);
      if (
        updatedData.status &&
        updatedData.status == "approved" &&
        updatedData.local_purchase === "no"
      ) {
        await RateApprovalSchema.deleteOne({
          site: ObjectID(updatedData.site),
          purchase_request_number: updatedData.purchase_request_number,
          companyIdf: req.user.companyIdf,
        });

        await addRateApproval(
          {
            ...updatedData.toObject(),
          },
          reqObj.langCode,
          loginUserId
        );
      } else if (
        updatedData.status &&
        updatedData.status == "approved" &&
        updatedData.local_purchase === "yes"
      ) {
        await addLocalPurchaseOrder({
          ...updatedData.toObject(),
        });
      }

     await invalidateEntityList("pr");
      await invalidateEntity("pr");

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

async function RejectApprovedPR(req, res) {
  const { id, login_user_id } = req.body;

  //console.log(id, login_user_id, "Reject Approved PR Request");
  try {
    // Check if the Purchase Request exists
    const purchaseRequest = await PurchaseRequest.findOne({ _id: ObjectID(id), companyIdf: req.user.companyIdf });
    if (!purchaseRequest) {
      return res.status(404).json({ message: "Purchase Request not found." });
    }

    // Check if the Rate Approval exists and its purchase_request_numbers are blank
    const rateApproval = await RateApprovalSchema.findOne({
      purchase_request_id: ObjectID(id),
      companyIdf: req.user.companyIdf,
    });
    if (
      rateApproval &&
      Array.isArray(rateApproval.purchase_request_numbers) &&
      rateApproval.purchase_request_numbers.length > 0
    ) {
      return res.status(400).json({
        message:
          "Cannot reject. Rate Approval has non-blank purchase_request_numbers.",
      });
    }

    // Check for linked Purchase Orders if Rate Approval exists
    if (rateApproval) {
      const purchaseOrders = await PurchaseOrderSchema.find({
        rate_approval_id: ObjectID(rateApproval._id),
        companyIdf: req.user.companyIdf,
      });
      const hasNonBlankOrders = purchaseOrders.some(
        (po) =>
          (Array.isArray(po.purchase_request_numbers) &&
            po.purchase_request_numbers.length > 0) ||
          (Array.isArray(po.rate_Approvals) && po.rate_Approvals.length > 0)
      );

      if (hasNonBlankOrders) {
        return res.status(400).json({
          message:
            "Cannot reject. At least one linked Purchase Order has non-blank purchase_request_numbers or rate_Approvals.",
        });
      }

      // Mark all linked Purchase Orders as rejected if they exist
      await PurchaseOrderSchema.updateMany(
        { rate_approval_id: rateApproval._id, companyIdf: req.user.companyIdf },
        { status: "rejected" }
      );

      // Mark the Rate Approval as rejected
      rateApproval.status = "rejected";
      await rateApproval.save();
    }

    const existingPR = await PurchaseRequest.findOne({ _id: id, companyIdf: req.user.companyIdf }).lean();

    let prHistory = Array.isArray(existingPR.prHistory)
      ? [...existingPR.prHistory]
      : [];
    // Add the current status update to prHistory

    let historyEntry = {
      updated_By: ObjectID(login_user_id),
      updated_Date: new Date(),
      status: `Rejected by SuperAdmin`,
    };

    prHistory.push(historyEntry);
    //reqObj.prHistory = prHistory;

    // Update the status of the Purchase Request to rejected

    await PurchaseRequest.updateOne(
      { _id: id, companyIdf: req.user.companyIdf },
      { $set: { status: "rejected", prHistory: prHistory } }
    );

    await invalidateEntityList("pr");
      await invalidateEntity("pr");

    res.status(200).json({
      message:
        "Purchase Request, related Rate Approval, and all linked Purchase Orders rejected successfully.",
    });
  } catch (error) {
    console.error("Error rejecting Purchase Request:", error);
    res.status(500).json({ message: "Internal server error." });
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

//Send Email Function for Sending Approval Emails for pending & Revised PRs

async function sendPurchaseRequestEmail(newData, accessPath, level) {
  try {
    const site = await SiteSchema.findById(ObjectID(newData.site)).populate(
      "roles.store_manager roles.project_manager roles.project_director"
    );
    const users = await getUsersBySiteId(ObjectID(newData.site));

    const notificationTypes = {
      pm_level: "RR_approval_project_manager",
      pd_level: "RR_approval_project_director",
      revised: "PR_revised",
    };

    const filteredEmails = users
      .filter((user) => user.notifications?.includes(notificationTypes[level]))
      .map((user) => user.email);

    if (filteredEmails.length === 0) {
      //console.log("No users found with the required permissions.");
      return;
    }

    const receipent =
      level === "pm_level" || level === "revised"
        ? site.roles?.project_manager?.name || "Project Manager"
        : site.roles?.project_director?.name || "Project Director";

    const emailContent = {
      pm_level: `<p>{storeInchargeName} has submitted purchase request- <strong>{purchaseRequestNumber}</strong>, for your approval.</p>`,
      pd_level: `<p>Purchase request- <strong>{purchaseRequestNumber}</strong>, has been Approved by Project Manager, waiting for your final approval.</p>`,
      revised: `<p>{storeInchargeName} has submitted the Revised purchase request- <strong>{purchaseRequestNumber}</strong>, for your approval.</p>`,
    };

    const formattedDate = (date) =>
      date
        ? new Date(date).toLocaleDateString("en-GB").replace(/\//g, "-")
        : "N/A";

    const payload = {
      subject: `Purchase Request - ${newData.purchase_request_number} for ${site.site_name}, Awaiting Your Approval`,
      to: filteredEmails,
      cc: [],
      htmlContent: `
        <p>Dear {projectManagerName},</p>
        ${emailContent[level] || ""}
        <p>Here are the request details:</p>
        <ul>
          <li><strong>RR Category:</strong> {rrCategory}</li>
          <li><strong>Requested Date:</strong> {requestedDate}</li>
          <li><strong>Purchase Type:</strong> {purchaseType}</li>
          <li><strong>Local Purchase:</strong> {localpurchase}</li>
          ${
            level === "revised"
              ? `<li><strong>Revised by Store Manager:</strong> {updatedDate}</li>`
              : ""
          }
          ${
            level === "pd_level"
              ? `<li><strong>Approved by Project Manager:</strong> {updatedDate}</li>`
              : ""
          }
          <li><strong>Project Location:</strong> {projectLocation}</li>
        </ul>
        <p>To review the request and take action, <a href='{resetLink}'>Click Here</a></p>
        <p>If revisions or rejection are necessary, please provide your comments or reasons.</p>
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
      `,
      variables: {
        purchaseRequestNumber: newData.purchase_request_number,
        purchaseType: newData.prType || "N/A",
        localpurchase: newData.local_purchase || "N/A",
        projectManagerName: receipent,
        storeInchargeName: site.roles?.store_manager?.name || "Store Incharge",
        rrCategory: newData.title || "N/A",
        requestedDate: formattedDate(newData.created_at),
        updatedDate: formattedDate(newData.updated_at),
        projectLocation: site.site_name || "N/A",
        resetLink: `${accessPath}/procurement/update/${newData._id}`,
      },
    };

    //console.log("Checking email payload:", payload);
    const { subject, to, cc, htmlContent, variables } = payload;
    await sendEmailsInBatches(subject, to, cc, htmlContent, variables);
  } catch (error) {
    console.error("Error sending purchase request email:", error);
  }
}

//Send Email Function for Sending Reject/Approved RR Emails with details Link

async function sendPurchaseRequestDetailsEmail(newData, accessPath, level) {
  try {
    const site = await SiteSchema.findById(ObjectID(newData.site)).populate(
      "roles.store_manager roles.project_manager roles.project_director"
    );
    const users = await getUsersBySiteId(ObjectID(newData.site));

    const notificationMapping = {
      pm_level_reject: "PR_revise_reject_PM",
      pd_level_reject: "PR_revise_reject_PD",
      approved: "RR_approved",
    };

    const filteredEmails = users
      .filter((user) =>
        user.notifications?.includes(notificationMapping[level])
      )
      .map((user) => user.email);

    if (!filteredEmails.length) {
      //console.log("No users found with the required permissions.");
      return;
    }

    const emailContent = {
      pm_level_reject: `<p>Purchase request- <strong>{purchaseRequestNumber}</strong> has been Rejected by the Project Manager.</p>`,
      pd_level_reject: `<p>Purchase request- <strong>{purchaseRequestNumber}</strong> has been Rejected by the Project Lead.</p>`,
      approved: `<p>Purchase request- <strong>{purchaseRequestNumber}</strong> has been Approved by the Project Lead.</p>`,
    };

    const roleNames = {
      pm_level_reject: site.roles?.project_manager?.name || "Project Manager",
      pd_level_reject: site.roles?.project_director?.name || "Project Lead",
      approved: site.roles?.project_director?.name || "Project Lead",
    };

    const formatDate = (date) =>
      date
        ? new Date(date).toLocaleDateString("en-GB").replace(/\//g, "-")
        : "N/A";

    const payload = {
      subject: `Purchase Request - ${newData.purchase_request_number} for ${site.site_name},has been ${newData.status} `,
      to: filteredEmails,
      cc: [],
      htmlContent: `
        <p>Dear User,</p>
        ${emailContent[level] || ""}
        <p>Here are the request details:</p>
        <ul>
          <li><strong>RR Category:</strong> {rrCategory}</li>
          <li><strong>Requested Date:</strong> {requestedDate}</li>
          <li><strong>Project Location:</strong> {projectLocation}</li>
           <li><strong>Purchase Type:</strong> {purchaseType}</li>
          <li><strong>Local Purchase:</strong> {localpurchase}</li>
          ${
            level.includes("reject")
              ? `<li><strong>Rejected by:</strong> {roleName}</li> <li><strong>Rejected on:</strong> {updatedDate}</li>`
              : ""
          }
          ${
            level === "approved"
              ? `<li><strong>Approved by:</strong> {roleName}</li> <li><strong>Approved on:</strong> {updatedDate}</li>`
              : ""
          }
        </ul>
        <p>To review the request and download RR, <a href='{resetLink}'>Click Here</a></p>
        
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
      `,
      variables: {
        purchaseRequestNumber: newData.purchase_request_number,
        purchaseType: newData.prType || "N/A",
        localpurchase: newData.local_purchase || "N/A",
        roleName: roleNames[level],
        rrCategory: newData.title || "N/A",
        requestedDate: formatDate(newData.created_at),
        updatedDate: formatDate(newData.updated_at),
        projectLocation: site.site_name || "N/A",
        resetLink: `${accessPath}/procurement/details/${newData._id}`,
      },
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

//Send Email Function for Sending Revision RR Emails with Revise Screen Link

async function sendRevisionPREmail(newData, accessPath, level) {
  try {
    const site = await SiteSchema.findById(ObjectID(newData.site)).populate(
      "roles.store_manager roles.project_manager roles.project_director"
    );

    const users = await getUsersBySiteId(ObjectID(newData.site));

    // Notification mapping for filtering emails
    const notificationMapping = {
      pm_level: "PR_revise_reject_PM",
      pd_level: "PR_revise_reject_PD",
    };

    const filteredEmails = users
      .filter((user) =>
        user.notifications?.includes(notificationMapping[level])
      )
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

    // Email content
    const revisionMessage =
      level === "pm_level"
        ? `<p>${revisionDetails.projectManagerName} has submitted purchase request- <strong>${revisionDetails.purchaseRequestNumber}</strong>, for your revision.</p>`
        : `<p>${revisionDetails.projectDirectorName} has submitted purchase request- <strong>${revisionDetails.purchaseRequestNumber}</strong>, for your revision.</p>`;

    const htmlContent = `
      <p>Dear ${revisionDetails.storeInchargeName},</p>
      ${revisionMessage}
      <p>Here are the request details:</p>
      <ul>
        <li><strong>RR Category:</strong> ${revisionDetails.rrCategory}</li>
        <li><strong>Requested Date:</strong> ${
          revisionDetails.requestedDate
        }</li>
         <li><strong>Project Location:</strong> ${
           revisionDetails.projectLocation
         }</li>
         <li><strong>Purchase Type:</strong> {purchaseType}</li>
          <li><strong>Local Purchase:</strong> {localpurchase}</li>
        ${
          level === "pm_level"
            ? `<li><strong>Revision Request By Project Manager:</strong> ${revisionDetails.projectManagerName}</li>`
            : `<li><strong>Revision Request By Project Director:</strong> ${revisionDetails.projectDirectorName}</li>`
        }
       
        <li><strong>Revision Requested On:</strong> ${
          revisionDetails.updatedDate
        }</li>
        <li><strong>RR Revision Remarks:</strong> ${
          revisionDetails.remarks
        }</li>
      </ul>
      <p>To revise the request and take action, <a href='${
        revisionDetails.resetLink
      }'>Click Here</a></p>
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
      subject: `Purchase Request - ${revisionDetails.purchaseRequestNumber} for ${site.site_name}, waiting for Revision`,
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

async function sendEditedApprovedPREmail(newData, accessPath) {
  try {
    const site = await SiteSchema.findById(ObjectID(newData.site)).populate(
      "roles.store_manager roles.project_manager roles.project_director"
    );

    const users = await getUsersBySiteId(ObjectID(newData.site));

    // Notification mapping for filtering emails

    const filteredEmails = users
      .filter((user) => user.notifications?.includes("PR_edited_by_superadmin"))
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
      resetLink: `${accessPath}/procurement/details/${newData._id}`,
    };

    // Email content

    const htmlContent = `
      <p>Dear User,</p>
     <p>As requested, purchase request- <strong>${revisionDetails.purchaseRequestNumber}</strong>, has been revised and necessary changes are made by the SuperAdmin.</p>
        
      <p>Here are the request details:</p>
      <ul>
        <li><strong>RR Category:</strong> ${revisionDetails.rrCategory}</li>
        <li><strong>Requested Date:</strong> ${revisionDetails.requestedDate}</li>
         <li><strong>Project Location:</strong> ${revisionDetails.projectLocation}</li>
         <li><strong>Purchase Type:</strong> {purchaseType}</li>
          <li><strong>Local Purchase:</strong> {localpurchase}</li>
        <li><strong>Revised by:</strong> SuperAdmin</li>
         
       
        <li><strong>Revision Updated On:</strong> ${revisionDetails.updatedDate}</li>
        <li><strong>RR Revision Remarks:</strong> ${revisionDetails.remarks}</li>
      </ul>
     <p>To review the request and download RR, <a href='{resetLink}'>Click Here</a></p>
     
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
      subject: `Purchase Request - ${revisionDetails.purchaseRequestNumber} for ${site.site_name}, revised & Updated by SuperAdmin`,
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

function removeDuplicateFields(source, base) {
  const result = {};

  for (const key in source) {
    // Always keep _id
    if (key === "_id") {
      result._id = source._id;
      continue;
    }

    if (key === "status") {
      result.status = source.status;
      continue;
    }

    // Skip unwanted fields from comparison
    if (["__v", "mergedPR"].includes(key)) continue;

    // Only add field if it's different from base
    const isDifferent =
      JSON.stringify(source[key]) !== JSON.stringify(base[key]);
    if (isDifferent) {
      result[key] = source[key];
    }
  }

  // Always retain prHistory if present
  if (source.prHistory) {
    result.prHistory = source.prHistory;
  }

  return result;
}

async function getPRWithLinkedData(req, res) {
  try {
    let { _id } = req.query;
    _id = new mongoose.Types.ObjectId(_id);

    const cacheKey = `pr:linked:${_id.toString()}`;

    // 🔹 TRY CACHE FIRST
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const purchaseRequestAgg = await PurchaseRequest.aggregate([
      { $match: { _id: _id, companyIdf: ObjectID(req.user.companyIdf) } },
      {
        $lookup: {
          from: "sites",
          localField: "site",
          foreignField: "_id",
          as: "siteData",
        },
      },

      {
        $lookup: {
          from: "vendors",
          localField: "vendor",
          foreignField: "_id",
          as: "vendorData",
        },
      },
      { $unwind: { path: "$siteData", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "items",
          localField: "items.item_id",
          foreignField: "_id",
          as: "items.itemDetail",
        },
      },
      {
        $unwind: {
          path: "$items.itemDetail",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "items.itemDetail.category",
          foreignField: "_id",
          as: "items.categoryDetail",
        },
      },
      {
        $unwind: {
          path: "$items.categoryDetail",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "sub_categories",
          localField: "items.itemDetail.sub_category",
          foreignField: "_id",
          as: "items.subCategoryDetail",
        },
      },
      {
        $unwind: {
          path: "$items.subCategoryDetail",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "uoms",
          localField: "items.itemDetail.uom",
          foreignField: "_id",
          as: "items.uomDetail",
        },
      },
      {
        $lookup: {
          from: "brands",
          localField: "items.itemDetail.brands",
          foreignField: "_id",
          as: "items.brandDetail",
        },
      },
      {
        $unwind: { path: "$items.uomDetail", preserveNullAndEmptyArrays: true },
      },
      {
        $group: {
          _id: "$_id",
          title: { $first: "$title" },
          prType: { $first: "$prType" },
          handle_by: { $first: "$handle_by" },
          PM_approvedBy: { $first: "$PM_approvedBy" },
          PD_approvedBy: { $first: "$PD_approvedBy" },
          pm_approvedDate: { $first: "$pm_approvedDate" },
          pd_approvedDate: { $first: "$pd_approvedDate" },
          purchaseRateApproval: { $first: "$purchaseRateApproval" },
          date: { $first: "$date" },
          expected_delivery_date: { $first: "$expected_delivery_date" },
          purchase_request_number: { $first: "$purchase_request_number" },
          site: { $first: "$site" },
          siteData: { $first: "$siteData" },
          local_purchase: { $first: "$local_purchase" },
          vendor: { $first: "$vendor" },
          status: { $first: "$status" },
          new_request: { $first: "$new_request" },
          remarks: { $first: "$remarks" },
          prHistory: { $first: "$prHistory" },
          vendorItems: { $first: "$vendorItems" },
          vendors_total: { $first: "$vendors_total" },
          vendorData: { $first: "$vendorData" },
          created_at: { $first: "$created_at" },
          updated_at: { $first: "$updated_at" },
          created_by: { $first: "$created_by" },
          updated_by: { $first: "$updated_by" },
          items: {
            $push: {
              item_id: "$items.item_id",
              item_code: "$items.item_code",
              specification: "$items.specification",
              hsnCode: "$items.hsnCode",
              qty: "$items.qty",
              attachment: "$items.attachment",
              remark: "$items.remark",
              uom: "$items.uom",
              brandName: "$items.brandName",
              rate: "$items.rate",
              gst: "$items.gst",
              freight: "$items.freight",
              itemDetail: "$items.itemDetail",
              categoryDetail: "$items.categoryDetail",
              subCategoryDetail: "$items.subCategoryDetail",
              uomDetail: "$items.uomDetail",
              brandDetail: "$items.brandDetail",
            },
          },
        },
      },
    ]);

    if (!purchaseRequestAgg.length) {
      return res.status(404).json({ message: "Purchase Request not found" });
    }

    const purchaseRequest = purchaseRequestAgg[0];

    // -------------------------------------------
    // Rate Approval & Purchase Order Fetch
    // -------------------------------------------

    const baseFilter = {
      companyIdf: req.user.companyIdf,
      $or: [
        { purchase_request_id: _id },
        { mergedPR: { $elemMatch: { purchase_request_id: _id } } },
      ],
    };

    const poFilter = {
      companyIdf: req.user.companyIdf,
      site: purchaseRequest.site,
      $or: [
        { purchase_request_number: purchaseRequest.purchase_request_number },
        { mergedPR: { $elemMatch: { purchase_request_id: _id } } },
      ],
    };

    const rateApprovalsRaw = await RateApprovalSchema.find(baseFilter).lean();
    const purchaseOrdersRaw = await PurchaseOrderSchema.find(poFilter).lean();
    const DMROrderRaw = await DMROrderSchema.find(poFilter).lean();

    console.log("DMR Orders Raw:", DMROrderRaw);

    const rateApprovals = rateApprovalsRaw.map((doc) =>
      removeDuplicateFields(doc, purchaseRequest)
    );
    const purchaseOrders = purchaseOrdersRaw.map((doc) =>
      removeDuplicateFields(doc, purchaseRequest)
    );
    const DMROrders = DMROrderRaw.map((doc) =>
      removeDuplicateFields(doc, purchaseRequest)
    );

    // -------------------------------------------
    // HISTORY MERGING + SORTING + ENRICHING
    // -------------------------------------------

    const getTimestamp = (entry) =>
      new Date(
        entry.updated_at ||
          entry.updatedAt ||
          entry.created_at ||
          entry.createdAt ||
          0
      );

    const sortHistoryByDateDesc = (arr) =>
      arr.sort((a, b) => getTimestamp(b) - getTimestamp(a));

    const purchaseRequestHistory = sortHistoryByDateDesc(
      purchaseRequest.prHistory || []
    );
    const rateApprovalHistory = sortHistoryByDateDesc(
      rateApprovalsRaw.flatMap((ra) => ra.prHistory || [])
    );
    const purchaseOrderHistory = sortHistoryByDateDesc(
      purchaseOrdersRaw.flatMap((po) => po.prHistory || [])
    );

    const DMROrderHistory = sortHistoryByDateDesc(
      DMROrderRaw.flatMap((dm) => dm.prHistory || [])
    );

    const mergedHistory = [
      ...purchaseRequestHistory,
      ...rateApprovalHistory,
      ...purchaseOrderHistory,
      ...DMROrderHistory,
    ]
      .filter(
        (entry, index, self) =>
          index ===
          self.findIndex((e) => JSON.stringify(e) === JSON.stringify(entry))
      )
      .sort((a, b) => getTimestamp(b) - getTimestamp(a));

    // -------------------------------------------
    // ENRICH updated_By WITH USER NAME
    // -------------------------------------------

    const allUserIds = [
      ...purchaseRequestHistory,
      ...rateApprovalHistory,
      ...purchaseOrderHistory,
      ...DMROrderHistory,
    ]
      .map((h) => h.updated_By)
      .filter(Boolean);

    const uniqueUserIds = [...new Set(allUserIds.map((id) => id.toString()))];

    const usersMap = {};
    if (uniqueUserIds.length) {
      const users = await UserSchema.find({ _id: { $in: uniqueUserIds } })
        .select("name")
        .lean();
      users.forEach((u) => {
        usersMap[u._id.toString()] = u.name;
      });
    }

    const enrichHistory = (arr) =>
      arr.map((entry) => ({
        ...entry,
        updated_By_name: entry.updated_By
          ? usersMap[entry.updated_By.toString()] || null
          : null,
      }));

    // -------------------------------------------
    // FINAL RESPONSE
    // -------------------------------------------

    const responsePayload = {
      purchaseRequest,
      rateApprovals,
      purchaseOrders,
      DMROrders,
      histories: {
        purchaseRequestHistory: enrichHistory(purchaseRequestHistory),
        rateApprovalHistory: enrichHistory(rateApprovalHistory),
        purchaseOrderHistory: enrichHistory(purchaseOrderHistory),
        DMROrderHistory: enrichHistory(DMROrderHistory),
        mergedHistory: enrichHistory(mergedHistory),
      },
    };

    // 🔹 SAVE TO CACHE
    await setCache(cacheKey, responsePayload, 900);

    return res.json(responsePayload);
  } catch (err) {
    console.error("getPRWithLinkedData error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}
