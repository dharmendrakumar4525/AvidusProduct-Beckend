/**
 * Web Routes Configuration
 * Defines all API routes for the web application
 * 
 * This file:
 * - Dynamically loads all controllers from controllers/web directory
 * - Configures file upload middleware (Multer)
 * - Defines all API endpoints with their HTTP methods and middleware
 * - All routes are prefixed with /api/web (configured in app.js)
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const middleware = require("../middleware");
const emailCtrl = require(path.resolve(`./controllers/common/email`));
const multer = require("multer");
const uploadimage = multer({ storage: multer.memoryStorage() });

// Object to store all loaded controllers
const controllerObj = {};

/**
 * Multer Configuration for File Uploads
 * Configures file storage for uploaded files
 */
// const multer = require("multer");

// Custom storage configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Store files in uploads/ directory
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // Generate unique filename: fieldname-timestamp.extension
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

// Multer instance with custom storage
const uploadItem = multer({ storage: storage });

// Multer instance with default storage (temporary directory)
const upload = multer({ dest: "uploads/" });

/**
 * Dynamically Load All Controllers
 * Reads all files from controllers/web directory and loads them as controllers
 * Controller names are derived from filenames (without extension)
 */
fs.readdirSync(path.resolve("./controllers/web")).forEach((file) => {
  let name = file.substr(0, file.indexOf("."));
  controllerObj[name] = require(path.resolve(`./controllers/web/${name}`));
});

/**
 * ============================================
 * COMMON ROUTES
 * ============================================
 */

// Email template sending
router.post("/mail/template", middleware.jwtVerify, emailCtrl.sendTemplateFn);

// Dashboard statistics
router.get("/dasboard-stats", middleware.jwtVerify, controllerObj.utilityController.getDashboardCounts);

/**
 * ============================================
 * ABOUT US ROUTES
 * ============================================
 */
router.get("/aboutUs", middleware.jwtVerify, controllerObj.aboutUs.getList);
router.get(
  "/aboutUs/:id",
  middleware.jwtVerify,
  controllerObj.aboutUs.getDetails
);
router.put(
  "/aboutUs/:id",
  middleware.jwtVerify,
  controllerObj.aboutUs.updateData
);
router.post("/aboutUs", middleware.jwtVerify, controllerObj.aboutUs.createData);

/**
 * ============================================
 * MISCELLANEOUS CONFIG ROUTES
 * ============================================
 */

router.get(
  "/miscellaneousConfig",
  middleware.jwtVerify,
  controllerObj.miscellaneousConfig.getList
);
router.get(
  "/miscellaneousConfig/:type",
  middleware.jwtVerify,
  controllerObj.miscellaneousConfig.getDetails
);
router.put(
  "/miscellaneousConfig/:id",
  middleware.jwtVerify,
  controllerObj.miscellaneousConfig.updateData
);
router.post(
  "/miscellaneousConfig",
  middleware.jwtVerify,
  controllerObj.miscellaneousConfig.createData
);

/**
 * ============================================
 * LINE GRAPH ROUTES
 * ============================================
 */
router.get("/lineGraph", middleware.jwtVerify, controllerObj.lineGraph.getList);
router.get(
  "/lineGraph/:id",
  middleware.jwtVerify,
  controllerObj.lineGraph.getDetails
);
router.post(
  "/lineGraph/date-filter",
  middleware.jwtVerify,
  controllerObj.lineGraph.createData
);

/**
 * ============================================
 * MASTER SUB TASK ROUTES
 * ============================================
 */
router.get(
  "/masterSubTasks",
  middleware.jwtVerify,
  controllerObj.masterSubTask.getList
);
router.get(
  "/masterSubTasks/:id",
  middleware.jwtVerify,
  controllerObj.masterSubTask.getDetails
);
router.put(
  "/masterSubTasks/:id",
  middleware.jwtVerify,
  controllerObj.masterSubTask.updateData
);
router.post(
  "/masterSubTasks",
  middleware.jwtVerify,
  controllerObj.masterSubTask.createData
);
router.delete(
  "/masterSubTasks/:id",
  middleware.jwtVerify,
  controllerObj.masterSubTask.deleteById
);
router.delete(
  "/masterSubTasks",
  middleware.jwtVerify,
  controllerObj.masterSubTask.deleteDetails
);

/**
 * ============================================
 * MASTER TASK ROUTES
 * ============================================
 */
router.get(
  "/masterTasks/all-tasks",
  middleware.jwtVerify,
  controllerObj.masterTask.getList
);
router.get(
  "/masterTasks/:id",
  middleware.jwtVerify,
  controllerObj.masterTask.getDetails
);
router.put(
  "/masterTasks/:id",
  middleware.jwtVerify,
  controllerObj.masterTask.updateData
);
router.post(
  "/masterTasks",
  middleware.jwtVerify,
  controllerObj.masterTask.createData
);
router.delete(
  "/masterTasks/:id",
  middleware.jwtVerify,
  controllerObj.masterTask.deleteById
);
router.delete(
  "/masterTasks",
  middleware.jwtVerify,
  controllerObj.masterTask.deleteDetails
);

/**
 * ============================================
 * PERMISSION ROUTES
 * ============================================
 */
router.get(
  "/permissions",
  middleware.jwtVerify,
  controllerObj.permission.getList
);
router.get(
  "/permissions/:id",
  middleware.jwtVerify,
  controllerObj.permission.getDetails
);
router.put(
  "/permissions/:id",
  middleware.jwtVerify,
  controllerObj.permission.updateData
);
router.post(
  "/permissions",
  middleware.jwtVerify,
  controllerObj.permission.createData
);
router.delete(
  "/permissions/:id",
  middleware.jwtVerify,
  controllerObj.permission.deleteById
);

/**
 * ============================================
 * PROJECT ROUTES
 * ============================================
 */
router.get("/projects", middleware.jwtVerify, controllerObj.project.getList);
router.get(
  "/projects/:id",
  middleware.jwtVerify,
  controllerObj.project.getDetails
);
router.post(
  "/projects",
  middleware.jwtVerify,
  controllerObj.project.createData
);
router.put(
  "/projects/updateMoreActivities/:id",
  middleware.jwtVerify,
  controllerObj.project.updateMoreActivityData
);
router.post(
  "/projects/:id",
  middleware.jwtVerify,
  controllerObj.project.postDataById
);
router.put(
  "/projects/update-project/:id",
  middleware.jwtVerify,
  controllerObj.project.updateProject
);
router.put("/projects", middleware.jwtVerify, controllerObj.project.updateData);
router.put(
  "/projects/members/:id",
  middleware.jwtVerify,
  controllerObj.project.updateMenberById
);
router.delete(
  "/projects/:id",
  middleware.jwtVerify,
  controllerObj.project.deleteById
);
router.delete(
  "/projects/List/:id",
  middleware.jwtVerify,
  controllerObj.project.getListById
);

/**
 * ============================================
 * RECENT ACTIVITY ROUTES
 * ============================================
 */
router.get(
  "/recentActivity",
  middleware.jwtVerify,
  controllerObj.recentActivity.getList
);

/**
 * ============================================
 * ROLE ROUTES
 * ============================================
 */

router.get("/roles", middleware.jwtVerify, controllerObj.role.getList);
router.get("/roles/:id", middleware.jwtVerify, controllerObj.role.getDataByID);
router.get(
  "/roles/role/:role",
  middleware.jwtVerify,
  controllerObj.role.getDataByRole
);
router.put("/roles/:id", middleware.jwtVerify, controllerObj.role.updateData);
router.put(
  "/roles/update-perm/:role",
  middleware.jwtVerify,
  controllerObj.role.updatePermData
);
router.post("/roles", middleware.jwtVerify, controllerObj.role.createData);
router.delete(
  "/roles/:id",
  middleware.jwtVerify,
  controllerObj.role.deleteData
);
router.delete("/roles", middleware.jwtVerify, controllerObj.role.deleteList);
router.get(
  "/user/permission",
  middleware.jwtVerify,
  controllerObj.role.getUserPermission
);

/**
 * ============================================
 * TASK ROUTES
 * ============================================
 */
router.get("/tasks", middleware.jwtVerify, controllerObj.task.getList);
router.get("/tasks/:id", middleware.jwtVerify, controllerObj.task.getDataByID);
router.put("/tasks/:id", middleware.jwtVerify, controllerObj.task.updateData);
router.post("/tasks", middleware.jwtVerify, controllerObj.task.createData);
router.delete(
  "/tasks/:id",
  middleware.jwtVerify,
  controllerObj.task.deleteData
);
router.get(
  "/tasks/tasksList/:id",
  middleware.jwtVerify,
  controllerObj.task.getTasksListData
);

/**
 * ============================================
 * USER ROUTES
 * ============================================
 */
router.get("/users", middleware.jwtVerify, controllerObj.user.getList);
router.get("/users/:id", middleware.jwtVerify, controllerObj.user.getDataByID);
router.put("/users/:id", middleware.jwtVerify, controllerObj.user.updateData);
router.post("/users", middleware.jwtVerify, controllerObj.user.createData);
router.post("/users/add-site", middleware.jwtVerify, controllerObj.user.addSiteToUsers);
router.delete(
  "/users/:id",
  middleware.jwtVerify,
  controllerObj.user.deleteData
);
router.delete("/users", middleware.jwtVerify, controllerObj.user.deleteAllData);
router.post("/users/register", controllerObj.user.createUser);
router.post("/users/login", controllerObj.user.loginUser);

/**
 * ============================================
 * SITE STAFF ROUTES
 * ============================================
 */
router.get("/siteStaff", middleware.jwtVerify, controllerObj.siteStaff.getList);
router.get(
  "/siteStaff/:id",
  middleware.jwtVerify,
  controllerObj.siteStaff.getDataByID
);
router.put(
  "/siteStaff",
  middleware.jwtVerify,
  controllerObj.siteStaff.updateData
);
router.post(
  "/siteStaff",
  middleware.jwtVerify,
  controllerObj.siteStaff.createData
);
router.delete(
  "/siteStaff",
  middleware.jwtVerify,
  controllerObj.siteStaff.deleteData
);
router.post(
  "/siteStaff/upload-csv",
  middleware.jwtVerify,
  upload.single("file"),
  controllerObj.siteStaff.uploadSiteStaffCSV
);

/**
 * ============================================
 * CONTRACTOR ROUTES
 * ============================================
 */
router.get(
  "/contractor",
  middleware.jwtVerify,
  controllerObj.contractor.getList
);
router.get(
  "/contractor/:id",
  middleware.jwtVerify,
  controllerObj.contractor.getDataByID
);
router.put(
  "/contractor",
  middleware.jwtVerify,
  controllerObj.contractor.updateData
);
router.post(
  "/contractor",
  middleware.jwtVerify,
  controllerObj.contractor.createData
);
router.delete(
  "/contractor",
  middleware.jwtVerify,
  controllerObj.contractor.deleteData
);
router.post(
  "/contractor/upload-csv",
  middleware.jwtVerify,
  upload.single("file"),
  controllerObj.contractor.uploadContractorCSV
);

/**
 * ============================================
 * SUBTASK ROUTES
 * ============================================
 */
router.get("/subTasks", middleware.jwtVerify, controllerObj.subTask.getList);
router.get(
  "/subTasks/activities/:id",
  middleware.jwtVerify,
  controllerObj.subTask.getActivitesDataByID
);
router.get(
  "/subTasks/:id",
  middleware.jwtVerify,
  controllerObj.subTask.getDataByID
);
router.post(
  "/subTasks",
  middleware.jwtVerify,
  controllerObj.subTask.createData
);
router.put(
  "/subTasks/:id",
  middleware.jwtVerify,
  controllerObj.subTask.updateData
);
router.put(
  "/subTasks/dailyTotalUpdate/:id",
  middleware.jwtVerify,
  controllerObj.subTask.updatedailyTotalUpdateData
);
router.put(
  "/subTasks/dailyTotalUpdate/update/:id",
  middleware.jwtVerify,
  controllerObj.subTask.TotalUpdateData
);
router.put(
  "/subTasks/remarkUpdate/:id",
  middleware.jwtVerify,
  controllerObj.subTask.remarkUpdateData
);
router.put(
  "/subTasks/remarks/:id",
  middleware.jwtVerify,
  controllerObj.subTask.updateRemarkData
);
router.delete(
  "/subTasks/:id",
  middleware.jwtVerify,
  controllerObj.subTask.deleteData
);
router.delete(
  "/subTasks/deleteMany",
  middleware.jwtVerify,
  controllerObj.subTask.deleteManyData
);

/**
 * ============================================
 * CATEGORY ROUTES
 * ============================================
 */
router.get("/category", middleware.jwtVerify, controllerObj.category.getList);
router.get(
  "/category/detail",
  middleware.jwtVerify,
  controllerObj.category.getDetails
);
router.put(
  "/category",
  middleware.jwtVerify,
  controllerObj.category.updateData
);
router.post(
  "/category",
  middleware.jwtVerify,
  controllerObj.category.createData
);
router.delete(
  "/category",
  middleware.jwtVerify,
  controllerObj.category.deleteData
);

/**
 * ============================================
 * SUB CATEGORY ROUTES
 * ============================================
 */
router.get(
  "/subcategory",
  middleware.jwtVerify,
  controllerObj.subCategory.getList
);
router.get(
  "/subcategory/detail",
  middleware.jwtVerify,
  controllerObj.subCategory.getDetails
);
router.put(
  "/subcategory",
  middleware.jwtVerify,
  controllerObj.subCategory.updateData
);
router.post(
  "/subcategory",
  middleware.jwtVerify,
  controllerObj.subCategory.createData
);
router.delete(
  "/subcategory",
  middleware.jwtVerify,
  controllerObj.subCategory.deleteData
);

/**
 * ============================================
 * SITE ROUTES
 * ============================================
 */
router.get("/site", middleware.jwtVerify, controllerObj.site.getList);
router.get("/site/detail", middleware.jwtVerify, controllerObj.site.getDetails);
router.put("/site", middleware.jwtVerify, controllerObj.site.updateData);
router.post("/site", middleware.jwtVerify, controllerObj.site.createData);
router.delete("/site", middleware.jwtVerify, controllerObj.site.deleteData);

/**
 * ============================================
 * ORGANISATION ROUTES
 * ============================================
 */
router.get(
  "/organisation",
  middleware.jwtVerify,
  controllerObj.organisation.getList
);
router.get(
  "/organisation/detail",
  middleware.jwtVerify,
  controllerObj.organisation.getDetails
);
router.put(
  "/organisation",
  middleware.jwtVerify,
  controllerObj.organisation.updateData
);
router.post(
  "/organisation",
  middleware.jwtVerify,
  controllerObj.organisation.createData
);
router.delete(
  "/organisation",
  middleware.jwtVerify,
  controllerObj.organisation.deleteData
);

/**
 * ============================================
 * GST ROUTES
 * ============================================
 */
router.get("/gst", middleware.jwtVerify, controllerObj.gst.getList);
router.get("/gst/detail", middleware.jwtVerify, controllerObj.gst.getDetails);
router.put("/gst", middleware.jwtVerify, controllerObj.gst.updateData);
router.post("/gst", middleware.jwtVerify, controllerObj.gst.createData);
router.delete("/gst", middleware.jwtVerify, controllerObj.gst.deleteData);

/**
 * ============================================
 * VENDOR ROUTES
 * ============================================
 */
router.get("/vendor", middleware.jwtVerify, controllerObj.vendor.getList);
router.get(
  "/vendorCode",
  middleware.jwtVerify,
  controllerObj.vendor.getVendorCode
);

router.get(
  "/vendor/detail",
  middleware.jwtVerify,
  controllerObj.vendor.getDetails
);
router.put("/vendor", middleware.jwtVerify, controllerObj.vendor.updateData);
router.post("/vendor", middleware.jwtVerify, controllerObj.vendor.createData);
router.delete("/vendor", middleware.jwtVerify, controllerObj.vendor.deleteData);

// Vendor master bulk upload
router.post(
  "/vendor/upload-csv",
  middleware.jwtVerify,
  upload.single("file"),
  controllerObj.vendor.uploadCSV
);

/**
 * ============================================
 * UOM (UNIT OF MEASUREMENT) ROUTES
 * ============================================
 */
router.get("/uom", middleware.jwtVerify, controllerObj.uom.getList);
router.get("/uom/detail", middleware.jwtVerify, controllerObj.uom.getDetails);
router.put("/uom", middleware.jwtVerify, controllerObj.uom.updateData);
router.post("/uom", middleware.jwtVerify, controllerObj.uom.createData);
router.delete("/uom", middleware.jwtVerify, controllerObj.uom.deleteData);

/**
 * ============================================
 * ITEM ROUTES
 * ============================================
 */
router.get("/item", middleware.jwtVerify, controllerObj.item.getList);

router.get(
  "/item/getItemNumber",
  middleware.jwtVerify,
  controllerObj.item.getNextItemNumber
);
router.get("/item/detail", middleware.jwtVerify, controllerObj.item.getDetails);
router.put("/item", middleware.jwtVerify, controllerObj.item.updateData);
router.post("/item", middleware.jwtVerify, controllerObj.item.createData);
router.delete("/item", middleware.jwtVerify, controllerObj.item.deleteData);

//Item Master Bulk Upload
router.post(
  "/item/upload-csv",
  middleware.jwtVerify,
  upload.single("file"),
  controllerObj.item.uploadCSV
);

/**
 * ============================================
 * LOCATION ROUTES
 * ============================================
 */
router.get("/location", middleware.jwtVerify, controllerObj.location.getList);
router.get(
  "/location/detail",
  middleware.jwtVerify,
  controllerObj.location.getDetails
);
router.put(
  "/location",
  middleware.jwtVerify,
  controllerObj.location.updateData
);
router.post(
  "/location",
  middleware.jwtVerify,
  controllerObj.location.createData
);
router.delete(
  "/location",
  middleware.jwtVerify,
  controllerObj.location.deleteData
);

/**
 * ============================================
 * STRUCTURE ROUTES
 * ============================================
 */
router.get("/structure", middleware.jwtVerify, controllerObj.structure.getList);
router.get(
  "/structure/detail",
  middleware.jwtVerify,
  controllerObj.structure.getDetails
);
router.put(
  "/structure",
  middleware.jwtVerify,
  controllerObj.structure.updateData
);
router.post(
  "/structure",
  middleware.jwtVerify,
  controllerObj.structure.createData
);
router.delete(
  "/structure",
  middleware.jwtVerify,
  controllerObj.structure.deleteData
);

/**
 * ============================================
 * ACTIVITY ROUTES
 * ============================================
 */
router.get("/activity", middleware.jwtVerify, controllerObj.activity.getList);
router.get(
  "/activity/detail",
  middleware.jwtVerify,
  controllerObj.activity.getDetails
);
router.put(
  "/activity",
  middleware.jwtVerify,
  controllerObj.activity.updateData
);
router.post(
  "/activity",
  middleware.jwtVerify,
  controllerObj.activity.createData
);
router.delete(
  "/activity",
  middleware.jwtVerify,
  controllerObj.activity.deleteData
);

/**
 * ============================================
 * PURCHASE REQUEST (PR) ROUTES
 * ============================================
 */
router.get(
  "/purchase-request",
  middleware.jwtVerify,
  controllerObj.purchaseRequest.getList
);
router.get(
  "/purchase-request-status/",
  middleware.jwtVerify,
  controllerObj.purchaseRequest.getPurchaseRequestStatus
);
router.get(
  "/local-rate-approval-status/",
  middleware.jwtVerify,
  controllerObj.purchaseRequest.getLocalPurchaseCounts
);

router.get(
  "/next-purchase-request/",
  middleware.jwtVerify,
  controllerObj.purchaseRequest.getPurchaseRequestList
);

router.get(
  "/local-purchase-approvals/",
  middleware.jwtVerify,
  controllerObj.purchaseRequest.getLocalRateApprovals
);

router.get(
  "/purchase-request/detail",
  middleware.jwtVerify,
  controllerObj.purchaseRequest.getDetails
);
// router.put("/purchase-request", middleware.jwtVerify, controllerObj.purchaseRequest.updateData);
router.put(
  "/purchase-request",
  middleware.jwtVerify,
  upload.any(),
  (req, res, next) => {
    // console.log('Request:', req.body);
    controllerObj.purchaseRequest.updateData(req, res, next);
  }
);

router.put(
  "/purchase-request/reject-request",
  middleware.jwtVerify,
  upload.any(),
  (req, res, next) => {
    // console.log('Request:', req.body);
    controllerObj.purchaseRequest.RejectApprovedPR(req, res, next);
  }
);

router.put(
  "/edit-purchase-request",
  middleware.jwtVerify,
  upload.any(),
  (req, res, next) => {
    // console.log('Request:', req.body);
    controllerObj.purchaseRequest.EditApprovedData(req, res, next);
  }
);

router.post(
  "/purchase-request",
  middleware.jwtVerify,
  upload.any(),
  (req, res, next) => {
    controllerObj.purchaseRequest.createData(req, res, next);
  }
);

router.delete(
  "/purchase-request",
  middleware.jwtVerify,
  controllerObj.purchaseRequest.deleteData
);

router.get(
  "/purchase-request/prHistory",
  middleware.jwtVerify,
  controllerObj.purchaseRequest.getPRWithLinkedData
);

/**
 * ============================================
 * RATE APPROVAL ROUTES
 * ============================================
 */
router.get(
  "/rate-approval",
  middleware.jwtVerify,
  controllerObj.rateApproval.getList
);

router.post(
  "/rate-approval/split-comparitive",
  middleware.jwtVerify,

  controllerObj.rateApproval.CreateSplitRateApproval
);

router.get(
  "/purchase-request/prHistory",
  middleware.jwtVerify,
  controllerObj.purchaseRequest.getPRWithLinkedData
);

router.get(
  "/rate-approval/getUniquePRNumber",
  middleware.jwtVerify,
  controllerObj.rateApproval.GetUniquePR
);

router.get(
  "/pending-rate-approval",
  middleware.jwtVerify,
  controllerObj.rateApproval.getPendingRateApprovalList
);

router.post(
  "/rate-approval-reject",
  middleware.jwtVerify,
  controllerObj.rateApproval.rejectRateApprovals
);

router.get(
  "/rate-approval/getPendingCategoryList",
  middleware.jwtVerify,
  controllerObj.rateApproval.getUniqueOpenRCTitle
);

router.get(
  "/rate-approval/getPendingPRs",
  middleware.jwtVerify,
  controllerObj.rateApproval.getPendingPRNumbers
);
router.get(
  "/rate-approval/detail",
  middleware.jwtVerify,
  controllerObj.rateApproval.getDetails
);
router.get(
  "/rate-approval-status/",
  middleware.jwtVerify,
  controllerObj.rateApproval.rateApprovalSummary
);


router.get(
  "/rate-approval-count/",
  middleware.jwtVerify,
  controllerObj.rateApproval.DashboardRateApprovalStats
);

router.get(
  "/rate-approval/getDetailsByPR",
  middleware.jwtVerify,
  controllerObj.rateApproval.getDetailsByPRNumber
);
router.put(
  "/rate-approval",
  middleware.jwtVerify,
  upload.any(),
  (req, res, next) => {
    controllerObj.rateApproval.updateData(req, res, next);
  }
);
router.put(
  "/rate-approval/Upload-files",
  middleware.jwtVerify,
  upload.any(),
  (req, res, next) => {
    controllerObj.rateApproval.updateFiles(req, res, next);
  }
);

router.delete(
  "/rate-approval",
  middleware.jwtVerify,
  controllerObj.rateApproval.deleteData
);

router.put(
  "/rate-approval/merge-rate-comparatives",
  middleware.jwtVerify,
  controllerObj.rateApproval.combineRateApprovals
);

router.delete(
  "/rate-approval/markLocalPurchase",
  middleware.jwtVerify,
  controllerObj.rateApproval.LocalPurchaseComparative
);

/**
 * ============================================
 * PROJECT ACTIVITY DATA ROUTES
 * ============================================
 */
router.get(
  "/project/activity_data",
  middleware.jwtVerify,
  controllerObj.projectActivityData.getList
);
router.get(
  "/project/activity_data/remarks",
  middleware.jwtVerify,
  controllerObj.projectActivityData.getRemarks
);
router.get(
  "/project/activity_data/detail",
  middleware.jwtVerify,
  controllerObj.projectActivityData.getDetails
);
router.put(
  "/project/activity_data",
  middleware.jwtVerify,
  controllerObj.projectActivityData.updateData
);
router.post(
  "/project/activity_data",
  middleware.jwtVerify,
  controllerObj.projectActivityData.createData
);
router.delete(
  "/project/activity_data",
  middleware.jwtVerify,
  controllerObj.projectActivityData.deleteData
);

/**
 * ============================================
 * PURCHASE ORDER (PO) ROUTES
 * ============================================
 */
router.get(
  "/purchase_order",
  middleware.jwtVerify,
  controllerObj.purchaseOrder.getList
);
router.get(
  "/purchase_order/detail",
  middleware.jwtVerify,
  controllerObj.purchaseOrder.getDetails
);
router.get(
  "/getPONumber",
  middleware.jwtVerify,
  controllerObj.purchaseOrder.getPONumber
);

router.get(
  "/getPONumber/plantMachinery",
  middleware.jwtVerify,
  controllerObj.purchaseOrder.getPlantMachineryPONumber
);

router.get(
  "/getPOStatusCount",
  middleware.jwtVerify,
  controllerObj.purchaseOrder.getPoStatusCount
);


router.get(
  "/purchase-order-count",
  middleware.jwtVerify,
  controllerObj.purchaseOrder.getPoStatusDashboardCount
);

router.post(
  "/mergePO",
  middleware.jwtVerify,
  controllerObj.purchaseOrder.getMergedPurchaseOrders
);

router.get(
  "/getPendingPOByVendors",
  middleware.jwtVerify,
  controllerObj.purchaseOrder.getPendingPOByVendorID
);

router.get(
  "/getApprovedPOByVendors",
  middleware.jwtVerify,
  controllerObj.purchaseOrder.getApprovedPOByVendorID
);

router.get(
  "/getPendingPOVendorsBySite",
  middleware.jwtVerify,
  controllerObj.purchaseOrder.getUniqueVendorsBySiteId
);

router.put(
  "/purchase_order",
  middleware.jwtVerify,
  controllerObj.purchaseOrder.updateData
);
router.delete(
  "/purchase_order",
  middleware.jwtVerify,
  controllerObj.purchaseOrder.deleteData
);
router.put(
  "/purchase_order/reviseOrder",
  middleware.jwtVerify,
  controllerObj.purchaseOrder.updateRevisedOrder
);

/**
 * ============================================
 * DMR PURCHASE ORDER ROUTES
 * ============================================
 */
router.get(
  "/dmr_purchase_order",
  middleware.jwtVerify,
  controllerObj.dmrPurchaseOrder.getList
);
router.put(
  "/dmr_purchase_order",
  middleware.jwtVerify,
  controllerObj.dmrPurchaseOrder.updateData
);
router.post(
  "/dmr_purchase_order",
  middleware.jwtVerify,
  controllerObj.dmrPurchaseOrder.createData
);
router.get(
  "/dmr_purchase_order/detailsByPO",
  middleware.jwtVerify,
  controllerObj.dmrPurchaseOrder.getDMRDetailsByPO
);
router.get(
  "/dmr_purchase_order/open-po",
  middleware.jwtVerify,
  controllerObj.dmrPurchaseOrder.getOpenPOList
);
router.get(
  "/dmr_purchase_order/details",
  middleware.jwtVerify,
  controllerObj.dmrPurchaseOrder.getDetails
);
router.put(
  "/dmr_purchase_order/hold-dmr",
  middleware.jwtVerify,
  controllerObj.dmrPurchaseOrder.updateHoldDMROrder
);

router.put(
  "/dmr_purchase_order/update-closing/:id",
  middleware.jwtVerify,
  controllerObj.dmrPurchaseOrder.updateClosingStatus
);
router.get(
  "/dmr_purchase_order/order-status-count",
  middleware.jwtVerify,
  controllerObj.dmrPurchaseOrder.DMRStatusCount
);
router.get(
  "/dmr/getUniquePRNumber",
  middleware.jwtVerify,
  controllerObj.dmrPurchaseOrder.GetUniquePR
);

router.get(
  "/dmr/getUniquePONumber",
  middleware.jwtVerify,
  controllerObj.dmrPurchaseOrder.getUniquePONumbers
);

/**
 * ============================================
 * DMR ENTRY ROUTES
 * ============================================
 */
router.post(
  "/dmr_entry",
  middleware.jwtVerify,
  controllerObj.dmrEntry.createData
);

router.put(
  "/dmr_entry/updateDMREntries",
  middleware.jwtVerify,
  controllerObj.dmrEntry.updateDMREntries
);

router.get(
  "/dmr_entry/open_challan",
  middleware.jwtVerify,
  controllerObj.dmrEntry.opneChallan
);
router.get("/dmr_list", middleware.jwtVerify, controllerObj.dmrEntry.getList);
router.get(
  "/dmr_purchase_order/check-duplicate-invoice",
  middleware.jwtVerify,
  controllerObj.dmrEntry.checkDuplicateInvoice
);
router.get(
  "/dmr_purchase_order/check-duplicate-challan",
  middleware.jwtVerify,
  controllerObj.dmrEntry.checkDuplicateChallan
);

router.get(
  "/dmr_entry_status",
  middleware.jwtVerify,
  controllerObj.dmrEntry.getDmrCounts
);
router.get(
  "/dmr_entry/validate-gate-entry",
  middleware.jwtVerify,
  controllerObj.dmrEntry.getGateEntryNumber
);
router.put(
  "/dmr_entry",
  middleware.jwtVerify,
  controllerObj.dmrEntry.updateData
);

router.get(
  "/getDMRNumber",
  middleware.jwtVerify,
  controllerObj.dmrEntry.getDMREntryNumber
);

router.get(
  "/getDMRNumberList",
  middleware.jwtVerify,
  controllerObj.dmrEntry.getUniqueDMRNumber
);

router.post(
  "/imprest_dmr_entry",
  middleware.jwtVerify,
  controllerObj.imprestDmrEntry.createData
);

router.get(
  "/imprest_dmr_list/uniqueDMRNumber",
  middleware.jwtVerify,
  controllerObj.imprestDmrEntry.getUniqueDMRNumber
);
router.get(
  "/imprest_dmr_list",
  middleware.jwtVerify,
  controllerObj.imprestDmrEntry.getList
);

router.get(
  "/imprest_dmr_list/check-duplicate-bill",
  middleware.jwtVerify,
  controllerObj.imprestDmrEntry.checkDuplicateBill
);

router.put(
  "/imprest_dmr_entry",
  middleware.jwtVerify,
  controllerObj.imprestDmrEntry.updateData
);
router.put(
  "/imprest_dmr_entry/doc_submission",
  middleware.jwtVerify,
  controllerObj.imprestDmrEntry.updateDocSubmissionAndRemark
);

router.get(
  "/imprest_dmr_entry/detail",
  middleware.jwtVerify,
  controllerObj.imprestDmrEntry.getDataById
);
router.get(
  "/getImprestNumberBySite",
  middleware.jwtVerify,
  controllerObj.imprestDmrEntry.getDMRNumberBYSite
);

/**
 * ============================================
 * FILE UPLOAD ROUTES
 * ============================================
 */
router.post(
  "/upload_file",
  middleware.jwtVerify,
  upload.any(), // Accept files with any field name (flexible for different clients)
  // Note: Using upload.any() instead of upload.array('files') to support various field names
  // File count limit (10 files) is enforced in the controller
  controllerObj.uploadImage.upload
);

/**
 * ============================================
 * INVENTORY ROUTES
 * ============================================
 */
router.get(
  "/inventory",
  middleware.jwtVerify,
  controllerObj.inventory.getInventoryData
);
router.get(
  "/inventory/search",
  middleware.jwtVerify,
  controllerObj.inventory.getInventoryList
);

router.get(
  "/inventory-report",
  middleware.jwtVerify,
  controllerObj.inventoryOut.InventoryData
);

router.get(
  "/inventory-issued-stock",
  middleware.jwtVerify,
  controllerObj.inventoryOut.getOutStockData
);

router.get(
  "/inventory-received-stock",
  middleware.jwtVerify,
  controllerObj.inventoryIn.getInStockData
);

/**
 * ============================================
 * INVENTORY OUT RECORD ROUTES
 * ============================================
 */
router.post(
  "/material_issue_slip",
  middleware.jwtVerify,
  controllerObj.inventoryOutRecord.createData
);
router.get(
  "/issue-slip-number",
  middleware.jwtVerify,
  controllerObj.inventoryOutRecord.getEntryNumber
);
router.get(
  "/issued_material_record",
  middleware.jwtVerify,
  controllerObj.inventoryOutRecord.getList
);
router.get(
  "/issued_material_record/details",
  middleware.jwtVerify,
  controllerObj.inventoryOutRecord.getDetails
);

/**
 * ============================================
 * BRAND ROUTES
 * ============================================
 */
router.get("/brand", middleware.jwtVerify, controllerObj.brand.getList);
router.get(
  "/brand/detail",
  middleware.jwtVerify,
  controllerObj.brand.getDetails
);
router.put("/brand", middleware.jwtVerify, controllerObj.brand.updateData);
router.post("/brand", middleware.jwtVerify, controllerObj.brand.createData);
router.delete("/brand", middleware.jwtVerify, controllerObj.brand.deleteData);

router.get(
  "/notification_type",
  middleware.jwtVerify,
  controllerObj.notificationType.getList
);
router.get(
  "/notification_type/detail",
  middleware.jwtVerify,
  controllerObj.notificationType.getDetails
);
//router.put("/brand", middleware.jwtVerify, controllerObj.notificationType.updateData);
router.post(
  "/notification_type",
  middleware.jwtVerify,
  controllerObj.notificationType.createData
);

router.get(
  "/vendor-quotations",
  middleware.jwtVerify,
  controllerObj.utilityController.DownloadQuotationsZip
);

router.get(
  "/dmr-documents",
  middleware.jwtVerify,
  controllerObj.utilityController.DownloadDMRDocumentZipByPO
);
router.get(
  "/debitNotes/credit-notes",
  middleware.jwtVerify,
  controllerObj.utilityController.DownloadCreditZip
);

router.get(
  "/credit-notes-zip",
  middleware.jwtVerify,
  controllerObj.utilityController.DownloadCreditZipByPO
);

/**
 * ============================================
 * DEBIT NOTE ROUTES
 * ============================================
 */
router.post(
  "/debitNote",
  middleware.jwtVerify,
  controllerObj.debitNote.createData
);
router.get("/debitNote", middleware.jwtVerify, controllerObj.debitNote.getList);
router.get(
  "/debitNote/open-debit-invoices",
  middleware.jwtVerify,
  controllerObj.debitNote.getEligibleInvoicesForDebitNote
);
router.put(
  "/debitNote",
  middleware.jwtVerify,
  controllerObj.debitNote.updateData
);

router.get(
  "/debitNote/getDebitNoteFromDmr",
  middleware.jwtVerify,
  controllerObj.debitNote.getDebitNoteDataFromDMR
);

/**
 * ============================================
 * CREDIT NOTE ROUTES
 * ============================================
 */
router.post(
  "/creditNote",
  middleware.jwtVerify,
  controllerObj.creditNote.createData
);
/*router.get("/creditNote", middleware.jwtVerify, controllerObj.creditNote.getList); */

/**
 * ============================================
 * INVENTORY TRANSFER ROUTES
 * ============================================
 */
router.post(
  "/inventory-transfer/create_request",
   middleware.jwtVerify,
  controllerObj.SiteInventoryTransfer.createTransfer
);

router.put(
  "/inventory-transfer/approve",
  controllerObj.SiteInventoryTransfer.approveTransfer
);
router.put(
  "/inventory-transfer/dispatch",
  controllerObj.SiteInventoryTransfer.dispatchTransfer
);
router.put(
  "/inventory-transfer/receive",
  controllerObj.SiteInventoryTransfer.receiveTransfer
);
router.delete(
  "/inventory-transfer/cancel/:id",
  controllerObj.SiteInventoryTransfer.cancelTransfer
);
router.get(
  "/inventory-transfer/details",
  controllerObj.SiteInventoryTransfer.getTransfer
);
router.get(
  "/inventory-transfer",
  controllerObj.SiteInventoryTransfer.getTransferList
);



/**
 * ============================================
 * LOCATION DATA ROUTES (Countries, States, Cities)
 * ============================================
 * These routes provide location data for forms and dropdowns
 * No authentication required for public location data
 */

// Get all countries
router.get("/countries", controllerObj.country.getCountries);

// Get states by country (e.g., /api/web/states?country=AF)
router.get("/states", controllerObj.country.getStatesByCountry);

// Get cities by state (e.g., /api/web/cities?state=BDS)
router.get("/cities", controllerObj.country.getCitiesByState);

// Get city by code (e.g., /api/web/city?code=MH-MUM)
router.get("/city", controllerObj.country.getCityByCode);

/**
 * ============================================
 * ONBOARDING COMPANY ROUTES
 * ============================================
 */

router.get(
  "/onboardingcompany",
  middleware.jwtVerify,
  controllerObj.onboardingcompany.getList
);

router.get(
  "/onboardingcompany/:id",
  middleware.jwtVerify,
  controllerObj.onboardingcompany.getDataByID
);

router.put(
  "/onboardingcompany/:id",
  middleware.jwtVerify,
  uploadimage.any(),   // OR fields([...])
  controllerObj.onboardingcompany.updateData
);

router.post(
  "/onboardingcompany",
  middleware.jwtVerify,
  uploadimage.any(), // 👈 change to any()
  controllerObj.onboardingcompany.createData
);

router.delete(
  "/onboardingcompany/:id",
  middleware.jwtVerify,
  controllerObj.onboardingcompany.deleteData
);


// Export router with all configured routes
module.exports = router;
