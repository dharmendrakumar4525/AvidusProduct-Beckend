/**
 * Role Model
 * Defines the schema for role-based access control including:
 * - Role name
 * - Notification preferences (array of notification types)
 * - Dashboard permissions (hierarchical module-based permissions)
 * - Supports granular permissions per module (add, edit, delete, view, etc.)
 */

const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema({
  companyIdf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "onboardingcompany",
      required: true
  },
  // Role name (e.g., "superadmin", "project_manager", "store_manager")
  role: {
    type: String,
    required: true,
  },
  
  // Notification types that this role should receive
  notifications: {
    type: [String], // Array of notification type strings
    enum: [
      "RR_approval_project_manager",
      "RR_approval_project_director",
      "RR_approved",
      "RC_initial_approval",
      "RC_final_approval",
      "rate_approved",
      "RO_approval",
      "RO_approved",
      "PR_revise_reject_PM",
      "PR_revise_reject_PD",
      "PR_revised",
      "PR_edited_by_superadmin",
      "RC_revise_initial",
      "RC_revise_final",
      "RC_reject_initial",
      "RC_reject_final",
      "RC_revised",
      "PO_reject",
      "PO_revised_by_superadmin",
      "debit_note_vendor",
    ],
    default: [],
  },

  // Dashboard permissions - hierarchical structure with modules and their permissions
  // Each module has child permissions (add, edit, delete, view, etc.)
  dashboard_permissions: {
    type: Array,
    default: [
      {
        isAllSelected: false,
        isAllCollapsed: false,
        ParentChildchecklist: [
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
    ],
  },

  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Role", roleSchema);
