/**
 * Debit Note PDF Template
 * Generates PDF documents for debit notes
 * 
 * This template creates a formatted PDF document for debit notes issued to vendors.
 * It includes vendor details, debit note number, date, items with quantities and rates,
 * financial breakdown (subtotal, GST, total), and terms & conditions.
 * 
 * Key Features:
 * - Vendor information display
 * - Item-wise debit note details
 * - Financial calculations (item debit note amount, GST, other charges)
 * - Company logo and branding
 * - Terms and conditions section
 * 
 * @module pdf/templates/debitNote
 */

var html_to_pdf = require("html-pdf-node");
const { convertCurrency, formatDate } = require("../../libs/map");
const env = require("../../config/env");

const DebitNoteSchema = require("../../models/DebitNote");
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
 * Generate Debit Note PDF
 * Creates a PDF document for a debit note
 * 
 * @param {Object} dataObj - Data object containing requested data
 * @param {Object} dataObj.requestedData - Request data
 * @param {String} dataObj.requestedData.id - Debit note ID
 * @param {String} dataObj.requestedData.template - Template name
 * 
 * @returns {Promise<Buffer>} PDF buffer
 */
module.exports.generateDebit = (dataObj) => {
  return new Promise(async (resolve, reject) => {
    try {
      let requestedData = dataObj.requestedData;

      let getDataResp = await getDetails(requestedData.id, "en");

      console.log("________________________", getDataResp);

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
        <tr>
            <td>
                <table  cellspacing="0" cellpadding="5px"  border: 0.2px solid black; width="100%">
                    <tr >
                        <td>Company/Seller Name:</td>
                        <td>${
                          getDataResp.vendorDetail.vendor_name
                        } </td>                       
                    </tr>
                    
                    <tr>
                     <td>Address:</td>
                        <td>${formatAddress(
                          getDataResp.vendorDetail.address
                        )} </td> 
                    </tr>
                     <tr>
                     <td>Phone No.:</td>
                        <td>${getDataResp.vendorDetail.phone_number[0]} </td> 
                    </tr>
                     <tr>
                     <td>Email ID:</td>
                        <td>${getDataResp.vendorDetail.email[0]} </td> 
                    </tr>
                     <tr>
                     <td>GSTIN:</td>
                        <td>${getDataResp.vendorDetail.gst_number} </td> 
                    </tr>
                     <tr>
                     <td>State:</td>
                        <td> ${getDataResp.vendorDetail.address.state}</td> 
                    </tr>
                </table>
                
                </td>
            </tr>  
        `;

      /* End:- Header */

      /* Start:- Mail content */

      templateContent += `
     <tr>
  <td  style="background-color:#233a61; padding:5px; color:white; text-align:center; font-weight:bold; font-size:16px;">
    Debit Note
  </td>
</tr>

        <tr style="margin-top: -100px;">
            <td >
                <table  cellspacing="0" cellpadding="5px"  border: 0.2px solid black; width="100%">  
                    <tr>
                        <td style="width:50%; ">
                            Return/Debit From:                
                        </td>
                        <td>
                            	Shipping To:
                        </td>
                    </tr>
                    <tr>
                    <td>
                    Name : ${getDataResp.billingAddress.company_name} <br>
                    Address : ${formatAddress(getDataResp.billingAddress)}<br>
                    Contact : ${getDataResp.billingAddress.contact_person}<br> 
                    GSTIN No. :${getDataResp.billingAddress.gst_number} <br>
                    State :${getDataResp.billingAddress.state} <br>
                    </td>
                    <td>
                    Name: ${getDataResp.delivery_address.company_name}<br>
                    Address:${formatAddress(getDataResp.delivery_address)} <br>
                    PO Number :${getDataResp.poNumber} <br>
                    Return/Debit Date:${formatDate(getDataResp.createdAt)} <br>
                    Return/Debit No.:${getDataResp.debitNoteNumber} <br>
                    Invoice No.: ${getInvoice(getDataResp.InvoiceNumber)}
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
                        <thead background="">
                            <tr align="center">
                            
            <th>Item Name</th>
            <th>Description</th>
            <th>UOM</th>
            <th>PO Rate</th>
             <th>Invoice Rate</th>
            <th>Received Qty</th>
            <th>Invoice Qty</th>
            <th>Debit Qty</th>
            <th>Reason</th>
            <th>GST</th>
            <th>Amount</th>  
                            </tr>
                        </thead>             
                        <tbody align="center">
                        `;

        getDataResp.items.forEach((o) => {
          if (o && o.amount > 0) {
            templateContent += `
      <tr>
        <td>${o.item_name || "-"}</td>
        <td>${o.description || "-"}</td>
        <td>${o.uom?.uom_name || "-"}</td>
        <td>${o.rate || "-"}</td>
         <td>${o.invoice_rate || "-"}</td>
        <td>${o.received_qty || "-"}</td>
        <td>${o.invoice_qty || "-"}</td>
        <td>${o.debit_qty || "-"}</td>
        <td>${o.debit_reason || "-"}</td>
        <td>${o.gst || "-"}</td>
        <td>${o.amount || "-"}</td>
      </tr>`;
          }
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
                        <td style="font-weight:600;">Total Debit Note Amount:</td>                   
                        <td  style="">${convertCurrency(
                          getDataResp.totalAmount
                        )}</td>
                    </tr>
                     <tr>
                        <td  style="font-weight:600;">Total Debit Tax Amount:</td>                   
                        <td  style=""> ${convertCurrency(
                          getDataResp.totalGST
                        )}</td>
                    </tr>
                     <tr>
                        <td  style="font-weight:600;">Grand Total Amount:</td>                   
                        <td  style="">${convertCurrency(
                          getDataResp.grandTotal
                        )}</td>
                    </tr>
                    </table>
                    </td>
                    </tr>
                   
                    
                
                `;

      templateContent += `
                
                <td > <span style="font-weight:600;"> Amount in Words : </span>
                ${numberToIndianCurrencyWords(getDataResp.grandTotal)}
                </td>
                </tr>
                </table>
          
          </td>
        </tr>  
  `;

      templateContent += `
      <tr  ${getDataResp.remarks !== ""}>
          <td>
              <table cellspacing="0" cellpadding="5px" border="0" width="100%">  
        <tr>
          <td colspan="2" border="0">
            <div style="font-size: 13px; color: #292F4C; font-weight:600">
              Remarks:   ${getDataResp.remarks}
            </div>
                                                           
          </td>
        </tr>
      </table>



              <table  cellspacing="0" cellpadding="5px" border="0" width="100%; padding-top: 20px;">  
             
                  <tr>

                      <td>
                          <div style="font-size: 13px;color: #292F4C; font-weight:600" >
                        
                          For Pragati Infra Solutions Pvt. Ltd.
                          </div>  
                           <div style="font-size: 13px;color: #292F4C; font-weight:400" >
                        
                         ${getDataResp.createdBy.name}
                          </div>                                              
                      </td>
                       <td style="width:40%; text-align:right;">
                               <div style="font-size: 13px;color: #292F4C; font-weight:600" >
                        
                       (  ${getDataResp.vendorDetail.vendor_name} )
                          </div>                                     
                      </td>
                  </tr>
                   
              </table>
              
              </td>
          </tr>  
           </table>   
      `;

      templateContent += `                      
                     
           
            <div style="width:100% !important;font-size:12px !important; margin-left:0;">

            <div style="display:block;margin:20px 0 0px 20px;">
            
            <table cellspacing="0" cellpadding="5px" border="0" width="100%">
                                           <tr>
                                            <td style="text-align:left;padding: 0;border:0">Authorised Signatory</td>
                                           
                                            </tr>
                                    </table>
            
            
            
            
            </div> 
           
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

  let recordDetail = await DebitNoteSchema.findOne({ _id: ObjectID(id) })
  .populate("createdBy", "name"); // only fetch `name` field from User

console.log(recordDetail.createdBy.name);



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

function getInvoice(arr) {
  return arr.join(", ");
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
