/**
 * Main Express Application Configuration
 * This file sets up the Express server, middleware, routes, and PDF generation endpoints
 */

// Core dependencies
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require("cors");
const compression = require('compression');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Application routes and database
const routes = require('./routes');
const database = require('./libs/mongoose');
const env = require("./config/env");

// Models
const DebitNote = require("./models/DebitNote");

// PDF generation modules
const generateDebitNote = require('./pdf/generate-debitNote');
const generateDMRInventoryPDF = require('./pdf/generate-dmrInventory');
const generateGatePassPDF = require('./pdf/generate-gatePass');
const generatePDF = require('./pdf/generate-pdf');
const generateRCPDF = require("./pdf/generate-rc-pdf");
const generateIssueSlipPDF = require('./pdf/generate-IssueSlip-pdf');
const generatePRPDF = require('./pdf/generate-pr-pdf');
const generatelocalPOpdf = require('./pdf/generate-localPO');

// Email and response utilities
const sendEmailsInBatches = require("./emails/sendEmail");
const Response = require('./libs/response');
const { responseMessage } = require("./libs/responseMessages");

// Redis initialization
const { initRedis } = require("./config/redis");

// Initialize Express application
const app = express();

/**
 * Initialize Redis connection asynchronously
 * Redis is used for caching to improve application performance
 */
(async () => {
  await initRedis();
})();

/**
 * Middleware Configuration
 */

// Enable response compression for all routes (gzip compression)
app.use(compression({
  threshold: 0  // Compress all responses regardless of size
}));

// View engine setup for server-side rendering (Jade templates)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Enable CORS (Cross-Origin Resource Sharing) for API access from different domains
app.use(cors());

// Parse JSON request bodies (limit: 5MB to handle large payloads)
app.use(express.json({ limit: '5mb' }));

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: false }));

// Parse cookies from request headers
app.use(cookieParser());

// Serve static files from the public directory
app.use(env.serverBasePath, express.static(path.join(__dirname, 'public')));

/**
 * Error Handler Middleware
 * Handles errors that occur during request processing
 */
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  // Only expose error details in development environment
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Render error page with appropriate status code
  res.status(err.status || 500);
  res.render('error');
});

/**
 * API Routes
 * All web API routes are mounted at the configured base path with compression
 */
app.use(env.API.web, compression({ level: 9 }), routes.webRoutes);

/**
 * AWS S3 Configuration
 * Configure AWS SDK with credentials for file storage
 * Note: In production, these should be stored in environment variables
 */
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
const s3 = new AWS.S3();

/**
 * PDF Generation Endpoints
 * These endpoints generate PDFs for various documents and can:
 * 1. Return PDF as binary response (isFile = 2)
 * 2. Upload to S3 and return URL (isFile = 1)
 * 3. Return PDF directly (default)
 */

/**
 * Generic PDF Generation Endpoint
 * POST /generate/pdf
 * Generates a PDF from the provided data
 * 
 * @param {Object} request.body - PDF generation data
 * @param {Number} request.body.isFile - 0: return binary, 1: upload to S3, 2: return as file
 */
app.post(`${env.serverBasePath}/generate/pdf`, async function (request, resp) {
  try {
    let requestedBody = request.body;
    
    // Generate PDF buffer from the provided data
    let pdfBuffer = await generatePDF(requestedBody);
    
    // Option 2: Return PDF as downloadable file
    if (requestedBody && requestedBody.isFile && requestedBody.isFile == 2) {
      resp.setHeader('Content-Type', 'application/pdf');
      resp.send(pdfBuffer);
    } 
    // Option 1: Upload PDF to S3 and return URL
    else if (requestedBody && requestedBody.isFile && requestedBody.isFile == 1) {
      // Generate unique filename using UUID
      const fileName = `pdf_${uuidv4()}.pdf`;
      
      // Upload to AWS S3
      const s3UploadResult = await s3.upload({
        Bucket: 'gamerji-dharmendra',
        Key: fileName,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
      }).promise();

      // Return S3 URL in JSON response
      resp.setHeader('Content-Type', 'application/json');
      resp.status(200).json(await Response.success({ pdf: s3UploadResult.Location }, responseMessage('en', 'SUCCESS'), request));
    } 
    // Default: Return PDF buffer directly
    else {
      resp.send(pdfBuffer);
    }
  } catch (e) {
    // Return error response
    resp.status(422).json(e);
  }
});


/**
 * Local Purchase Order PDF Generation
 * POST /generate/localPO-pdf
 * Generates PDF for local purchase orders
 * 
 * @param {Object} request.body - Local PO data
 * @param {Number} request.body.isFile - Output format (0: binary, 1: S3 URL, 2: file)
 */
app.post(`${env.serverBasePath}/generate/localPO-pdf`, async function (request, resp) {
  try {
    let requestedBody = request.body;
    
    // Generate PDF buffer for local PO
    let pdfBuffer = await generatelocalPOpdf(requestedBody);
    
    // Handle different output formats (same logic as generic PDF endpoint)
    if (requestedBody && requestedBody.isFile && requestedBody.isFile == 2) {
      resp.setHeader('Content-Type', 'application/pdf');
      resp.send(pdfBuffer);
    } else if (requestedBody && requestedBody.isFile && requestedBody.isFile == 1) {
      // Upload to S3
      const fileName = `pdf_${uuidv4()}.pdf`;
      const s3UploadResult = await s3.upload({
        Bucket: 'gamerji-dharmendra',
        Key: fileName,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
      }).promise();

      resp.setHeader('Content-Type', 'application/json');
      resp.status(200).json(await Response.success({ pdf: s3UploadResult.Location }, responseMessage('en', 'SUCCESS'), request));
    } else {
      resp.send(pdfBuffer);
    }
  } catch (e) {
    resp.status(422).json(e);
  }
}); 

/**
 * DMR Inventory PDF Generation
 * POST /generate/DMR-Inventory-pdf
 * Generates PDF for DMR (Delivery Material Receipt) inventory reports
 * 
 * @param {Object} request.body - DMR inventory data
 * @param {Number} request.body.isFile - Output format (0: binary, 1: S3 URL, 2: file)
 */
app.post(`${env.serverBasePath}/generate/DMR-Inventory-pdf`, async function (request, resp) {
  try {
    let requestedBody = request.body;
    
    // Generate DMR inventory PDF
    let pdfBuffer = await generateDMRInventoryPDF(requestedBody);
    
    // Handle different output formats
    if (requestedBody && requestedBody.isFile && requestedBody.isFile == 2) {
      resp.setHeader('Content-Type', 'application/pdf');
      resp.send(pdfBuffer);
    } else if (requestedBody && requestedBody.isFile && requestedBody.isFile == 1) {
      // Upload to S3
      const fileName = `pdf_${uuidv4()}.pdf`;
      const s3UploadResult = await s3.upload({
        Bucket: 'gamerji-dharmendra',
        Key: fileName,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
      }).promise();

      resp.setHeader('Content-Type', 'application/json');
      resp.status(200).json(await Response.success({ pdf: s3UploadResult.Location }, responseMessage('en', 'SUCCESS'), request));
    } else {
      resp.send(pdfBuffer);
    }
  } catch (e) {
    resp.status(422).json(e);
  }
}); 


/**
 * Material Gate Pass PDF Generation
 * POST /generate/material-gatePass
 * Generates PDF for material gate pass documents
 * 
 * @param {Object} request.body - Gate pass data
 * @param {Number} request.body.isFile - Output format (0: binary, 1: S3 URL, 2: file)
 */
app.post(`${env.serverBasePath}/generate/material-gatePass`, async function (request, resp) {
  try {
    let requestedBody = request.body;
    
    // Generate gate pass PDF
    let pdfBuffer = await generateGatePassPDF(requestedBody);
    
    // Handle different output formats
    if (requestedBody && requestedBody.isFile && requestedBody.isFile == 2) {
      resp.setHeader('Content-Type', 'application/pdf');
      resp.send(pdfBuffer);
    } else if (requestedBody && requestedBody.isFile && requestedBody.isFile == 1) {
      // Upload to S3
      const fileName = `pdf_${uuidv4()}.pdf`;
      const s3UploadResult = await s3.upload({
        Bucket: 'gamerji-dharmendra',
        Key: fileName,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
      }).promise();

      resp.setHeader('Content-Type', 'application/json');
      resp.status(200).json(await Response.success({ pdf: s3UploadResult.Location }, responseMessage('en', 'SUCCESS'), request));
    } else {
      resp.send(pdfBuffer);
    }
  } catch (e) {
    resp.status(422).json(e);
  }
}); 

/**
 * Debit Note PDF Generation and Email
 * POST /generate/debitNote-pdf
 * Generates PDF for debit note and optionally sends it via email to vendor
 * 
 * @param {String} req.body.id - Debit Note ID (required)
 * @param {Boolean} req.body.isMailData - If true, sends email with PDF attachment
 * 
 * @returns {Buffer|Object} PDF buffer or success message if email sent
 */
app.post(`${env.serverBasePath}/generate/debitNote-pdf`, async function (req, res) {
  try {
    const { id, isMailData } = req.body;
    
    // Validate debit note ID
    if (!id) {
      return res.status(400).json({ success: false, message: "debitNoteId is required" });
    }

    // Step 1: Generate PDF buffer from debit note data
    const pdfBuffer = await generateDebitNote(req.body);
    
    // Step 2: Email flow - if isMailData is true, send email with PDF attachment
    if (isMailData) {
      // Fetch debit note details from database
      const debitNote = await DebitNote.findById(id).lean();
      if (!debitNote) {
        return res.status(404).json({ success: false, message: "Debit Note not found" });
      }

      // Prepare email recipients
      const toRecipients = debitNote.vendorDetail.email || [];
      const ccRecipients = ["anshika@avidusinteractive.com"];

      // Prepare email HTML content
      const htmlContent = `
        <p>Dear ${debitNote.vendorDetail.vendor_name || "Vendor"},</p>
        <p>Please find attached the Debit Note <b>${debitNote.debitNoteNumber}</b> raised by <b>${debitNote.billingAddress.company_name}</b> booked under invoices ${getInvoice(debitNote.InvoiceNumber)} for PO ${debitNote.poNumber}.</p>
        <p>Regards,<br/>${debitNote.billingAddress.company_name}</p>
      `;

      // Send email with PDF attachment
      await sendEmailsInBatches(
        `Debit Note Request - ${debitNote.debitNoteNumber} - ${debitNote.billingAddress.company_name}`,
        toRecipients,
        ccRecipients,
        htmlContent,
        {},
        [
          {
            filename: `${debitNote.debitNoteNumber}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ]
      );

      return res.status(200).json([{ success: true, message: "Email sent successfully" }]);
    }
    // If not sending email, return PDF buffer directly
    else {
      res.send(pdfBuffer);
    }
  } catch (err) {
    // Handle errors
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
});



/**
 * Purchase Request PDF Generation
 * POST /generate/prpdf
 * Generates PDF for purchase requests
 * 
 * @param {Object} request.body - Purchase request data
 * @param {Number} request.body.isFile - Output format (0: binary, 1: S3 URL, 2: file)
 */
app.post(`${env.serverBasePath}/generate/prpdf`, async function (request, resp) {
  try {
    let requestedBody = request.body;
    
    // Generate purchase request PDF
    let pdfBuffer = await generatePRPDF(requestedBody);
    
    // Handle different output formats
    if (requestedBody && requestedBody.isFile && requestedBody.isFile == 2) {
      resp.setHeader('Content-Type', 'application/pdf');
      resp.send(pdfBuffer);
    } else if (requestedBody && requestedBody.isFile && requestedBody.isFile == 1) {
      // Upload to S3
      const fileName = `pr-pdf_${uuidv4()}.pdf`;
      const s3UploadResult = await s3.upload({
        Bucket: 'gamerji-dharmendra',
        Key: fileName,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
      }).promise();
      
      resp.setHeader('Content-Type', 'application/json');
      resp.status(200).json(await Response.success({ pdf: s3UploadResult.Location }, responseMessage('en', 'SUCCESS'), request));
    } else {
      resp.send(pdfBuffer);
    }
  } catch (e) {
    resp.status(422).json(e);
  }
});


/**
 * Material Issue Slip PDF Generation
 * POST /generate/issueSlip
 * Generates PDF for material issue slips
 * 
 * @param {Object} request.body - Issue slip data
 * @param {Number} request.body.isFile - Output format (0: binary, 1: S3 URL, 2: file)
 */
app.post(`${env.serverBasePath}/generate/issueSlip`, async function (request, resp) {
  try {
    let requestedBody = request.body;
    
    // Generate issue slip PDF
    let pdfBuffer = await generateIssueSlipPDF(requestedBody);
    
    // Handle different output formats
    if (requestedBody && requestedBody.isFile && requestedBody.isFile == 2) {
      resp.setHeader('Content-Type', 'application/pdf');
      resp.send(pdfBuffer);
    } else if (requestedBody && requestedBody.isFile && requestedBody.isFile == 1) {
      // Upload to S3
      const fileName = `issueSlip-_${uuidv4()}.pdf`;
      const s3UploadResult = await s3.upload({
        Bucket: 'gamerji-dharmendra',
        Key: fileName,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
      }).promise();
      
      resp.setHeader('Content-Type', 'application/json');
      resp.status(200).json(await Response.success({ pdf: s3UploadResult.Location }, responseMessage('en', 'SUCCESS'), request));
    } else {
      resp.send(pdfBuffer);
    }
  } catch (e) {
    resp.status(422).json(e);
  }
});


/**
 * Receipt Challan PDF Generation
 * POST /generate/rcpdf
 * Generates PDF for receipt challans
 * 
 * @param {Object} request.body - Receipt challan data
 * @param {Number} request.body.isFile - Output format (0: binary, 1: S3 URL, 2: file)
 */
app.post(`${env.serverBasePath}/generate/rcpdf`, async function (request, resp) {
  try {
    let requestedBody = request.body;

    // Generate receipt challan PDF
    let pdfBuffer = await generateRCPDF(requestedBody);
    
    // Handle different output formats
    if (requestedBody && requestedBody.isFile && requestedBody.isFile == 2) {
      resp.setHeader('Content-Type', 'application/pdf');
      resp.send(pdfBuffer);
    } else if (requestedBody && requestedBody.isFile && requestedBody.isFile == 1) {
      // Upload to S3
      const fileName = `rc-pdf_${uuidv4()}.pdf`;
      const s3UploadResult = await s3.upload({
        Bucket: 'gamerji-dharmendra',
        Key: fileName,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
      }).promise();
      
      resp.setHeader('Content-Type', 'application/json');
      resp.status(200).json(await Response.success({ pdf: s3UploadResult.Location }, responseMessage('en', 'SUCCESS'), request));
    } else {
      resp.send(pdfBuffer);
    }
  } catch (e) {
    resp.status(422).json(e);
  }
});


/**
 * Root Route Handler
 * Serves a welcome page for the root URL
 */
app.use("/", function (req, res, next) {
  res.send('<html><head><title>Pragati Infra</title></head><body><h1>Welcome to Pragati Infra</h1></body></html>');
});

/**
 * 404 Error Handler
 * Handles requests to non-existent routes
 * In production: returns user-friendly HTML page
 * In development: forwards to Express error handler
 */
app.use(function (req, res, next) {
  if (process.env.NODE_ENV == 'production') {
    if (createError(404, 'Requested data not found')) {
      res.send('<html><head><title>Not Found</title></head><body><h1>Requested data not found</h1></body></html>');
    }
  } else {
    next(createError(404));
  }
});

/**
 * Initialize Database Connection
 * Connect to MongoDB using the configured connection string
 */
database.connect();

/**
 * Utility Function: Format Invoice Numbers
 * Converts array of invoice numbers to comma-separated string
 * 
 * @param {Array} arr - Array of invoice numbers
 * @returns {String} Comma-separated invoice numbers
 */
function getInvoice(arr) {
  return arr.join(", ");
}

// Export Express app for use in server startup
module.exports = app;