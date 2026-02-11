/**
 * Utility Controller
 * Provides utility functions used across the application including:
 * - Number group ID generation and management
 * - Rate approval operations
 * - Vendor and location-based queries
 * - Purchase order creation (regular and local)
 * - Activity logging
 * - File download operations (ZIP archives for quotations, credit notes, DMR documents)
 * - Dashboard count calculations
 * - AWS S3 file operations
 */

"use strict";

const ObjectID = require("mongodb").ObjectID;
const creditNoteSchema = require("../../models/CreditNote");
const NumberingGroupSchema = require("../../models/NumberGroup");
const RateApprovalSchema = require("../../models/RateApproval");
const DmrPurchaseOrderSchema = require("../../models/DmrPurchaseOrder");
const dmrEntry = require("../../models/dmrEntry");
const PurchaseOrderSchema = require("../../models/PurchaseOrder");
const SiteSchema = require("../../models/Site");
const ItemSchema = require("../../models/Item");
const VendorSchema = require("../../models/Vendor");
const UOMSchema = require("../../models/Uom");
const gstSchema = require("../../models/Gst");
const UserSchema = require("../../models/User");
const axios = require("axios");
const archiver = require("archiver");
const fs = require("fs");
const path = require("path");
const AWS = require("aws-sdk");
const mime = require("mime-types");
const { v4: uuidv4 } = require("uuid");
const util = require("util");
const unlinkFile = util.promisify(fs.unlink);

const User = require("../../models/User");
const Site = require("../../models/Site");
const Vendor = require("../../models/Vendor");
const Item = require("../../models/Item");
const Organisation = require("../../models/Organisation");
const {
  getCache,
  setCache,
  invalidateEntity,
  invalidateEntityList,
} = require("../../utils/cache");
const { DASHBOARD } = require("../../libs/cacheConfig");
require('dotenv')


// const {  updateNextNumberGroupId } = require('./utils/helpers');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const ProjectActivityDataSchema = require("../../models/ProjectActivityData");
const ProjectSchema = require("../../models/Project");
const _ = require("lodash");
const RecentActivity = require("../../models/recentActivity");
const {
  billingAddress,
  mailContentHeader,
  mailContent,
  termsConsition,
} = require("../../libs/constant");
require("dotenv").config();
const sendEmailsInBatches = require("../../emails/sendEmail");

module.exports = {
  getNextNumberGroupId,
  updateNextNumberGroupId,
  addRateApproval,
  checkVendorCount,
  getVendorListByLocation,
  updateTotalCumulativeQuantity,
  checkTotalQuantityValidation,
  addPurchaseOrder,
  updateActivityLog,
  addLocalPurchaseOrder,
  DownloadQuotationsZip,
  DownloadCreditZip,
  DownloadCreditZipByPO,
  DownloadDMRDocumentZipByPO,
  getDashboardCounts,
};
const accessPath = process.env.ACCESS_PATH;

/**
 * Generate Next Number Group ID
 * Generates the next sequential number for a given module or number group
 * Used for auto-incrementing document numbers (PR, PO, DMR, etc.)
 * 
 * @param {String} groupId - Number group ID (optional if moduleName provided)
 * @param {String} moduleName - Module name (e.g., "PR", "PO", "DMR") (optional if groupId provided)
 * 
 * @returns {Promise<Number>} Next number in sequence
 */
function getNextNumberGroupId(groupId, moduleName = "") {
  return new Promise(async (resolve, reject) => {
    try {
      let getNumberGroup;

      if (moduleName) {
        getNumberGroup = await NumberingGroupSchema.findOne({
          module: moduleName,
        });
      } else {
        getNumberGroup = await NumberingGroupSchema.findOne({
          _id: ObjectID(groupId),
        });
      }

      if (getNumberGroup) {
        let nextId = getNumberGroup.next_id ? getNumberGroup.next_id : 0;
        nextId = nextId + 1;
        resolve(nextId);
      } else {
        await new NumberingGroupSchema({
          module: moduleName,
          next_id: 1,
        }).save();
        resolve(1);
      }
    } catch (error) {
      //console.log("error", error);
      reject(error);
    }
  });
}

/* Update invoice id for next result */
function updateNextNumberGroupId(groupId, moduleName = "") {
  return new Promise(async (resolve, reject) => {
    try {
      let getNumberGroup;

      if (moduleName) {
        getNumberGroup = await NumberingGroupSchema.findOneAndUpdate(
          { module: moduleName },
          { $inc: { next_id: 1 } }
        );
      } else {
        getNumberGroup = await NumberingGroupSchema.findOneAndUpdate(
          { _id: ObjectID(groupId) },
          { $inc: { next_id: 1 } }
        );
      }

      if (getNumberGroup) {
        resolve(true);
      } else {
        resolve(false);
      }
    } catch (error) {
      reject(error);
    }
  });
}

/* Filter VendorByCategory */
function filterVendorByCategory(vendorList, categoryId) {
  return new Promise(async (resolve, reject) => {
    if (vendorList && vendorList.length > 0) {
      let vendorListData = vendorList.filter((o) => {
        if (o.category.includes(String(categoryId))) {
          return o;
        }
      });
      resolve(vendorListData);
    } else {
      resolve([]);
    }
  });
}

/* Rate approval */
function addRateApproval(dataObj, langCode, login_user_id) {
  //console.log("are we getting dataObj", dataObj);
  return new Promise(async (resolve, reject) => {
    try {
      let cloneData = { ...dataObj };

      let getVendors = await VendorSchema.aggregate([
        {
          $project: {
            vendor_id: "$_id",
            vendor_name: 1,
            category: 1,
          },
        },
        {
          $addFields: {
            item_rate: 0,
            item_subtotal: 0,
            item_total_amount: 0,
          },
        },
        {
          $project: {
            _id: 0,
          },
        },
        { $sort: { _id: -1 } },
      ]);

      let vendorTotal = [];

      delete cloneData._id;
      delete cloneData.items;
      cloneData.purchase_request_number = dataObj.purchase_request_number;
      delete cloneData.remark;
      cloneData.prType = dataObj.prType;
      cloneData.order_Type = dataObj.order_Type;
      cloneData.date = dataObj.created_at;
      cloneData.created_at = new Date();
      cloneData.purchase_request_id = dataObj._id;
      cloneData.status = "pending";

      if (cloneData.local_purchase == "no")
        cloneData.stage = "rate_comparitive";
      else cloneData.stage = "rate_approval";

      let itemArray = [];

      if (dataObj.items && dataObj.items.length > 0) {
        let selectedVendorArray = [];

        let promises = dataObj.items.map(async (o, index) => {
          let getItemDetail = await ItemSchema.aggregate([
            { $match: { _id: ObjectID(o.item_id) } },
            {
              $lookup: {
                from: "gsts",
                localField: "gst",
                foreignField: "_id",
                as: "gstDetail",
              },
            },
            {
              $project: {
                item_name: 1,
                item_number: 1,
                item_code: 1,
                specification: 1,
                hsnCode: 1,
                category: 1,
                sub_category: 1,
                uom: 1,
                gst: 1,
                created_at: 1,
                updated_at: 1,
                created_by: 1,
                updated_by: 1,
                gstDetail: { $arrayElemAt: ["$gstDetail", 0] },
              },
            },
            {
              $project: {
                item_name: 1,
                item_number: 1,
                item_code: 1,
                specification: 1,
                hsnCode: 1,
                category: 1,
                sub_category: 1,
                uom: 1,
                gst: 1,
                created_at: 1,
                updated_at: 1,
                created_by: 1,
                updated_by: 1,
                "gstDetail._id": 1,
                "gstDetail.gst_name": 1,
                "gstDetail.gst_percentage": 1,
              },
            },
          ]);

          if (getItemDetail && getItemDetail.length > 0) {
            let filteredVendor = await filterVendorByCategory(
              getVendors,
              getItemDetail[0]["category"]
            );
            selectedVendorArray = selectedVendorArray.concat(filteredVendor);

            return {
              index, // Store the original index
              item: {
                item_id: o.item_id,
                tax: {
                  amount: getItemDetail[0]["gstDetail"]["gst_percentage"],
                  name: getItemDetail[0]["gstDetail"]["gst_name"],
                },
                qty: o.qty,
                item_code: o.item_code,
                specification: o.specification,
                hsnCode: o.hsnCode,
                uom: o.uom,
                attachment: o.attachment,
                remark: o.remark,
                brandName: o.brandName,
                vendors: filteredVendor,
              },
            };
          }
        });

        let resolvedItems = await Promise.all(promises);

        // Sort items by original index and map them to itemArray
        itemArray = resolvedItems
          .filter(Boolean) // Remove undefined entries
          .sort((a, b) => a.index - b.index) // Restore original order
          .map((entry) => entry.item);

        selectedVendorArray = _.uniqBy(selectedVendorArray, "vendor_id");

        if (selectedVendorArray.length > 0) {
          selectedVendorArray.forEach((o) => {
            vendorTotal.push({
              vendor_id: o.vendor_id,
              vendor_name: o.vendor_name,
              brand: "",
              subtotal: 0,
              total_tax: 0,
              freight_charges: 0,
              freight_tax: 0,
              total_amount: 0,
            });
          });
        }

        cloneData.vendors_total = vendorTotal;
        cloneData.items = itemArray;
      }

      //console.log("checking console data", cloneData);

      let getNumber = await getNextNumberGroupId("", "rate_approval");

      cloneData.rate_approval_number = getNumber;

      cloneData.prHistory = [];

      // Add the current status update to prHistory
      cloneData.prHistory.push({
        updated_By: ObjectID(login_user_id), //loginUserId,
        updated_Date: new Date(), // or moment().toDate()
        status: "pending",
        stage: "rate_comparitive",
      });
      let savedData = await new RateApprovalSchema(cloneData).save();
      //console.log("are we getting dataObj", savedData);
      updateNextNumberGroupId("", "rate_approval");

      //const users = await getUsersBySiteId(ObjectID(savedData.site));
      /*const users = await UserSchema.find({ sites: ObjectID(savedData.site)}).lean();
      const filteredEmails = users
          .filter((user) => user.notifications?.includes("RC_creation"))
          .map((user) => user.email);

        //console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>",accessPath)
        if (filteredEmails) {
          
          const payload = {
            subject: ` Create Rate Comparative for Requisition Request ${savedData.purchase_request_number}`,
            to: [filteredEmails],
            cc: [""],
            htmlContent:
              "<h2>Hello, User</h2><p>Click <a href='{resetLink}'>here</a> to create the Rate Comparative for Approved RR.</p>",
            variables: {
              resetLink: `${accessPath}/rate-comparative/update/${savedData._id}`,
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
        } */

         
                 await invalidateEntityList("rc");
                 
      resolve(savedData);
    } catch (error) {
      //console.log("error", error);
      reject(error);
    }
  });
}

function checkVendorCount() {
  return new Promise(async (resolve, reject) => {
    try {
      let getVendors = await VendorSchema.find().lean();

      if (getVendors && getVendors.length > 0) {
        resolve(true);
      } else {
        resolve(false);
      }
    } catch (error) {
      reject(error);
    }
  });
}

function getVendorListByLocation() {
  return new Promise(async (resolve, reject) => {
    try {
      let getVendors = await VendorSchema.find().sort({ _id: 1 }).lean();

      if (getVendors && getVendors.length > 0) {
        resolve(getVendors);
      } else {
        resolve(false);
      }
    } catch (error) {
      reject(error);
    }
  });
}

async function updateTotalCumulativeQuantity(activityData) {
  let getTotalQuantity = await ProjectActivityDataSchema.aggregate([
    {
      $match: { activity_ref_id: activityData.activity_ref_id },
    },
    {
      $group: { _id: null, totalQuantity: { $sum: "$daily_quantity" } },
    },
  ]);

  let totalUsedQuantity = 0;
  if (getTotalQuantity && getTotalQuantity.length > 0) {
    totalUsedQuantity = getTotalQuantity[0]["totalQuantity"];
  }

  let updatedData = await ProjectSchema.updateOne(
    {
      _id: ObjectID(activityData.project_id),
      "locations.structures.activities._id": ObjectID(
        activityData.activity_ref_id
      ),
    },
    {
      $set: {
        "locations.$[].structures.$[].activities.$[xxx].dailyCumulativeTotal":
          totalUsedQuantity,
      },
    },
    {
      arrayFilters: [{ "xxx._id": ObjectID(activityData.activity_ref_id) }],
    }
  );
  return updatedData;
}

async function checkTotalQuantityValidation(activityData, updatedQuantity) {
  try {
    let getprojectData = await ProjectSchema.findOne(
      {
        _id: ObjectID(activityData.project_id),
        "locations._id": ObjectID(activityData.location_ref_id),
      },
      { "locations.$": 1 }
    ).lean();

    let totalQuantity = 0;
    if (
      getprojectData &&
      getprojectData.locations &&
      getprojectData.locations[0] &&
      getprojectData.locations[0]["structures"] &&
      getprojectData.locations[0]["structures"].length > 0
    ) {
      getprojectData.locations[0]["structures"].map((o) => {
        if (
          o._id.toString() == activityData.structure_ref_id.toString() &&
          o.activities &&
          o.activities.length > 0
        ) {
          o.activities.map((o1) => {
            if (o1._id.toString() == activityData.activity_ref_id.toString()) {
              totalQuantity = o1.quantity;
            }
            return o1;
          });
        }
        return o;
      });
    }

    if (totalQuantity <= 0) {
      throw {
        status: 422,
        message: "Please add total quantity in activity",
      };
    }

    let getTotalQuantity = await ProjectActivityDataSchema.aggregate([
      {
        $match: {
          activity_ref_id: activityData.activity_ref_id,
          _id: { $ne: ObjectID(activityData._id) },
        },
      },
      {
        $group: { _id: null, totalQuantity: { $sum: "$daily_quantity" } },
      },
    ]);

    let totalUsedQuantity = 0;
    if (getTotalQuantity && getTotalQuantity.length > 0) {
      totalUsedQuantity = getTotalQuantity[0]["totalQuantity"];
    }

    totalUsedQuantity = totalUsedQuantity + updatedQuantity;

    if (totalUsedQuantity > totalQuantity) {
      throw {
        status: 422,
        message: "Used quantity cannot be greater than total quantity.",
      };
    }

    return {
      totalQuantity: totalQuantity,
      totalUsedQuantity: totalUsedQuantity,
    };
  } catch (error) {
    throw error;
  }
}

/* Rate approval */

function addPurchaseOrder(dataObj, langCode, login_user_id, bodyobj) {
  //console.log("are we getting here?");
  const handle_by = dataObj.handle_by;
  if (dataObj.prType === "Project BOQ (PB)") {
    dataObj.prType = "Project BOQ";
  } else if (dataObj.prType === "Assets (P&M)") {
    dataObj.prType = "Assets";
  } else {
    dataObj.prType = "Site Establishment";
  }
  return new Promise(async (resolve, reject) => {
    try {
      let getSiteData, vendorsAssociatedArray, address;
      //making list vendor wise
      const vendorMap = new Map();
      if (
        dataObj.vendorRatesItemWise &&
        dataObj.vendorRatesItemWise.items.length > 0
      ) {
        const promises = [];

        // Iterate through each item
        for (const item of dataObj.vendorRatesItemWise.items) {
          // Find the item by item_name
          const itemData = await ItemSchema.findOne({
            item_code: item.item_code,
          }).exec();
          if (!itemData) {
            console.error(`Item with name ${item.name} not found.`);
            continue; // Skip if item is not found
          }
          //console.log("itemData", item.vendors);
          // Iterate through each vendor for the current item
          for (const vendorId in item.vendors) {
            const vendorData = item.vendors[vendorId];

            // Find the vendor by vendorId
            //console.log("vendorId", vendorId);
            const vendorObject = await VendorSchema.findById(vendorId).exec();
            if (!vendorObject) {
              console.error(`Vendor with ID ${vendorId} not found.`);
              continue; // Skip if vendor is not found
            }
            //console.log("vendorData", vendorObject);
            // Calculate the subtotal and total for the current item
            const subtotalAmount = vendorData.requiredQty * vendorData.rate;
            const gstAmount = subtotalAmount * (item.gst / 100);
            const totalAmount = subtotalAmount + gstAmount;

            // Prepare the mapped object

            //console.log("check________", dataObj.items);

            // Ensure item.item_id is a string or a number as appropriate
            const itemDataCheck = dataObj.items.find(
              (i) => i._id.toString() === item.item_id.toString()
            );

            if (itemDataCheck) {
              //console.log("Item found:", itemDataCheck);
            } else {
              //console.log("Item not found");
            }

            //console.log(itemDataCheck);
            const vendorItem = {
              item: itemDataCheck, // Using itemData found by item_name

              uom: item.uom,
              prUOM: item.prUOM,
              rateUOM: item.rateUOM,
              gst: item.gst,
              RequiredQuantity: vendorData.requiredQty, // Use item.quantity
              Rate: vendorData.rate,
              remark: item.remark,
              SubTotalAmount: subtotalAmount,
              Freight: 0, // Set freight to 0
              otherCharges: 0,
              Total: totalAmount, // Total = Subtotal + GST
            };

            // Map the item to the vendor in the vendorMap
            //console.log("vendorId", vendorId, vendorItem);
            if (vendorMap.has(vendorId)) {
              vendorMap.get(vendorId).push(vendorItem);
            } else {
              vendorMap.set(vendorId, [vendorItem]);
            }
          }
        }

        //console.log("checking vendorMap", vendorMap);

        //getting site address
        const getSiteData = await SiteSchema.findOne({
          _id: ObjectID(dataObj.site),
        })
          .populate("roles.store_manager") // Only populate store_manager
          .lean();
        //console.log("check it here____________________",getSiteData);
        address = {};
        if (getSiteData) {
          address = {
            company_name: getSiteData.site_name,
            site_code: getSiteData.code,
            gst_number: "",
            pan_card: "",
            contact_person: getSiteData.roles.store_manager.name || "",
            contact_number: getSiteData.roles.store_manager.phone || "",
            email: getSiteData.roles.store_manager.email || "",
            ...getSiteData.address,
          };
        }

        //geting vendorList
        let vendorsList = await VendorSchema.find({}).lean();
        vendorsAssociatedArray = {};
        if (vendorsList && vendorsList.length > 0) {
          let allVendorsPromise = vendorsList.map(async (obj) => {
            vendorsAssociatedArray[obj._id] = obj;
            return obj;
          });
          let allVendorsPromiseResp = await Promise.all(allVendorsPromise);
        }
      }
      // Iterate over key-value pairs
      //creating po
      //console.log("getting here?");
      let allorders = [];
      let count = 0;
      let siteDetails = {};
      if (dataObj.local_purchase == "yes") {
        //console.log("check getting here?");
        const localPurchaseOrders = await PurchaseOrderSchema.countDocuments({
          site: dataObj.site,
          local_purchase: "yes",
        });
        bodyobj.Pocount = localPurchaseOrders + 1;
        siteDetails = await SiteSchema.findById(ObjectID(dataObj.site));
      }

      //console.log("dataObj.vendorRatesItemWise", vendorMap);

      for (const [vendor_id, item] of vendorMap.entries()) {
        //console.log(vendor_id);
        // console.log(item);
        let getPoNo = 0;

        if (dataObj.local_purchase === "yes") {
          const poNumber = `LOC/${
            siteDetails.code
          }/${getCurrentFinancialYear()}/${formatToFourDigits(
            bodyobj.Pocount + count
          )}`;
          getPoNo = poNumber;
        } else {
          const poCount = Number(bodyobj.Pocount) + Number(count);
          // let getPoNo=bodyobj.po_number;
          getPoNo = poCount;
        }

        count++;
        //console.log("GEtPoNo+++++++++++++++++", getPoNo);

        let order = {
          po_number: getPoNo,
          order_Type: dataObj.order_Type,
          //billing_cycle: dataObj.billing_cycle,
          open_order: dataObj.open_order || "no",
          purchase_request_id: dataObj.purchase_request_id,
          rate_approval_numbers: dataObj.rate_approval_numbers,
          purchase_request_numbers: dataObj.purchase_request_numbers,
          mergedPR: dataObj.mergedPR,
          rate_approval_id: dataObj._id,
          purchase_request_number: dataObj.purchase_request_number,
          vendor_files: dataObj.files,
          date: dataObj.date,
          poStartDate: "",
          //totalVendors: dataObj.vendors_total.length,
          due_date: "",
          prType: dataObj.prType,
          title: dataObj.title,
          site: dataObj.site,
          approved_by: handle_by,
          local_purchase: dataObj.local_purchase,
          status: "pending",
          remarks: "",
          compareBy: dataObj.compareBy,
          created_by: dataObj.updated_by,
          updated_by: dataObj.updated_by,
          billing_address: billingAddress,
          delivery_address: address,
          vendor_message_header: mailContentHeader,
          vendor_message: mailContent,
          terms_condition: termsConsition,
        };

        if (bodyobj.isRevised) order["status"] = "revise";

        if (dataObj.vendorRatesItemWise.totals[vendor_id]) {
          const vendorTotals = dataObj.vendorRatesItemWise.totals[vendor_id];

          order.vendors_total = {
            gstAmount: vendorTotals.gstAmount || 0,
            subTotal: vendorTotals.totalAmount || 0,
            total: vendorTotals.grandTotal || 0,
            GSTDetails: { type: "NO GST", GST: vendorTotals.gstAmount || 0 },
            Vendor: vendor_id,
            category: null,
            subCategory: null,
            freightGST: vendorTotals.freightGst,
            freight: vendorTotals.freight || 0,
            otherChargesGST: vendorTotals.otherChargesGst,
            otherCharges: vendorTotals.otherCharges || 0,
            otherChargesTotal:
              (vendorTotals.otherCharges || 0) +
              ((vendorTotals.otherCharges * vendorTotals.otherChargesGst) /
                100 || 0),

            freightTotal:
              (vendorTotals.freight || 0) +
              ((vendorTotals.freight * vendorTotals.freightGst) / 100 || 0), // Freight total = freight + freightGst
          };
        } else {
          // If vendorId is not found in totals, initialize with zero values
          order.vendors_total = {
            gstAmount: 0,
            subTotal: 0,
            total: 0,
            Vendor: vendorId,
            category: null,
            subCategory: null,
            freightTotal: 0,
            otherCharges: 0,
          };
        }

        order.items = item;
        delete order.vendors_total.items;
        if (vendorsAssociatedArray && vendorsAssociatedArray[vendor_id]) {
          order["vendor_detail"] = vendorsAssociatedArray[vendor_id];
        }

        order.prHistory = [];

        // Add the current status update to prHistory
        order.prHistory.push({
          updated_By: ObjectID(login_user_id), //loginUserId,
          updated_Date: new Date(), // or moment().toDate()
          status: "pending",
        });

        //console.log("check order details", order);
        allorders.push(order);
      }

      if (allorders && allorders.length > 0) {
        let savedData = await PurchaseOrderSchema.insertMany(allorders);
      }
        
      await invalidateEntity("PO");
      await invalidateEntityList("PO");
      resolve(allorders);
    } catch (error) {
      reject(error);
    }
  });
}

function updateActivityLog(description) {
  return new Promise(async (resolve, reject) => {
    try {
      let recentActivity = new RecentActivity({
        description: description,
      });
      recentActivity = await recentActivity.save();

      resolve(recentActivity);
    } catch (error) {
      reject(error);
    }
  });
}

async function fetchItemById(req) {
  // Assuming you have a model or database function to get item details
  return ItemSchema.findById(_id).exec(); // Returns a promise
}

async function addLocalPurchaseOrder(input, langCode, login_user_id) {
  if (input.prType === "Project BOQ (PB)") {
    input.prType = "Project BOQ";
  } else if (input.prType === "Assets (P&M)") {
    input.prType = "Assets";
  } else {
    input.prType = "Site Establishment";
  }
  console.log("checking ID", input._id);
  // Fetch and validate data
  const siteDetails = await SiteSchema.findById(ObjectID(input.site));
  const vendorDetails = await VendorSchema.findById(ObjectID(input.vendor));
  //console.log("siteDetails", vendorDetails);
  // Generate PO number
  const localPurchaseOrders = await PurchaseOrderSchema.countDocuments({
    site: input.site,
    local_purchase: "yes",
  });
  const poNumber = `${localPurchaseOrders + 1}`;

  const vendor_detail = {
    address: vendorDetails.address,
    contact_person: vendorDetails.vendor_name,
    _id: vendorDetails._id,
    phone_number: vendorDetails.phone_number,
    gst_number: vendorDetails.gst_number,
    pan_number: vendorDetails.pan_number,
    email: vendorDetails.email,
    dialcode: vendorDetails.dialcode,
    payment_terms: vendorDetails.payment_terms,
    terms_condition: vendorDetails.terms_condition,
    vendor_name: vendorDetails.vendor_name,
  };

  let billing_address = {
    code: "",
    company_name: "",
    gst_number: "",
    pan_card: "",
    contact_person: "",
    email: "",
    street_address: "",
    street_address2: "",
    state: "",
    city: "",
    zip_code: "",
    country: "",
  };
  let delivery_address = {
    company_name: siteDetails?.site_name,
    site_code: siteDetails?.code,
    gst_number: "",
    pan_card: "",
    contact_person: siteDetails?.store_manager,
    contact_number: siteDetails?.store_manager_phone_number,
    email: siteDetails?.site_manager_email,
    street_address: siteDetails?.address?.street_address,
    street_address2: siteDetails?.address?.street_address2,
    state: siteDetails?.address?.state,
    city: siteDetails?.addresss?.city,
    zip_code: siteDetails?.address?.zip_code,
    country: siteDetails?.address?.country,
  };

  // Construct items
  const items = await Promise.all(
    input.items.map(async (item) => {
      const itemDetails = await ItemSchema.findById(
        ObjectID(item.item_id)
      ).lean(); // Fetch item details

      // Fetch related data from Category, SubCategory, and UOM schemas

      const gstDetails = itemDetails?.gst
        ? await gstSchema.findById(ObjectID(itemDetails.gst)).lean()
        : null;
      //console.log("uomDetails__________", gstDetails);
      // Combine all details into a single object
      return {
        item: {
          hsnCode: item.hsnCode,
          brandName: item.brandName,
          itemCode: item.item_code,
          item_id: item.item_id,
          remark: item.remark,
          specification: item.specification,
          qtyLeft: item.qty,
          _id: item._id,
          tax: gstDetails,
        },

        RequiredQuantity: item.qty,
        uom: item.uom,
        freight: 0,
        otherCharges: 0,
        Rate: parseFloat(item.rate),
        gst: item.gst,

        itemId: item.item_id,
        SubTotalAmount: parseFloat(item.rate) * item.qty,
        Total:
          parseFloat(item.rate) * item.qty +
          (parseFloat(item.rate) * item.qty * item.gst) / 100,
      };
    })
  );

  // Construct vendors total
  //console.log(vendor_detail);
  const vendors_total = {
    gstAmount: input.vendors_total.gstAmount,
    freightTotal: input.vendors_total.freightTotal,
    freightGST: input.vendors_total.freightGST,
    freight: input.vendors_total.freight,
    subTotal: input.vendors_total.subTotal,
    total: input.vendors_total.total,
    otherChargesTotal: input.vendors_total.otherChargesTotal,
    otherChargesGST: input.vendors_total.otherChargesGST,
    otherCharges: input.vendors_total.otherCharges,
    vendorId: input.vendors_total.Vendor,
    Vendor: input.vendor,
  };

  // Return formatted purchase order object
  let newPurchaseOrder = {
    po_number: poNumber,

    order_Type: input.order_Type,
    purchase_request_number: input.purchase_request_number,
    purchase_request_id: ObjectID(input._id),
    date: new Date(),
    prType: input.prType,
    title: input.title,
    site: input.site,
    approved_by: input.PD_approvedBy || null,
    localPurchase: input.local_purchase === "yes",
    vendor: input.vendor,
    handleBy: input.handle_by,
    status: "pending",
    billing_address,
    delivery_address,
    vendor_detail: vendor_detail,
    poStartDate: new Date(),
    poDate: new Date(),
    due_date: new Date(input.expected_delivery_date),
    remarks: input.remarks !== "null" ? input.remarks : null,
    vendor_message_header: mailContentHeader,
    vendor_message: mailContent,
    terms_condition: termsConsition,
    items,
    vendors_total,

    createdAt: new Date(input.created_at.$date),
    updatedAt: new Date(input.updated_at.$date),
  };

  //console.log("newPurchaseOrder", newPurchaseOrder.vendor_detail);
  newPurchaseOrder = addGSTDetails(newPurchaseOrder);

  newPurchaseOrder.prHistory = [];

  // Add the current status update to prHistory
  newPurchaseOrder.prHistory.push({
    updated_By: ObjectID(login_user_id), //loginUserId,
    updated_Date: new Date(), // or moment().toDate()
    status: "pending",
  });
  try {
    // Save the purchase order

    const PurchaseOrder = await PurchaseOrderSchema.create(newPurchaseOrder);
     await invalidateEntityList("PO_STATUS_COUNT");
    await invalidateEntity("PO");
    await invalidateEntityList("PO");
    //console.log("Purchase Order saved successfully:", PurchaseOrder);
    /* let sendData = {
      ...newPurchaseOrder,
      purchase_type: "local_purchase",
      DMR_number: `${poNumber}/DMR`,
    }; */

    /*(const users = await UserSchema.find({ sites: ObjectID(PurchaseOrder.site)}).lean();
      const filteredEmails = users
          .filter((user) => user.notifications?.includes("rate_approved"))
          .map((user) => user.email);

        //console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>",accessPath)
        if (filteredEmails) {
          
          const payload = {
            subject: ` Create Purchase Order for Local Requisition Request ${PurchaseOrder.purchase_request_number}`,
            to: [filteredEmails],
            cc: [""],
            htmlContent:
              "<h2>Hello, User</h2><p>Click <a href='{resetLink}'>here</a> to create the Purchase Order for Approved Local RR.</p>",
            variables: {
              resetLink: `${accessPath}/purchase-order/update/${PurchaseOrder._id}`,
            },
          };

          console.log("checking email payload", payload);

          const { subject, to, cc, htmlContent, variables } = payload;
          await sendEmailsInBatches(
            subject,
            to,
            cc || [],e
            htmlContent,
            variables
          );
        }*/
    //console.log("Purchase Order saved successfully:", PurchaseOrder);
    /* if (sendData.hasOwnProperty("status")) {
      delete sendData.status; // Delete the status key if it exists
    } */
  } catch (error) {
    //console.error("Error saving Purchase Order:", error.message);
    throw error;
  }
}

// Function to get the current financial year in YY-YY format
function getCurrentFinancialYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // Months are zero-based in JS
  let startYear, endYear;

  if (month >= 4) {
    // If month is April (4) or later, financial year starts this year
    startYear = year % 100;
    endYear = (year + 1) % 100;
  } else {
    // If month is before April, financial year started last year
    startYear = (year - 1) % 100;
    endYear = year % 100;
  }

  return `${startYear.toString().padStart(2, "0")}-${endYear
    .toString()
    .padStart(2, "0")}`;
}

// Function to format a number to 4 digits
function formatToFourDigits(number) {
  return number.toString().padStart(4, "0");
}

function addGSTDetails(poDetails) {
  // Extract the first two digits of the billing company's GST number
  const billingGST = poDetails.billing_address.gst_number || "";
  const billingGSTStateCode = billingGST.replace(/\s+/g, "").slice(0, 2);

  // Define default GST structure if vendor GST is missing
  const defaultGST = {
    type: "Default",
    CGST: 0,
    SGST: 0,
    IGST: 0,
  };

  // Iterate over vendors_total to add GST details based on conditions

  const vendorGST = poDetails.vendor_detail.gst_number || "";
  const gstRate = poDetails.vendors_total.gstAmount || 0;
  //console.log(gstRate);
  if (vendorGST) {
    const vendorGSTStateCode = vendorGST.replace(/\s+/g, "").slice(0, 2);

    //console.log(billingGSTStateCode, vendorGSTStateCode)
    if (billingGSTStateCode === vendorGSTStateCode) {
      //console.log("here, intraSatate");
      // Intrastate: Split GST into CGST and SGST
      poDetails.vendors_total.GSTDetails = {
        type: "Intrastate",
        CGST: gstRate / 2,
        SGST: gstRate / 2,
        IGST: 0,
      };
      //console.log(poDetails.vendors_total);
    } else {
      //console.log("here, interState");
      // Interstate: Use IGST
      poDetails.vendors_total.GSTDetails = {
        type: "Interstate",
        CGST: 0,
        SGST: 0,
        IGST: gstRate,
      };

      //console.log(poDetails.vendors_total);
    }
  } else {
    // Vendor GST is missing: Use default GST setup
    poDetails.vendors_total.GSTDetails = {
      type: "NO GST",
      GST: gstRate,
    };
    //console.log(poDetails.vendors_total);
  }

  //console.log(poDetails);
  return poDetails;
}

async function getUsersBySiteId(siteId) {
  if (!siteId) {
    console.warn("Invalid siteId provided:", siteId);
    return [];
  }

  try {
    let users = await UserSchema.find({ sites: siteId }).lean();

    //console.log(`Fetched ${users.length} users for siteId: ${siteId}`);

    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    return []; // Returning an empty array instead of throwing an error
  }
}

async function DownloadQuotationsZip(req, res) {
  const { id } = req.query;
  //console.log("id", id);
  try {
    const rateApproval = await RateApprovalSchema.findById(ObjectID(id));
    //console.log("rateApproval", rateApproval);
    if (!rateApproval) {
      return res
        .status(404)
        .json({ message: "RateApproval not found or has no files." });
    }

    const fileObj = rateApproval.files;
    //console.log("fileObj", fileObj);
    const fileEntries = Object.entries(fileObj); // [ [ "106", "url1" ], [ "235", "url2" ] ]

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=attachments.zip"
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    for (let i = 0; i < fileEntries.length; i++) {
      const [key, url] = fileEntries[i];

      try {
        const fileResponse = await axios({
          method: "get",
          url,
          responseType: "stream",
        });

        const urlParts = url.split("/");
        const originalFileName = urlParts[urlParts.length - 1].split("?")[0];

        const fileName = `${i + 1}-${key}-${originalFileName}`;
        archive.append(fileResponse.data, { name: fileName });
      } catch (err) {
        console.error(`Error downloading file ${key}:`, err.message);
        archive.append(`Failed to download file for key ${key}`, {
          name: `error-${key}.txt`,
        });
      }
    }

    archive.finalize();
  } catch (error) {
    console.error("Error generating ZIP:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function DownloadCreditZip(req, res) {
  const { debitNoteId } = req.query;

  try {
    if (!debitNoteId) {
      return res.status(400).json({ message: "debitNoteId is required" });
    }

    // 🔹 Find all credit notes that have this debitNoteId in settledDebitNotes
    const creditNotes = await creditNoteSchema.find({
      "settledDebitNotes.debitNoteId": ObjectID(debitNoteId),
    });

    if (!creditNotes || creditNotes.length === 0) {
      return res
        .status(404)
        .json({ message: "No credit notes found for this debit note." });
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=credit-documents.zip"
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    let fileCount = 0;

    for (const creditNote of creditNotes) {
      if (creditNote.creditNoteDoc) {
        const url = creditNote.creditNoteDoc;
        try {
          const fileResponse = await axios({
            method: "get",
            url,
            responseType: "stream",
          });

          const urlParts = url.split("/");
          const originalFileName = urlParts[urlParts.length - 1].split("?")[0];

          const fileName = `${++fileCount}-${
            creditNote.creditNoteNumber
          }-${originalFileName}`;
          archive.append(fileResponse.data, { name: fileName });
        } catch (err) {
          console.error(
            `Error downloading file for ${creditNote._id}:`,
            err.message
          );
          archive.append(
            `Failed to download file for CreditNote ${creditNote._id}`,
            { name: `error-${creditNote._id}.txt` }
          );
        }
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error("Error generating ZIP:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function DownloadCreditZipByPO(req, res) {
  const { poNumber } = req.query;

  try {
    if (!poNumber) {
      return res.status(400).json({ message: "PO number is required" });
    }

    // 🔹 Find all credit notes that have this debitNoteId in settledDebitNotes
    const creditNotes = await creditNoteSchema.find({
      poNumber: poNumber,
    });

    if (!creditNotes || creditNotes.length === 0) {
      return res
        .status(404)
        .json({ message: "No credit notes found for this debit note." });
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=credit-documents.zip"
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    let fileCount = 0;

    for (const creditNote of creditNotes) {
      if (creditNote.creditNoteDoc) {
        const url = creditNote.creditNoteDoc;
        try {
          const fileResponse = await axios({
            method: "get",
            url,
            responseType: "stream",
          });

          const urlParts = url.split("/");
          const originalFileName = urlParts[urlParts.length - 1].split("?")[0];

          const fileName = `${++fileCount}-${
            creditNote.creditNoteNumber
          }-${originalFileName}`;
          archive.append(fileResponse.data, { name: fileName });
        } catch (err) {
          console.error(
            `Error downloading file for ${creditNote._id}:`,
            err.message
          );
          archive.append(
            `Failed to download file for CreditNote ${creditNote._id}`,
            { name: `error-${creditNote._id}.txt` }
          );
        }
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error("Error generating ZIP:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function DownloadDMRDocumentZipByPO(req, res) {
  const { PONumber } = req.query;

  try {
    if (!PONumber) {
      return res.status(400).json({ message: "PO number is required" });
    }

    // 🔹 Find all credit notes that have this debitNoteId in settledDebitNotes
    const dmrEntries = await dmrEntry.find({
      PONumber: PONumber,
    });

    if (!dmrEntries || dmrEntries.length === 0) {
      return res
        .status(404)
        .json({ message: "No DMR Entries found for this PO." });
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=credit-documents.zip"
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    let fileCount = 0;

    for (const entry of dmrEntries) {
      if (entry.InvoiceOrChallanDoc) {
        const url = entry.InvoiceOrChallanDoc;
        try {
          const fileResponse = await axios({
            method: "get",
            url,
            responseType: "stream",
          });

          const urlParts = url.split("/");
          const originalFileName = urlParts[urlParts.length - 1].split("?")[0];

          const fileName = `${++fileCount}-${
            entry.InvoiceOrChallanDoc
          }-${originalFileName}`;
          archive.append(fileResponse.data, { name: fileName });
        } catch (err) {
          console.error(
            `Error downloading file for ${entry.DMR_No}:`,
            err.message
          );
          archive.append(
            `Failed to download file for DMR Entry ${entry.DMR_No}`,
            { name: `error-${entry.DMR_No}.txt` }
          );
        }
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error("Error generating ZIP:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}


async function getDashboardCounts(req, res) {
  try {
    const cacheKey = "dashboard:counts";

    // 🔹 Check cache first
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        data: cached
      });
    }

    // 🔹 DB calls (unchanged)
    const [
      Users,
      Sites,
      Vendors,
      Items,
      Organisations
    ] = await Promise.all([
      User.countDocuments({}),
      Site.countDocuments({}),
      Vendor.countDocuments({}),
      Item.countDocuments({}),
      Organisation.countDocuments({})
    ]);

    const data = {
      Users,
      Sites,
      Organisations,
      vendors: Vendors,
      Items,
    };

    // 🔹 Store in cache (short TTL)
    await setCache(cacheKey, data, DASHBOARD);

    return res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    console.error("Dashboard count error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard counts"
    });
  }
}




