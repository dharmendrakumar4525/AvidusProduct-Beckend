/**
 * Site Staff Model
 * Schema for storing site staff/employee information
 * 
 * Site staff can be assigned to multiple sites and have unique employee codes
 * 
 * Fields:
 * - name: Staff name
 * - sites: Array of site IDs where staff is assigned
 * - email: Email address (optional)
 * - phone: Phone number
 * - role: Staff role/position
 * - employeeCode: Unique employee code (must be unique across all staff)
 * - date: Date when staff was added
 */

const mongoose = require("mongoose");

const siteStaffSchema = new mongoose.Schema({
  companyIdf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "onboardingcompany",
      required: true
  },
  /**
   * Staff Name
   * @type {String}
   * @required
   */
  name: {
    type: String,
    required: true,
  },

  /**
   * Sites
   * Array of site IDs where staff is assigned
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
   * Role
   * Staff role/position
   * @type {String}
   * @required
   */
  role: {
    type: String,
    required: true,
  },
  
  /**
   * Employee Code
   * Unique employee code (must be unique across all site staff)
   * @type {String}
   * @required
   * @unique
   */
  employeeCode: {
    type: String,
    required: true,
  },

  /**
   * Date
   * Date when staff was added
   * @type {Date}
   * @default Date.now
   */
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("siteStaff", siteStaffSchema);
