/**
 * Asset Tracker Controller
 * Handles all operations related to Asset Tracking including:
 * - Creating new assets
 * - Auto-generating asset codes and voucher numbers
 * - Asset lifecycle tracking (Procurement stage initialization)
 */

const express = require("express");
const router = express.Router();
const AssetTracker = require("../../models/AssetTracker");

/**
 * Generate Asset Code
 * Generates a unique asset code in format: PISL-{subcategoryCode}{number}
 * 
 * @param {String} subcategoryCode - Subcategory code
 * @param {Number} number - Sequential number
 * @returns {String} Generated asset code (e.g., PISL-SUB00100001)
 */
function generateAssetCode(subcategoryCode, number) {
  return `PISL-${subcategoryCode}${String(number).padStart(5, "0")}`;
}

/**
 * Generate Voucher Code
 * Generates a unique voucher code in format: {categoryCode}-{number}
 * 
 * @param {String} categoryCode - Category code
 * @param {Number} number - Sequential number
 * @returns {String} Generated voucher code (e.g., CAT001-0001)
 */
function generateVoucherCode(categoryCode, number) {
  return `${categoryCode}-${String(number).padStart(4, "0")}`;
}

/**
 * Create Asset
 * POST /api/asset-tracker/create
 * Creates a new asset with auto-generated codes and initializes lifecycle
 * 
 * Process:
 * - Validates required fields
 * - Counts existing assets by subcategory and category
 * - Generates unique asset code and voucher number
 * - Initializes asset lifecycle with Procurement stage
 * 
 * Required Fields:
 * - item_id: Item ID
 * - po_number: Purchase order number
 * - category_code: Category code for voucher generation
 * - subcategory_code: Subcategory code for asset code generation
 * 
 * @param {String} req.body.item_id - Item ID (required)
 * @param {String} req.body.po_number - Purchase order number (required)
 * @param {String} req.body.category_code - Category code (required)
 * @param {String} req.body.subcategory_code - Subcategory code (required)
 * @param {Date} req.body.po_date - PO date (optional)
 * @param {String} req.body.department - Department (default: "P&M")
 * @param {String} req.body.invoice_number - Invoice number (optional)
 * @param {Date} req.body.invoice_date - Invoice date (optional)
 * @param {Number} req.body.rate_per_unit - Rate per unit (optional)
 * @param {Number} req.body.basic_invoice_value - Basic invoice value (optional)
 * @param {String} req.body.current_location - Current location (optional)
 * @param {String} req.body.created_by - User creating the asset (required)
 * 
 * @returns {Object} Created asset object with generated codes
 */
router.post("/create", async (req, res) => {
  try {
    const data = req.body;

    // Validate required fields
    if (!data.item_id || !data.po_number || !data.category_code || !data.subcategory_code) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: item_id, po_number, category_code, subcategory_code",
      });
    }

    // Count existing assets with the same subcategory for sequential numbering
    const Assetcount = await AssetTracker.countDocuments({
     subCategory: { $regex: data.subcategory },
     companyIdf: req.user.companyIdf,
    });
    
    // Count existing vouchers with the same category for sequential numbering
    const Vouchercount = await AssetTracker.countDocuments({
     catgeory: { $regex: data.catgeory },
     companyIdf: req.user.companyIdf,
    });

    // Generate unique asset code and voucher number
    const asset_code = generateAssetCode(data.subcategory_code, Assetcount + 1);
    const voucher_code = generateVoucherCode(data.category_code, Vouchercount + 1);
    
    // Create new asset with auto-filled fields
    const newAsset = new AssetTracker({
      companyIdf: req.user.companyIdf,
      po_number: data.po_number,
      po_date: data.po_date,
      department: data.department || "P&M", // Default department
      invoice_number: data.invoice_number,
      invoice_date: data.invoice_date,
      item_id: data.item_id,
      voucher_number: voucher_code, // Auto-generated
      asset_code: asset_code, // Auto-generated
      rate_per_unit: data.rate_per_unit,
      basic_invoice_value: data.basic_invoice_value,
      current_location: data.current_location,

      // Initialize lifecycle with Procurement stage entry
      asset_lifecycle: [
        {
          stage_type: "Procurement",
          po_number: data.po_number,
          rate: data.rate_per_unit,
          item: data.item_id,
          invoice_number: data.invoice_number,
          invoice_date: data.invoice_date,
          remarks: "New Asset Added",
          date: new Date(),
        },
      ],

      created_by: data.created_by,
      updated_by: data.created_by,
    });

    // Save asset to database
    await newAsset.save();

    res.status(201).json({
      success: true,
      message: "Asset created successfully",
      data: newAsset,
    });
  } catch (error) {
    console.error("Error creating asset:", error);
    res.status(500).json({
      success: false,
      message: "Error creating asset",
      error: error.message,
    });
  }
});

module.exports = router;
