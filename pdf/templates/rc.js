/**
 * Rate Comparative PDF Template
 * Generates PDF documents for rate comparative/rate approval documents
 * 
 * This template creates a formatted PDF document showing vendor-wise rate comparisons.
 * It displays items with their specifications, HSN codes, vendor quotes, quantities,
 * rates, GST, freight, and grand totals for comparison and approval decisions.
 * 
 * Key Features:
 * - Site and title information
 * - Rate approval number and date
 * - Vendor-wise rate comparison table
 * - Item details (location, description, HSN code, UOM, quantity)
 * - Financial comparison (rate, GST, rate with GST, freight with GST, grand total)
 * - Remarks column
 * - Company logo and branding
 * 
 * @module pdf/templates/rc
 */

var html_to_pdf = require("html-pdf-node");
const { convertCurrency, formatDate } = require("../../libs/map");
const env = require("../../config/env");
const RateApprovalSchema = require("../../models/RateApproval");
const ItemSchema = require("../../models/Item");
const BrandSchema = require("../../models/Brand");
const ObjectID = require("mongodb").ObjectID;
const { footerData } = require("./footer");
const path = require("path");
const fs = require("fs");
const { companyLogo } = require("../../libs/constant");
const imageToBase64 = require("image-to-base64");
const SiteSchema = require("../../models/Site");

/**
 * Generate Rate Comparative PDF
 * Creates a PDF document for a rate comparative
 * 
 * @param {Object} dataObj - Data object containing requested data
 * @param {Object} dataObj.requestedData - Request data
 * @param {String} dataObj.requestedData.id - Rate approval ID
 * @param {String} dataObj.requestedData.template - Template name
 * 
 * @returns {Promise<Buffer>} PDF buffer
 */
module.exports.generateRcpdf = (dataObj) => {
  return new Promise(async (resolve, reject) => {
    try {
      let requestedData = dataObj.requestedData;

      let getDataResp = await getDetails(requestedData.id, "en");
      console.log("~~~~~~~~getDataResp~~~~~~~~", getDataResp);
      let formattedItems = formatData(getDataResp.vendorRatesVendorWise);
      let BudgetItems = extractItemDetails(
        getDataResp.vendorRatesVendorWise[0].items
      );

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
    <title>Rate Comparative</title>
    <style>
        table, th, td {
            border: 1px solid black;
            border-collapse: collapse;
            padding: 5px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding:10px
        }
    </style>
</head>
<body>
<div style="display: flex; justify-content: space-between;">
                <div>
                    <img style="margin-top: -110px;margin-left:-40px;margin-bottom: -70px;height:300px;" src="https://gamerji-dharmendra.s3.amazonaws.com/PISL+Logo.jpg">
                </div>
                <div style='margin-right:20px;'>
                    <p style='font-size:20px;'>Pragati Infra Solutions Pvt. Ltd.</p>
                    <p style='margin-left:20px;'>CIN - U70101DL2009PTC194947</p>
                </div>
            </div>
             <h2 style=" text-align:center;">RATE COMPARATIVE</h2>
    <div  >
       
        <div class="header">
                 <div>    
           <h4>Site: ${getDataResp.siteDetail.site_name}</h4>
         <h5>Title: ${getDataResp.title}</h5>
         </div>
       
        <div>
            <p>Request Date: ${formattedDate(getDataResp.updated_at)}</p>
            <p>Request No: ${getDataResp.rate_approval_number}</p>
        </div>
    </div>

    <table style="width:98%; margin:10px"  align-items: center;">
        <tr>
           <th>Location</th>
            <th>Item Description</th>
           <th>HSN Code</th>
            <th>Vendor Name</th>
            <th>Date</th>
            <th>UOM</th>
            <th>Quantity</th>
            <th>Rate (₹)</th>
            <th>GST (%)</th>
            <th>Rate with GST(₹)</th>
            <th>Freight with GST (₹)</th>
            <th>Grand Total (₹)</th>
            <th>Remarks</th>

        </tr>
 ${BudgetItems.map(
   (item, index) => `
    <tr style="text-align:center; align-items:center">
       <td>${getDataResp.siteDetail.code}</td>
        <td>${item.ItemName}</td>
        <td>${item.hsnCode}</td>
        <td>PISL Budget</td>
        <td>${formatDate(getDataResp.date)}</td>
        <td>${item.UOM || ""}</td>
        <td>${item.Quantity || ""}</td>
        <td>${item.PISLBudget}</td>
        <td>-</td>
        <td-</td>
        <td>-</td>
        <td>-</td>
        <td> -</td>
        <td></td>

    </tr>
    `
 ).join("")}
        
            ${formattedItems
              .map(
                (item, index) => `
    <tr style="text-align:center; align-items:center">
       <td>${getDataResp.siteDetail.code}</td>
        <td>${item.ItemName}</td>
        <td>${item.hsnCode}</td>
        <td>${item.VendorName}</td>
        <td>${formatDate(getDataResp.date)}</td>
        <td>${item.UOM || ""}</td>
        <td>${item.Quantity || ""}</td>
        <td>${item.Rate}</td>
        <td>${item.GST}</td>
        <td>${item.Amount}</td>
        <td>${item.Freight}</td>
        <td>${item.GrandTotal}</td>
       
       
        <td>${item.remarks || ""}</td>

    </tr>
    `
              )
              .join("")}
    </table>

    <br>

  
</body>
</html>`;

      let isFile = requestedData.isFile;
      let footerContent = await footerData(getDataResp);
      let options = {
        format: "A4",
        landscape: true,
        date: false,
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: "<div></div>",
        footerTemplate: footerContent,
        margin: {
          top: "50px",
          bottom: "50px",
          right: "0px",
          left: "0px",
        },
      };
      let file = {
        content: templateContent,
      };
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

      let recordDetail = await RateApprovalSchema.findOne({
        _id: ObjectID(id),
      }).lean();

      if (!recordDetail) {
        throw {
          errors: [],
          message: "Purchase request not found",
          statusCode: 404,
        };
      }

      const populatedItems = await Promise.all(
        recordDetail.items.map(async (item) => {
          const itemDetail = await ItemSchema.findOne({
            _id: item.item_id,
          }).lean();

          let brandNames;
         
          const uniqueBrandIds = [...new Set(item.brandName)]
            .filter((id) => ObjectID.isValid(id))
            .map((id) => ObjectID(id));

          const brands = await BrandSchema.find(
            { _id: { $in: uniqueBrandIds } },
            { brand_name: 1 }
          ).lean();

          const brandMap = Object.fromEntries(
            brands.map((b) => [b._id.toString(), b.brand_name])
          );

          return {
            ...item,
            itemDetail: {
              ...itemDetail,
              brandName: brandNames,
            },
          };
        })
      );

      // Replace the items array in recordDetail with the populated items
      recordDetail.items = populatedItems;
      console.log("recordDetail", recordDetail.items);
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

function formatData(data) {
  const formattedItems = [];

  data.forEach((entry) => {
    entry.items.forEach((item) => {
      //console.log(item);
      const vendorIds = Object.keys(item.vendors);

      vendorIds.forEach((vendorId, index) => {
        const vendorDetails = item.vendors[vendorId];
        const totalDetails = entry.totals[vendorId] || {};

        // Assuming vendor names are in the same order as vendorIds in entry.vendors array
        const vendorName = entry.vendors[index] || "Unknown Vendor"; // Mapping the vendor name based on position

        // Calculate the amount with GST
        const amountWithGST =
          parseFloat(vendorDetails.amount) +
          (parseFloat(vendorDetails.amount) * item.gst) / 100;

        // Push the data for each item under the same vendor
        formattedItems.push({
          ItemName: item.name,
          Category: item.category,
          SubCategory: item.subCategory,
          Quantity: item.quantity,
          UOM: item.uom,
          GST: item.gst,
          hsnCode: item.hsnCode,
          VendorName: vendorName, // Now we assign the correct vendor name
          Rate: vendorDetails.rate.toFixed(2),
          Amount: amountWithGST.toFixed(2),
          Freight: totalDetails.freight,
          GrandTotal: totalDetails.grandTotal,
          VendorId: vendorId, // To use in sorting and logic for showing totals
          LastItem: false, // We will use this later to mark the last item for each vendor
        });
      });
    });
  });

  // Sort by vendor so that all items from the same vendor are together
  formattedItems.sort((a, b) => a.VendorId.localeCompare(b.VendorId));

  // Mark the last item for each vendor
  for (let i = 0; i < formattedItems.length; i++) {
    if (
      i === formattedItems.length - 1 ||
      formattedItems[i].VendorId !== formattedItems[i + 1].VendorId
    ) {
      // Mark this item as the last one for the vendor
      formattedItems[i].LastItem = true;
    }
  }

  // Now, when we generate the HTML, only show Freight and GrandTotal on the last item of the vendor
  return formattedItems.map((item) => ({
    ItemName: item.ItemName,

    Category: item.Category,
    SubCategory: item.SubCategory,
    Quantity: item.Quantity,
    hsnCode: item.hsnCode,
    UOM: item.UOM,
    GST: item.GST,
    VendorName: item.VendorName,
    Rate: item.Rate,
    Amount: item.Amount,
    Freight: item.LastItem ? item.Freight.toFixed(2) : "", // Only show for the last item
    GrandTotal: item.LastItem ? item.GrandTotal.toFixed(2) : "", // Only show for the last item
  }));
}

function extractItemDetails(formattedItems) {
  return formattedItems.map((item) => ({
    ItemName: item.name,
    PISLBudget: item.pislBudget.toFixed(2),
    hsnCode: item.hsnCode, // Assuming PISLBudget refers to the Rate in this context
    // Set to current date; modify as needed
    UOM: item.uom,
    Quantity: item.quantity,
  }));
}
