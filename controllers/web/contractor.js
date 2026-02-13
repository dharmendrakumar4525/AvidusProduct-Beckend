/**
 * Contractor Controller
 * Handles all operations related to Contractor management including:
 * - Creating and updating contractors
 * - Auto-generating contractor codes
 * - Duplicate validation (email, phone)
 * - Bulk contractor upload via CSV
 * - Contractor queries with site filtering and pagination
 */

const router = require("express").Router();
const ContractorSchema = require("../../models/Contractor");
const SiteSchema = require("../../models/Site");
const { MongoClient } = require("mongodb");
const { responseMessage } = require("../../libs/responseMessages");
const ObjectID = require("mongodb").ObjectID;
const csv = require("csv-parser");
const fs = require("fs");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Response = require("../../libs/response");
const jwt = require("jsonwebtoken");

// Export all controller functions
module.exports = {
  getList,
  getDataByID,
  createData,
  updateData,
  deleteData,
  uploadContractorCSV,
};

/**
 * Create Contractor
 * POST /api/web/contractor
 * Creates a new contractor with auto-generated code and duplicate validation
 * 
 * Code Generation:
 * - Automatically generates a 4-digit code (e.g., "0001", "0002")
 * - Increments from the highest existing contractor number
 * 
 * Validation:
 * - Email and phone combination must be unique
 * 
 * @param {String} req.body.name - Contractor name (required)
 * @param {Array} req.body.sites - Array of site IDs (required)
 * @param {String} req.body.email - Email address (required)
 * @param {String} req.body.Contact_Person - Contact person name (required)
 * @param {String} req.body.phone - Phone number (required)
 * @param {String} req.body.NatureOfWork - Nature of work (required)
 * @param {String} req.body.type - Contractor type (required)
 * @param {String} req.body.location - Location (required)
 * @param {String} req.body.langCode - Language code for response messages
 * 
 * @returns {Object} Created contractor object with generated code
 */
async function createData(req, res) {
  let reqObj = req.body;
  try {
    const {
      name,
      sites,
      email,
      Contact_Person,
      phone,
      NatureOfWork,
      type,
      location,
    } = req.body;

    // Step 1: Get the last contractor record to determine next code
    const lastContractor = await ContractorSchema.findOne({ companyIdf: req.user.companyIdf })
      .sort({ code: -1 }) // Sort by code in descending order
      .exec();

    // Step 2: Generate the new code by incrementing the highest code value
    let newCode = "0001";
    let lastCodeNumber = 0; // Default code for the first contractor
    if (lastContractor && lastContractor.number) {
      lastCodeNumber = lastContractor.number || 0;
      newCode = String(lastCodeNumber + 1).padStart(4, "0"); // Increment and format to 4 digits
    }

    // Step 3: Check if a contractor with the same email or phone already exists
    const existingStaff = await ContractorSchema.findOne({ email, phone, companyIdf: req.user.companyIdf });

    if (existingStaff) {
      // If email or phone already exists, throw an error
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "EMPLOYEE_EXISTS"),
        statusCode: 409, // Conflict status code
      };
    }

    // Step 4: If unique, proceed with saving the new contractor
    const newContractorSchema = new ContractorSchema({
      companyIdf: req.user.companyIdf,
      name,
      number: lastCodeNumber + 1,
      code: newCode, // Assign the generated code
      sites,
      email,
      Contact_Person,
      phone,
      NatureOfWork,
      type,
      location,
    });

    // Save contractor to database
    const savedStaff = await newContractorSchema.save();

    if (savedStaff) {
      res
        .status(200)
        .json(
          await Response.success(
            savedStaff,
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
    return res.status(error.statusCode || 422).json(
      await Response.errors(
        {
          errors: error.errors,
          message: error.message,
        },
        error,
        reqObj
      )
    );
  }
}

/**
 * Update Contractor
 * PUT /api/web/contractor
 * Updates an existing contractor
 * 
 * @param {String} req.body._id - Contractor ID (required)
 * @param {Object} req.body - Contractor fields to update
 * @param {String} req.body.langCode - Language code for response messages
 * @param {String} req.body.login_user_id - User updating the contractor
 * 
 * @returns {Object} Updated contractor object
 */
async function updateData(req, res) {
  try {
    let reqObj = req.body;
    let loginUserId = reqObj.login_user_id;

    // Validate contractor ID
    if (!reqObj._id) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "ID_MISSING"),
        statusCode: 412,
      };
    }

    // Prepare update data with user tracking
    let requestedData = { ...reqObj, ...{ updated_by: loginUserId } };

    // Update contractor and return updated document
    let updatedData = await ContractorSchema.findOneAndUpdate(
      {
        _id: ObjectID(reqObj._id),
        companyIdf: req.user.companyIdf,
      },
      requestedData,
      {
        new: true, // Return updated document
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

/**
 * Delete Contractor
 * DELETE /api/web/contractor
 * Deletes a contractor by ID
 * 
 * @param {String} req.query._id - Contractor ID (required)
 * @param {String} req.body.langCode - Language code for response messages
 * 
 * @returns {Object} Success message
 */
async function deleteData(req, res) {
  try {
    let reqObj = req.body;
    let { _id } = req.query;

    // Validate contractor ID
    if (!_id) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "ID_MISSING"),
        statusCode: 412,
      };
    }

    // Check if contractor exists
    let getData = await ContractorSchema.findOne({ _id: ObjectID(_id), companyIdf: req.user.companyIdf });

    if (!getData) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "NO_RECORD_FOUND"),
        statusCode: 412,
      };
    }

    // Delete contractor
    const dataRemoved = await ContractorSchema.deleteOne({
      _id: ObjectID(_id),
      companyIdf: req.user.companyIdf,
    });

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
 * Get Contractor By ID
 * GET /api/web/contractor
 * Retrieves detailed information about a specific contractor
 * 
 * @param {String} req.query._id - Contractor ID (required)
 * 
 * @returns {Object} Contractor details
 */
async function getDataByID(req, res) {
  try {
    const staff = await ContractorSchema.findOne({ ...req.query, companyIdf: req.user.companyIdf });

    if (!staff) return res.send("no Staff exits");

    res.send(staff);
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
 * Upload Contractor CSV
 * POST /api/web/contractor/uploadCSV
 * Bulk uploads contractors from a CSV file
 * 
 * CSV Format:
 * - name, email, phone, contact_person, Nature_of_work, type, location
 * - site[0], site[1], etc. for multiple site assignments
 * 
 * Processing:
 * - Validates required fields
 * - Checks for duplicate emails
 * - Auto-generates contractor codes
 * - Maps site codes to site IDs
 * 
 * @param {File} req.file - CSV file (required)
 * @param {String} req.body.langCode - Language code for response messages
 * 
 * @returns {Array} Array of created contractor objects
 */
async function uploadContractorCSV(req, res) {
  try {
    // Validate file exists
    if (!req.file) {
      throw {
        errors: [],
        message: responseMessage(req.body.langCode, "FILE_MISSING"),
        statusCode: 412,
      };
    }

    // Read and parse CSV file
    const results = [];
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", async () => {
        try {
          // Process the CSV data (validate, generate codes, map sites)
          const processedData = await processContractorCSVData(results);

          // Save the processed data to the database
          const savedStaff = await ContractorSchema.insertMany(processedData);

          // Remove the temporary file
          fs.unlink(req.file.path, (err) => {
            if (err) {
              console.error("Error deleting file:", err);
            } else {
              //console.log("File deleted successfully");
            }
          });

          res
            .status(200)
            .json(
              await Response.success(
                savedStaff,
                responseMessage(req.body.langCode, "SITE_STAFF_IMPORTED"),
                req
              )
            );
        } catch (error) {
          // Handle any errors that occur during processing
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

/**
 * Process Contractor CSV Data
 * Validates and processes CSV rows into contractor records
 * 
 * @param {Array} data - Array of CSV row objects
 * 
 * @returns {Array} Array of processed contractor data objects ready for insertion
 * @throws {Error} If validation errors are encountered
 */
async function processContractorCSVData(data) {
  const processedData = [];
  const errors = [];

  // Fetch all existing contractors to avoid duplicates
  const existingContractor = new Set(
    (await ContractorSchema.find({}, "email"))
      .map((staff) => staff.email?.toLowerCase())
      .filter(Boolean)
  );

  // Get last contractor to determine starting code number
  const lastContractor = await ContractorSchema.findOne()
      .sort({ code: -1 }) // Sort by code in descending order
      .exec();

  let newCode = "0001";
  let lastCodeNumber = 0; // Default code for the first contractor
  if (lastContractor && lastContractor.number) {
    lastCodeNumber = lastContractor.number || 0;
  }

  // Process each CSV row
  for (const [index, row] of data.entries()) {
    // Extract and trim row data
    const Contact_Person = row.contact_person?.trim();
    const NatureOfWork = row.Nature_of_work?.trim();
    const type = row.type?.trim();
    const location = row.location?.trim();
    const name = row.name?.trim();
    const email = row.email?.trim();
    const phone = row.phone?.trim();
    
    // Generate contractor code (incremental)
    lastCodeNumber += 1;
    newCode = String(lastCodeNumber).padStart(4, "0");

    // Dynamically collect site codes from columns like site[0], site[1], etc.
    const siteCodes = [];
    Object.keys(row).forEach((key) => {
      if (key.startsWith("site[")) {
        const siteCode = row[key]?.trim();
        if (siteCode) {
          siteCodes.push(siteCode);
        }
      }
    });

    // Validate required fields
    if (!name) {
      errors.push(`Row ${index + 1}: Name is missing or invalid.`);
      continue;
    }
    if (!Contact_Person) {
      errors.push(`Row ${index + 1}: Contact Person is missing or invalid.`);
      continue;
    }
    if (!NatureOfWork) {
      errors.push(`Row ${index + 1}: Nature of Work is missing or invalid.`);
      continue;
    }
    if (!type) {
      errors.push(
        `Row ${index + 1}: Type of Contractor is missing or invalid.`
      );
      continue;
    }
    if (!phone) {
      errors.push(`Row ${index + 1}: Phone is missing or invalid.`);
      continue;
    }
    if (!location) {
      errors.push(`Row ${index + 1}: Location is missing or invalid.`);
      continue;
    }

    // Check for duplicate email
    if (email && existingContractor.has(email.toLowerCase())) {
      errors.push(`Row ${index + 1}: Duplicate email found: ${email}.`);
      continue;
    }

    // Map site codes to site IDs
    const siteRefs = [];
    for (const siteCode of siteCodes) {
      const site = await SiteSchema.findOne({ code: siteCode });
      if (site) {
        siteRefs.push(site._id);
      } else {
        errors.push(`Row ${index + 1}: Invalid site code: ${siteCode}.`);
      }
    }
    
    // Build contractor data object
    const contractorData = {
      name,
      email: email || undefined, // Allow undefined for non-mandatory emails
      phone,
      code: newCode,
      number: lastCodeNumber,
      Contact_Person,
      NatureOfWork,
      type,
      location,
      sites: siteRefs,
    };

    processedData.push(contractorData);
    
    // Track email to prevent duplicates within the same batch
    if (email) {
      existingContractor.add(email.toLowerCase());
    }
  }

  // If validation errors found, throw error with details
  if (errors.length > 0) {
    throw new Error(
      `Errors encountered during processing:\n${errors.join("\n")}`
    );
  }

  return processedData;
}

/**
 * Get Contractor List
 * GET /api/web/contractor
 * Retrieves a paginated and searchable list of contractors with site filtering
 * 
 * @param {Number} req.query.page - Page number (default: 1)
 * @param {Number} req.query.per_page - Items per page (default: 10)
 * @param {String} req.query.sort_by - Field to sort by
 * @param {String} req.query.sort_order - Sort order: "asc" or "desc"
 * @param {String} req.query.search - Search term for contractor name
 * @param {String} req.query.siteId - Filter by site ID
 * @param {String} req.body.langCode - Language code for response messages
 * 
 * @returns {Object} Paginated list of contractors with populated site details
 */
async function getList(req, res) {
  try {
    const reqObj = req.body;
    const { page = 1, per_page = 10, sort_by, sort_order, search, siteId } = req.query;

    // Validate and prepare pagination
    const pageData = Response.validationPagination(page, per_page);
    
    // Build sort criteria
    const sort = sort_by
      ? { [sort_by]: sort_order === "desc" ? -1 : 1 }
      : { _id: 1 };

    // Build match filter
    const matchFilter = { companyIdf: mongoose.Types.ObjectId(req.user.companyIdf) };
    if (search) {
      matchFilter.name = { $regex: search, $options: "i" }; // Case-insensitive search
    }
    if (siteId) {
      matchFilter.sites = mongoose.Types.ObjectId(siteId); // Filter by site
    }

    // Get total count for pagination
    const totalCount = await ContractorSchema.countDocuments(matchFilter);

    // Fetch paginated data with populated site details
    const allRecords = await ContractorSchema.aggregate([
      { $match: matchFilter },
      { $sort: sort },
      { $skip: pageData.offset },
      { $limit: pageData.limit },

      // Lookup to populate sites array
      {
        $lookup: {
          from: "sites",
          let: { siteIds: "$sites" },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$siteIds"] } } },
            { $project: { _id: 1, site_name: 1, location: 1 } } // only needed fields
          ],
          as: "siteData"
        }
      },

      // Optional: Convert siteData to string "Site A / Site B"
      {
        $addFields: {
          siteNames: {
            $cond: [
              { $isArray: "$siteData" },
              {
                $reduce: {
                  input: "$siteData.site_name",
                  initialValue: "",
                  in: {
                    $concat: [
                      { $cond: [{ $eq: ["$$value", ""] }, "", { $concat: ["$$value", " / "] }] },
                      "$$this"
                    ]
                  }
                }
              },
              ""
            ]
          }
        }
      },

      // Project final required fields
      {
        $project: {
          Contact_Person: 1,
          NatureOfWork: 1,
          type: 1,
          location: 1,
          code: 1,
          name: 1,
          email: 1,
          phone: 1,
          created_at: 1,
          updated_at: 1,
          created_by: 1,
          updated_by: 1,
          siteData: 1,   // populated site details
          siteNames: 1   // optional preformatted string
        }
      }
    ]);

   
    return res.status(200).json({
      success: true,
      message: responseMessage(reqObj.langCode, "SUCCESS"),
      current_page: parseInt(page, 10),
      per_page: parseInt(per_page, 10),
      total: totalCount,
      total_pages: Math.ceil(totalCount / parseInt(per_page, 10)),
      data: allRecords
    });

  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: "An error occurred",
      error: error.message || error
    });
  }
}

