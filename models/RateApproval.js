/**
 * Rate Approval Model
 * Schema for storing rate approval requests and their workflow
 * 
 * This model manages the rate approval workflow from rate comparison to final approval.
 * It supports splitting PRs, merging PRs, and tracking approval history.
 * 
 * Workflow Stages:
 * - rate_comparitive: Rate comparison stage
 * - rate_approval: Rate approval stage
 * 
 * Status Values:
 * - pending: Awaiting approval
 * - draft: Draft state
 * - approved: Approved
 * - rejected: Rejected
 * - revise: Needs revision
 * - revised: Has been revised
 * 
 * Key Features:
 * - Initial and final approval tracking
 * - PR history tracking
 * - Vendor rate comparison (item-wise and vendor-wise)
 * - Support for merged PRs
 * - Local purchase flag
 * - Open order tracking
 * - Billing cycle configuration
 * 
 * Fields:
 * - rate_approval_number: Auto-generated rate approval number
 * - purchase_request_id: Reference to purchase request
 * - items: Array of items with specifications, rates, taxes
 * - vendorItems: Vendor item mappings
 * - vendorRatesItemWise: Item-wise vendor rate comparisons
 * - vendorRatesVendorWise: Vendor-wise rate comparisons
 * - vendors_total: Array of vendor totals with preferred vendor flag
 * - prHistory: History of status and stage changes
 * - mergedPR: Array of merged purchase requests
 * - status: Current approval status
 * - stage: Current workflow stage
 */

const mongoose = require('mongoose');
const schema = mongoose.Schema;
const config = require('../config/env');

const RateApprovalSchema = new mongoose.Schema({

    /**
     * Rate Approval Number
     * Auto-generated rate approval number
     * @type {String}
     */
    rate_approval_number: {
        type: String,
    },
    
    /**
     * PR Type
     * Purchase request type
     * @type {String}
     * @required
     */
    prType: {
        type: String,
        required: true,
    },
    
    /**
     * Purchase Request Number
     * Purchase request number (string format)
     * @type {String}
     */
    purchase_request_number: {
        type: String,
    },

    /**
     * Title
     * Rate approval title
     * @type {String}
     * @required
     */
    title: {
        type: String,
        required: true
    },
    
    /**
     * Handle By
     * Person handling the rate approval
     * @type {String}
     * @default ''
     */
    handle_by: {
        type: String,
        default: ''
    },
    
    /**
     * Initial Approved
     * Flag indicating initial approval status
     * @type {Boolean}
     * @default false
     */
    initial_approved: {
        type: Boolean,
        default: false,
    },
    
    /**
     * Final Approved
     * Flag indicating final approval status
     * @type {Boolean}
     * @default false
     */
    final_approved: {
        type: Boolean,
        default: false,
    },
    
    /**
     * Initial Approved By
     * User who gave initial approval
     * @type {String}
     * @default ""
     */
    initial_approvedBy: {
        type: String,
        default: "",
    },
    
    /**
     * Final Approved By
     * User who gave final approval
     * @type {String}
     * @default ""
     */
    final_approvedBy: {
        type: String,
        default: "",
    },
    date: {
        type: Date,
        required: true
    },
    expected_delivery_date: {
        type: Date,
        required: true
    },
    purchase_request_id: {
        type: schema.Types.ObjectId,
        required: true
    },
    purchase_request_number: {
        type: Number,
    },
    order_Type: {
        type: String,
        enum: ['Purchase Order', 'Work Order'],
        default: 'Purchase Order'
    },
    open_order : {
        type: String,
        enum: ['yes', 'no'],
        default: 'no'
    },
    billing_cycle: {
  type: String,
  enum: ['hour', 'day', 'week', 'month', 'quarter', 'half_year', 'one_year']
},
    site: {
        type: schema.Types.ObjectId,
        required: true
    },
    local_purchase: {
        type: String,
        enum: ['yes', 'no'],
        default: 'yes'
    },
    /**
     * Items
     * Array of items in the rate approval
     * @type {Array}
     */
    items: [{
        /**
         * Item ID
         * Reference to the item
         * @type {ObjectId}
         * @ref item
         * @required
         */
        item_id: {
            type: schema.Types.ObjectId,
            ref: 'item',
            required: true
        },
        
        /**
         * Specification
         * Item specification
         * @type {String}
         * @default ''
         */
        specification: {
            type: String,
            default: ''
        },
        
        /**
         * HSN Code
         * HSN code for the item
         * @type {String}
         * @default ''
         */
        hsnCode: {
            type: String,
            default: ''
        },
        
        /**
         * Item Code
         * Item code
         * @type {String}
         * @default ''
         */
        item_code: {
            type: String,
            default: ''
        },
        
        /**
         * PR UOM
         * Unit of measurement from purchase request
         * @type {String}
         */
        prUOM: {
            type: String,
        },
        
        /**
         * Rate UOM
         * Unit of measurement for rate
         * @type {String}
         */
        rateUOM: {
            type: String,
        },
        
        /**
         * Tax
         * Tax information
         * @type {Object}
         */
        tax: {
            /**
             * Tax Amount
             * @type {Number}
             */
            amount: Number,
            
            /**
             * Tax Name
             * @type {String}
             */
            name: String
        },
        
        /**
         * Quantity
         * Item quantity
         * @type {Number}
         * @default 1
         */
        qty: {
            type: Number,
            default: 1
        },
        
        /**
         * Brand Name
         * Array of brand names
         * @type {Array<String>}
         * @default ''
         */
        brandName: {
            type: [String],
            default: ''
        },
        
        /**
         * Attachment
         * Array of attachment URLs
         * @type {Array<String>}
         * @default ''
         */
        attachment: {
            type: [String],
            default: ''
        },
        
        /**
         * Remark
         * Remarks for the item
         * @type {String}
         * @default ''
         */
        remark: {
            type: String,
            default: ''
        },
    }],
    
    /**
     * Vendor Items
     * Vendor item mappings
     * @type {Object}
     */
    vendorItems: {},

    /**
     * Vendor Rates Item Wise
     * Item-wise vendor rate comparisons
     * @type {Object}
     */
    vendorRatesItemWise: {},

    /**
     * Vendor Rates Vendor Wise
     * Vendor-wise rate comparisons
     * @type {Object}
     */
    vendorRatesVendorWise: {},

    /**
     * PR History
     * History of status and stage changes
     * @type {Array}
     */
    prHistory: [
        {
            _id: false,
            /**
             * Rate Approval Number
             * @type {String}
             */
            rate_approval_number: { type: String },
            
            /**
             * Updated By
             * User who made the update
             * @type {ObjectId}
             * @required
             */
            updated_By: { type: schema.Types.ObjectId, required: true },
            
            /**
             * Updated Date
             * Date of the update
             * @type {Date}
             * @default Date.now
             */
            updated_Date: { type: Date, default: Date.now },
            
            /**
             * Status
             * Status at the time of update
             * @type {String}
             * @required
             */
            status: { type: String, required: true },
            
            /**
             * Stage
             * Stage at the time of update
             * @type {String}
             * @required
             */
            stage: { type: String, required: true },
        }
    ],
    
    /**
     * Rate Approval Numbers
     * Array of rate approval numbers (for merged approvals)
     * @type {Array<Number>}
     */
    rate_approval_numbers: [Number],
    
    /**
     * Purchase Request Numbers
     * Array of purchase request numbers (for merged PRs)
     * @type {Array<String>}
     */
    purchase_request_numbers: [String],
    
    /**
     * Compare By
     * Comparison method
     * @type {String}
     */
    compareBy: {
        type: String
    },
    
    /**
     * Status
     * Current approval status
     * @type {String}
     * @enum ['pending', 'draft', 'approved', 'rejected', 'revise', 'revised']
     * @default 'pending'
     */
    status: {
        type: String,
        enum: ['pending', 'draft', 'approved', 'rejected', 'revise', 'revised'],
        default: 'pending'
    },
    
    /**
     * Stage
     * Current workflow stage
     * @type {String}
     * @enum ['rate_comparitive', 'rate_approval']
     * @default 'rate_comparitive'
     */
    stage: {
        type: String,
        enum: ['rate_comparitive', 'rate_approval'],
        default: 'rate_comparitive'
    },
    new_request: {
        type: Boolean,
        default: true
    },
    remarks: {
        type: String,
        default: ""
    },
   files: {
        type: Object,
        required: false,
    },
    

    mergedPR: [
        {
            purchase_request_id: {
            type: schema.Types.ObjectId,
            
          },
          purchase_request_number: {
            type: Number,
          },
          date: {
            type: Date 
          },
          expected_delivery_date: {
            type: Date
          }
        }
      ], 
        

    /**
     * Vendors Total
     * Array of vendor totals with financial breakdown
     * @type {Array}
     */
    vendors_total: [
        {
            /**
             * Vendor ID
             * Reference to vendor
             * @type {ObjectId}
             * @required
             */
            vendor_id: {
                type: schema.Types.ObjectId,
                required: true
            },

            /**
             * Subtotal
             * Subtotal amount
             * @type {Number}
             * @default 0
             */
            subtotal: {
                type: Number,
                default: 0
            },
            
            /**
             * Total Tax
             * Total tax amount
             * @type {Number}
             * @default 0
             */
            total_tax: {
                type: Number,
                default: 0
            },
            
            /**
             * Freight Charges
             * Freight charges
             * @type {Number}
             * @default 0
             */
            freight_charges: {
                type: Number,
                default: 0
            },
            
            /**
             * Freight Tax
             * Tax on freight
             * @type {Number}
             * @default 0
             */
            freight_tax: {
                type: Number,
                default: 0
            },
            
            /**
             * Total Amount
             * Total amount including all charges and taxes
             * @type {Number}
             * @default 0
             */
            total_amount: {
                type: Number,
                default: 0
            },
            
            /**
             * Preferred
             * Flag indicating if this vendor is preferred
             * @type {Boolean}
             * @default false
             */
            preferred: {
                type: Boolean,
                default: false
            }
        }
    ],
    created_by: String,
    updated_by: String
}, {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
})
RateApprovalSchema.set('autoIndex', config.db.autoIndex);
module.exports = mongoose.model('rate_approval', RateApprovalSchema)