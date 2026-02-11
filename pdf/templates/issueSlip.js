/**
 * Issue Slip PDF Template
 * Generates PDF documents for inventory issue slips
 * 
 * This template creates a formatted PDF document for material issue slips.
 * It includes site details, issue slip number, authorized and received by information,
 * item-wise issue details, work order number, and signature sections.
 * 
 * Key Features:
 * - Issue slip number and entry number
 * - Site and project details
 * - Authorized by and received by information
 * - Item-wise issue details (item code, UOM, quantity, inventory type)
 * - Work order number (if applicable)
 * - Signature sections (issued by, received by, authorized by)
 * - Company logo and branding
 * 
 * @module pdf/templates/issueSlip
 */

var html_to_pdf = require("html-pdf-node");
const UOM = require("../../models/Uom");
const { getDetails } = require("../../controllers/web/inventoryOutRecord");
const { footerData } = require("./footer");
const path = require("path");
const fs = require("fs");
const { companyLogo } = require("../../libs/constant");
const { HeaderData } = require("./Header");

/**
 * Generate Issue Slip PDF
 * Creates a PDF document for an inventory issue slip
 * 
 * @param {Object} dataObj - Data object containing requested data
 * @param {Object} dataObj.requestedData - Request data
 * @param {String} dataObj.requestedData.id - Inventory out record ID
 * @param {String} dataObj.requestedData.template - Template name
 * 
 * @returns {Promise<Buffer>} PDF buffer
 */
module.exports.issueSlipPdf = (dataObj) => {
  return new Promise(async (resolve, reject) => {
    try {
      let requestedData = dataObj.requestedData;

      let getDataResp = await getAllDetails(requestedData.id, "en");
      //getDataResp=getDataResp.responseData;
      console.log("________________________", getDataResp);

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
                
            
.issue-slip {
  font-family: Arial, sans-serif;
  
  padding: 20px;
  align-items: center;
}

.header {
  text-align: center;
  margin-bottom: 20px;
}

.project-details {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.project-info,
.return-info {
  width: 65%;
}


.materials-table {
  width:100%;
  border-collapse: collapse;
  margin-bottom: 20px;
 
}

.materials-table th,
.materials-table td {
  border: 1px solid #000;
  text-align: center;
  padding: 5px;
}

.signature-section {
 width:100%;
  display: flex;
  
  margin-bottom: 20px;
}

.sign-block {
  width: 33%;
  border: 1px solid #000;
  padding: 10px;
  
}

.countersigned {
  text-align: right;
}
        </style>        
            `;
      /* End:- Style */

      /* Start:- Header */

      templateContent += `
    <div class="issue-slip">
      <header class="header">
        <h2>PRAGATI INFRA SOLUTIONS PVT LTD</h2>
        <h3>MATERIALS REQUISITION / ISSUE SLIP</h3>
      </header>

      <div class="project-details">
        <div class="project-info">
          <p>
            <strong>PROJECT NAME:</strong> ${ getDataResp?.site?.site_name }
          </p>
          <p>
            <strong>ISSUE SLIP NO:</strong> ${ getDataResp?.issueSlip_number }
          </p>
        </div>
        <div class="return-info">
          <p><strong>DATE:</strong> ${ getDataResp?.issue_Date }</p>
         <p><strong>INVENTORY TYPE: </strong>${ getDataResp?.itemType }</p>
          <p><strong>RETURNABLE TYPE: </strong>${ getDataResp?.type }</p>
        </div>
       
      </div>

      

      
   
  </div>
            `;

      /* End:- Header */

      /* Start:- Mail content */

      templateContent += `
            <tr>
                <td>
                    <table class="materials-table">
        <thead>
          <tr>
            <th style="width: 70px">SR.NO.</th>
            <th>ITEM DESCRIPTION</th>
            <th>ITEM CODE</th>
            <th>UOM</th>
           
            <th>ISSUED QTY</th>
          
            <th>REMARKS</th>
          </tr>
        </thead>
        <tbody>`;
        if (getDataResp.items && getDataResp.items.length > 0) {
          getDataResp.items.map(async (material, i) => {
            if (material) {
             
              //let tempBrandName=await getBrandName(o.item.brandName,'en')
              templateContent += `
                             <tr>
            <td>${ i + 1 }</td>
            <td>${ material.item_details.item_name }</td>
            <td>${ material.item_details.item_code }</td>
            <td>${ material?.uomName }</td>
           
            <td>${ material.issued_Qty }</td>
           
            <td>${ material.remarks }</td>
          </tr>`
            }
          });
        };

        templateContent += `</tbody>

        </table>   
  
  </td>
</tr>  
`;


      templateContent += `
            <tr>
                <td>
                    <div class="signature-section">
        <div class="sign-block">
          <p style="border-bottom: 1px solid #000; font-size:15px" ><strong >Issued By</strong></p>
          <p style="border-bottom: 1px solid #000; font-size:13px"><strong>Name:</strong> ${ getDataResp?.authorizedBy?.name }</p>
          <p style="border-bottom: 1px solid #000;font-size:13px"><strong>Emp ID:</strong> ${ getDataResp?.authorizedBy?.employeeCode }</p>
          <p style="border-bottom: 1px solid #000;font-size:13px"><strong>Designation: </strong>${ getDataResp?.authorizedBy?.role }</p>
           <p style="font-size:13px"><strong>Sign:</strong>______________________</p>
        </div>

        <div class="sign-block">
          <p style="border-bottom: 1px solid #000; font-size:15px"><strong>Received By</strong></p>
          <p style="border-bottom: 1px solid #000; font-size:13px"><strong>Contractor Name:</strong> ${ getDataResp?.receivedBy}</p>
          <p style="border-bottom: 1px solid #000; font-size:13px"><strong>Name:</strong> ${ getDataResp?.receivedByName }</p>
          <p style="border-bottom: 1px solid #000;font-size:13px"><strong>WO Number: </strong> ${ getDataResp?.wo_number }</p>
          <p font-size:13px"><strong>Sign:</strong>______________________</p>
          
        </div>

        <div class="sign-block">
          <p style="border-bottom: 1px solid #000;font-size:15px""><strong >Issued By</strong></p>
          <p style="border-bottom: 1px solid #000;font-size:13px"><strong>Name:</strong> ${ getDataResp?.issuedBy?.name }</p>
          <p style="border-bottom: 1px solid #000;font-size:13px"><strong>Emp ID:</strong> ${ getDataResp?.issuedBy?.employeeCode }</p>
          <p style="border-bottom: 1px solid #000;font-size:13px"><strong>Designation: </strong> ${ getDataResp?.issuedBy?.role }</p>
          <p style="font-size:13px"><strong>Sign:</strong>______________________</p>
        </div>
      </div>

      <div class="countersigned">
        <p><strong>Counter signed by PM/PD:</strong> ________________________</p>
      </div>
    </div>
                    
                    </td>
                </tr>  
            `;

      /* End:- Mail content */

      let isFile = requestedData.isFile;
      const options = {
                     format: 'A4',
                     printBackground: true,
                     displayHeaderFooter: true,
                     headerTemplate: "<div></div>",  // Empty header
                     footerTemplate: `
                       <div style="font-size: 10px; text-align: center; width: 100%; padding: 10px 0;">
                         Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                       </div>
                     `,
                     margin: {
                       top: "50px",       // Adjust for header if any
                       bottom: "150px",   // Adjust for footer position
                       right: "15px",
                       left: "15px",
                     },
                     customCSS: `
                       .pageNumber:before {
                         content: "Page " attr(data-page);
                       }
                       .totalPages:before {
                         content: "of " attr(data-total);
                       }
                     `
                   };
               
               
                   
                   // Create a file object to hold your HTML content
                   const file = {
                     content: templateContent
                   };
               
                   // Generate the PDF from the content
                  /* const pdfBuffer = await html_to_pdf.generatePdf(file, options);
               
                   // Since we can't directly calculate the total pages, we'll calculate it after the PDF is generated
                   //console.log("____________PDF Buffer Length:", pdfBuffer.length);
                   const pdfDoc = await PDFDocument.load(pdfBuffer);
                   const totalPages = pdfDoc.getPages().length; // You will need to define A4PageSizeHeight
               
                   // Update the footer with the actual total pages
                   //console.log("____________Total Pages:", totalPages);
                   
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

async function getAllDetails(id, langCode) {
  try {
    const mockRes = {
      statusCode: null,
      data: null,
      status: function (code) {
        //console.log(`Setting status: ${code}`);
        this.statusCode = code;
        return this;
      },
      json: function (data) {
        //console.log("Setting response data:", data);
        this.data = data;
        return this;
      },
    };

    const req = { query: { id: id || null } }; // Handle potential null/undefined

    //console.log("Calling getDetails with:", req);
    await getDetails(req, mockRes);

    let getDataResp = {
      statusCode: mockRes.statusCode,
      responseData: mockRes.data,
    };

    // Wait for the UOM population in items
    if (getDataResp && getDataResp.responseData && getDataResp.responseData.items) {
      // Use `map` to populate UOM for each item
      for (let item of getDataResp.responseData.items) {
        const uomName = await getUOMNameById(item.item_details.uom[0]); // Adjust if needed for the field structure
        item.uomName = uomName; // Add the UOM name to the item object
      }
    }

    //console.log(getDataResp.responseData);

    // Return the final response after all asynchronous UOM fetches are done
    return getDataResp.responseData;
  } catch (e) {
    console.error("Error occurred:", e);
    throw e; // Re-throw the error to propagate it
  }
}



async function getUOMNameById(uomId) {
  if (!uomId) {
    return undefined; // Or any default value you want to return
  }

  try {
    // Query the database to find the UOM by its ID
    const uom = await UOM.findById(uomId); // Use `lean()` for better performance if you don't need a Mongoose document

    // Return the `uom_name` if found, otherwise undefined
    return uom ? uom.uom_name : undefined;
  } catch (error) {
    //console.error("Error fetching UOM by ID:", error);
    return undefined; // Handle errors gracefully
  }
}