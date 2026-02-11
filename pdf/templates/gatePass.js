/**
 * Gate Pass PDF Template
 * Generates PDF documents for material transfer notes/gate passes
 * 
 * This template creates a formatted PDF document for inter-site inventory transfers.
 * It includes transfer details, origin and destination sites, items being transferred,
 * vehicle information, approval status, and timeline of the transfer process.
 * 
 * Key Features:
 * - Transfer number (MTN/Gate Pass number)
 * - Origin and destination site details
 * - Item-wise transfer details (requested, dispatched, received quantities)
 * - Vehicle and driver information
 * - Approval workflow status
 * - Timeline tracking
 * - Company logo and branding
 * 
 * @module pdf/templates/gatePass
 */

var html_to_pdf = require("html-pdf-node");
const { convertCurrency, formatDate } = require("../../libs/map");
const env = require("../../config/env");

const InterSiteSchema = require("../../models/SiteInventoryTransfer");
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
 * Generate Gate Pass PDF
 * Creates a PDF document for a material transfer note/gate pass
 * 
 * @param {Object} dataObj - Data object containing requested data
 * @param {Object} dataObj.requestedData - Request data
 * @param {String} dataObj.requestedData.id - Site inventory transfer ID
 * @param {String} dataObj.requestedData.template - Template name
 * 
 * @returns {Promise<Buffer>} PDF buffer
 */
module.exports.generateGatePass = (dataObj) => {
  return new Promise(async (resolve, reject) => {
    try {
      let requestedData = dataObj.requestedData;

      let getDataResp = await getDetails(requestedData.id, "en");

      console.log("________________________", getDataResp.timeline);

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
            background: #233a61;
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
  <td  style="background-color:#233a61; padding:10px; color:white; text-align:center; font-weight:bold; font-size:20px;">
    PRAGATI INFRA SOLUTIONS PVT LTD
  </td>
</tr>
     <tr>
  <td  style="padding:5px; color:#233a61; text-align:center; font-weight:bold; font-size:16px;">
    MATERIAL TRANSFER NOTE/GATE PASS
  </td>
</tr>

        <tr style="margin-top: -100px;">
            <td >
                <table  cellspacing="0" cellpadding="5px"  border: 0.2px solid black; width="100%">  
                <tr>
                <td>
               <b> MTN/GATE PASS NO. </b>  : ${getDataResp.transfer_number}
                 </td>
                <td>
               
               <b> DATE :</b>  ${formatDate(getDataResp.created_at)}
                </td>
             
                </tr>
                    <tr>
                        <td style="width:50%; ">
                         <b>   Transfer From:      </b>          
                        </td>
                        <td>
                           <b> 	Transfer To: </b>
                        </td>
                    </tr>
                    <tr>
                    <td>
                   <b> Name : </b> ${getDataResp.origin_site.site_name} <br>
                    <b> Address :</b>  ${formatAddress(
                      getDataResp.origin_site.address
                    )}<br>
                  <b>  State :</b> ${getDataResp.origin_site.address.state} <br>
                    </td>
                    <td>
                   <b> Name: </b> ${getDataResp.destination_site.site_name}<br>
                   <b> Address:</b> ${formatAddress(
                      getDataResp.destination_site.address
                    )} <br>
                   <b> State :</b> ${getDataResp.destination_site.address.state} <br>
                    
                    </td>
                    </tr>
                </table>
                
                </td>
            </tr>  
        `;

      if (getDataResp.items && getDataResp.items.length > 0) {
        templateContent += `
              <tr>  
                <td colspan="2">
                    <table cellspacing="0" cellpadding="5px" border="0" width="100%" >
                        <thead style="padding:10px; color:white;">
                            <tr align="center">
                            
            <th>Item Name</th>
            <th>Item Code</th>
            <th>UOM</th>
            <th>Item Type</th>
            <th>Dispatched Quantity</th>
            <th>Remarks</th>  
                            </tr>
                        </thead>             
                        <tbody align="center">
                        `;

        getDataResp.items.forEach((o) => {
          templateContent += `
      <tr>
        <td>${o.item_id.item_name || "-"}</td>
        <td>${o.item_id.item_code || "-"}</td>
        <td>${o.item_id.uom[0].uom_name || "-"}</td>
     <td>${getDataResp.itemType || "-"}</td>
        <td>${o.dispatched_quantity || "-"}</td>
          <td>${o.remarks || ""}</td>
       
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
                    <td colspan="3" style="text-align: center;">
  <b>Vehicle Details</b>
</td>

                    <tr>
                        <td ><b>Vehicle No. :</b>  ${getDataResp.vehicle.vehicle_number}</td>                   
                        <td ><b>Driver Name : </b> ${getDataResp.vehicle.driver_name}</td>
                        <td ><b>Driver Contact :</b>  ${getDataResp.vehicle.driver_contact}</td>
                    </tr>
                     
                    </table>
                    </td>
                    </tr>
                   </table>
          
          </td>
        </tr>  
         </table>
                    
                
                `;

                const dispatchedEntry = getDataResp.timeline.find(t => t.action === "Dispatched");
const receivedEntry = getDataResp.timeline.find(t => t.action === "Received");

      templateContent += `
     
     



              <table  cellspacing="0" cellpadding="5px" border="0" width="100%; padding-top: 20px;">  
             
                
                     <tr>
                        <td style="width:50%; ">
                           <b> Transferred By     </b>          
                        </td>
                        <td>
                           <b>  	Received By</b> 
                        </td>
                    </tr>
                    <tr>
                    <td>
                    Name : ${dispatchedEntry.user.name} <br>
                    Email : ${
                      dispatchedEntry.user.email
                    }<br>
                    Mobile No. :${dispatchedEntry.user.phone} <br>
                    Dispatched Date:${formatDate(getDataResp.dispatch_date) || ""}
                    Sign:_______________________________
                    </td>
                    <td>
                    Name : ${receivedEntry?.user?.name || "_______________________________"} <br>
                     Email : ${
                      receivedEntry?.user?.email || '_______________________________'
                    }<br>
                    Mobile No. :${receivedEntry?.user?.phone || '_______________________________'} <br>
                    Received Date:${formatDate(getDataResp?.received_date) || "_________________________"}
                    Sign:_______________________________
                    
                    </td>
                    </tr>
                      
                  
                   
              </table>
              
              </td>
          </tr>  
           </table>   
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

    let recordDetail = await InterSiteSchema.findById(ObjectID(id))
      .populate("origin_site") // full site
      .populate("destination_site") // full site
      .populate({
        path: "items.item_id",
        select: "item_name item_code uom category sub_category",
        populate: [
          { path: "uom", select: "uom_name" },
          { path: "category", select: "name" },
          { path: "sub_category", select: "subcategory_name" },
        ],
      })
      .populate("created_by", "name email role")
      .populate("updated_by", "name email role")
      .populate("approvals.project_director.approved_by", "name email role")
      .populate("approvals.store_or_pm_head.approved_by", "name email role")
      .populate("timeline.user", "name email role phone");

    if (!recordDetail) {
      throw {
        errors: [],
        message: "DebitNote not found",
        statusCode: 404,
      };
    }

    return recordDetail;
  } catch (err) {
    throw err;
  }
}

function getUOMName(uomId) {
  const uom = this.uomList.find((u) => u._id === uomId);
  return uom ? uom.uom_name : "Unknown UOM";
}

function numberToIndianCurrencyWords(amount) {
  if (amount === 0) return "zero rupees only";

  const ones = [
    "",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const tens = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];

  function numToWords(n) {
    if (n < 20) return ones[n];
    if (n < 100)
      return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000)
      return (
        ones[Math.floor(n / 100)] +
        " hundred" +
        (n % 100 ? " " + numToWords(n % 100) : "")
      );
    return "";
  }

  // Indian system groupings
  function convertToWords(n) {
    let str = "";

    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const hundred = Math.floor(n / 100);
    const rest = n % 100;

    if (crore) str += numToWords(crore) + " crore ";
    if (lakh) str += numToWords(lakh) + " lakh ";
    if (thousand) str += numToWords(thousand) + " thousand ";
    if (hundred) str += ones[hundred] + " hundred ";
    if (rest) str += numToWords(rest) + " ";

    return str.trim();
  }

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let words = "";
  if (rupees > 0) words += convertToWords(rupees) + " rupees";
  if (paise > 0)
    words += (words ? " and " : "") + convertToWords(paise) + " paise";
  return words + " only";
}

function formatAddress(data) {
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
