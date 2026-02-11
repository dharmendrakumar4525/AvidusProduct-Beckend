/**
 * Local Purchase Order PDF Template
 * Generates PDF documents for local purchase orders
 * 
 * This template creates a formatted PDF document for local purchase orders.
 * It includes vendor details, PO number, date, items with specifications,
 * quantities, rates, GST, freight, and terms & conditions.
 * 
 * Key Features:
 * - Vendor information and billing address
 * - Local PO number and dates
 * - Item-wise details (specifications, HSN codes, quantities, rates)
 * - Financial breakdown (subtotal, GST, freight, total)
 * - Terms and conditions
 * - Company logo and branding
 * 
 * @module pdf/templates/localPo
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
 * Generate Local PO PDF
 * Creates a PDF document for a local purchase order
 * 
 * @param {Object} dataObj - Data object containing requested data
 * @param {Object} dataObj.requestedData - Request data
 * @param {String} dataObj.requestedData.id - Purchase order ID
 * @param {String} dataObj.requestedData.template - Template name
 * 
 * @returns {Promise<Buffer>} PDF buffer
 */
module.exports.generateLocalPdf = (dataObj) => {
  return new Promise(async (resolve, reject) => {
    try {
      let requestedData = dataObj.requestedData;
   
      let getDataResp = await getDetails(requestedData.id, "en");
      //console.log("________________________", getDataResp.vendor_detail);
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
            margin-left: 1cm;
            margin-right: 1cm;
            font-size: 14px;
            font-family: sans-serif;
        }
            
        thead th {
            background: #EDF0F2;;
        }

        table {
            width: 100%;
        }
        
        .invoice-table td{
            border-bottom: 1px solid #DADADC;
            border-right: 1px solid #DADADC;
            font-size: 12px;
        }
        .invoice-table tr td:first-child{
            border-left: 1px solid #DADADC;
        }
        .invoice-table th {
            border-bottom: 1px solid #DADADC;
            border-top: 1px solid #DADADC;
            border-right: 1px solid #DADADC;
            font-size: 12px;
        }
        .invoice-table tr th:first-child {
            border-left: 1px solid #DADADC;
        }
        .terms-table td,
        .terms-table th {
            font-size: 12px;
        }

        .section-heading{
            font-weight:600;
            font-size:14px;
        }
    </style>        
        `;
      /* End:- Style */

      /* Start:- Header */

      let date = formatDate(getDataResp.date);
      let dueDate = formatDate(getDataResp.due_date);
      let StartDate = formatDate(getDataResp.poStartDate);

      templateContent += `
            <div style="display: flex; justify-content: space-between;">
                <div >
                  
                </div>
                <div style='margin-right:20px;'>
                   
                </div>
            </div>
        <table cellspacing="0" cellpadding="10px" border="0" width="100%" >
        <tr>
            <td>
                <table  cellspacing="0" cellpadding="10px" border="0" width="100%">
                    <tr>
                        <td colspan="2">                           
                            <p style="margin-top:-30px;font-size: 16px;width:100%;text-align:center;font-weight:800"> LOCAL ${
                              getDataResp.order_Type.toUpperCase()
                            }</p>                          
                        </td>                        
                    </tr>
                    
                    <tr>
                        <td>
                <table  cellspacing="0" cellpadding="10px" border="0" width="100%">  
                    <tr>
                        <td style="width:40%;">
                            <p style="font-size: 12px;color: #292F4C;" >
                               
                            </p>
                            <p style="font-size: 12px;color: #292F4C;" >
                            M/s ${getDataResp.vendor_detail.vendor_name},
                            </p>
                             <p style="font-size: 12px;color: #292F4C;" >
                            Address: ${getDataResp.vendor_detail.address.street_address}  ${getDataResp.vendor_detail.address.street_address2} ${getDataResp.vendor_detail.address.city} ${getDataResp.vendor_detail.address.state} ${getDataResp.vendor_detail.address.country} ${getDataResp.vendor_detail.address.zip_code}
                            </p>
                             <p style="font-size: 12px;color: #292F4C;" >
                            GSTIN: ${getDataResp.vendor_detail.gst_number}
                            </p>  
                            <p style="font-size: 12px;color: #292F4C;" >
                            PAN: ${getDataResp.vendor_detail.pan_number}
                            </p> 
                            <p style="font-size: 12px;color: #292F4C;" >
                            Email Id : ${getDataResp.vendor_detail.email}
                            </p>
                             <p style="font-size: 12px;color: #292F4C;" >
                            Mobile No.: ${getDataResp.vendor_detail.phone_number}
                            </p> 
                             
                             <p style="font-size: 12px;color: #292F4C;" >
                            Contact Person: ${getDataResp.vendor_detail.contact_person}
                            </p> 
                           
                            
                                                   
                        </td>
                        <td style="text-align: end; font-size: 16px;color: #292F4C;vertical-align: top;padding-top:25px;width:40%;>
                        <p style="font-size: 12px;color: #292F4C;"></p>
                            <p style="font-size: 12px;color: #292F4C;"><strong>DATE</strong> :
                            <span style="direction:ltr !important;unicode-bidi: embed;">${date}</span></p>
                            <p style="font-size: 12px;color: #292F4C;">Valid Upto </strong> &nbsp; <span style="direction:ltr !important;unicode-bidi: embed;">${dueDate}</span></p>
   
                           
                            <p style="font-size: 12px;color: #292F4C;margin-bottom: -5px;"><strong>${
                              getDataResp.order_Type === "Purchase Order"
                                ? "PO. NO"
                                : "WO NO."
                            }</strong> : <span style="direction:ltr !important;unicode-bidi: embed;">${
        getDataResp.po_number
      }</span></p>
<p style="font-size: 12px;color: #292F4C;margin-bottom: -5px;"><strong>PR No.</strong> : <span style="direction:ltr !important;unicode-bidi: embed;">${
        getDataResp.delivery_address.site_code
      }_0${getDataResp.purchase_request_number}</span></p>
    <p style="font-size: 12px;color: #292F4C;margin-bottom: -5px;"><strong>PR Type</strong> : <span style="direction:ltr !important;unicode-bidi: embed;">${
      getDataResp.prType || "Site Establishment"
    }</span></p>

                            <p style="font-size: 12px;color: #292F4C;line-height: 20px;">
                            <strong>Site/Delivery Address</strong> :
                            ${getDataResp.delivery_address.street_address} 
                            ${getDataResp.delivery_address.street_address2}
                            ${getDataResp.delivery_address.city},
                            ${getDataResp.delivery_address.state},
                            ${getDataResp.delivery_address.country},${
        getDataResp.delivery_address.zip_code
      }
                            </p>

                            <p style="font-size: 12px;color: #292F4C;margin-top: -5px;"><strong>Site Contact Person</strong> : ${
                              getDataResp.delivery_address.contact_person
                            }</p>
                            <p style="font-size: 12px;color: #292F4C;"><strong>Contact No.</strong> : ${
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
        <tr>
           
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
                <table  cellspacing="0" cellpadding="10px" border="0" width="100%">  
                    <tr>
                        <td colspan="2">
                            <div style="font-size: 12px;color: #292F4C;" >
                            Sir,
                            </div>
                            <br>
                            
                            <div style="font-size: 12px;color: #292F4C; line-height:1.2" >
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

      let subtotal = convertCurrency(getDataResp.vendors_total[0]["subTotal"]);
      let gstType = getDataResp.vendors_total[0]["GSTDetails"]["type"];
      let total_tax = convertCurrency(
        getDataResp.vendors_total[0]["gstAmount"]
      );
      let CGSTTAX = convertCurrency(
        getDataResp.vendors_total[0]["gstAmount"] / 2
      );
      let SGSTTAX = convertCurrency(
        getDataResp.vendors_total[0]["gstAmount"] / 2
      );

      let freight_charges = convertCurrency(
        getDataResp.vendors_total[0]["freightTotal"]
      );
      let otherCharges=convertCurrency(
        getDataResp.vendors_total[0]["otherChargesTotal"]
      );
      // let freight_tax = convertCurrency(getDataResp.vendors_total[0]['freight_tax']);
      let total_amount = convertCurrency(getDataResp.vendors_total[0]["total"]);

      templateContent += `
              <tr>  
                <td colspan="2">
                    <table cellspacing="0" cellpadding="10px" class="invoice-table" border="0" width="100%" >
                        <thead background="">
                            <tr align="center">
                                <th> Item No	 </th>
                                <th>Item Name</th>
                                <th>Item Code</th>
          <th>Specification</th>
          <th>HSN Code</th>
       
                                <th>Quantity</th>
                                <th>UOM</th>
                                <th>Make List</th>
                                <th class="price">Rate</th>
                                <th class="price">Sub Total</th>
                                <th class="price">Tax</th>
                                <th class="price">Total</th>
                            </tr>
                        </thead>             
                        <tbody align="center">
                        `;

      if (getDataResp.items && getDataResp.items.length > 0) {
        getDataResp.items.map(async (o, i) => {
          if (o) {
            let itemRate = convertCurrency(o.Rate);
            let item_subtotal = convertCurrency(o.SubTotalAmount);
            let item_total_amount = convertCurrency(o.Total);
            let productTax = o.gst
                ? `<span style="display:inline-block;direction:ltr;">${ o.gst}%</span>`
                : ``;
            //let tempBrandName=await getBrandName(o.item.brandName,'en')
            templateContent += `
                            <tr>
                                    <td  style="">${i + 1}</td>
                                    <td  style="">${o.item.item_name}</td>
                                    <td  style="">${o.item.item_code || ""}</td>
                                     <td  style=" ">${o.item.specification}</td>
                                      <td  style=" ">${o.item.hsnCode}</td>
                                     
                                    <td  style=" ">${o.
                                      RequiredQuantity
                                      }</td>
                                    <td  style="">${o.uom}</td>
                                    <td  style="">${o.brandName}</td>
                                    <td  style="">${itemRate}</td>
                                    <td  style="">${item_subtotal}</td>
                                    <td  style="">${productTax}</td>
                                    <td  style="">${item_total_amount}</td>
                                </tr>`;
          }
        });
      }

      templateContent += `
                
                    <tr>
                        <td colspan="11"  style="font-weight:600;">Subtotal</td>                   
                        <td  style="">${subtotal}</td>
                    </tr>
                   
                      ${
                        gstType === "Interstate"
                          ? `
    <tr>
        <td colspan="11"  style="font-weight:600;">IGST Amount</td>                   
        <td  style="">${total_tax}</td>
    </tr>
    `
                          : ""
                      }
                     ${
                       gstType === "Intrastate"
                         ? `
    <tr>
      <td colspan="11" style="font-weight:600;">CGST Amount</td>
      <td>${CGSTTAX}</td>
    </tr>
    <tr>
      <td colspan="11" style="font-weight:600;">SGST Amount</td>
      <td>${SGSTTAX}</td>
    </tr>
    `
                         : ""
                     }

                      ${
                        gstType === "NO GST"
                        ? `
    <tr>
      <td colspan="11" style="font-weight:600;">GST Amount</td>
      <td>${total_tax}</td>
    </tr>
   
    `
                        : ""
                    }
                    ${
                      freight_charges !== "INR 0.00"
                        ? `
    <tr>
        <td colspan="11"  style="font-weight:600;">Total Freight (Inc* GST)</td>                   
        <td  style="">${freight_charges}</td>
    </tr>
    `
                        : ""
                    }

                     ${
                      otherCharges !== "INR 0.00"
                        ? `
    <tr>
        <td colspan="11"  style="font-weight:600;">Total Other Charges (Inc* GST)</td>                   
        <td  style="">${otherCharges}</td>
    </tr>
    `
                        : ""
                    }
                    
                   
                    <tr>
                        <td colspan="11"  style="font-weight:600;">Total amount</td>                   
                        <td  style="">${total_amount}</td>
                    </tr>
                
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
              <table  cellspacing="0" cellpadding="10px" border="0" width="100%">  
                  <tr>
                      <td colspan="2">
                          <div style="font-size: 14px;color: #292F4C; font-weight:600" >
                          Payment Terms & Other Conditions:
                          </div>
                          <div style="font-size: 12px;color: #292F4C; white-space: pre-wrap;" >
                          <p>${getDataResp.terms_condition.replace(
                            /^\s+/,
                            ""
                          )}</p>
                          <script>
                </script>
                          </div>                                                 
                      </td>
                  </tr>
              </table>



              <table  cellspacing="0" cellpadding="10px" border="0" width="100%">  
                  <tr>
                      <td colspan="2">
                                                                       
                      </td>
                  </tr>
                    <tr>
                      <td colspan="2">
                          <div style="font-size: 12px;color: #292F4C; font-weight:400" >
                        
                         ${getDataResp.approved_by}
                          </div>                                               
                      </td>
                  </tr>
              </table>
              
              </td>
          </tr>  
      `;

      /* End:- erms & condition &  Vendor Total */

      /*  let imageName = getDataResp && getDataResp.sign ? getDataResp.sign : "";
      var imageCodes = "";
      if (imageName) {
        let signImg = imageName;
        let stampBase64 = await imageToBase64(signImg);
        stampBase64Code = "data:image/png;base64," + stampBase64;
        imageCodes = stampBase64Code;
      } */

      templateContent += `                      
                     
            </table>   
            <div style="width:100% !important;font-size:10px !important; margin-left:0;">

            <div style="display:block;margin:20px 0 0px 20px;">
            
            <table cellspacing="0" cellpadding="10px" border="0" width="100%">
                                           
                                            <td style="text-align:left;padding: 0;">Authorised Signatory</td>
                                            <td></td>
                                            </tr>
                                    </table>
            
            
            
            
            </div> 
           
        `;

      let isFile = requestedData.isFile;
       const options = {
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        
        margin: {
          top: "150px",       // Adjust for header if any
          bottom: "100px",   // Adjust for footer position
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
                      content: templateContent
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
                    pageRange: 'all',  // Apply to all pages
                    footerTemplate: `
                      <div style="font-size: 7px; text-align: center; width: 100%; padding: 10px 0;">
                        Page <span class="pageNumber"></span> of ${totalPages}
                      </div>
                    `,
                    }; */
      html_to_pdf
        .generatePdf(file, options)
        .then(async (pdfBuffer) => {
          if (isFile && isFile == 1) {
            let randomNumber =
              new Date().getTime() + Math.floor(Math.random() * 10000000);
            let fileName = `${requestedData.template}-${randomNumber}.pdf`;
            let pdfFilePath = path.resolve("public/pdf") + `/${fileName}`;

            fs.writeFile(`${pdfFilePath}`, pdfBuffer, (err) => {
              if (err) {
                throw err;
              }
              resolve({
                file: fileName,
              });
            });

            // let getUploadedFile  = await uploadToBucket({
            //     fileName:fileName,
            //     file:pdfBuffer,
            //     companySlug:companyData.slug
            // })
            resolve(fileName);
          } else if (dataObj.isMailData) {
            let randomNumber =
              new Date().getTime() + Math.floor(Math.random() * 10000000);
            let fileName = `${requestedData.template}-${randomNumber}.pdf`;

            let emailData = { ...getDataResp };

            emailData.date = formatDate(getDataResp.date);
            emailData.due_date = formatDate(getDataResp.due_date);
            emailData.subtotal = convertCurrency(
              getDataResp.vendors_total[0]["subtotal"]
            );
            emailData.total_tax = convertCurrency(
              getDataResp.vendors_total[0]["total_tax"]
            );
            emailData.freight_charges = convertCurrency(
              getDataResp.vendors_total[0]["freight_charges"]
            );
            emailData.freight_tax = convertCurrency(
              getDataResp.vendors_total[0]["freight_tax"]
            );
            emailData.total_amount = convertCurrency(
              getDataResp.vendors_total[0]["total_amount"]
            );

            resolve({
              companyLogo: companyLogo,
              dataObj: emailData,
              fileName: fileName,
              subject: `Purchase Order Request - #${getDataResp.po_number} from ${getDataResp.billing_address.company_name}`,
              to: requestedData.mails,
              sender_name: getDataResp.billing_address.company_name,
              receiver_name: getDataResp.vendor_detail.vendor_name,
              pdfBuffer: pdfBuffer,
            });
          } else {
            resolve(pdfBuffer);
          }
        })
        .catch((err) => {
          //console.log("err", err);
          reject(err);
        });
    } catch (e) {
      //console.log("e", e);
      reject(e);
    }
  });
};

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
      const populatedItems = await Promise.all(
        recordDetail.items.map(async (item) => {
          //console.log("item", item.item);
          let brandNames;
          if (Array.isArray(item.item.brandName)) {
            const brandDetails = await BrandSchema.find({
              _id: { $in: item.item.brandName.map((id) => ObjectID(id)) },
            }).lean();
            brandNames = brandDetails
              .map((brand) => brand.brand_name)
              .join(" / ");
          } else {
            const brandDetail = await BrandSchema.findOne({
              _id: ObjectID(item.brandName),
            }).lean();
            brandNames = brandDetail ? brandDetail.brand_name : null;
          }

          return {
            ...item,
            brandName: brandNames,
          };
        })
      );

      // Replace the items array in recordDetail with the populated items
      recordDetail.items = populatedItems;

      resolve(recordDetail);
    } catch ($e) {
      //console.error("Error in getDetails:", $e);
      return reject($e);
    }
  });
}


const getBrandNames = async (brandIds) => {
  try {
      // Assuming BrandSchema is a Mongoose model
      const brands = await BrandSchema.find({ _id: { $in: ObjectID(brandIds) } }).select('brand_name');
      
      // Extracting brand names from the resulting documents
      const brandNames = brands.map(brand => brand.brand_name);
      
      // Joining the brand names with '/'
      return brandNames.join(' / ');
  } catch (error) {
      //.error('Error fetching brand names:', error);
      throw new Error('Failed to fetch brand names');
  }
};

                             