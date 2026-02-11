/**
 * Country Model
 * Schema for storing country/geographic data
 * 
 * This model stores comprehensive country information including codes,
 * currency, geographic coordinates, and other metadata
 * 
 * Fields:
 * - id: Country ID
 * - name: Country name
 * - iso3, iso2: ISO country codes
 * - numeric_code: Numeric country code
 * - phonecode: Phone country code
 * - capital: Capital city
 * - currency, currency_name, currency_symbol: Currency information
 * - tld: Top-level domain
 * - native: Native name
 * - population: Population
 * - gdp: GDP
 * - region, subregion: Geographic regions
 * - nationality: Nationality
 * - latitude, longitude: Geographic coordinates
 * - emoji: Country flag emoji
 * - translations: Translations object
 * - timezones: Array of timezones
 * - wikiDataId: WikiData identifier
 */

const mongoose = require("mongoose");

const CountrySchema = new mongoose.Schema({
  /**
   * Country ID
   * @type {Number}
   */
  id: Number,
  
  /**
   * Country Name
   * @type {String}
   */
  name: String,
  
  /**
   * ISO3 Code
   * 3-letter ISO country code
   * @type {String}
   */
  iso3: String,
  
  /**
   * ISO2 Code
   * 2-letter ISO country code
   * @type {String}
   */
  iso2: String,
  
  /**
   * Numeric Code
   * Numeric country code
   * @type {String}
   */
  numeric_code: String,
  
  /**
   * Phone Code
   * International phone country code
   * @type {String}
   */
  phonecode: String,
  
  /**
   * Capital
   * Capital city name
   * @type {String}
   */
  capital: String,
  
  /**
   * Currency
   * Currency code
   * @type {String}
   */
  currency: String,
  
  /**
   * Currency Name
   * Full currency name
   * @type {String}
   */
  currency_name: String,
  
  /**
   * Currency Symbol
   * Currency symbol
   * @type {String}
   */
  currency_symbol: String,
  
  /**
   * TLD
   * Top-level domain
   * @type {String}
   */
  tld: String,
  
  /**
   * Native Name
   * Country name in native language
   * @type {String}
   */
  native: String,
  
  /**
   * Population
   * Country population
   * @type {Number}
   */
  population: Number,
  
  /**
   * GDP
   * Gross Domestic Product
   * @type {Number}
   */
  gdp: Number,
  
  /**
   * Region
   * Geographic region
   * @type {String}
   */
  region: String,
  
  /**
   * Region ID
   * @type {Number}
   */
  region_id: Number,
  
  /**
   * Subregion
   * Geographic subregion
   * @type {String}
   */
  subregion: String,
  
  /**
   * Subregion ID
   * @type {Number}
   */
  subregion_id: Number,
  
  /**
   * Nationality
   * @type {String}
   */
  nationality: String,
  
  /**
   * Latitude
   * Geographic latitude
   * @type {String}
   */
  latitude: String,
  
  /**
   * Longitude
   * Geographic longitude
   * @type {String}
   */
  longitude: String,
  
  /**
   * Emoji
   * Country flag emoji
   * @type {String}
   */
  emoji: String,
  
  /**
   * Translations
   * Translations object for country name
   * @type {Object}
   */
  translations: Object,
  
  /**
   * Timezones
   * Array of timezones
   * @type {Array}
   */
  timezones: Array,
  
  /**
   * WikiData ID
   * WikiData identifier
   * @type {String}
   */
  wikiDataId: String
});

module.exports = mongoose.model("Country", CountrySchema);
