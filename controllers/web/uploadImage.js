/**
 * Upload Image Controller
 * Handles file upload operations to AWS S3 including:
 * - Multiple file uploads
 * - Unique file naming with UUID
 * - File type detection
 * - Temporary file cleanup
 * - S3 URL generation
 */

const Response = require('../../libs/response');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { responseMessage } = require("../../libs/responseMessages");
const mime = require('mime-types');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);
require('dotenv').config();

// Export all controller functions
module.exports = {
    upload
};

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });
const publicPath = path.resolve('./public');



/**
 * Upload Files to S3
 * POST /api/web/uploadImage
 * Uploads multiple files to AWS S3 and returns their URLs
 * 
 * Process:
 * - Reads uploaded files from multer
 * - Generates unique file names using UUID
 * - Detects file MIME type
 * - Uploads to S3 bucket
 * - Cleans up temporary files
 * - Returns mapping of file names (without extension) to S3 URLs
 * 
 * @param {Array} req.files - Array of uploaded files (from multer middleware)
 * @param {String} req.langCode - Language code for response messages
 * 
 * @returns {Object} Object with filenames mapping (filename without extension -> S3 URL)
 */
async function upload(req, res) {
  try {
    const uploadedFilesMap = {};
    
    // Validate file count (max 10 files)
    if (req.files && req.files.length > 10) {
      return res.status(400).json(
        await Response.errors({
          errors: [],
          message: responseMessage(req.langCode || 'en', 'MAX_FILES_EXCEEDED') || 'Maximum 10 files allowed',
        }, { statusCode: 400 }, req)
      );
    }
    
    // Process files if any were uploaded
    if (req.files && req.files.length > 0) {
      const bucketName = 'gamerji-dharmendra';

      // Process each file
      for (let file of req.files) {
        // Read file content
        const fileContent = fs.readFileSync(file.path);
        
        // Detect file MIME type
        const fileType = mime.lookup(file.originalname) || 'application/octet-stream';

        // Extract file name without extension for mapping key
        const fileNameWithoutExt = path.basename(file.originalname, path.extname(file.originalname));
        
        // Generate unique file name with UUID
        const uniqueFileName = `${uuidv4()}-${file.originalname}`;

        // Prepare S3 upload parameters
        const params = {
          Bucket: bucketName,
          Key: `uploads/${uniqueFileName}`, // Store in uploads folder with unique name
          Body: fileContent,
          ContentType: fileType,
        };

        try {
          // Upload to S3
          const s3UploadResult = await s3.upload(params).promise();
          
          // Remove temporary file from local storage
          fs.unlinkSync(file.path);

          // Map file name (without extension) to S3 URL
          uploadedFilesMap[fileNameWithoutExt] = s3UploadResult.Location;
        } catch (uploadError) {
          throw {
            errors: [],
            message: responseMessage(req.langCode, 'FILE_UPLOAD_FAILED'),
            statusCode: 500
          };
        }
      }
    }

    // Return mapping of file names to S3 URLs
    res.status(200).json(await Response.success({
      filenames: uploadedFilesMap // Key: filename without extension, Value: S3 URL
    }, responseMessage(req.langCode, 'RECORD_CREATED'), req));
  } catch (error) {
    return res.status(error.statusCode || 422).json(
      await Response.errors({
        errors: error.errors,
        message: error.message,
      }, error, req)
    );
  }
}

