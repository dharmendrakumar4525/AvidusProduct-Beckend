/**
 * Purchase Order PDF Template
 * Generates PDF documents for purchase orders
 * 
 * This template creates a formatted PDF document for purchase orders.
 * It supports revision tracking and includes vendor details, PO number,
 * dates, items with specifications, quantities, rates, GST, freight,
 * billing cycle, and terms & conditions.
 * 
 * Key Features:
 * - Vendor information and billing address
 * - PO number with revision support
 * - Item-wise details (specifications, HSN codes, quantities, rates, brands)
 * - Financial breakdown (subtotal, GST, freight, total)
 * - Billing cycle information
 * - Terms and conditions
 * - Company logo and branding
 * - Revision history tracking
 * 
 * @module pdf/templates/po
 */

var html_to_pdf = require("html-pdf-node");
const { convertCurrency, formatDate } = require("../../libs/map");
const env = require("../../config/env");

const PurchaseOrderSchema = require("../../models/PurchaseOrder");
const BrandSchema = require("../../models/Brand");
const ObjectID = require("mongodb").ObjectID;
const { footerData } = require("./footer");
const path = require("path");
const fs = require("fs");
const { companyLogo } = require("../../libs/constant");
const imageToBase64 = require("image-to-base64");
const { HeaderData } = require("./Header");
const { head } = require("lodash");

/**
 * Generate Purchase Order PDF
 * Creates a PDF document for a purchase order
 * 
 * @param {Object} dataObj - Data object containing requested data
 * @param {Object} dataObj.requestedData - Request data
 * @param {String} dataObj.requestedData.id - Purchase order ID
 * @param {Number} dataObj.requestedData.revision - Revision number (optional, defaults to 0)
 * @param {String} dataObj.requestedData.template - Template name
 * 
 * @returns {Promise<Buffer>} PDF buffer
 */
module.exports.generatePdf = (dataObj) => {
  return new Promise(async (resolve, reject) => {
    try {
      let requestedData = dataObj.requestedData;
      let revision = requestedData.revision || 0;
console.log("Requested Data in PO PDF:", requestedData);
      let getDataResp = await getDetails(requestedData.id, requestedData.revision, "en");

      //console.log("________________________", getDataResp.items);
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
            font-size: 16px;
            font-family: sans-serif;
        }
            
        thead th {
            background: #EDF0F2;;
        }

        table {
            width: 100%;
            
        }
        
        .invoice-table td{
            border-bottom: 1px solid black;
            border-right: 1px solid black;
            font-size: 13px;
        }
        .invoice-table tr td:first-child{
            border-left: 1px solid black;
        }
        .invoice-table th {
            border-bottom: 1px solid black;
            border-top: 1px solid black;
            border-right: 1px solid black;
            font-size: 13px;
        }
        .invoice-table tr th:first-child {
            border-left: 1px solid black;
        }
        .terms-table td,
        .terms-table th {
            font-size: 13px;
        }

        .section-heading{
            font-weight:600;
            font-size:16px;
        }
    </style>        
        `;
      /* End:- Style */

      /* Start:- Header */

      let date = formatDate(getDataResp.poDate);
      //console.log("________________________", getDataResp.poDate);
      let dueDate = formatDate(getDataResp.revision[revision].due_date||getDataResp.due_date);
      let StartDate = formatDate(getDataResp.revision[revision].poStartDate ||getDataResp.poStartDate);

      templateContent += `
            <div style="display: flex; justify-content: space-between;">
                <div >
                  
                </div>
                <div style='margin-right:20px;'>
                   
                </div>
            </div>
        <table cellspacing="0" cellpadding="7px" border="0" width="100%" >
        <tr>
            <td>
                <table  cellspacing="0" cellpadding="10px" border="0" width="100%">
                    <tr>
                        <td colspan="2">                           
                            <p style="margin-top:10px;font-size: 16px;width:100%;text-align:center;font-weight:800">${getDataResp.order_Type.toUpperCase()}</p>                          
                        </td>                        
                    </tr>
                    
                    <tr style="margin-bottom: -20px;">
                        <td style="text-align: start; vertical-align: top;padding-top:-25px">
                            <div id="logo" >
                            <strong>
                                Billing Address :</strong>
                            </div>
                            <p style="font-size: 13px;color: #292F4C;"><strong>${
                              getDataResp.billing_address.company_name
                            }</strong></br>

                          ${getDataResp.billing_address.street_address} ${
        getDataResp.billing_address.street_address2
      } ${getDataResp.billing_address.city} ${
        getDataResp.billing_address.state
      } ${getDataResp.billing_address.country} ${
        getDataResp.billing_address.zip_code
      }</br>
                          <strong>GSTIN</strong> : ${
                            getDataResp.billing_address.gst_number
                          }</br>
                           <strong>Contact Person</strong> : ${
                             getDataResp.billing_address.contact_person
                           }
                            </p
                        </td>
                        <td style="text-align: start; color: #292F4C;vertical-align: top;width:45%;;">
                        
                            <p style="font-size: 13px;color: #292F4C;"><strong>DATE</strong> :
                            <span style="direction:ltr !important;unicode-bidi: embed;">${date}</span></br>
                            <strong>VALID From</strong> &nbsp; <span style="direction:ltr !important;unicode-bidi: embed;">${StartDate}</span> &nbsp <strong> to </strong> &nbsp; <span style="direction:ltr !important;unicode-bidi: embed;">${dueDate}</span></br>
     <strong>Order Type</strong> : <span style="direction:ltr !important;unicode-bidi: embed;">
       ${
         getDataResp?.open_order === "yes"
           ? "Open " + getDataResp.order_Type
           : getDataResp.order_Type
       }
      </span></br>
                           
                          <strong>${
                            getDataResp.order_Type === "Purchase Order"
                              ? "PO. NO"
                              : "WO NO."
                          }</strong> : <span style="direction:ltr !important;unicode-bidi: embed;">${
        getDataResp.revision[revision].po_number || getDataResp.po_number
      }</span></br>
      ${
        getDataResp.revision && getDataResp.revision.length > 1
          ? `
      <strong>Revised On</strong> : <span style="direction:ltr !important;unicode-bidi: embed;">${
        getDataResp.revision[revision]
          ? formatDate(getDataResp.revision[revision].revisionDate)
          : ""
      }</span></br>
      `
          : ""
      }
<strong>PR No.</strong> : <span style="direction:ltr !important;unicode-bidi: embed;">
   ${
     getDataResp.purchase_request_numbers?.length > 0
       ? getDataResp.purchase_request_numbers
           .map(
             (prNumber) =>
               `${getDataResp.delivery_address.site_code}_0${prNumber}`
           )
           .join(", ")
       : `${getDataResp.delivery_address.site_code}_0${getDataResp.purchase_request_number}`
   }
</span></br>

    <strong>PR Type</strong> : <span style="direction:ltr !important;unicode-bidi: embed;">${
      getDataResp.prType || "Site Establishment"
    }</span></br>

                            
                            <strong>Site/Delivery Address</strong> :
                            ${getDataResp.delivery_address.street_address} 
                            ${getDataResp.delivery_address.street_address2}
                            ${getDataResp.delivery_address.city},
                            ${getDataResp.delivery_address.state},
                            ${getDataResp.delivery_address.country},${
        getDataResp.delivery_address.zip_code
      }
                            </br>

                           <strong>Site Contact Person</strong> : ${
                             getDataResp.delivery_address.contact_person
                           }</br>
                           <strong>Contact No.</strong> : ${
                             getDataResp.delivery_address.contact_number
                           }</p>
                        </td>
                    </tr>
                </table>
                
                </td>
            </tr>  
        `;

      /* End:- Header */

      /* Start:- Mail content */

      templateContent += `
        <tr style="margin-top: -100px;">
            <td >
                <table  cellspacing="0" cellpadding="5px" border="0" width="100%">  
                    <tr>
                        <td style="width:50%; ">
                            <p style="font-size: 13px;color: #292F4C; line-height:1.3" >
                               
                            </br>
                           
                           <strong> M/s ${getDataResp.vendor_detail.vendor_name},</strong>
                            </br>
                             
                           ${getDataResp.vendor_detail.address.street_address}  ${getDataResp.vendor_detail.address.street_address2} ${getDataResp.vendor_detail.address.city} ${getDataResp.vendor_detail.address.state} ${getDataResp.vendor_detail.address.country} ${getDataResp.vendor_detail.address.zip_code}
                            </br>
                            
                          <strong>  GSTIN: </strong>${getDataResp.vendor_detail.gst_number}
                            </br>  
                          
                         <strong>   PAN: </strong>${getDataResp.vendor_detail.pan_number}
                            </br> 
                           
                          <strong>  Email Id : </strong>${getDataResp.vendor_detail.email}
                            </br>
                             <strong> Contact Person:</strong> ${getDataResp.vendor_detail.contact_person}
                          </br>
                          <strong>  Contact No.: </strong>${getDataResp.vendor_detail.phone_number}
                            
                             
                           
                          
                            </p> 
                           
                            
                                                   
                        </td>
                        <td>
                            
                        </td>
                    </tr>
                </table>
                
                </td>
            </tr>  
        `;

      templateContent += `
        <tr>
            <td>
                <table  cellspacing="0" cellpadding="5px" border="0" width="100%">  
                    <tr>
                        <td colspan="2">
                            <div style="font-size: 13px;color: #292F4C;" >
                            Sir,
                            </div>
                            <br>
                            
                            <div style="font-size: 13px;color: #292F4C; line-height: 1.2; " >
                            With reference to your quotation and final negotiation, we are pleased to inform you that your final offer  (Description mentioned below) has been accepted and work is  awarded to you based on the terms & conditions mentioned below. No extra payment will be made on any account.
                            </div>                                                 
                        </td>
                    </tr>
                </table>
                
                </td>
            </tr>  
        `;

      /* End:- Mail content */

      /* start:- item table */

      let subtotal = convertCurrency(getDataResp.revision[revision].vendors_total[0]["subTotal"]);
      let gstType = getDataResp.revision[revision].vendors_total[0]["GSTDetails"]["type"];
      let total_tax = convertCurrency(
        getDataResp.revision[revision].vendors_total[0]["gstAmount"]
      );
      let CGSTTAX = convertCurrency(
        getDataResp.revision[revision].vendors_total[0]["gstAmount"] / 2
      );
      let SGSTTAX = convertCurrency(
        getDataResp.revision[revision].vendors_total[0]["gstAmount"] / 2
      );

      let freight_charges = convertCurrency(
        getDataResp.revision[revision].vendors_total[0]["freightTotal"]
      );
      let otherCharges = convertCurrency(
        getDataResp.revision[revision].vendors_total[0]["otherChargesTotal"]
      );
      // let freight_tax = convertCurrency(getDataResp.vendors_total[0]['freight_tax']);
      let total_amount = convertCurrency(getDataResp.revision[revision].vendors_total[0]["total"]);

      templateContent += `
              <tr>  
                <td colspan="2">
                    <table cellspacing="0" cellpadding="5px" class="invoice-table" border="0" width="100%" >
                        <thead background="">
                            <tr align="center">
                                <th> Item No	 </th>
                                <th>Item Name</th>
                             
                               
          <th>HSN Code</th>
        
                                <th>Quantity</th>
                                <th>UOM</th>
                               
                               
                                <th class="price">Rate</th>
                              ${
                                !getDataResp.open_order ||
                                getDataResp.open_order === "no"
                                  ? `<th class="price">Sub Total</th>`
                                  : ""
                              }
                                 <th>Remarks</th>
                               
                            </tr>
                        </thead>             
                        <tbody align="center">
                        `;

      if (getDataResp.revision[revision].items && getDataResp.revision[revision].items.length > 0) {
        getDataResp.revision[revision].items.map(async (o, i) => {
          if (o) {
            let itemRate = convertCurrency(o.Rate);
            let item_subtotal = convertCurrency(o.SubTotalAmount);
            let item_total_amount = convertCurrency(o.Total);
            /*let productTax =
              o.item.tax.amount && o.item.tax.name
                ? `<span style="display:inline-block;direction:ltr;">${o.item.tax.amount}%</span>`
                : ``; */
            //let tempBrandName=await getBrandName(o.item.brandName,'en')
            templateContent += `
                            <tr>
                                    <td  style="">${i + 1}</td>
                                    <td  style="">${o.item.item_name}</td>
                                    
                                   
                                      <td  style=" ">${o.item.hsnCode}</td>
                                    
                                    <td  style=" ">${
                                      getDataResp.open_order === "yes" &&
                                      getDataResp.order_Type ===
                                        "Purchase Order"
                                        ? "RO"
                                        : o.RequiredQuantity
                                    }</td>
                                    <td  style="">${o.rateUOM || o.uom}</td>
                                  
                                   
                                    <td  style="">${itemRate}</td>
                                   ${
                                     !getDataResp.open_order ||
                                     getDataResp.open_order === "no"
                                       ? `<td  style="">${item_subtotal}</td>`
                                       : ""
                                   }
                                  
                                     <td  style=" ">${o.remark || ""}</td>
                                </tr>`;
          }
        });
      }

      templateContent += `
                
                 ${
                   !getDataResp.open_order || getDataResp.open_order === "no"
                     ? `<tr>
                        <td colspan="6"  style="font-weight:600;">Subtotal</td>                   
                        <td  style="">${subtotal}</td>
                        <td></td>
                    </tr>
                   
                      ${
                        gstType === "Interstate"
                          ? `
    <tr>
        <td colspan="6"  style="font-weight:600;">IGST Amount</td>                   
        <td  style="">${total_tax}</td>
        <td></td>
    </tr>
    `
                          : ""
                      }
                     ${
                       gstType === "Intrastate"
                         ? `
    <tr>
      <td colspan="6" style="font-weight:600;">CGST Amount</td>
      <td>${CGSTTAX}</td>
      <td></td>
    </tr>
    <tr>
      <td colspan="6" style="font-weight:600;">SGST Amount</td>
      <td>${SGSTTAX}</td>
      <td></td>
    </tr>
    `
                         : ""
                     }

                      ${
                        gstType === "NO GST"
                          ? `
    <tr>
      <td colspan="6" style="font-weight:600;">GST Amount</td>
      <td>${total_tax}</td>
      <td></td>
    </tr>
   
    `
                          : ""
                      }
                    ${
                      freight_charges !== "INR 0.00"
                        ? `
    <tr>
        <td colspan="6"  style="font-weight:600;">Total Freight (Inc* GST)</td>                   
        <td  style="">${freight_charges}</td>
        <td></td>
    </tr>
    `
                        : ""
                    }
                    
                     ${
                       otherCharges !== "INR 0.00"
                         ? `
    <tr>
        <td colspan="6"  style="font-weight:600;">Total Other Charges (Inc* GST)</td>                   
        <td  style="">${otherCharges}</td>
        <td></td>
    </tr>
    `
                         : ""
                     }
                    
                   
                    <tr>
                        <td colspan="6"  style="font-weight:600;">Total amount</td>                   
                        <td  style="">${total_amount}</td>
                        <td></td>
                    </tr>
                `
                     : ""
                 }
                `;

      templateContent += `</tbody>

                </table>   
          
          </td>
        </tr>  
  `;

      /* End:- item table */

      /* Start:- Terms & condition &  Vendor Total */
      templateContent += `
      <tr>
          <td>
              <table cellspacing="0" cellpadding="5px" border="0" width="100%">  
        <tr>
          <td colspan="2">
            <div style="font-size: 13px; color: #292F4C; font-weight:600">
              Payment Terms & Other Conditions:
            </div>
            <div style="font-size: 13px; color: #292F4C;">
            <ol style="padding-left: 20px; margin: 0;">
  ${
    (
      getDataResp.revision[revision].terms_condition ||
      getDataResp.terms_condition ||
      ""
    )
      .trim()
      .split(/\r?\n/)
      .filter(line => line.trim() !== "")
      .map(line => `<li>${line.trim()}</li>`)
      .join("")
  }
</ol>

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
                        
                         ${getDataResp.approved_by}
                          </div>                                              
                      </td>
                       <td style="width:40%; text-align:right;">
                              <div style="font-size: 13px;color: #292F4C; font-weight:400">
                              I agree to above terms & Conditions</div>   
                               <div style="font-size: 13px;color: #292F4C; font-weight:600" >
                        
                       (  ${getDataResp.vendor_detail.vendor_name} )
                          </div>                                     
                      </td>
                  </tr>
                   
              </table>
              
              </td>
          </tr>  
      `;

      templateContent += `                      
                     
            </table>   
            <div style="width:100% !important;font-size:12px !important; margin-left:0;">

            <div style="display:block;margin:20px 0 0px 20px;">
            
            <table cellspacing="0" cellpadding="5px" border="0" width="100%">
                                           
                                            <td style="text-align:left;padding: 0;">Authorised Signatory</td>
                                            <td></td>
                                            </tr>
                                    </table>
            
            
            
            
            </div> 
           
        `;

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

      // Generate the PDF from the content
      //const pdfBuffer = await html_to_pdf.generatePdf(file, options);

      // Since we can't directly calculate the total pages, we'll calculate it after the PDF is generated
      /* console.log("____________PDF Buffer Length:", pdfBuffer.length);
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const totalPages = pdfDoc.getPages().length; // You will need to define A4PageSizeHeight
    
        // Update the footer with the actual total pages
        console.log("____________Total Pages:", totalPages);
        
        const updatedOptions = {
          ...options,
        pageRange: 'all',  // Apply to all pages
        footerTemplate: `
          <div style="font-size: 7px; text-align: center; width: 100%; padding: 10px 0;">
            Page <span class="pageNumber"></span> of ${totalPages}
          </div>
        `,
        };
        // Generate the final PDF with updated footer */
      console.log(isFile, "Generating PDF with options:");
      await html_to_pdf
        .generatePdf({ content: templateContent }, options)
        .then(async (finalPdfBuffer) => {
          if (isFile && isFile === 1) {
            const randomNumber =
              new Date().getTime() + Math.floor(Math.random() * 10000000);
            const fileName = `${requestedData.template}-${randomNumber}.pdf`;
            const pdfFilePath = path.resolve("public/pdf") + `/${fileName}`;

            // Save the generated PDF to the file system
            fs.writeFile(pdfFilePath, finalPdfBuffer, (err) => {
              if (err) {
                //console.error("Error saving the file:", err);
                throw err;
              }
              resolve({
                file: fileName,
              });
            });

            // Optionally, upload the PDF to cloud storage if needed
            // const getUploadedFile = await uploadToBucket({ fileName, file: finalPdfBuffer });

            return fileName; // Instead of `resolve(fileName)`, return the file name here
          } else if (requestedData.isMailData) {
            const randomNumber =
              new Date().getTime() + Math.floor(Math.random() * 10000000);
            const fileName = `${requestedData.template}-${randomNumber}.pdf`;

            const emailData = { ...getDataResp };

            // Format email data if needed
            emailData.date = formatDate(getDataResp.date);
            emailData.due_date = formatDate(getDataResp.due_date);

            return {
              companyLogo: companyLogo,
              dataObj: emailData,
              fileName: fileName,
              subject: `Purchase Order Request - #${getDataResp.po_number} from ${getDataResp.billing_address.company_name}`,
              to: requestedData.mails,
              sender_name: getDataResp.billing_address.company_name,
              receiver_name: getDataResp.vendor_detail.vendor_name,
              pdfBuffer: finalPdfBuffer,
            };
          } else {
            resolve(finalPdfBuffer); // Resolving the final buffer
          }
        })
        .catch((error) => {
          //console.error("Error in generating PDF:", error);
          throw error;
        });
    } catch (error) {
      //console.error("Error in generatePdf:", error);
      return reject(error);
    }
  });
};

function getDetails(id, revision, langCode) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!id) {
        throw {
          errors: [],
          message: "Id missing",
          statusCode: 412,
        };
      }

      let recordDetail = await PurchaseOrderSchema.findOne({
        _id: ObjectID(id),
      }).lean();

      if (!recordDetail) {
        throw {
          errors: [],
          message: "Purchase request not found",
          statusCode: 404,
        };
      }

      // Fetch item details for all items
      console.log("Record Detail:", recordDetail);

      resolve(recordDetail);
    } catch ($e) {
      //console.error("Error in getDetails:", $e);
      return reject($e);
    }
  });
}
