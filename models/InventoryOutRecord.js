/**
 * Inventory Out Record Model
 * Schema for storing inventory issue slips (material issue records)
 * 
 * This model represents a complete issue slip that can contain multiple items.
 * Each issue slip has a unique issue slip number and entry number.
 * 
 * Fields:
 * - site: Site ID where issue is made
 * - issueSlip_number: Unique issue slip number
 * - entry_number: Sequential entry number
 * - type: Type of issue/return
 * - itemType: Type of items (BOQ, SE, Asset)
 * - issue_Date: Date of issue
 * - authorizedBy: Person who authorized the issue
 * - receivedBy: Person/contractor who received the items
 * - issuedBy: Person who issued the items
 * - receivedByName: Name of the person who received
 * - wo_number: Work order number (optional)
 * - items: Array of items being issued
 */

const mongoose = require('mongoose');
const schema = mongoose.Schema;
const config = require('../config/env');

/**
 * Inventory Types Enum
 */
const InventoryTypes = {
  PROJECT_BOQ: "BOQ",
  SITE_ESTABLISHMENT: "SE",
  ASSETS: 'Asset',
};

const InventoryOutRecordSchema = new mongoose.Schema({
    companyIdf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "onboardingcompany",
        required: true
    },
    /**
     * Site
     * Site ID where issue is made
     * @type {ObjectId}
     * @required
     */
    site: {
        type: schema.Types.ObjectId,
        required: true
    },
    
    /**
     * Issue Slip Number
     * Unique issue slip number
     * @type {String}
     * @required
     */
    issueSlip_number: {
        type: String,
        required: true
    },
    
    /**
     * Entry Number
     * Sequential entry number for the site
     * @type {Number}
     * @required
     */
    entry_number: {
        type: Number,
        required: true
    },
    
    /**
     * Type
     * Type of issue/return
     * @type {String}
     * @required
     */
    type: {
        type: String,
        required: true
    },
    
    /**
     * Item Type
     * Type of items in this issue slip
     * @type {String}
     * @enum ['BOQ', 'SE', 'Asset']
     * @required
     */
    itemType: {
        type: String,
        enum: ['BOQ', 'SE', 'Asset'],
        required: true
    },
   
    /**
     * Issue Date
     * Date when items were issued
     * @type {String}
     * @required
     */
    issue_Date: {
        type: String,
        required: true
    },
    
    /**
     * Authorized By
     * Person who authorized the issue
     * @type {ObjectId}
     * @required
     */
    authorizedBy: {
        type: schema.Types.ObjectId,
        required: true
    },
    
    /**
     * Received By
     * ID/name of person/contractor who received the items
     * @type {String}
     * @required
     */
    receivedBy: {
        type: String,
        required: true
    },
    
    /**
     * Issued By
     * Person who issued the items
     * @type {ObjectId}
     * @required
     */
    issuedBy: {
        type: schema.Types.ObjectId,
        required: true
    },

    /**
     * Received By Name
     * Name of the person who received the items
     * @type {String}
     * @required
     */
    receivedByName: {
        type: String,
        required: true
    },
    
    /**
     * Work Order Number
     * Work order number associated with this issue (optional)
     * @type {String}
     */
    wo_number: {
        type: String,
        default: ""
    },
    
    /**
     * Items
     * Array of items being issued
     * @type {Array}
     */
    items: [
        {
            /**
             * Item ID
             * @type {ObjectId}
             * @required
             */
            item_id: {
                type: schema.Types.ObjectId,
                required: true
            },
            
            /**
             * Item Code
             * @type {String}
             * @required
             */
            item_code: {
                type: String,
                required: true
            },
            
            /**
             * Unit of Measurement (UOM)
             * @type {String}
             * @required
             */
            uom: {
                type: String,
                required: true
            },
            
            /**
             * Issued Quantity
             * Quantity being issued
             * @type {Number}
             * @required
             */
            issued_Qty: {
                type: Number,
                required: true
            },
           
            /**
             * Inventory Type
             * Type of inventory for this item
             * @type {String}
             * @enum ['BOQ', 'SE', 'P&M']
             * @required
             */
            inventoryType: {
                type: String,
                enum: ['BOQ', 'SE', 'P&M'],
                required: true
            },
            
            /**
             * Remarks
             * Remarks for this item
             * @type {String}
             */
            remarks: {
                type: String,
            },
        }
    ],
   
    
    created_by: String,
    updated_by: String
},{
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
})
InventoryOutRecordSchema.set('autoIndex', config.db.autoIndex);
module.exports = mongoose.model('Inventory_Out_Record',InventoryOutRecordSchema)



