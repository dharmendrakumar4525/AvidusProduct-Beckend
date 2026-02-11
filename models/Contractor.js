/**
 * Contractor Model
 * Schema for storing contractor information
 * 
 * Contractors can be assigned to multiple sites and have different work types
 * 
 * Fields:
 * - name: Contractor name
 * - code: Auto-generated contractor code (e.g., "0001", "0002")
 * - number: Sequential contractor number
 * - Contact_Person: Contact person name
 * - sites: Array of site IDs where contractor is assigned
 * - email: Email address (optional)
 * - phone: Phone number
 * - NatureOfWork: Type of work (With Material, Without Material, Labour Supplier)
 * - type: Contractor type (Contractor or Sub-Contractor)
 * - location: Location of contractor
 * - date: Date when contractor was added
 */

const mongoose = require("mongoose");

const contractorSchema = new mongoose.Schema({
  /**
   * Contractor Name
   * @type {String}
   * @required
   */
  name: {
    type: String,
    required: true,
  },
  
  /**
   * Contractor Code
   * Auto-generated 4-digit code (e.g., "0001", "0002")
   * @type {String}
   * @required
   */
  code: {
    type: String,
    required: true,
  },
  
  /**
   * Contractor Number
   * Sequential number for contractor identification
   * @type {Number}
   * @required
   */
  number: {
    type: Number,
    required: true,
  },
  
  /**
   * Contact Person
   * Name of the contact person
   * @type {String}
   * @required
   */
  Contact_Person: {
    type: String,
    required: true,
  },

  /**
   * Sites
   * Array of site IDs where contractor is assigned
   * @type {Array<ObjectId>}
   * @ref site
   */
  sites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "site",
  }],

  /**
   * Email Address
   * @type {String}
   * @optional
   */
  email: {
    type: String,
  },

  /**
   * Phone Number
   * @type {String}
   * @required
   */
  phone: {
    type: String,
    required: true,
  },

  /**
   * Nature of Work
   * Type of work the contractor performs
   * @type {String}
   * @enum ['With Material', 'Without Material', 'Labour Supplier']
   * @required
   */
  NatureOfWork: {
    type: String,
    enum: ['With Material', 'Without Material', 'Labour Supplier'],
    required: true,
  },
  
  /**
   * Contractor Type
   * Whether the contractor is a main contractor or sub-contractor
   * @type {String}
   * @enum ['Contractor', 'Sub-Contractor']
   * @required
   */
  type: {
    type: String,
    enum: ['Contractor', 'Sub-Contractor'],
    required: true,
  },
  
  /**
   * Location
   * Location of the contractor
   * @type {String}
   * @required
   */
  location: {
    type: String,
    required: true,
  },

  /**
   * Date
   * Date when contractor was added
   * @type {Date}
   * @default Date.now
   */
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("contractor", contractorSchema);
