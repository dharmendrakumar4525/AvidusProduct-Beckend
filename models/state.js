/**
 * State Model
 * Schema for storing state/province geographic data
 * 
 * This model stores state information linked to countries
 * 
 * Fields:
 * - id: State ID
 * - name: State name
 * - country_id, country_code, country_name: Country information
 * - iso2, iso3166_2: ISO codes
 * - fips_code: FIPS code
 * - type, level: State type and level
 * - parent_id: Parent state ID (for hierarchical states)
 * - native: Native name
 * - latitude, longitude: Geographic coordinates
 * - translations: Translations object
 * - timezone: Timezone
 * - population: Population
 */

const mongoose = require("mongoose");

const StateSchema = new mongoose.Schema({
  /**
   * State ID
   * @type {Number}
   */
  id: Number,
  
  /**
   * State Name
   * @type {String}
   */
  name: String,
  
  /**
   * Country ID
   * @type {Number}
   */
  country_id: Number,
  
  /**
   * Country Code
   * @type {String}
   */
  country_code: String,
  
  /**
   * Country Name
   * @type {String}
   */
  country_name: String,
  
  /**
   * ISO2 Code
   * @type {String}
   */
  iso2: String,
  
  /**
   * ISO3166-2 Code
   * @type {String}
   */
  iso3166_2: String,
  
  /**
   * FIPS Code
   * @type {String}
   */
  fips_code: String,
  
  /**
   * Type
   * State type
   * @type {String}
   */
  type: String,
  
  /**
   * Level
   * Administrative level
   * @type {String}
   */
  level: String,
  
  /**
   * Parent ID
   * Parent state ID (for hierarchical states)
   * @type {Number}
   */
  parent_id: Number,
  
  /**
   * Native Name
   * State name in native language
   * @type {String}
   */
  native: String,
  
  /**
   * Latitude
   * @type {String}
   */
  latitude: String,
  
  /**
   * Longitude
   * @type {String}
   */
  longitude: String,
  
  /**
   * Translations
   * Translations object
   * @type {Object}
   */
  translations: Object,
  
  /**
   * Timezone
   * @type {String}
   */
  timezone: String,
  
  /**
   * Population
   * @type {Number}
   */
  population: Number
});

module.exports = mongoose.model("State", StateSchema);
