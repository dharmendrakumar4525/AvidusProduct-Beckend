/**
 * DMR Inventory PDF Template
 * Generates PDF documents for DMR (Delivery Material Receipt) inventory reports
 * 
 * This template creates a formatted PDF document showing DMR inventory details
 * including vendor information, DMR entry details, challan information, items received,
 * and inventory status.
 * 
 * Key Features:
 * - Vendor and site details
 * - DMR entry information (DMR number, date, gate entry details)
 * - Challan number and status
 * - Item-wise inventory details
 * - Company logo and branding
 * 
 * @module pdf/templates/dmrInventory
 */

var html_to_pdf = require("html-pdf-node");
const { convertCurrency, formatDate } = require("../../libs/map");
const env = require("../../config/env");

const DMREntrySchema = require("../../models/dmrEntry");
const siteSchema = require("../../models/Site");
const itemSchema = require("../../models/Item");
const User = require("../../models/User");
const ObjectID = require("mongodb").ObjectID;
const { ObjectId } = require("mongodb");
const { footerData } = require("./footer");
const path = require("path");
const fs = require("fs");
const { companyLogo } = require("../../libs/constant");
const imageToBase64 = require("image-to-base64");
const { HeaderData } = require("./Header");
const { head } = require("lodash");
const sendEmailsInBatches = require("../../emails/sendEmail");

/**
 * Generate DMR Inventory PDF
 * Creates a PDF document for DMR inventory report
 * 
 * @param {Object} dataObj - Data object containing requested data
 * @param {Object} dataObj.requestedData - Request data
 * @param {String} dataObj.requestedData.id - DMR entry ID
 * @param {String} dataObj.requestedData.template - Template name
 * 
 * @returns {Promise<Buffer>} PDF buffer
 */
module.exports.generateDMRInventory = (dataObj) => {
  return new Promise(async (resolve, reject) => {
    try {
      let requestedData = dataObj.requestedData;
      //console.log("check requestedData", requestedData);
      let getDataResp = await getDetails(requestedData.id, "en");

      //console.log("________________________", getDataResp);

      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      const yearRange = `${String(currentYear).slice(-2)}-${String(
        nextYear
      ).slice(-2)}`;
      // let brandNameId=getDataResp.items.item.brandName;
      // let brandName=await getBrandName(getDataResp.items.item.brandName,'en');
      let currentlang = "en";

      /* Start:- Style */
      let templateContent = `  
        <style>
        html { -webkit-print-color-adjust: exact; }
        * {
            font-family: sans-serif;
        }

        body {
            margin-top: 0cm;

            margin-left: 2cm;
            margin-right: 2cm;
            font-size: 12px;
            font-family: sans-serif;
        }
            
        thead th {
            background: #EDF0F2;;
        }

       
      
        td {
        border: 0.2px solid black;
        }
     
        .section-heading{
            font-weight:600;
            font-size:16px;
        }
    </style>        
        `;

      templateContent += `
          
        <table cellpadding="5px" border: 0.2px solid black; width="100% style="padding:10px" >
       
        `;

      /* End:- Header */

      /* Start:- Mail content */

      templateContent += `
     <tr>
  <td  style="background-color:#233a61; padding:5px; color:white; text-align:center; font-weight:bold; font-size:16px;">
    DMR Inventory Report - ${getDataResp.Site.site_name} - ${
        getDataResp.ChallanNumber
      }
  </td>
</tr>

        <tr style="margin-top: -100px;">
            <td >
                <table  cellspacing="0" cellpadding="5px"  border: 0.2px solid black; width="100%">  
                    <tr>
                        <td style="width:50%; ">
                            Vendor Details:                
                        </td>
                        <td>
                               DMR Entry Details:
                        </td>
                    </tr>
                    <tr>
                    <td>
                    Name : ${getDataResp.vendor_detail.vendor_name} <br>
                    Address : ${formatAddress(
                      getDataResp.vendor_detail.address
                    )}<br>
                    Contact : ${getDataResp.vendor_detail.contact_person}<br> 
                    GSTIN No. :${getDataResp.vendor_detail.gst_number} <br>
                   
                    </td>
                    <td>
                    Site Name : ${getDataResp.Site.site_name} <br>
                    PO Number :${getDataResp.PONumber} <br>
                    DMR Entry No.:${getDataResp.DMR_No} <br>
                    DMR Date :${getDataResp.dmrdate}<br>
                    Invoice No.: ${getDataResp.ChallanNumber}<br>
                    Invoice Date : ${formatDate(getDataResp.challan_date)} <br>
                    </td>
                    </tr>
                </table>
                
                </td>
            </tr>  
        `;

      if (getDataResp.dmritem && getDataResp.dmritem.length > 0) {
        templateContent += `
              <tr>  
                <td colspan="2">
                    <table cellspacing="0" cellpadding="5px" border="0" width="100%" >
                        <thead background="">
                            <tr align="center">
                            
            <th>Item Name</th>
            <th>UOM</th>
            <th>PO Rate</th>
            <th>Received Qty</th>
            <th>Invoice Qty</th>
            <th>Debit Qty</th>
            <th>GST</th>
            <th>Invoice Amount(incl. tax)</th>  
            <th>Remarks</th>
            
                            </tr>
                        </thead>             
                        <tbody align="center">
                        `;

        getDataResp.dmritem.forEach((o) => {
          templateContent += `
      <tr>
        <td>${o.item.item_name || "-"}</td>
        <td>${o.uom || "-"}</td>
        <td>${o.Rate || 0}</td>
         <td>${o.totalReceivedQuantity || 0}</td>
        <td>${o.invoiceQty || 0}</td>
        <td>${o.totalDebitNoteQty || 0}</td>
        <td>${o.gst || "-"}</td>
        <td>${o.InvoiceRate || 0}</td>
        <td>${o.Remarks || " "}</td>
      </tr>`;
        });
      }
      templateContent += `   </tbody>
      </table>
        </td>
        </tr>`;

      templateContent += `
                    
                    <tr>
                    <td>
                    <table cellspacing="0" cellpadding="5px" border="0" width="100%" >
                     <tr>
                        <td style="font-weight:600;">Freight:</td>                   
                        <td  style=""> ₹ ${convertCurrency(
                          getDataResp.Freight.totalfreight || 0
                        )}</td>
                    </tr>
                     <tr>
                        <td style="font-weight:600;">Other Charges:</td>                   
                        <td  style=""> ₹ ${convertCurrency(
                          getDataResp.otherCharges.totalotherCharges || 0
                        )}</td>
                    </tr>
                     <tr>
                        <td style="font-weight:600;">TCS Charges:</td>                   
                        <td  style=""> ₹ ${convertCurrency(
                          getDataResp.tcsCharges || 0
                        )}</td>
                    </tr>
                   
                     <tr>
                        <td  style="font-weight:600;">Total Amount (Incl. Tax):</td>                   
                        <td  style=""> ₹ ${convertCurrency(
                          getDataResp.TotalAmount
                        )}</td>
                    </tr>
                     <tr>
                        <td  style="font-weight:600;">Vendor Invoice Amount (Incl. Tax) :</td>                   
                         <td  style=""> ₹ ${convertCurrency(
                           getDataResp.vendorInvoiceTotal
                         )} </td>
                    </tr>
                    </table>
                    </td>
                    </tr>
                   
                    
                
                `;

      //console.log("________________________", templateContent);
      const isFile = requestedData.isFile;

      // Initial PDF generation with placeholder for page numbers
      const options = {
        format: "A4",
        printBackground: true,
        displayHeaderFooter: true,

        margin: {
          top: "150px", // Adjust for header if any
          bottom: "120px", // Adjust for footer position
          right: "10px",
          left: "10px",
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

      await html_to_pdf
        .generatePdf({ content: templateContent }, options)

        .then(async (finalPdfBuffer) => {
          //console.log("Returning PDF buffer directly");
          resolve(finalPdfBuffer); // Resolving the final buffer
        })
        .catch((error) => {
          console.error("Error in generating PDF:", error);
          throw error;
        });
    } catch (error) {
      console.error("Error in generatePdf:", error);
      return reject(error);
    }
  });
};

async function getDetails(id) {
  try {
    if (!id) {
      throw {
        errors: [],
        message: "Id missing",
        statusCode: 412,
      };
    }

    let recordDetail = await DMREntrySchema.findOne({ _id: ObjectID(id) });
    const recordObj = recordDetail.toObject();
    const siteDetail = await siteSchema.findOne({
      _id: ObjectID(recordObj.Site),
    });

    recordObj.Site = siteDetail;

    if (!recordObj) {
      throw {
        errors: [],
        message: "DebitNote not found",
        statusCode: 404,
      };
    }

    return recordObj;
  } catch (err) {
    throw err;
  }
}

function formatAddress(data) {
  console.log("address data", data);
  const parts = [
    data.street_address,
    data.street_address2,
    data.city,
    data.state,
    data.country,
    data.zip_code,
  ];

  return parts.filter((part) => part && part.trim() !== "").join(", ");
}
