/**
 * Application Constants
 * Contains default values, templates, and configuration constants used throughout the application
 * 
 * This file includes:
 * - Default billing address structure
 * - Company branding (logo)
 * - Email templates
 * - Terms and conditions
 * - Module and permission definitions for RBAC
 */

/**
 * Default Billing Address Structure
 * Template for company billing address information
 */
const billingAddress = {
  company_name: "",
  gst_number: "",
  pan_card: "",
  code: "",
  contact_person: "",
  email: "",
  street_address: "",
  street_address2: "",
  city: "",
  state: "",
  zip_code: "",
  country: "",
};

/**
 * Company Logo URL
 * URL to company logo for use in PDFs and emails
 */
const companyLogo =
  "https://d2yt4av5mvk7ck.cloudfront.net/assets/images/logo3.svg";

/**
 * Email Content Header
 * Default greeting for email communications
 */
const mailContentHeader = "Sir,";

/**
 * Email Content Template
 * Default email body for work order/purchase order communications
 */
const mailContent =
  "With reference to your quotation and final negotiation, we are pleased to inform you that your final offer  (Description mentioned below) has been accepted and work is  awarded to you based on the terms & conditions mentioned below. No extra payment will be made on any account.";

/**
 * Terms and Conditions
 * Standard terms and conditions for work orders
 * Includes payment terms, completion timelines, warranty, etc.
 */
const termsConsition = `GST 18% & freight included in above WO amount.\n 
Work Completion : work will complete within 02 months from the date of WO.\n  
Amount of Rs 30 Lakh Shall be paid as advance and after execution of work at site of that advance amount further advance of 30 lakh shall be paid and this to be followed 3 times as per direction from site Project Head/Director. \n
Advance is for Bitumen material only, For rest material payment will be released against RA Bills.\n  Further Balance Payment shall be paid after successful completion and handover of Work.\n  GST amount will be released after GST filed by the contractor & the same is reflected on GST portal.\n  Above rates are valid till 2026.\n Royltee required percentage 100 ( adress-PISL patli)\n   Warranty of work- 05 Years for total work done as per this WO.\n Acceptance of this order shall be conveyed to us within 24Hr Otherwise, it will be accepted by Vendor as it is
\n Vendor's Bank Name, Account No., IFSC Code, Branch Address should be mentioned on invoice copy.\n Any increase/decrease in govt taxes & policies will be paid/deduct as per actual.\n Company Reserves the right to increase or decrease WO Qty at any time.\n Juridiction for any dispute against this order will be Gurugram, Haryana.`;
/**
 * Module List for Role-Based Access Control (RBAC)
 * Defines all application modules and their available permissions
 * 
 * Structure:
 * - Each module has a name and list of child permissions
 * - Permissions include: add, view, edit, delete, and module-specific actions
 * - Used to configure role permissions in the system
 * 
 * Modules include:
 * - Projects, Progress Sheet, Calendar, Roles, Users, Members
 * - Activities, Sub Activities, Location, UOM, GST, Item, Brand
 * - Organisation, Site, Vendor, Category, Sub Category
 * - Purchase Requests, Rate Approvals, Purchase Orders
 * - Inventory, DMR, Inventory Transfer
 * - Special Permissions
 */
const ModuleList = [
  {
    id: 1,
    moduleName: "projects",
    isSelected: false,
    isClosed: false,
    childList: [
      {
        id: 1,
        parent_id: 1,
        value: "add",
        isSelected: false,
      },
      {
        id: 5,
        parent_id: 1,
        value: "view",
        isSelected: false,
      },
      {
        id: 3,
        parent_id: 1,
        value: "Edit",
        isSelected: false,
      },
      {
        id: 6,
        parent_id: 1,
        value: "Delete",
        isSelected: false,
      },
    ],
  },

  {
    id: 2,
    moduleName: "progress_sheet",
    isSelected: false,
    isClosed: false,
    childList: [
      {
        id: 2,
        parent_id: 1,
        value: "edit",
        isSelected: false,
      },
      {
        id: 5,
        parent_id: 1,
        value: "view",
        isSelected: false,
      },
    ],
  },

  {
    id: 3,
    moduleName: "calender",
    isSelected: false,
    isClosed: false,
    childList: [
      {
        id: 1,
        parent_id: 1,
        value: "add",
        isSelected: false,
      },
      {
        id: 5,
        parent_id: 1,
        value: "view",
        isSelected: false,
      },
      {
        id: 5,
        parent_id: 1,
        value: "remarks",
        isSelected: false,
      },
    ],
  },

  {
    id: 4,
    moduleName: "roles",
    isSelected: false,
    isClosed: false,
    childList: [
      {
        id: 1,
        parent_id: 1,
        value: "add",
        isSelected: false,
      },
      {
        id: 2,
        parent_id: 1,
        value: "edit",
        isSelected: false,
      },
      {
        id: 3,
        parent_id: 1,
        value: "delete",
        isSelected: false,
      },
      // {
      //   id: 4,parent_id: 1,value: 'deleteMultiple',isSelected: false
      // },
      {
        id: 5,
        parent_id: 1,
        value: "view",
        isSelected: false,
      },
    ],
  },

  {
    id: 5,
    moduleName: "users",
    isSelected: false,
    isClosed: false,
    childList: [
      {
        id: 1,
        parent_id: 1,
        value: "add",
        isSelected: false,
      },
      {
        id: 2,
        parent_id: 1,
        value: "edit",
        isSelected: false,
      },
      {
        id: 3,
        parent_id: 1,
        value: "delete",
        isSelected: false,
      },
      // {
      //   id: 4,parent_id: 1,value: 'deleteMultiple',isSelected: false
      // },
      {
        id: 5,
        parent_id: 1,
        value: "view",
        isSelected: false,
      },
    ],
  },

  {
    id: 6,
    moduleName: "members",
    isSelected: false,
    isClosed: false,
    childList: [
      {
        id: 1,
        parent_id: 1,
        value: "add",
        isSelected: false,
      },
    ],
  },
  {
    id: 7,
    moduleName: "activities",
    isSelected: false,
    isClosed: false,
    childList: [
      {
        id: 1,
        parent_id: 1,
        value: "add",
        isSelected: false,
      },
      {
        id: 2,
        parent_id: 1,
        value: "edit",
        isSelected: false,
      },
      {
        id: 3,
        parent_id: 1,
        value: "delete",
        isSelected: false,
      },
      // {
      //   id: 4,parent_id: 1,value: 'deleteMultiple',isSelected: false
      // },
      {
        id: 5,
        parent_id: 1,
        value: "view",
        isSelected: false,
      },
    ],
  },

  {
    id: 8,
    moduleName: "sub activities",
    isSelected: false,
    isClosed: false,
    childList: [
      {
        id: 1,
        parent_id: 1,
        value: "add",
        isSelected: false,
      },
      {
        id: 2,
        parent_id: 1,
        value: "edit",
        isSelected: false,
      },
      {
        id: 3,
        parent_id: 1,
        value: "delete",
        isSelected: false,
      },
      // {
      //   id: 4,parent_id: 1,value: 'deleteMultiple',isSelected: false
      // },
      {
        id: 5,
        parent_id: 1,
        value: "view",
        isSelected: false,
      },
    ],
  },
  {
    id: 9,
    moduleName: "Location",
    isSelected: false,
    isClosed: false,
    childList: [
      {
        id: 1,
        parent_id: 1,
        value: "add",
        isSelected: false,
      },
      {
        id: 2,
        parent_id: 1,
        value: "edit",
        isSelected: false,
      },
      {
        id: 3,
        parent_id: 1,
        value: "delete",
        isSelected: false,
      },
      // {
      //   id: 4,parent_id: 1,value: 'deleteMultiple',isSelected: false
      // },
      {
        id: 5,
        parent_id: 1,
        value: "view",
        isSelected: false,
      },
    ],
  },
  {
    id: 10,
    moduleName: "UOM",
    isSelected: false,
    isClosed: false,
    childList: [
      {
        id: 1,
        parent_id: 1,
        value: "add",
        isSelected: false,
      },
      {
        id: 2,
        parent_id: 1,
        value: "edit",
        isSelected: false,
      },
      {
        id: 3,
        parent_id: 1,
        value: "delete",
        isSelected: false,
      },
      // {
      //   id: 4,parent_id: 1,value: 'deleteMultiple',isSelected: false
      // },
      {
        id: 5,
        parent_id: 1,
        value: "view",
        isSelected: false,
      },
    ],
  },
  {
    id: 11,
    moduleName: "GST",
    isSelected: false,
    isClosed: false,
    childList: [
      {
        id: 1,
        parent_id: 1,
        value: "add",
        isSelected: false,
      },
      {
        id: 2,
        parent_id: 1,
        value: "edit",
        isSelected: false,
      },
      {
        id: 3,
        parent_id: 1,
        value: "delete",
        isSelected: false,
      },
      // {
      //   id: 4,parent_id: 1,value: 'deleteMultiple',isSelected: false
      // },
      {
        id: 5,
        parent_id: 1,
        value: "view",
        isSelected: false,
      },
    ],
  },
  {
    id: 12,
    moduleName: "Item",
    isSelected: false,
    isClosed: false,
    childList: [
      {
        id: 1,
        parent_id: 1,
        value: "add",
        isSelected: false,
      },
      {
        id: 2,
        parent_id: 1,
        value: "edit",
        isSelected: false,
      },
      {
        id: 3,
        parent_id: 1,
        value: "delete",
        isSelected: false,
      },
      // {
      //   id: 4,parent_id: 1,value: 'deleteMultiple',isSelected: false
      // },
      {
        id: 5,
        parent_id: 1,
        value: "view",
        isSelected: false,
      },
    ],
  },
  {
    id: 13,
    moduleName: "Brand",
    isSelected: false,
    isClosed: false,
    childList: [
      {
        id: 1,
        parent_id: 1,
        value: "add",
        isSelected: false,
      },
      {
        id: 2,
        parent_id: 1,
        value: "edit",
        isSelected: false,
      },
      {
        id: 3,
        parent_id: 1,
        value: "delete",
        isSelected: false,
      },
      // {
      //   id: 4,parent_id: 1,value: 'deleteMultiple',isSelected: false
      // },
      {
        id: 5,
        parent_id: 1,
        value: "view",
        isSelected: false,
      },
    ],
  },
  {
    id: 14,
    moduleName: "Organisation",
    isSelected: false,
    isClosed: false,
    childList: [
      {
        id: 1,
        parent_id: 1,
        value: "add",
        isSelected: false,
      },
      {
        id: 2,
        parent_id: 1,
        value: "edit",
        isSelected: false,
      },
      {
        id: 3,
        parent_id: 1,
        value: "delete",
        isSelected: false,
      },
      // {
      //   id: 4,parent_id: 1,value: 'deleteMultiple',isSelected: false
      // },
      {
        id: 5,
        parent_id: 1,
        value: "view",
        isSelected: false,
      },
    ],
  },
  {
    id: 15,
    moduleName: "Site",
    isSelected: false,
    isClosed: false,
    childList: [
      {
        id: 1,
        parent_id: 1,
        value: "add",
        isSelected: false,
      },
      {
        id: 2,
        parent_id: 1,
        value: "edit",
        isSelected: false,
      },
      {
        id: 3,
        parent_id: 1,
        value: "delete",
        isSelected: false,
      },
      // {
      //   id: 4,parent_id: 1,value: 'deleteMultiple',isSelected: false
      // },
      {
        id: 5,
        parent_id: 1,
        value: "view",
        isSelected: false,
      },
    ],
  },
  {
    id: 16,
    moduleName: "Vendor",
    isSelected: false,
    isClosed: false,
    childList: [
      {
        id: 1,
        parent_id: 1,
        value: "add",
        isSelected: false,
      },
      {
        id: 2,
        parent_id: 1,
        value: "edit",
        isSelected: false,
      },
      {
        id: 3,
        parent_id: 1,
        value: "delete",
        isSelected: false,
      },
      // {
      //   id: 4,parent_id: 1,value: 'deleteMultiple',isSelected: false
      // },
      {
        id: 5,
        parent_id: 1,
        value: "view",
        isSelected: false,
      },
    ],
  },
  {
    id: 17,
    moduleName: "Category",
    isSelected: false,
    isClosed: false,
    childList: [
      {
        id: 1,
        parent_id: 1,
        value: "add",
        isSelected: false,
      },
      {
        id: 2,
        parent_id: 1,
        value: "edit",
        isSelected: false,
      },
      {
        id: 3,
        parent_id: 1,
        value: "delete",
        isSelected: false,
      },
      // {
      //   id: 4,parent_id: 1,value: 'deleteMultiple',isSelected: false
      // },
      {
        id: 5,
        parent_id: 1,
        value: "view",
        isSelected: false,
      },
    ],
  },
  {
    id: 18,
    moduleName: "Sub Category",
    isSelected: false,
    isClosed: false,
    childList: [
      {
        id: 1,
        parent_id: 1,
        value: "add",
        isSelected: false,
      },
      {
        id: 2,
        parent_id: 1,
        value: "edit",
        isSelected: false,
      },
      {
        id: 3,
        parent_id: 1,
        value: "delete",
        isSelected: false,
      },
      // {
      //   id: 4,parent_id: 1,value: 'deleteMultiple',isSelected: false
      // },
      {
        id: 5,
        parent_id: 1,
        value: "view",
        isSelected: false,
      },
    ],
  },
  {
    id: 19,
    moduleName: "Add_Requisition",
    isSelected: false,
    isClosed: false,
    // childList: [
    //   {
    //     id: 5, parent_id: 1, value: 'view', isSelected: false
    //   },
    // ]
    childList: [
      {
        id: 5,
        parent_id: 1,
        value: "view",
        isSelected: false,
      },
     
  {
        id: 3,
        parent_id: 1,
        value: "view All Sites Requisition",
        isSelected: false,
      },
      {
        id: 1,
        parent_id: 1,
        value: "add",
        isSelected: false,
      },
      {
        id: 2,
        parent_id: 1,
        value: "edit",
        isSelected: false,
      },
      // {
      //   id: 3, parent_id: 1, value: 'delete', isSelected: false
      // },
    ],
  },
  {
    id: 20,
    moduleName: "Requisition_approval",
    isSelected: false,
    isClosed: false,
    // childList: [
    //   {
    //     id: 5, parent_id: 1, value: 'view', isSelected: false
    //   },
    // ]
    childList: [
      {
        id: 5,
        parent_id: 1,
        value: "view",
        isSelected: false,
      },

      {
        id: 1,
        parent_id: 1,
        value: "PM Level Approval",
        isSelected: false,
      },
      {
        id: 4,
        parent_id: 1,
        value: "PD Level Approval",
        isSelected: false,
      },
      {
        id: 2,
        parent_id: 1,
        value: "Revise",
        isSelected: false,
      },
      {
        id: 3,
        parent_id: 1,
        value: "Reject",
        isSelected: false,
      },
    ],
  },

  {
    id: 21,
    moduleName: "Rate_comparitive",
    isSelected: false,
    isClosed: false,
    // childList: [
    //   {
    //     id: 5, parent_id: 1, value: 'view', isSelected: false
    //   },
    // ]
    childList: [
      {
        id: 5,
        parent_id: 1,
        value: "view",
        isSelected: false,
      },

      {
        id: 1,
        parent_id: 1,
        value: "add",
        isSelected: false,
      },
      {
        id: 2,
        parent_id: 1,
        value: "edit",
        isSelected: false,
      },
      // {
      //   id: 3, parent_id: 1, value: 'delete', isSelected: false
      // },
    ],
  },
  {
    id: 22,
    moduleName: "Rate_approval",
    isSelected: false,
    isClosed: false,
    childList: [
      {
        id: 5,
        parent_id: 1,
        value: "view",
        isSelected: false,
      },

      {
        id: 1,
        parent_id: 1,
        value: "add",
        isSelected: false,
      },
      {
        id: 2,
        parent_id: 1,
        value: "edit",
        isSelected: false,
      },
      {
        id: 3,
        parent_id: 1,
        value: "delete",
        isSelected: false,
      },
      {
        id: 4,
        parent_id: 1,
        value: "initial Approval",
        isSelected: false,
      },
      {
        id: 6,
        parent_id: 1,
        value: "Final Approval",
        isSelected: false,
      },
    ],
  },
  {
    id: 23,
    moduleName: "Requisition_order",
    isSelected: false,
    isClosed: false,
    // childList: [
    //   {
    //     id: 5, parent_id: 1, value: 'view', isSelected: false
    //   },

    // ]
    childList: [
      {
        id: 5,
        parent_id: 1,
        value: "view",
        isSelected: false,
      },

      {
        id: 1,
        parent_id: 1,
        value: "add",
        isSelected: false,
      },
      {
        id: 2,
        parent_id: 1,
        value: "edit",
        isSelected: false,
      },

      {
        id: 3,
        parent_id: 1,
        value: "delete",
        isSelected: false,
      },
      {
        id: 4,
        parent_id: 1,
        value: "Purchase Order Approval",
        isSelected: false,
      },
    ],
  },
  {
    id: 24,
    moduleName: "Inventory",
    isSelected: false,
    isClosed: false,
    childList: [
      {
        id: 5,
        parent_id: 1,
        value: "view",
        isSelected: false,
      },
    ],
  },
  {
    id: 25,
    moduleName: "DMR",
    isSelected: false,
    isClosed: false,
    childList: [
       {
                id: 2,
                parent_id: 1,
                value: "edit",
                isSelected: false,
              },  
              {
                id: 5,
                parent_id: 1,
                value: "view",
                isSelected: false,
              },
                {
                id: 1,
                parent_id: 1,
                value: "Add",
                isSelected: false,
              },  
              {
                 id: 4,
                parent_id: 1,
                value: "Debit Note Handling",
                isSelected: false,
              },
                {
                 id: 3,
                parent_id: 1,
                value: "Closing DMR",
                isSelected: false,
              },
                {
                 id: 6,
                parent_id: 1,
                value: "DMR Closure Approval",
                isSelected: false,
              },
             

    ],
  },

  {
    id: 26,
    moduleName: "Special Permissions",
    isSelected: false,
    isClosed: false,
    childList: [
      {
        id: 1,
        parent_id: 26,
        value: "Edit Approved PR",
        isSelected: false,
      },
      {
        id: 1,
        parent_id: 26,
        value: "Revise Approved PO",
        isSelected: false,
      },
      {
        id: 1,
        parent_id: 26,
        value: "Create DMR Order",
        isSelected: false,
      },
      {
                id: 1,
                parent_id: 26,
                value: "Initial Approval Variance DMR Closure",
                isSelected: false,
              },
               {
                id: 1,
                parent_id: 26,
                value: "Final Approval Variance DMR Closure",
                isSelected: false,
              },
    ],
  },
  {
    id: 27,
    moduleName: "InterSite Inventory Transfer",
    isSelected: false,
    isClosed: false,
    childList: [
      {
        id: 1,
        parent_id: 27,
        value: "Add Transfer Request",
        isSelected: false,
      },
        {
        id: 2,
        parent_id: 27,
        value: "View",
        isSelected: false,
      },
       {
        id: 3,
        parent_id: 27,
        value: "Edit",
        isSelected: false,
      },
       {
        id: 4,
        parent_id: 27,
        value: "PD Approval",
        isSelected: false,
      },
       {
        id: 5,
        parent_id: 27,
        value: "Store Head Approval",
        isSelected: false,
      },
       {
        id: 6,
        parent_id: 27,
        value: "Asset Head Approval",
        isSelected: false,
      },
       {
        id: 7,
        parent_id: 27,
        value: "Material Receiving",
        isSelected: false,
      },
  {
        id: 8,
        parent_id: 27,
        value: "Request Closure",
        isSelected: false,
      },
    
    ],
  },
];

// Export all constants for use throughout the application
module.exports = {
  billingAddress,
  mailContentHeader,
  mailContent,
  termsConsition,
  companyLogo,
  ModuleList,
};
