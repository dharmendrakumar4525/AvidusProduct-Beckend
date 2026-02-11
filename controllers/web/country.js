/**
 * Country Controller
 * Handles all operations related to geographic data (Countries, States, Cities) including:
 * - Retrieving countries list
 * - Retrieving states by country
 * - Retrieving cities by state
 * - Retrieving city by code
 * - Caching for performance optimization (24-hour TTL)
 */

const Country = require("../../models/country");
const State = require("../../models/state");
const City = require("../../models/city");
const {
  getCache,
  setCache,
  invalidateEntity,
  invalidateEntityList,
} = require("../../utils/cache");
const { STATIC } = require("../../libs/cacheConfig");

/**
 * Get Countries
 * GET /api/web/country
 * Retrieves all countries sorted alphabetically
 * 
 * Caching:
 * - Cache key: "geo:countries"
 * - TTL: 24 hours (86400 seconds)
 * 
 * @returns {Array} List of all countries sorted by name
 */
exports.getCountries = async (req, res) => {
  try {
    const cacheKey = "geo:countries";

    // Check cache first
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Fetch from database if not cached
    const list = await Country.find({}).sort({ name: 1 });

    // Cache for 24 hours
    await setCache(cacheKey, list, STATIC);
    
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch countries" });
  }
};


/**
 * Get States By Country
 * GET /api/web/country/states
 * Retrieves all states for a specific country
 * 
 * @param {String} req.query.countryCode - Country code (required, case-insensitive)
 * 
 * Caching:
 * - Cache key: "geo:states:{countryCode}"
 * - TTL: 24 hours (86400 seconds)
 * 
 * @returns {Array} List of states for the country sorted by name
 */
exports.getStatesByCountry = async (req, res) => {
  try {
    const { countryCode } = req.query;
    const upperCode = countryCode.toUpperCase();

    const cacheKey = `geo:states:${upperCode}`;

    // Check cache first
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Fetch from database if not cached
    const states = await State.find({ country_code: upperCode })
      .sort({ name: 1 });

    // Cache for 24 hours
    await setCache(cacheKey, states, STATIC);

    res.json(states);
  } catch (err) {
    console.log("Error fetching states:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


/**
 * Get Cities By State
 * GET /api/web/country/cities
 * Retrieves all cities for a specific state
 * 
 * @param {String} req.query.stateCode - State code (required)
 * 
 * Caching:
 * - Cache key: "geo:cities:{stateCode}"
 * - TTL: 24 hours (86400 seconds)
 * 
 * @returns {Array} List of cities for the state sorted by name
 */
exports.getCitiesByState = async (req, res) => {
  try {
    const { stateCode } = req.query;

    const cacheKey = `geo:cities:${stateCode}`;

    // Check cache first
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Fetch from database if not cached
    const cities = await City.find({ state_code: stateCode })
      .sort({ name: 1 });

    // Cache for 24 hours
    await setCache(cacheKey, cities, STATIC);

    res.json(cities);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch cities" });
  }
};


/**
 * Get City By Code
 * GET /api/web/country/city
 * Retrieves a specific city by its code
 * 
 * @param {String} req.query.cityCode - City code (required)
 * 
 * Caching:
 * - Cache key: "geo:city:{cityCode}"
 * - TTL: 24 hours (86400 seconds)
 * 
 * @returns {Object} City details
 */
exports.getCityByCode = async (req, res) => {
  try {
    const { cityCode } = req.query;

    const cacheKey = `geo:city:${cityCode}`;

    // Check cache first
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Fetch from database if not cached
    const city = await City.findOne({ city_code: cityCode });

    if (!city) {
      return res.status(404).json({ error: "City not found" });
    }

    // Cache for 24 hours
    await setCache(cacheKey, city, STATIC);

    res.json(city);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch city" });
  }
};
