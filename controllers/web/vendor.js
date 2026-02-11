/**
 * Vendor Controller
 * Handles all operations related to Vendor master data including:
 * - Creating and updating vendor information
 * - Vendor validation (PAN, GST duplicate checking)
 * - Bulk vendor upload via CSV
 * - Vendor code generation
 * - Caching for performance optimization
 */

const VendorSchema = require("../../models/Vendor");
const StateSchema = require("../../models/state");
const citySchema = require("../../models/city");
const CountrySchema = require('../../models/country');
const Response = require("../../libs/response");
const { responseMessage } = require("../../libs/responseMessages");
const ObjectID = require("mongodb").ObjectID;

const csv = require("csv-parser");
const fs = require("fs");
const CategorySchema = require("../../models/Category");
const SubCategorySchema = require("../../models/SubCategory");
const {
  getCache,
  setCache,
  deleteCache,
  invalidateEntity,
  invalidateEntityList,
} = require("../../utils/cache");
const { MASTER_DATA } = require("../../libs/cacheConfig");

// Export all controller functions
module.exports = {
  createData,
  updateData,
  deleteData,
  getDetails,
  getList,
  uploadCSV,
  getVendorCode
};

/**
 * Create Vendor
 * POST /api/web/vendor
 * Creates a new vendor with duplicate validation for PAN and GST numbers
 * 
 * Validation Rules:
 * - GST number must be unique across all vendors
 * - PAN number must be unique across all vendors
 * - Cannot have both PAN and GST as duplicates
 * 
 * @param {Object} req.body - Vendor data
 * @param {String} req.body.pan_number - PAN card number (required, must be unique)
 * @param {String} req.body.gst_number - GST number (optional, must be unique if provided)
 * @param {String} req.body.langCode - Language code for response messages
 * @param {String} req.body.login_user_id - User creating the vendor
 * 
 * @returns {Object} Created vendor object
 */
async function createData(req, res) {
  try {
    const reqObj = req.body;
    reqObj.created_by = reqObj.login_user_id;
    reqObj.updated_by = reqObj.login_user_id;

    const { pan_number, gst_number, langCode } = reqObj;
    let existingVendorWithGST;
    
    // Step 1: Check if GST number already exists (if provided)
    if (gst_number !== "") {
      existingVendorWithGST = await VendorSchema.findOne({ gst_number });
      if (existingVendorWithGST) {
        throw {
          errors: [],
          message: responseMessage(langCode, "GST_ALREADY_EXISTS"),
          statusCode: 412,
        };
      }
    }

    // Step 2: Check if PAN number already exists
    const existingVendorWithPAN = await VendorSchema.findOne({ pan_number });
    if (existingVendorWithPAN) {
      // Case 1: PAN is duplicate and GST is blank
      if (!gst_number) {
        throw {
          errors: [],
          message: responseMessage(langCode, "PAN_ALREADY_EXISTS"),
          statusCode: 412,
        };
      }

      // Case 2: PAN is duplicate and GST is also duplicate
      if (existingVendorWithGST) {
        throw {
          errors: [],
          message: responseMessage(langCode, "PAN_AND_GST_DUPLICATE"),
          statusCode: 412,
        };
      }
    }

    // Step 3: If no conflicts, proceed to create the vendor
    const newData = await new VendorSchema(reqObj).save();
    
    // Invalidate vendor list cache
    await invalidateEntityList("vendor");
    
    return res
      .status(200)
      .json(
        await Response.success(
          newData,
          responseMessage(langCode, "RECORD_CREATED"),
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

/**
 * Update Vendor
 * PUT /api/web/vendor
 * Updates an existing vendor with duplicate validation for PAN and GST numbers
 * 
 * Validation Rules (same as create):
 * - GST number must be unique (excluding current vendor)
 * - PAN number must be unique (excluding current vendor)
 * 
 * @param {String} req.body._id - Vendor ID (required)
 * @param {String} req.body.pan_number - PAN card number
 * @param {String} req.body.gst_number - GST number
 * @param {String} req.body.langCode - Language code for response messages
 * @param {String} req.body.login_user_id - User updating the vendor
 * 
 * @returns {Object} Updated vendor object
 */
async function updateData(req, res) {
  try {
    let reqObj = req.body;
    const { _id, pan_number, gst_number, langCode, login_user_id } = reqObj;
    
    // Validate vendor ID
    if (!_id) {
      throw {
        errors: [],
        message: responseMessage(langCode, "ID_MISSING"),
        statusCode: 412,
      };
    }

    // Prepare update data with user tracking
    const requestedData = { ...reqObj, updated_by: login_user_id };

    // Step 1: Check if GST number is duplicate (excluding current vendor)
    let existingVendorWithGST = null;
    if (gst_number !== "") {
      existingVendorWithGST = await VendorSchema.findOne({
        gst_number,
        _id: { $ne: ObjectID(_id) }, // Exclude the current vendor's ID
      });

      if (existingVendorWithGST) {
        throw {
          errors: [],
          message: responseMessage(langCode, "GST_ALREADY_EXISTS"),
          statusCode: 412,
        };
      }
    }

    // Step 2: Check if PAN number is duplicate (excluding current vendor)
    const existingVendorWithPAN = await VendorSchema.findOne({
      pan_number,
      _id: { $ne: _id },
    });

    if (existingVendorWithPAN) {
      // Case 1: PAN is duplicate and GST is blank
      if (!gst_number) {
        throw {
          errors: [],
          message: responseMessage(langCode, "PAN_ALREADY_EXISTS"),
          statusCode: 412,
        };
      }

      // Case 2: PAN is duplicate and GST is also duplicate
      if (existingVendorWithGST) {
        throw {
          errors: [],
          message: responseMessage(langCode, "PAN_AND_GST_DUPLICATE"),
          statusCode: 412,
        };
      }
    }

    // Step 3: If no conflicts, proceed to update the vendor data
    const updatedData = await VendorSchema.findOneAndUpdate(
      { _id: ObjectID(_id) },
      requestedData,
      { new: true } // Return updated document
    );

    if (updatedData) {
      // Invalidate cache for this vendor and vendor list
      await invalidateEntity("vendor");
      await invalidateEntityList("vendor");
      await deleteCache(`vendor:${_id}`);
      return res
        .status(200)
        .json(
          await Response.success(
            updatedData,
            responseMessage(langCode, "RECORD_UPDATED"),
            req
          )
        );
    } else {
      return res
        .status(400)
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
 * Delete Vendor
 * DELETE /api/web/vendor
 * Deletes a vendor by ID
 * 
 * @param {String} req.query._id - Vendor ID (required)
 * @param {String} req.body.langCode - Language code for response messages
 * 
 * @returns {Object} Success message
 */
async function deleteData(req, res) {
  try {
    let reqObj = req.body;
    let { _id } = req.query;

    // Validate vendor ID
    if (!_id) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "ID_MISSING"),
        statusCode: 412,
      };
    }

    // Check if vendor exists
    let getData = await VendorSchema.findOne({ _id: ObjectID(_id) });

    if (!getData) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "NO_RECORD_FOUND"),
        statusCode: 412,
      };
    }

    // Delete vendor
    const dataRemoved = await VendorSchema.deleteOne({ _id: ObjectID(_id) });
    
    // Invalidate cache for this vendor and vendor list
    await invalidateEntity("vendor");
    await invalidateEntityList("vendor");
    await deleteCache(`vendor:${_id}`);

    res
      .status(200)
      .json(
        await Response.success(
          {},
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

/**
 * Get Vendor Details
 * GET /api/web/vendor
 * Retrieves detailed information about a specific vendor by ID
 * Uses caching for performance optimization
 * 
 * @param {String} req.query._id - Vendor ID (required)
 * @param {String} req.body.langCode - Language code for response messages
 * 
 * @returns {Object} Vendor details with populated references
 */
async function getDetails(req, res) {
  try {
    let reqObj = req.body;
    let { _id } = req.query;

    // Validate vendor ID
    if (!_id) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "ID_MISSING"),
        statusCode: 412,
      };
    }

    // Check cache first
    const cacheKey = `vendor:${_id}`;

    // 🔹 TRY CACHE
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    let recordDetail = await VendorSchema.aggregate([
      { $match: { _id: ObjectID(_id) } },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryDetail",
        },
      },
      {
        $project: {
          vendor_name: 1,
          category: 1,
          SubCategory: 1,
          code: 1,
          Uniquecode: 1,
          address: 1,
          contact_person: 1,
          dialcode: 1,
          phone_number: 1,
          gst_number: 1,
          pan_number: 1,
          MSME_number: 1,
          scope: 1,
          vendor_type: 1,
          email: 1,
          payment_terms: 1,
          terms_condition: 1,
          created_at: 1,
          updated_at: 1,
          created_by: 1,
          updated_by: 1,
          categoryDetail: { $arrayElemAt: ["$categoryDetail", 0] },
        },
      },
      {
        $project: {
          vendor_name: 1,
          category: 1,
          code: 1,
          Uniquecode: 1,
          SubCategory: 1,
          address: 1,
          contact_person: 1,
          dialcode: 1,
          phone_number: 1,
          gst_number: 1,
          pan_number: 1,
          MSME_number: 1,
          scope: 1,
          vendor_type: 1,
          email: 1,
          payment_terms: 1,
          terms_condition: 1,
          created_at: 1,
          updated_at: 1,
          created_by: 1,
          updated_by: 1,
          "categoryDetail._id": 1,
          "categoryDetail.name": 1,
          "categoryDetail.code": 1,
        },
      },
    ]);

    if (recordDetail) {
      await setCache(cacheKey, recordDetail, MASTER_DATA);
      res
        .status(200)
        .json(
          await Response.success(
            recordDetail,
            responseMessage(reqObj.langCode, "SUCCESS")
          )
        );
    } else {
      res
        .status(422)
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



async function getVendorCode(req, res) {
  try {
    // Find the vendor with the highest code
    const lastVendor = await VendorSchema.findOne().sort({ code: -1 }).limit(1);

    const nextCode = lastVendor ? lastVendor.code + 1 : 1; // Start from 1 if no vendor exists

    res.status(200).json({ nextCode });
  } catch (error) {
    console.error("Error getting next vendor code:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getList(req, res) {
  try {
    const { page, per_page, sort_by = "code", sort_order = "asc", search } = req.query;
    const reqObj = req.body;

    // Check if pagination applies

    const cacheKey = `vendor:getList:${JSON.stringify(req.query)}`;
        const cachedResponse = await getCache(cacheKey);
    
        if (cachedResponse) {
          return res.status(200).json(cachedResponse); // ✅ EXACT SAME RESPONSE
        }

    const applyPagination =
      page !== undefined &&
      per_page !== undefined &&
      !isNaN(parseInt(page, 10)) &&
      !isNaN(parseInt(per_page, 10)) &&
      parseInt(page, 10) > 0 &&
      parseInt(per_page, 10) > 0;

    const pageInt = applyPagination ? parseInt(page, 10) : null;
    const limitInt = applyPagination ? parseInt(per_page, 10) : null;
    const skip = applyPagination ? (pageInt - 1) * limitInt : null;

    

    // Sorting
    const sort = {};
    sort[sort_by] = sort_order === "desc" ? -1 : 1;

    // Search filter
    const matchFilter = {};
    if (search) {
      matchFilter.vendor_name = { $regex: search, $options: "i" };
    }

    // Base pipeline
    let pipeline = [
      { $match: matchFilter },

      // Category lookup (supports array or single ObjectId)
      {
        $lookup: {
          from: "categories",
          let: { categoryIds: "$category" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $cond: [
                    { $isArray: "$$categoryIds" },
                    { $in: ["$_id", "$$categoryIds"] },
                    { $eq: ["$_id", "$$categoryIds"] }
                  ]
                }
              }
            },
            { $project: { _id: 1, name: 1 } }
          ],
          as: "categoryDetail"
        }
      },

      // Subcategory lookup (supports array or single ObjectId)
      {
        $lookup: {
          from: "sub_categories",
          let: { subCategoryIds: "$SubCategory" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $cond: [
                    { $isArray: "$$subCategoryIds" },
                    { $in: ["$_id", "$$subCategoryIds"] },
                    { $eq: ["$_id", "$$subCategoryIds"] }
                  ]
                }
              }
            },
            { $project: { _id: 1, subcategory_name: 1 } }
          ],
          as: "subCategoryDetail"
        }
      },

      // Fields to include
      {
        $project: {
          vendor_name: 1,
          category: 1,
          SubCategory: 1,
          code: 1,
          Uniquecode: 1,
          address: 1,
          contact_person: 1,
          dialcode: 1,
          phone_number: 1,
          gst_number: 1,
          pan_number: 1,
          MSME_number: 1,
          scope: 1,
          vendor_type: 1,
          email: 1,
          payment_terms: 1,
          terms_condition: 1,
          created_at: 1,
          updated_at: 1,
          created_by: 1,
          updated_by: 1,
          categoryDetail: 1,
          subCategoryDetail: 1,
        }
      }
    ];

    // 🔹 When pagination is applied
    if (applyPagination) {
      pipeline.push(
        { $sort: sort },
        {
          $facet: {
            data: [
              { $skip: skip },
              { $limit: limitInt }
            ],
            totalCount: [{ $count: "count" }]
          }
        },
        {
          $project: {
            data: 1,
            totalCount: { $ifNull: [{ $arrayElemAt: ["$totalCount.count", 0] }, 0] }
          }
        }
      );

      const result = await VendorSchema.aggregate(pipeline);
      const data = result[0]?.data || [];
      const total = result[0]?.totalCount || 0;

      const response = {
        success: true,
        message: responseMessage(reqObj.langCode, "SUCCESS"),
        current_page: parseInt(page, 10),
        per_page: parseInt(per_page, 10),
        total: total,
        total_pages: Math.ceil(total / parseInt(per_page, 10)),
        data: data,
      };

      /* ================== CACHE SET (ONLY ADDITION) ================== */
      await setCache(cacheKey, response, MASTER_DATA);
      /* =============================================================== */

      return res.status(200).json(response);

    } 
    // 🔹 When pagination is NOT applied
    else {
      pipeline.push({ $sort: sort });
      const data = await VendorSchema.aggregate(pipeline);

      return res.status(200).json({
        success: true,
        message: "Vendors fetched successfully",
        data
      });
    }

  } catch (error) {
    console.error("Error in getList:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
      errors: error.errors || []
    });
  }
}



async function uploadCSV(req, res) {
  try {
    if (!req.file) {
      throw {
        errors: [],
        message: responseMessage(req.body.langCode, "FILE_MISSING"),
        statusCode: 412,
      };
    }

    //console.log("Received file:", req.file);

    const results = [];
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", async () => {
        try {
          //console.log("Parsed CSV data:", results);

          const { processedData, errors } = await processCSVData(results);

          let savedVendors = [];
          if (processedData.length > 0) {
            //console.log("Change this", processedData);

            // Attempt database insertion and catch any errors
            try {
              savedVendors = await VendorSchema.insertMany(processedData);
              //console.log("Data successfully saved to database:", processedData);
            } catch (dbError) {
              //console.error("Error inserting data into database:", dbError);
            }
          }

          // Delete the file after processing
          fs.unlink(req.file.path, (err) => {
            if (err) {
              //console.error("Error deleting file:", err);
            } else {
              //console.log("File deleted successfully");
            }
          });

          res.status(200).json(
            await Response.success(
              {
                savedVendors,
                errors,
                totalProcessed: results.length,
                successfulUploads: savedVendors.length,
                failedUploads: errors.length,
              },
              responseMessage(req.body.langCode, "VENDORS_IMPORTED"),
              req
            )
          );
        } catch (error) {
          //console.error("Error processing CSV data:", error);
          res.status(422).json(
            await Response.errors(
              {
                errors: error.errors || [],
                message: error.message,
              },
              error,
              req
            )
          );
        }
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

async function processCSVData(data, langCode) {
  const processedData = [];
  const errors = [];
  const existingVendors = new Set();

  // Fetch countries and states
  let Country;
  let states;
  let City;
  try {
    Country = await CountrySchema.find({ iso2: 'IN' })
          .sort({ name: 1 });
    states = await StateSchema.find({ country_code: 'IN' })
          .sort({ name: 1 });
    City=    await citySchema.find({ country_id: Country[0].id })
          .sort({ name: 1 });

  
  } catch (error) {
    //console.error("Error retrieving countries and states data:", error);
    throw new Error(
      "Unable to process CSV due to country and state data unavailability."
    );
  }

  const sortedVendors = await VendorSchema.find({})
    .sort({ code: 1 })
    .select("vendor_name code gst_number pan_number");

  const totalVendors = sortedVendors.length;
  //console.log("console here", totalVendors[totalVendors- 1]);
  let vendorCodeCounter =
    totalVendors > 0 ? sortedVendors[totalVendors - 1].code + 1 : 1;

  const formatVendorCode = (code) => code.toString().padStart(4, "0");

  // Define mappings for scope and vendor type values
  const scopeMap = {
    "Local(Lv)": "Lv",
    "National(Nv)": "Nv",
    "Global (Gv)": "Gv",
  };

  const vendorTypeMap = {
    Fabricator: "F",
    Manufacturer: "M",
    Trader: "T",
    Contractor: "C",
  };

  for (const row of data) {
    try {
      const vendorName = row.vendor_name.trim();
      const gstNumber = row.gst_number?.trim();
      const panNumber = row.pan_number?.trim();
      const vendorType = row.vendor_type;
      const scope = row.scope;

      if (existingVendors.has(vendorName.toLowerCase())) {
        throw new Error(`Duplicate vendor: ${vendorName}`);
      }

      const existingVendorWithGST = gstNumber
        ? await VendorSchema.findOne({ gst_number: gstNumber })
        : null;

      const existingVendorWithPAN = panNumber
        ? await VendorSchema.findOne({ pan_number: panNumber })
        : null;

      if (existingVendorWithPAN && !gstNumber) {
        // Case 1: PAN is duplicate but GST is blank
        throw {
          errors: [],
          message: responseMessage(langCode, "PAN_ALREADY_EXISTS"),
          statusCode: 412,
        };
      } else if (existingVendorWithPAN && existingVendorWithGST) {
        // Case 2: Both PAN and GST are duplicates
        throw {
          errors: [],
          message: responseMessage(langCode, "PAN_AND_GST_DUPLICATE"),
          statusCode: 412,
        };
      } else if (!existingVendorWithPAN && existingVendorWithGST) {
        // Case 3: PAN is not duplicate but GST is
        throw {
          errors: [],
          message: responseMessage(langCode, "GST_ALREADY_EXISTS"),
          statusCode: 412,
        };
      }

      // Case 4: Both PAN and GST are not duplicates – proceed without any error

      //console.log("Checking Payload",row.address_Country);
     
    
      const cityCode = City.find((c)=>c.name===row.address_city).city_code;
      const formattedVendorCodeCounter = formatVendorCode(vendorCodeCounter);

      const scopeCode = scopeMap[scope] || "";
      const vendorTypeCode = vendorTypeMap[vendorType] || "";

      const combinedCode = `${vendorTypeCode}${scopeCode}${cityCode}${formattedVendorCodeCounter}`;
      //console.log("checking vendorCOunter", vendorCodeCounter);
      const vendorData = {
        vendor_name: vendorName,
        contact_person: row.contact_person,
        dialcode: parseInt(row.dialcode),
        phone_number: row.phone_number,
        gst_number: gstNumber,
        pan_number: panNumber,
        MSME_number: row.MSME_number,
        email: row.email,
        category: [],
        SubCategory: [],
        code: vendorCodeCounter++, // Increment for the next vendor
        Uniquecode: combinedCode,
        address: {
          street_address: row.address_street_address,
          street_address2: row.address_street_address2,
          state: row.address_state,
          city: row.address_city,
          zip_code: row.address_zip_code,
          country: row.address_Country,
        },
        payment_terms: row.payment_terms,
        terms_condition: row.terms_condition,
        vendor_type: vendorType,
        scope: scope,
      };

      const requiredFields = ["vendor_name"];
      const missingFields = requiredFields.filter(
        (field) => !vendorData[field]
      );

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }

      const categories = Array.from(
        { length: 4 },
        (_, i) => row[`category[${i}]`]
      ).filter((cat) => cat && cat.trim() !== "");

      for (const catName of categories) {
        const category = await CategorySchema.findOne({ name: catName });
        if (category) {
          vendorData.category.push(category._id);
        }
      }

      const subcategories = Array.from(
        { length: 18 },
        (_, i) => row[`SubCategory[${i}]`]
      ).filter((subcat) => subcat && subcat.trim() !== "");

      for (const subcatName of subcategories) {
        const subcategory = await SubCategorySchema.findOne({
          subcategory_name: subcatName,
        });
        if (subcategory) {
          vendorData.SubCategory.push(subcategory._id);
        }
      }

      processedData.push(vendorData);
      existingVendors.add(vendorName.toLowerCase());
    } catch (error) {
      errors.push({
        vendor_name: row.vendor_name || "Unknown",
        error: error.message || error.message.message,
        details: row,
      });
    }
  }

  return { processedData, errors };
}

async function getCountriesAndStates() {
  try {
    const response = await fetch(
      "https://countriesnow.space/api/v0.1/countries/states"
    );
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();
    const countries = data.data.map((country) => ({
      name: country.name,
      code: country.iso3,
      states: country.states.map((state) => ({
        name: state.name,
        code: state.state_code,
      })),
    }));
    return countries;
  } catch (error) {
    //console.error("Error fetching countries and states:", error);
    throw new Error("Failed to retrieve country and state data.");
  }
}
