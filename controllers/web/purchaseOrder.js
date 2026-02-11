/**
 * Purchase Order Controller
 * Handles all operations related to Purchase Orders including:
 * - Creating and updating purchase orders
 * - PO status management and workflow
 * - PO number generation
 * - Vendor-specific PO queries
 * - PO revision and history tracking
 * - Email notifications for PO status changes
 */

const PurchaseOrderSchema = require("../../models/PurchaseOrder");
const VendorSchema = require("../../models/Vendor");
const Response = require("../../libs/response");
const UserSchema = require("../../models/User");
const { responseMessage } = require("../../libs/responseMessages");
const ObjectID = require("mongodb").ObjectID;
const { getVendorListByLocation } = require("./utilityController");
require("dotenv").config();
const sendEmailsInBatches = require("../../emails/sendEmail");
const OrganisationSchema = require("../../models/Organisation");
const SiteSchema = require("../../models/Site");
const ItemSchema = require("../../models/Item");
const Brand = require("../../models/Brand");
const Category = require("../../models/Category");
const SubCategory = require("../../models/SubCategory");
const UOM = require("../../models/Uom");
const GST = require("../../models/Gst");
const {
  getCache,
  setCache,
  deleteCache,
  invalidateEntity,
  invalidateEntityList,
} = require("../../utils/cache");
const { TRANSACTIONAL } = require("../../libs/cacheConfig");

// Export all controller functions
module.exports = {
  getList,
  getDetails,
  updateData,
  deleteData,
  updateRevisedOrder,
  getPoStatusDashboardCount,
  getPendingPOByVendorID,
  getApprovedPOByVendorID,
  getUniqueVendorsBySiteId,
  getPONumber,
  getPoStatusCount,
  getMergedPurchaseOrders,
  getPlantMachineryPONumber,
};

// Access path for email links (from environment)
const accessPath = process.env.ACCESS_PATH;

/**
 * Update Purchase Order
 * PUT /api/web/purchase_order
 * Updates a purchase order and maintains history of status changes
 * Sends email notifications based on status changes
 * 
 * @param {String} req.body._id - Purchase order ID (required)
 * @param {String} req.body.status - New status (revised, pending, approved, etc.)
 * @param {Array} req.body.po_files - PO files uploaded by vendor (optional)
 * @param {String} req.body.login_user_id - User ID making the update
 * @param {Object} req.body - Other purchase order fields to update
 * 
 * @returns {Object} Updated purchase order object
 */
async function updateData(req, res) {
  try {
    let reqObj = req.body;
    let loginUserId = reqObj.login_user_id;
    
    // Validate PO ID
    if (!reqObj._id) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "ID_MISSING"),
        statusCode: 412,
      };
    }

    // Prepare update data with user tracking
    let requestedData = { ...reqObj, ...{ updated_by: loginUserId } };
    
    // Fetch existing PO to get history
    const existingPR = await PurchaseOrderSchema.findById(
      requestedData._id
    ).lean();

    // Get existing history or initialize empty array
    let prHistory = Array.isArray(existingPR.prHistory)
      ? [...existingPR.prHistory]
      : [];
    
    // Create history entry based on status change
    let historyEntry = {};
    
    if (requestedData.status === "revised") {
      historyEntry = {
        po_number: requestedData.po_number,
        updated_By: ObjectID(requestedData.login_user_id),
        updated_Date: new Date(),
        status: "Revised at SuperAdmin Level",
      };
    } else if (requestedData.status === "pending") {
      historyEntry = {
        po_number: requestedData.po_number,
        updated_By: ObjectID(requestedData.login_user_id),
        updated_Date: new Date(),
        status: "Order Details to be Revised by Purchase Department",
      };
    } else if ((requestedData.po_files?.length || 0) > 0) {
      // Vendor has uploaded PO acceptance files
      historyEntry = {
        po_number: requestedData.po_number,
        updated_By: ObjectID(requestedData.login_user_id),
        updated_Date: new Date(),
        status: "Vendor Accepted PO",
      };
    } else {
      // Default status update
      historyEntry = {
        po_number: requestedData.po_number,
        updated_By: ObjectID(requestedData.login_user_id),
        updated_Date: new Date(),
        status: requestedData.status,
      };
    }

    // Add new history entry and attach to update data
    prHistory.push(historyEntry);
    requestedData.prHistory = prHistory;

    let updatedData = await PurchaseOrderSchema.findOneAndUpdate(
      {
        _id: ObjectID(reqObj._id),
      },
      requestedData,
      {
        new: true,
      }
    );

    //console.log("updatedData", updatedData.remarks);

    if (updatedData) {
      /*const users = await UserSchema.find({ sites: ObjectID(updatedData.site)}).lean();
      console.log(updatedData);
      if(updatedData.status === "ApprovalPending"){
      const filteredEmails = users
          .filter((user) => user.notifications?.includes("RO_approval"))
          .map((user) => user.email);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>",filteredEmails)
        if (filteredEmails) {
          
          const payload = {
            subject: `New Requisition Order Created for Requisition Request ${updatedData.purchase_request_number} with RO no. ${updatedData.po_number}`,
            to: [filteredEmails],
            cc: [""],
            htmlContent:
              "<h2>Hello, User</h2><p>Click <a href='{resetLink}'>here</a> to Approve the Requsition Order.</p>",
            variables: {
              resetLink: `${accessPath}/purchase-order/approve/${updatedData._id}`,
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
      else  if(updatedData.status === "approved"){
        const filteredEmails = users
            .filter((user) => user.notifications?.includes("RO_approved"))
            .map((user) => user.email);
  
          console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>",filteredEmails)
          if (filteredEmails) {
            
            const payload = {
              subject: `Approved- Requisition Order for Requisition Request ${updatedData.purchase_request_number} with RO no. ${updatedData.po_number}`,
              to: [filteredEmails],
              cc: [""],
              htmlContent:
                "<h2>Hello, User</h2><p>Requisition Order Approved. Click <a href='{resetLink}'>here</a> to View & Download the Requsition Order.</p>",
              variables: {
                resetLink: `${accessPath}//purchase-order/details/${updatedData._id}`,
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
        else  if(updatedData.status === "revised"){
          const filteredEmails = users
              .filter((user) => user.notifications?.includes("RO_approved"))
              .map((user) => user.email);
    
            console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>",filteredEmails)
            if (filteredEmails) {
              
              const payload = {
                subject: `Revised by SuperAdmin- Requisition Order for Requisition Request ${updatedData.purchase_request_number} with RO no. ${updatedData.po_number}`,
                to: [filteredEmails],
                cc: [""],
                htmlContent:
                  "<h2>Hello, User</h2><p>Requisition Order has been Revised by the SuperAdmin. Click <a href='{resetLink}'>here</a> to View & Download the Requsition Order.</p>",
                variables: {
                  resetLink: `${accessPath}//purchase-order/details/${updatedData._id}`,
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
        else if(updatedData.status === "rejected"){
        
            const filteredEmails = users
                .filter((user) => user.notifications?.includes("RO_approved"))
                .map((user) => user.email);
      
              console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>",filteredEmails)
              if (filteredEmails) {
                
                const payload = {
                  subject: `Rejected- Requisition Order for Requisition Request ${updatedData.purchase_request_number} with RO no. ${updatedData.po_number}`,
                  to: [filteredEmails],
                  cc: [""],
                  htmlContent:
                    "<h2>Hello, User</h2><p>Requisition Order Rejected. Click <a href='{resetLink}'>here</a> to View the Requsition Order.</p>",
                  variables: {
                    resetLink: `${accessPath}//purchase-order/details/${updatedData._id}`,
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

      // Invalidate cache for this PO and PO list
      await invalidateEntity("PO");
      await invalidateEntityList("PO");
      await deleteCache(`PO:details:${reqObj._id}`);


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
    console.log(error);
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
      per_page = 20,
      sort_by = "updated_at",
      sort_order = "desc",
      purchase_type,
      prType,
      list_type, // unused, maybe add condition?
      filter_by,
      purchase_request_number,
      site,
      startDate,
      endDate,
      vendor,
      title,
      userId,
      filter_value,
      stage,
      itemId,
    } = req.query;

    // Pagination + Sorting
    const pageData = Response.validationPagination(page, per_page);
    const sortOrder = sort_order === "desc" ? -1 : 1;
    const sort = { [sort_by]: sortOrder };

    const cacheKey = `PO:LIST:${JSON.stringify(req.query)}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    // Filters
    const filterRequest = {};
    if (filter_by && filter_value) filterRequest[filter_by] = filter_value;
    if (prType) filterRequest.prType = prType;
    if (purchase_type) filterRequest.local_purchase = purchase_type;
    if (stage) filterRequest.stage = stage;
    if (vendor) filterRequest["vendor_detail._id"] = vendor;
    if (site) filterRequest.site = new ObjectID(site);
    if (title) filterRequest.title = { $regex: title, $options: "i" };

    if (purchase_request_number) {
      filterRequest.purchase_request_number = {
        $regex: "^" + purchase_request_number,
        $options: "i",
      };
    }

    // Date filter
    if (startDate || endDate) {
      filterRequest.updated_at = {};
      if (startDate) {
        filterRequest.updated_at.$gte = new Date(
          new Date(startDate).setHours(0, 0, 0, 0)
        );
      }
      if (endDate) {
        filterRequest.updated_at.$lte = new Date(
          new Date(endDate).setHours(23, 59, 59, 999)
        );
      }
    }

    // Site restrictions if no site provided
    if (!site && userId) {
      const user = await UserSchema.findById(userId).lean();
      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.role !== "superadmin") {
        const sites = user.sites || [];
        filterRequest.site = sites.length
          ? { $in: sites.map((id) => new ObjectID(id)) }
          : { $exists: false };
      }
    }

    const keyword = (itemId ?? "").trim();

    // --- Base Pipeline ---
    const basePipeline = [{ $match: filterRequest }];

    // --- Add item filter only if keyword provided ---
    if (keyword) {
      basePipeline.push(
        { $unwind: "$items" },
        {
          $addFields: {
            "items.lookup_item_id": {
              $ifNull: [
                {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$items.item.item_id", null] },
                        { $ne: ["$items.item.item_id", ""] },
                      ],
                    },
                    { $toObjectId: "$items.item.item_id" },
                    "$items.itemId",
                  ],
                },
                "$items.itemId",
              ],
            },
          },
        },
        {
          $lookup: {
            from: "items",
            localField: "items.lookup_item_id",
            foreignField: "_id",
            as: "itemDetail",
          },
        },
        {
          $match: {
            "itemDetail.item_name": { $regex: keyword, $options: "i" },
          },
        },
        {
          $group: { _id: "$_id", doc: { $first: "$$ROOT" } },
        },
        { $replaceRoot: { newRoot: "$doc" } }
      );
    }

    // --- Final Pipeline with facet ---
    const pipeline = [
      ...basePipeline,
      {
        $facet: {
          data: [
            { $sort: sort },
            { $skip: pageData.offset },
            { $limit: pageData.limit },
            {
              $project: {
                po_number: 1,
                date: 1,
                rate_approval_numbers: 1,
                purchase_request_numbers: 1,
                title: 1,
                site: 1,
                local_purchase: 1,
                po_files: 1,
                purchase_request_number: 1,
             
                status: 1,
               
                vendor_detail: 1,
                delivery_address: 1,
              
                created_at: 1,
                updated_at: 1,
              },
            },
          ],
          total: [{ $count: "total" }],
        },
      },
    ];

    const [result] = await PurchaseOrderSchema.aggregate(pipeline);

    const data = result.data || [];
    const total = result.total[0]?.total || 0;

    const response = {
      data,
      total,
      current_page: pageData.page,
      per_page: pageData.limit,
      result_start: pageData.offset + 1,
      result_end: pageData.offset + data.length,
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
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "ID_MISSING"),
        statusCode: 412,
      };
    }

    const cacheKey = `PO:details:${_id}`;

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



    // Step 1: Fetch the PO
    let po = await PurchaseOrderSchema.findOne({ _id: ObjectID(_id) }).lean();
    if (!po) {
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

    // Step 2: Enrich billing address
    if (po.billing_address?.gst_number) {
      const org = await OrganisationSchema.findOne({
        gst_number: po.billing_address.gst_number,
      }).lean();
      if (org) {
        po.billing_address = {
          code: org.code || "",
          company_name: org.companyName || "",
          gst_number: org.gst_number || "",
          pan_card: org.pan_number || "",
          contact_person: org.contact_person + "-" + org.phone_number || "",
          email: org.email || "",
          street_address: org.address.street_address || "",
          street_address2: org.address.street_address2 || "",
          state: org.address.state || "",
          city: org.address.city || "",
          zip_code: org.address.zip_code || "",
          country: org.address.country || "",
        };
      }
    }

    // Step 3: Enrich delivery address
    if (po.delivery_address?.site_code) {
      const site = await SiteSchema.findOne({
        site_code: po.delivery_address.site_code,
      }).lean();
      if (site) {
        po.delivery_address = {
          company_name: site.company_name || "",
          site_code: site.site_code || "",
          gst_number: site.gst_number || "",
          pan_card: site.pan_card || "",
          contact_person: site.contact_person || "",
          contact_number: site.contact_number || "",
          email: site.email || "",
          street_address: site.street_address || "",
          street_address2: site.street_address2 || "",
          state: site.state || "",
          city: site.city || "",
          zip_code: site.zip_code || "",
          country: site.country || "",
        };
      }
    }

    // Step 4: Enrich vendor details
    if (po.vendor_detail?._id) {
      const vendor = await VendorSchema.findOne({
        _id: ObjectID(po.vendor_detail._id),
      }).lean();
      if (vendor) {
        po.vendor_detail = {
          vendor_name: vendor.vendor_name || "",
          address: {
            street_address: vendor.address?.street_address || "",
            street_address2: vendor.address?.street_address2 || "",
            state: vendor.address?.state || "",
            city: vendor.address?.city || "",
            zip_code: vendor.address?.zip_code || "",
            country: vendor.address?.country || "",
          },
          contact_person: vendor.contact_person || "",
          _id: vendor._id.toString(),
          dialcode: vendor.dialcode || "",
          phone_number: vendor.phone_number || [],
          gst_number: vendor.gst_number || "",
          pan_number: vendor.pan_number || "",
          email: vendor.email || [],
          payment_terms: vendor.payment_terms || "",
          terms_condition: vendor.terms_condition || "",
        };
      }
    }

    // Step 5: Enrich items with item details
    if (po.items && Array.isArray(po.items) && po.items.length > 0) {
      const itemIds = po.items.map((it) => ObjectID(it.item.item_id));
      const itemDocs = await ItemSchema.find({ _id: { $in: itemIds } }).lean();
      const categoryIds = [
        ...new Set(itemDocs.map((i) => ObjectID(i.category.toString()))),
      ];

      // Unique SubCategory IDs
      const subCategoryIds = [
        ...new Set(itemDocs.map((i) => ObjectID(i.sub_category.toString()))),
      ];

      // Unique Brand IDs (flatten array of arrays first)
      const brandIds = [
        ...new Set(
          itemDocs.flatMap((i) => i.brands.map((b) => ObjectID(b.toString())))
        ),
      ];

      // Fetch referenced data manually
      const categories = await Category.find({
        _id: { $in: categoryIds },
      }).lean();
      const subCategories = await SubCategory.find({
        _id: { $in: subCategoryIds },
      }).lean();
      const brands = await Brand.find({ _id: { $in: brandIds } }).lean();

      // Create lookup maps
      const categoryMap = Object.fromEntries(
        categories.map((c) => [c._id.toString(), c])
      );
      const subCategoryMap = Object.fromEntries(
        subCategories.map((sc) => [sc._id.toString(), sc])
      );
      const brandMap = Object.fromEntries(
        brands.map((b) => [b._id.toString(), b])
      );

      // Merge enriched data into PO items
      const itemDetailsMap = itemDocs.reduce((map, item) => {
        map[item._id.toString()] = {
          ...item,
          categoryDetail: categoryMap[item.category.toString()] || {},
          subCategoryDetail: subCategoryMap[item.sub_category.toString()] || {},
          brandName: item.brands.map((b) => brandMap[b.toString()] || {}),
        };
        return map;
      }, {});

      po.items = po.items.map((poItem) => {
        const details = itemDetailsMap[poItem.item.item_id] || {};
        return {
          ...poItem,
          item: {
            ...poItem.item,
            item_name: details.item_name || poItem.item.item_name,
            categoryDetail: details.categoryDetail || {},
            subCategoryDetail: details.subCategoryDetail || {},
            uomDetail: details.uom || [],
            brandName: details.brandName || [],
            attachment: details.attachment || poItem.item.attachment,
            gst: details.gst || {},
          },
        };
      });
    }

    // Step 6: Send enriched PO (no DB update)
   await setCache(cacheKey, po, TRANSACTIONAL);

    return res
      .status(200)
      .json(
        await Response.success(po, responseMessage(reqObj.langCode, "SUCCESS"))
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

async function deleteData(req, res) {
  try {
    let reqObj = req.body;
    let { _id } = req.query;
    //console.log(_id);
    if (!_id) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "ID_MISSING"),
        statusCode: 412,
      };
    }
    let record = await PurchaseOrderSchema.findOneAndDelete({
      _id: ObjectID(_id),
    });

    // Invalidate cache for this PO and PO list
    await invalidateEntity("PO");
    await invalidateEntityList("PO");
    await deleteCache(`PO:details:${_id}`);


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

async function updateRevisedOrder(req, res) {
  try {
    const { po_number, remarks, langCode, login_user_id } = req.body;

    if (!po_number || !remarks) {
      throw {
        errors: [],
        message: responseMessage(langCode, "INPUT_MISSING"), // Adjust the message key as per your localization setup
        statusCode: 412,
      };
    }

    // Build the update object
    const updateFields = {
      status: "approved",
      revisionRemarks: remarks, // Store remarks in `revisionRemarks`
      revisionRequestedBy: login_user_id, // Changed from `updated_by` to `revisionRequestedBy`
    };

    // Find and update the document
    const updatedData = await PurchaseOrderSchema.findOneAndUpdate(
      { po_number }, // Query by `po_number`
      updateFields, // Update with `status`, `revisionRemarks`, and `revisionRequestedBy`
      { new: true } // Return the updated document
    );

    // Check if the document was updated

    if (updatedData) {
       await invalidateEntity("PO");
  await invalidateEntityList("PO");
      res
        .status(200)
        .json(
          await Response.success(
            updatedData,
            responseMessage(langCode, "RECORD_UPDATED"),
            req
          )
        );
    } else {
       await invalidateEntity("PO");
  await invalidateEntityList("PO");
      res
        .status(404)
        .json(
          await Response.success(
            {},
            responseMessage(langCode, "NO_RECORD_FOUND"),
            req
          )
        );
    }
  } catch (error) {
    return res.status(error.statusCode || 422).json(
      await Response.errors(
        {
          errors: error.errors || [],
          message: error.message || "An error occurred",
        },
        error,
        req
      )
    );
  }
}

async function getPONumber(req, res) {
  try {
    const { siteId, gst_number, local_purchase } = req.query;
    console.log(req.query);
    if (!siteId) {
      return res.status(400).json({ error: "siteId is required" });
    }

    // Fetch POs that are not pending and match the site
    const poList = await PurchaseOrderSchema.find({
      site: ObjectID(siteId),
      prType: { $ne: "Plant & Machinery" }, // Exclude "Plant & Machinery"
      "billing_address.gst_number": gst_number,
      status: { $ne: "pending" },
    }).select("po_number");

    // Filter only those with pattern: x/x/x/xxxx

    const validPoNumbers = poList
      .map((po) => po.po_number)
      .filter((poNum) => poNum.includes("/")); // basic filter for PO format

    // Extract the last numeric part and sort
    const numericParts = validPoNumbers
      .map((poNum) => {
        // Split by '/' and take the last part
        const lastPart = poNum.split("/").pop().trim();

        // Extract the leading digits before any non-digit character
        const match = lastPart.match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((num) => num !== null)
      .sort((a, b) => a - b);
    console.log("check numeric parts", numericParts);
    let nextPONumber = 1;
    if (numericParts.length > 0) {
      nextPONumber = Math.max(...numericParts) + 1;
    }

    console.log(nextPONumber);

    res.status(200).json({ nextPONumber });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

async function getPlantMachineryPONumber(req, res) {
  try {
    // Fetch POs that are not pending and match the site
    const poList = await PurchaseOrderSchema.find({
      prType: "Plant & Machinery",
      status: { $ne: "pending" },
    }).select("po_number");

    // Filter only those with pattern: x/x/x/xxxx
    const validPoNumbers = poList
      .map((po) => po.po_number)
      .filter((poNum) => /^([^/]+\/){3}\d{4}$/.test(poNum)); // 3 slashes and 4-digit ending

    // Extract last 4 digits and sort
    const numericParts = validPoNumbers
      .map((poNum) => parseInt(poNum.split("/").pop(), 10))
      .filter((num) => !isNaN(num))
      .sort((a, b) => a - b);

    //console.log(numericParts[numericParts.length - 1]);

    const nextPONumber =
      numericParts.length > 0 ? numericParts[numericParts.length - 1] + 1 : 1;

    res.status(200).json({ nextPONumber });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

async function getUniqueVendorsBySiteId(req, res) {
  try {
    const { siteId, prType, order_Type } = req.query;
    //console.log("siteId>>>>>>>>>>>>>>>>>>>>>>", siteId);
    if (!ObjectID(siteId)) {
      return res.status(400).json({ message: "Invalid site ID format" });
    }

    const purchaseOrders = await PurchaseOrderSchema.find(
      {
        site: ObjectID(siteId),
        order_Type: order_Type,
        local_purchase: "no",
        status: { $in: ["pending"] },
        prType: prType,
      },
      "vendor_detail"
    );

    //ApprovalPending

    //console.log("checkingPurchaseOrders>>>>>>>>>>>>>>>>>>>>>>", purchaseOrders);

    // Extract unique vendor IDs
    const vendorIds = new Set();

    // Find all purchase orders matching the given site ID
    purchaseOrders.forEach((order) => {
      if (order.vendor_detail && order.vendor_detail._id) {
        vendorIds.add(order.vendor_detail._id.toString()); // Convert to string to ensure uniqueness
      }
    });

    // Convert Set to an array of ObjectIDs
    const uniqueVendorIds = Array.from(vendorIds).map((id) => new ObjectID(id));
    let uniqueVendorDetails = [];
    if (uniqueVendorIds.length > 0) {
      // Fetch vendor details for unique IDs
      uniqueVendorDetails = await VendorSchema.find({
        _id: { $in: uniqueVendorIds },
      });

      //console.log("Unique Vendor Details:", uniqueVendorDetails);
    } else {
      //console.log("No unique vendors found.");
    }

    res.status(200).json({ uniqueVendorDetails });
  } catch (error) {
    console.error("Error fetching unique vendors:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function getPendingPOByVendorID(req, res) {
  try {
    const { siteId, vendorId, order_Type, prType } = req.query;

    if (!siteId) {
      return res.status(400).json({ error: "siteId is required" });
    }

    let query = {
      site: ObjectID(siteId),
      order_Type: order_Type,
      prType: prType,
      status: { $in: ["pending"] },
      local_purchase: "no",
    };

    if (vendorId) {
      query["vendor_detail._id"] = vendorId;
      // Apply local_purchase filter when vendorId is present
    }

    const purchaseOrders = await PurchaseOrderSchema.find(query);
    //console.log("check purchaseOrders>>>>>>>>>>>>>>>>>>>>>>>>>>>>",purchaseOrders);
    return res.status(200).json({ success: true, data: purchaseOrders });
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getApprovedPOByVendorID(req, res) {
  try {
    const { siteId, vendorId, order_Type, prType } = req.query;

    if (!siteId) {
      return res.status(400).json({ error: "siteId is required" });
    }

    let query = {
      site: ObjectID(siteId),
      order_Type: order_Type,
      prType: prType,
      status: { $in: ["approved", "revised"] },
      local_purchase: "no",
    };

    if (vendorId) {
      query["vendor_detail._id"] = vendorId;
      // Apply local_purchase filter when vendorId is present
    }

    const purchaseOrders = await PurchaseOrderSchema.find(query);
    //console.log("check purchaseOrders>>>>>>>>>>>>>>>>>>>>>>>>>>>>",purchaseOrders);
    return res.status(200).json({ success: true, data: purchaseOrders });
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getPoStatusCount(req, res) {
  try {
    let {
      site,
      title,
      prType,
      vendor,
      userId,
      startDate,
      endDate,
      filter_by,
      filter_value,
      itemId,
      purchase_request_number,
    } = req.query;

     const cacheKey = `PO:STATUS_COUNT:${JSON.stringify(req.query)}`;

    // 🔹 1. CACHE READ
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    let filterRequest = {};

    if (site) {
      filterRequest.site = new ObjectID(site);
    }

    if (purchase_request_number?.trim()) {
      filterRequest.purchase_request_number = {
        $regex: "^" + purchase_request_number,
        $options: "i",
      };
    }

    if (prType?.trim()) {
      filterRequest.prType = prType;
    }

    if (title?.trim()) {
      filterRequest.title = { $regex: title, $options: "i" }; // ✅ partial match
    }

    if (filter_by && filter_value) {
      filterRequest[filter_by] = filter_value;
    }

    if (vendor) {
      filterRequest["vendor_detail._id"] = vendor;
    }

    // User site restrictions
    if (!site && userId) {
      const user = await UserSchema.findById(userId).lean();
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.role !== "superadmin") {
        const userSites = user.sites || [];
        filterRequest.site =
          userSites.length > 0
            ? { $in: userSites.map((id) => new ObjectID(id)) }
            : { $exists: false };
      }
    }

    // Date filter
    if (startDate || endDate) {
      filterRequest.updated_at = {};
      if (startDate) {
        filterRequest.updated_at.$gte = new Date(
          new Date(startDate).setHours(0, 0, 0, 0)
        );
      }
      if (endDate) {
        filterRequest.updated_at.$lte = new Date(
          new Date(endDate).setHours(23, 59, 59, 999)
        );
      }
    }

    const keyword = (itemId ?? "").trim();

    // Build pipeline
    let pipeline = [{ $match: filterRequest }];

    // Only add item filter pipeline if keyword is provided
    if (keyword) {
      pipeline.push(
        { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            "items.lookup_item_id": {
              $ifNull: [
                {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$items.item.item_id", null] },
                        { $ne: ["$items.item.item_id", ""] },
                      ],
                    },
                    { $toObjectId: "$items.item.item_id" },
                    "$items.itemId",
                  ],
                },
                "$items.itemId",
              ],
            },
          },
        },
        {
          $lookup: {
            from: "items",
            localField: "items.lookup_item_id",
            foreignField: "_id",
            as: "itemDetail",
          },
        },
        {
          $match: {
            "itemDetail.item_name": { $regex: keyword, $options: "i" },
          },
        },
        {
          $group: {
            _id: "$_id",
            doc: { $first: "$$ROOT" },
          },
        },
        { $replaceRoot: { newRoot: "$doc" } }
      );
    }

    // Final grouping by local_purchase
    pipeline.push({
      $group: {
        _id: "$local_purchase",
        count: { $sum: 1 },
      },
    });

    const countAggregation = await PurchaseOrderSchema.aggregate(pipeline);

    // Format response with defaults
    let response = { local_purchase: 0, ho_purchase: 0 };
    countAggregation.forEach((item) => {
      if (item._id === "yes") response.local_purchase = item.count;
      if (item._id === "no") response.ho_purchase = item.count;
    });

   const finalResponse = {
      success: true,
      message: "Count fetched successfully",
      data: response,
    };

    // 🔹 2. CACHE WRITE (15 mins)
    await setCache(cacheKey, finalResponse, 900);

    return res.status(200).json(finalResponse);
  } catch (error) {
    return res.status(error.statusCode || 422).json({
      success: false,
      message: error.message,
      errors: error.errors,
    });
  }
}


async function getPoStatusDashboardCount(req, res) {
  try {
    const { userId, site } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    // ---- Cache ----
    const cacheKey = `PO:DASHBOARD_STATUS_COUNT:${JSON.stringify({ userId, site: site || null })}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.status(200).json(cached);

    // ---- Build match criteria ----
    const match = {};

    // If site is given, use it directly
    if (site?.trim()) {
      match.site = new ObjectID(site);
    } else {
      // else apply user's assigned sites (unless superadmin)
      const user = await UserSchema.findById(userId).lean();
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      if (user.role !== "superadmin") {
        const userSites = user.sites || [];
        if (userSites.length === 0) {
          const empty = {
            success: true,
            message: "Count fetched successfully",
            data: {
              pending: 0,
              ApprovalPending: 0,
              approved: 0,
              revised: 0,
              rejected: 0,
            },
          };
          await setCache(cacheKey, empty, 900);
          return res.status(200).json(empty);
        }

        match.site = { $in: userSites.map((id) => new ObjectID(id)) };
      }
    }

    // ---- Aggregate status counts ----
    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: null,
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          pendingApproval: {
            $sum: { $cond: [{ $eq: ["$status", "ApprovalPending"] }, 1, 0] },
          },
          approved: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
          },
          revised: {
            $sum: { $cond: [{ $eq: ["$status", "revised"] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          pending: 1,
          ApprovalPending: 1,
          approved: 1,
          revised: 1,
          rejected: 1,
        },
      },
    ];

    const [counts] = await PurchaseOrderSchema.aggregate(pipeline);

    const finalResponse = {
      success: true,
      message: "Count fetched successfully",
      data: counts || {
        pending: 0,
        ApprovalPending: 0,
        approved: 0,
        revised: 0,
        rejected: 0,
      },
    };

    await setCache(cacheKey, finalResponse, 900); // 15 mins
    return res.status(200).json(finalResponse);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function getMergedPurchaseOrders(req, res) {
  try {
    const { ids, approvedPO, userId } = req.body;
    console.log("Merging POs with IDs:", ids, "Approved PO:", approvedPO);
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ message: 'Invalid or missing "ids" array in request body.' });
    }

    // Fetch all the purchase orders by given IDs
    const purchaseOrders = await PurchaseOrderSchema.find({
      _id: { $in: ids.map((id) => ObjectID(id)) },
    });

    const approvedOrder = await PurchaseOrderSchema.findOne({
      _id: approvedPO,
    });

    if (purchaseOrders.length === 0) {
      return res
        .status(404)
        .json({ message: "No purchase orders found for the given IDs." });
    }

    if (approvedPO && !approvedOrder) {
      return res
        .status(404)
        .json({ message: "Approved PO not found for the given ID." });
    }

    // 5. Build merged PO object
    let savedMergedPO = null;

    if (approvedPO) {
      const mergedPO = mergePurchaseOrders([approvedOrder, ...purchaseOrders]);

      const combinedString = (mergedPO.purchase_request_numbers || []).join(
        ", "
      );

      // Prepare history update
      const prHistoryEntry = {
        updated_By: userId,
        updated_Date: new Date(),
        status: `PO Merged RR - ${combinedString} for PO - ${approvedOrder.po_number} and by Purchase Department`,
      };

      // Build update object
      const updateFields = {
        purchase_request_numbers: mergedPO.purchase_request_numbers, // Updated PR numbers
        rate_Approvals: mergedPO.rate_Approvals,
        mergedPR: mergedPO.mergedPR,
        vendor_files: mergedPO.vendor_files,
        vendors_total: mergedPO.vendors_total,
        items: mergedPO.items,

        // push or replace PR history
        $push: { prHistory: prHistoryEntry },
      };

      // Update the PO instead of creating a new one
      savedMergedPO = await PurchaseOrderSchema.findByIdAndUpdate(
        ObjectID(approvedPO), // THE PO THAT MUST BE UPDATED
        updateFields,
        { new: true } // return updated document
      );
    } else {
      const mergedPO = mergePurchaseOrders(purchaseOrders);
      const combinedString = (mergedPO.purchase_request_numbers || []).join(
        ", "
      );

      mergedPO.prHistory = [
        {
          updated_By: userId,
          updated_Date: new Date(),
          status: `PO Merged for ${combinedString} RR by Purchase Department`,
        },
      ];

      // 6. Remove the _id property for the merged PO to create a new document
      delete mergedPO._id;

      // Create the new merged PO document
      const mergedPODoc = new PurchaseOrderSchema(mergedPO);

      // Save the merged PO document
      savedMergedPO = await mergedPODoc.save();
    }
    // 7. Delete the original POs
    await PurchaseOrderSchema.deleteMany({
      _id: { $in: ids.map((id) => ObjectID(id)) },
    });

  await invalidateEntity("PO");
  await invalidateEntityList("PO");

    return res.status(201).json({
      message: "Purchase orders merged and original POs deleted successfully",
      data: savedMergedPO,
    });
  } catch (error) {
    console.error("Error merging purchase orders:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
}

function mergePurchaseOrders(purchaseOrders) {
  if (!Array.isArray(purchaseOrders) || purchaseOrders.length === 0)
    return null;

  const getPOData = (poEntry) => {
    if (poEntry.doc) {
      return poEntry.doc.toObject ? poEntry.doc.toObject() : poEntry.doc._doc;
    }
    return poEntry.toObject ? poEntry.toObject() : poEntry._doc || poEntry;
  };

  const basePO = getPOData(purchaseOrders[0]);

  const merged = {
    ...basePO,
    items: [],
    po_files: [],
    vendor_files: [],
    purchase_request_numbers: [],
    mergedPR: [],
    vendors_total: [],
    revision: [],
  };

  const vendorTotal = {
    gstAmount: 0,
    freightTotal: 0,
    freightGST: 0,
    freight: 0,
    subTotal: 0,
    total: 0,
    otherChargesTotal: 0,
    otherChargesGST: 0,
    otherCharges: 0,
  };

  let frtGst = 0;
  let OcgGst = 0;
  purchaseOrders.forEach((poEntry) => {
    const po = getPOData(poEntry);

    if (Array.isArray(po.items)) {
      merged.items.push(...po.items);
    }

    if (Array.isArray(po.po_files)) {
      merged.po_files.push(...po.po_files);
    }

    if (Array.isArray(po.vendor_files)) {
      merged.vendor_files.push(...po.vendor_files);
    }

    if (Array.isArray(po.vendors_total)) {
      po.vendors_total.forEach((vendor) => {
        vendorTotal.gstAmount += vendor.gstAmount ?? 0;
        vendorTotal.freightTotal += vendor.freightTotal ?? 0;

        vendorTotal.freightGST = Math.max(
          vendorTotal.freightGST ?? 0,
          vendor.freightGST ?? 0
        );

        vendorTotal.freight += vendor.freight ?? 0;
        vendorTotal.subTotal += vendor.subTotal ?? 0;
        vendorTotal.total += vendor.total ?? 0;
        vendorTotal.otherChargesTotal += vendor.otherChargesTotal ?? 0;

        vendorTotal.otherChargesGST = Math.max(
          vendorTotal.otherChargesGST ?? 0,
          vendor.otherChargesGST ?? 0
        );

        vendorTotal.otherCharges += vendor.otherCharges ?? 0;
      });

      vendorTotal.freightTotal =
        (vendorTotal.freight * vendorTotal.freightGST) / 100 +
        vendorTotal.freight;
      vendorTotal.otherChargesTotal =
        (vendorTotal.otherCharges * vendorTotal.otherChargesGST) / 100 +
        vendorTotal.otherCharges;
    }

    console.log(
      vendorTotal.freightGST,
      vendorTotal.otherChargesGST,
      frtGst++,
      OcgGst++
    );
    merged.purchase_request_numbers = merged.purchase_request_numbers || [];

    if (
      Array.isArray(po.purchase_request_numbers) &&
      po.purchase_request_numbers.length > 0
    ) {
      //console.log("po.purchase_request_numbers", po.purchase_request_numbers);
      merged.purchase_request_numbers.push(...po.purchase_request_numbers);
    } else if (po.purchase_request_number) {
      merged.purchase_request_numbers.push(po.purchase_request_number);
    }

    //console.log("merged.purchase_request_numbers", merged.purchase_request_numbers);
    if (Array.isArray(po.mergedPR) && po.mergedPR.length > 0) {
      merged.mergedPR.push(...po.mergedPR);
    } else if (po.purchase_request_number && po._id) {
      merged.mergedPR.push({
        purchase_request_id: po._id,
        purchase_request_number: po.purchase_request_number,
        date: po.date,
      });
    }
  });

  merged.vendors_total = [vendorTotal];

  merged.vendors_total[0].GSTDetails = basePO.vendors_total[0].GSTDetails;
  merged.vendors_total[0].GSTDetails.GST = vendorTotal.gstAmount;
  merged.vendors_total[0].category = basePO.vendors_total[0].category;
  merged.vendors_total[0].subCategory = basePO.vendors_total[0].subCategory;
  merged.vendors_total[0].Vendor = basePO.vendors_total[0].Vendor;

  merged.purchase_request_numbers = [
    ...new Set(merged.purchase_request_numbers),
  ];

  merged.revision = [
    {
      revisionNo: 0,
      revisionRemarks: "",
      revisionRequested: "",
      revisionDate: new Date(),
      items: merged.items,
      vendors_total: merged.vendors_total,
    },
  ];

  return merged;
}

/*
async function getMergedPurchaseOrders(req, res) {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ message: 'Invalid or missing "ids" array in request body.' });
    }

    // Fetch all the purchase orders by given IDs
    const purchaseOrders = await PurchaseOrderSchema.find({
      _id: { $in: ids.map((id) => ObjectID(id)) },
    });

    if (purchaseOrders.length === 0) {
      return res
        .status(404)
        .json({ message: "No purchase orders found for the given IDs." });
    }

    // 5. Build merged PO object
    const mergedPO = mergePurchaseOrders(purchaseOrders);
    const combinedString = (mergedPO.purchase_request_numbers || []).join(", ");

    mergedPO.prHistory = [
      {
        updated_By: null,
        updated_Date: new Date(),
        status: `PO Merged for ${combinedString} RR by Purchase Department`,
      },
    ];

    // 6. Remove the _id property for the merged PO to create a new document
    delete mergedPO._id;

    // Create the new merged PO document
    const mergedPODoc = new PurchaseOrderSchema(mergedPO);

    // Save the merged PO document
    const savedMergedPO = await mergedPODoc.save();

    // 7. Delete the original POs
    await PurchaseOrderSchema.deleteMany({
      _id: { $in: ids.map((id) => ObjectID(id)) },
    });

    return res.status(201).json({
      message: "Purchase orders merged and original POs deleted successfully",
      data: savedMergedPO,
    });
  } catch (error) {
    console.error("Error merging purchase orders:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
}*/
