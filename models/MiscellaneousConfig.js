/**
 * Miscellaneous Config Model
 * Schema for storing miscellaneous configuration data
 * 
 * This model is used for storing various configuration values that can be
 * of any type (string, number, object, array, etc.)
 * 
 * Fields:
 * - type: Configuration type/key identifier
 * - value: Configuration value (can be any type: string, number, object, array, etc.)
 * - createdAt: Timestamp when config was created
 * - updatedAt: Timestamp when config was last updated
 */

const mongoose = require("mongoose");

const MiscellaneousConfigSchema = new mongoose.Schema({
  /**
   * Type
   * Configuration type/key identifier (e.g., "amount", "special_case", etc.)
   * @type {String}
   * @required
   */
  type: { 
    type: String, 
    required: true 
  },
  
  /**
   * Value
   * Configuration value - can be any type (object, array, string, number, etc.)
   * @type {Mixed}
   * @required
   */
  value: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true 
  },
  
  /**
   * Created At
   * Timestamp when config was created
   * @type {Date}
   * @default Date.now
   */
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  
  /**
   * Updated At
   * Timestamp when config was last updated
   * @type {Date}
   * @default Date.now
   */
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
});

module.exports = mongoose.model(
  "MiscellaneousConfig",
  MiscellaneousConfigSchema
);
