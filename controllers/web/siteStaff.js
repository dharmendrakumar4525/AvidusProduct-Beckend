/**
 * Site Staff Controller
 * Handles all operations related to Site Staff management including:
 * - Creating and updating site staff
 * - Employee code validation (must be unique)
 * - Bulk site staff upload via CSV
 * - Site staff queries with site filtering and pagination
 */

const router = require("express").Router();
const SiteStaff = require("../../models/SiteStaff");
const SiteSchema = require("../../models/Site");
const { MongoClient } = require('mongodb');
const { responseMessage } = require("../../libs/responseMessages");
const ObjectID = require("mongodb").ObjectID;
const csv = require("csv-parser");
const fs = require("fs");
const mongoose = require('mongoose');
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
  uploadSiteStaffCSV
};

/**
 * Create Site Staff
 * POST /api/web/siteStaff
 * Creates a new site staff member with employee code validation
 * 
 * Validation:
 * - Employee code must be unique across all site staff
 * 
 * @param {String} req.body.name - Staff name (required)
 * @param {Array} req.body.sites - Array of site IDs (required)
 * @param {String} req.body.email - Email address (optional)
 * @param {String} req.body.phone - Phone number (required)
 * @param {String} req.body.role - Staff role (required)
 * @param {String} req.body.employeeCode - Unique employee code (required)
 * @param {String} req.body.langCode - Language code for response messages
 * 
 * @returns {Object} Created site staff object
 */
async function createData(req, res) {
  let reqObj = req.body;
  try {
    const { name, sites, email, phone, role, employeeCode } = req.body;

    // Check if an employee with the same employeeCode already exists
    const existingStaff = await SiteStaff.findOne({ employeeCode, companyIdf: req.user.companyIdf });

    if (existingStaff) {
      // If employeeCode already exists, throw an error
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, 'EMPLOYEE_CODE_EXISTS'),
        statusCode: 409, // Conflict status code
      };
    }

    // If employeeCode is unique, proceed with saving the new staff
    const newSiteStaff = new SiteStaff({
      name,
      sites,
      email,
      phone,
      role,
      employeeCode,
      companyIdf: req.user.companyIdf,
    });

    // Save site staff to database
    const savedStaff = await newSiteStaff.save();
    
    if (savedStaff) {
      res.status(200).json(await Response.success(savedStaff, responseMessage(reqObj.langCode, 'RECORD_CREATED'), req));
    } else {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, 'SOMETHING_WRONG'),
        statusCode: 412,
      };
    }
  } catch (error) {
    return res.status(error.statusCode || 422).json(
      await Response.errors({
        errors: error.errors,
        message: error.message,
      }, error, reqObj)
    );
  }
}



/**
 * Update Site Staff
 * PUT /api/web/siteStaff
 * Updates an existing site staff member
 * 
 * @param {String} req.body._id - Site Staff ID (required)
 * @param {Object} req.body - Site staff fields to update
 * @param {String} req.body.langCode - Language code for response messages
 * @param {String} req.body.login_user_id - User updating the site staff
 * 
 * @returns {Object} Updated site staff object
 */
async function updateData(req, res) {
  try {
    let reqObj = req.body;
    let loginUserId = reqObj.login_user_id;

    // Validate site staff ID
    if (!reqObj._id) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "ID_MISSING"),
        statusCode: 412,
      };
    }

    // Prepare update data with user tracking
    let requestedData = { ...reqObj, ...{ updated_by: loginUserId } };

    // Update site staff and return updated document
    let updatedData = await SiteStaff.findOneAndUpdate(
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
 * Delete Site Staff
 * DELETE /api/web/siteStaff
 * Deletes a site staff member by ID
 * 
 * @param {String} req.query._id - Site Staff ID (required)
 * @param {String} req.body.langCode - Language code for response messages
 * 
 * @returns {Object} Success message
 */
async function deleteData(req, res) {
  try {
    let reqObj = req.body;
    let { _id } = req.query;

    // Validate site staff ID
    if (!_id) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "ID_MISSING"),
        statusCode: 412,
      };
    }

    // Check if site staff exists
    let getData = await SiteStaff.findOne({ _id: ObjectID(_id), companyIdf: req.user.companyIdf });

    if (!getData) {
      throw {
        errors: [],
        message: responseMessage(reqObj.langCode, "NO_RECORD_FOUND"),
        statusCode: 412,
      };
    }

    // Delete site staff
    const dataRemoved = await SiteStaff.deleteOne({ _id: ObjectID(_id), companyIdf: req.user.companyIdf });
 
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


/*async function getList(req, res) {
  try {
    const staffList = await SiteStaff.find().populate("site"); // Populate the site field with its referenced data
    res.status(200).json(staffList);
  } catch (error) {
    res.status(500).json({ message: "Error fetching site staff list", error });
  }
} */


async function getDataByID(req, res) {
//console.log(req);
  try {
     const staff = await SiteStaff.findOne({ _id: req.query._id, companyIdf: req.user.companyIdf });
    
        if (!staff) return res.send("no Staff  exits");
    
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
  }}


  

/**
 * Upload Site Staff CSV
 * POST /api/web/siteStaff/uploadCSV
 * Bulk uploads site staff from a CSV file
 * 
 * CSV Format:
 * - name, email, phone, role, employee_code
 * - site[0], site[1], etc. for multiple site assignments
 * 
 * Processing:
 * - Validates required fields
 * - Checks for duplicate emails and employee codes
 * - Maps site codes to site IDs
 * 
 * @param {File} req.file - CSV file (required)
 * @param {String} req.body.langCode - Language code for response messages
 * 
 * @returns {Array} Array of created site staff objects
 */
async function uploadSiteStaffCSV(req, res) {
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
          // Process the CSV data (validate, map sites)
          const processedData = await processSiteStaffCSVData(results, req.user.companyIdf);

          // Save the processed data to the database
          const savedStaff = await SiteStaff.insertMany(processedData);
  
            // Remove the temporary file
            fs.unlink(req.file.path, (err) => {
              if (err) {
                //console.error("Error deleting file:", err);
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
  
  async function processSiteStaffCSVData(data, companyIdf) {
    const processedData = [];
    const errors = [];
  
    // Fetch all existing site staff to avoid duplicates
    const existingStaff = new Set(
      (await SiteStaff.find({ companyIdf }, "email")).map((staff) => staff.email?.toLowerCase()).filter(Boolean)
    );
  
    for (const [index, row] of data.entries()) {
      const name = row.name?.trim();
      const email = row.email?.trim();
      const phone = row.phone?.trim();
      const role = row.role?.trim();
      const employeeCode = row.employee_code?.trim();
  
      // Dynamically collect site codes
      const siteCodes = [];
      Object.keys(row).forEach((key) => {
        if (key.startsWith("site[")) {
          const siteCode = row[key]?.trim();
          if (siteCode) {
            siteCodes.push(siteCode);
          }
        }
      });
  
      if (!name) {
        errors.push(`Row ${index + 1}: Name is missing or invalid.`);
        continue;
      }
  
      if (!employeeCode) {
        errors.push(`Row ${index + 1}: Employee code is missing or invalid.`);
        continue;
      }
  
      if (!phone) {
        errors.push(`Row ${index + 1}: Phone is missing or invalid.`);
        continue;
      }
  
      if (!role) {
        errors.push(`Row ${index + 1}: Role is missing or invalid.`);
        continue;
      }
  
      if (email && existingStaff.has(email.toLowerCase())) {
        errors.push(`Row ${index + 1}: Duplicate email found: ${email}.`);
        continue;
      }
      //console.log("______________!!!!!!!!!__________", siteCodes);
      const siteRefs = [];
      for (const siteCode of siteCodes) {
        const site = await SiteSchema.findOne({ code: siteCode, companyIdf });
        if (site) {
          siteRefs.push(site._id);
        } else {
          errors.push(`Row ${index + 1}: Invalid site code: ${siteCode}.`);
        }
      }
  //console.log("________________________", siteRefs);
      const staffData = {
        name,
        email: email || undefined, // Allow undefined for non-mandatory emails
        phone,
        role,
        employeeCode,
        sites: siteRefs,
        companyIdf,
      };
  
      processedData.push(staffData);
      if (email) {
        existingStaff.add(email.toLowerCase());
      }
    }
  
    if (errors.length > 0) {
      throw new Error(`Errors encountered during processing:\n${errors.join("\n")}`);
    }
  
    return processedData;
  }
  
async function getList(req, res) {
  try {
    const reqObj = req.body;
    const { page = 1, per_page = 10, sort_by, sort_order, search, siteId } = req.query;

    const pageData = Response.validationPagination(page, per_page);
    const sort = sort_by
      ? { [sort_by]: sort_order === "desc" ? -1 : 1 }
      : { _id: 1 };

    // Build match filter
    const matchFilter= { companyIdf: ObjectID(req.user.companyIdf) };
    if (search) {
      matchFilter.name = { $regex: search, $options: "i" };
    }
    if (siteId) {
      matchFilter.sites = mongoose.Types.ObjectId(siteId); // match site in array
    }

    // Get total count efficiently
    const totalCount = await SiteStaff.countDocuments(matchFilter);

    // Fetch paginated data with populated sites
    const allRecords = await SiteStaff.aggregate([
      { $match: matchFilter },
      { $sort: sort },
      { $skip: pageData.offset },
      { $limit: pageData.limit },

      // Populate sites array
      {
        $lookup: {
          from: "sites",
          let: { siteIds: "$sites" },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$siteIds"] } } },
            { $project: { site_name: 1, location: 1 } } // only required fields
          ],
          as: "siteDetails"
        }
      },

      // Project required fields
      {
        $project: {
          name: 1,
          role: 1,
          email: 1,
          phone: 1,
          employeeCode: 1,
          created_at: 1,
          updated_at: 1,
          created_by: 1,
          updated_by: 1,
          siteDetails: 1 // populated site info
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
