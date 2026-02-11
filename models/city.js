/**
 * City Model
 * Schema for storing city geographic data
 * 
 * This model stores city information linked to states
 * 
 * Fields:
 * - id: City ID
 * - name: City name
 * - latitude, longitude: Geographic coordinates
 * - state_code: State code the city belongs to
 * - country_id: Country ID
 * - city_code: City code (unique per state, not globally)
 */

const mongoose = require("mongoose");

const CitySchema = new mongoose.Schema({
  /**
   * City ID
   * @type {Number}
   */
  id: Number,
  
  /**
   * City Name
   * @type {String}
   */
  name: String,
  
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
   * State Code
   * State code the city belongs to
   * @type {String}
   */
  state_code: String,
  
  /**
   * Country ID
   * @type {Number}
   */
  country_id: Number,
  
  /**
   * City Code
   * City code (unique per state, not globally unique)
   * @type {String}
   * @required
   */
  city_code: {
    type: String,
    required: true,
    unique: false  // unique per state, not global
  }
});

module.exports = mongoose.model("City", CitySchema);
