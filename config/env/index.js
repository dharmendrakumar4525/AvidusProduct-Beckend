/**
 * Environment Configuration Loader
 * Dynamically loads environment-specific configuration
 * 
 * Loads the appropriate config file based on NODE_ENV:
 * - "production" -> production.js
 * - "local" -> local.js
 * - "stage" or default -> stage.js
 * 
 * @module config/env
 */

const env = process.env.NODE_ENV || "stage";
module.exports = require(`./${env}`);
