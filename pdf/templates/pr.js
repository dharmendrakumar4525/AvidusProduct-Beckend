/**
 * Purchase Request PDF Template
 * Generates PDF documents for purchase requests
 * 
 * This template creates a formatted PDF document for purchase requests.
 * It includes site details, PR number, request type, items with specifications,
 * quantities, UOM, brands, and approval information.
 * 
 * Key Features:
 * - Site and request type information
 * - Purchase request number and date
 * - Item-wise details (item codes, specifications, HSN codes, quantities, UOM, brands)
 * - Local purchase flag
 * - Approval status
 * - Company logo and branding
 * 
 * @module pdf/templates/pr
 */

var html_to_pdf = require("html-pdf-node");
const { convertCurrency, formatDate } = require("../../libs/map");
const env = require("../../config/env");
const PurchaseRequestSchema = require("../../models/PurchaseRequest");
const ItemSchema = require("../../models/Item");
const CategorySchema = require("../../models/Category");
const SubCategorySchema = require("../../models/SubCategory");
const BrandSchema = require("../../models/Brand");
const ObjectID = require("mongodb").ObjectID;
const { footerData } = require("./footer");
const path = require("path");
const fs = require("fs");
const { companyLogo } = require("../../libs/constant");
const imageToBase64 = require("image-to-base64");
const SiteSchema = require("../../models/Site");

/**
 * Generate Purchase Request PDF
 * Creates a PDF document for a purchase request
 * 
 * @param {Object} dataObj - Data object containing requested data
 * @param {Object} dataObj.requestedData - Request data
 * @param {String} dataObj.requestedData.id - Purchase request ID
 * @param {String} dataObj.requestedData.template - Template name
 * 
 * @returns {Promise<Buffer>} PDF buffer
 */
module.exports.generatePRpdf = (dataObj) => {

  //console.log("dataObj", dataObj);
  return new Promise(async (resolve, reject) => {
    try {
      let requestedData = dataObj.requestedData;

      let getDataResp = await getDetails(requestedData.id, "en");
      //console.log("~~~~~~~~getDataResp~~~~~~~~", getDataResp);
      let data = JSON.stringify(getDataResp, null, 2);
      //console.log("data~~~~~~~~", data);

      // Define the templateContent variable here
      let templateContent = "";

      /* Start:- Style */
      templateContent += `  
            <style>
            /* Your CSS styles go here */
            </style>        
            `;
      /* End:- Style */

      /* Start:- Header */

      let approvedBy = getDataResp.approvedBy ? getDataResp.approvedBy : "";

      templateContent += `<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Purchase Request</title>
    <style>
        table{
            border: 1px solid black;
            border-collapse: collapse;
            padding: 10px;
            width:100%;
        }

        th, td {
            border: 1px solid black;
            border-collapse: collapse;
            padding: 5px;
            font-size:12px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            
            padding:10px
        }
    </style>
</head>
<body>
<div style="display: flex; justify-content: space-between;">
                <div>
                    <img style="margin-top: -110px;margin-left:-40px;margin-bottom: -70px;height:270px;" src="https://gamerji-dharmendra.s3.amazonaws.com/PISL+Logo.jpg">
                </div>
                <div style='margin-right:20px;'>
                    <p style='font-size:18px;'>Pragati Infra Solutions Pvt. Ltd.</p>
                    <p style='margin-left:18px;'>CIN - U70101DL2009PTC194947</p>
                </div>
            </div>
             <h3 style=" text-align:center;">REQUISITION REQUEST</h2>
    <div  >
       
        <div class="header">
                 <div  style="display: flex; flex-direction: column; align-items: flex-start; gap: 0;">    
           <h5 style="margin: 5px; line-height: 1;">Site: ${getDataResp.siteDetail.site_name}</h5>
           <h5 style="margin: 5px; line-height: 1;">Request Type: ${getDataResp.prType || "Site Establishment"}</h5>
          ${
            getDataResp.local_purchase === "yes"
              ? `<h5 style="margin: 5px; line-height: 1;">Purchase Type: Local Purchase</h5>`
              : ""
          }
         <h5 style="margin: 5px; line-height: 1;"> Request Category: ${getDataResp.title}</h5>
         </div>
       
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0;font-size:14px">
            <p style="margin: 5px; line-height: 1;">Request Date: ${formattedDate(getDataResp.created_at)}</p>
            <p style="margin: 5px; line-height: 1;">Request No: ${getDataResp.purchase_request_number}</p>
        </div>
    </div>

    <table style="width:100%;  align-items: center;">
        <tr>
            <th>Sr. No.</th>
             <th>Item Code</th>
            <th>Item Name</th>
            <th>Item Type</th>
           
             <th>Qty</th>
             ${getDataResp.local_purchase === "yes" ? `<th>Rate</th>` : ""}
             <th>UOM</th>
            <th> HSN Code</th>
           
            <th>Sub Category</th>  
            <th>Make List</th>
            <th>Required by (Date)</th>
            <th>Remarks</th>
        </tr>
            ${getDataResp.items
              .map(
                (item, index) => `
    <tr style="text-align:center; align-items:center">
        <td>${index + 1}</td>
         <td>${item.itemDetail.item_code || ""}</td>
        <td>${item.itemDetail.item_name}</td>
         <td>${getDataResp.prType === "Project BOQ (PB)" ? "BOQ" : "SE"}</td>
       
         <td>${item.qty || ""}</td>
         ${
           getDataResp.local_purchase === "yes"
             ? `<td>${item.rate || ""}</td>`
             : ""
         }
          <td>${item.uom || ""}</td>
         <td>${item.hsnCode}</td>
        
        <td>${item.itemDetail.sub_categoryName}</td>
        <td style="width:100px">${item.itemDetail.brandName}</td>
       
        <td>${
          item.itemDetail ? formatDate(getDataResp.expected_delivery_date) : ""
        }</td>
        <td>${item.remark || ""}</td>
    </tr>
    `
              )
              .join("")}
    </table>

    <br>
 ${
   getDataResp.local_purchase === "yes" && getDataResp.vendors_total
     ? `<table style="width:100%;  align-items: center;">
  
  

     <tr>
             <td style="width:50%">Freight Charges: ${formatToRupees(
               getDataResp.vendors_total.freight
             )}</td>
            <td>Other Charges : ${formatToRupees(
              getDataResp.vendors_total.otherCharges
            )}</td>
        </tr>
         <tr>
            <td style="width:50%">Freight Charges GST: ${
              getDataResp.vendors_total.freightGST
            }%</td>
            <td>Other Charges GST: ${
              getDataResp.vendors_total.otherChargesGST
            }%</td>
        </tr>
  <tr>
            <td style="width:50%">Freight Total: ${formatToRupees(
              getDataResp.vendors_total.freightTotal
            )}</td>
            <td>Charges Total: ${formatToRupees(
              getDataResp.vendors_total.otherChargesTotal
            )}</td>
        </tr>
        <tr>
            <td style="width:50%">SubTotal: ${formatToRupees(
              getDataResp.vendors_total.subTotal
            )}</td>
            <td>GST Amount: ${formatToRupees(
              getDataResp.vendors_total.gstAmount
            )}</td>
        </tr>
         <tr>
            <td style="width:50%;" colspan="2">
    
Total Amount: ${formatToRupees(getDataResp.vendors_total.total)}</td>
            
        </tr>
        
         
        `
     : ""
 }
    </table>
    <table style="width:100%;  align-items: center;">
     <tr>
            <td style="width:50%">Remarks/Additional Details</td>
            <td>${getDataResp.remarks}</td>
        </tr>
        <tr>
            <td style="width:50%">Store In charge:</td>
            <td>${getDataResp.handle_by}</td>
        </tr>
          <tr>
            <td>Project Manager :</td>
               <td>${getDataResp.PM_approvedBy}</td>
        </tr>
        <tr>
            <td>Project Lead :</td>
               <td>${getDataResp.PD_approvedBy}</td>
        </tr>
       
    </table>
</body>
</html>`;
      /* End:- Header */

      // Rest of the code...

      const isFile = requestedData.isFile;

      // Initial PDF generation with placeholder for page numbers
      const options = {
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        
        margin: {
          top: "50px",       // Adjust for header if any
          bottom: "50px",   // Adjust for footer position
          right: "0px",
          left: "0px",
        },
        headerTemplate: `
  <div style="display: none;"></div> <!-- Hides unwanted header -->
`,
footerTemplate: `
<div style="font-size: 7px; width: 100%; text-align: center;">
    <span class="pageNumber"></span> / <span class="totalPages"></span>
  </div>
  
`,
        
      };
      // Create a file object to hold your HTML content
      const file = {
        content: templateContent,
      };

      // Generate the PDF from the content
      /*const pdfBuffer = await html_to_pdf.generatePdf(file, options);

      // Since we can't directly calculate the total pages, we'll calculate it after the PDF is generated
      console.log("____________PDF Buffer Length:", pdfBuffer.length);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const totalPages = pdfDoc.getPages().length; // You will need to define A4PageSizeHeight

      // Update the footer with the actual total pages
      console.log("____________Total Pages:", totalPages);

      const updatedOptions = {
        ...options,
        pageRange: "all", // Apply to all pages
        footerTemplate: `
                <div style="font-size: 7px; text-align: center; width: 100%; padding: 10px 0;">
                  Page <span class="pageNumber"></span> of ${totalPages}
                </div>
              `,
      }; */
      html_to_pdf
        .generatePdf(file, options)
        .then(async (pdfBuffer) => {
          resolve(pdfBuffer);
        })
        .catch((err) => {
          //console.log("err", err);
          reject(err);
        });
    } catch (e) {
      //console.log("Error in generatePRpdf:", e);
      reject(e);
    }
  });
};

function formattedDate(dateString) {
  // Create a Date object using the input string
  const date = new Date(dateString);
  //console.log("checkin this new format", dateString);

  if (isNaN(date.getTime())) {
    throw new Error("Invalid date format");
  }

  // Format the date as 'DD MMM YYYY'
  const formattedDay = String(date.getDate()).padStart(2, "0");
  const formattedMonth = date.toLocaleString("en-US", { month: "short" });
  const formattedYear = date.getFullYear();

  return `${formattedDay} ${formattedMonth} ${formattedYear}`;
}

function getFormattedBrandNames(brandName) {
  //console.log("see BrandName", brandName);
  if (this.isArray(brandName)) {
    return brandName.map((brand) => this.myBrandName(brand)).join(" / ");
  } else {
    return this.myBrandName(brandName);
  }
}

async function getCategoryName(categoryId) {
  const category = await CategorySchema.findOne({ _id: ObjectID(categoryId) });
  return category ? category.name : null;
}

async function getSubCategoryName(subcategoryId) {
  const subcategory = await SubCategorySchema.findOne({
    _id: ObjectID(subcategoryId),
  });
  return subcategory ? subcategory.subcategory_name : null;
}

function getDetails(id, langCode) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!id) {
        throw {
          errors: [],
          message: "Id missing",
          statusCode: 412,
        };
      }

      let recordDetail = await PurchaseRequestSchema.findOne({
        _id: ObjectID(id),
      }).lean();
//console.log("recordDetail", recordDetail);
      if (!recordDetail) {
        throw {
          errors: [],
          message: "Purchase request not found",
          statusCode: 404,
        };
      }

      // Fetch item details for all items
      const populatedItems = await Promise.all(
        recordDetail.items.map(async (item) => {
          const itemDetail = await ItemSchema.findOne({
            _id: ObjectID(item.item_id),
          }).lean();
//console.log("itemDetail", itemDetail);
          // Fetch brand names
          let brandNames = "Others";

if (Array.isArray(item.brandName)) {
  const validIds = item.brandName.filter((id) => id && id.trim() !== "");
  if (validIds.length > 0) {
    const brandDetails = await BrandSchema.find({
      _id: { $in: validIds.map((id) => ObjectID(id)) },
    }).lean();
    brandNames = brandDetails.map((brand) => brand.brand_name).join(" / ");
  }
} else if (item.brandName && item.brandName.trim() !== "") {
  const brandDetail = await BrandSchema.findOne({
    _id: ObjectID(item.brandName),
  }).lean();
  brandNames = brandDetail ? brandDetail.brand_name : "Others";
}
         

          //console.log("brandNames", brandNames);

          // Fetch category name
          const categoryName = await getCategoryName(itemDetail.category);
          const subCategoryName = await getSubCategoryName(
            itemDetail.sub_category
          );

          return {
            ...item,
            itemDetail: {
              ...itemDetail,
              brandName: brandNames,
              categoryName: categoryName,
              sub_categoryName: subCategoryName, // Add category name here
            },
          };
        })
      );

      // Replace the items array in recordDetail with the populated items
      recordDetail.items = populatedItems;

      // Fetch and populate site data
      if (recordDetail.site) {
        const siteDetail = await SiteSchema.findOne({
          _id: ObjectID(recordDetail.site),
        }).lean();
        recordDetail.siteDetail = siteDetail || null;
      }

      resolve(recordDetail);
    } catch ($e) {
      console.error("Error in getDetails:", $e);
      return reject($e);
    }
  });
}

// Example of calling getCategoryName using async/await

function formatToRupees(amount) {
  //console.log(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}
