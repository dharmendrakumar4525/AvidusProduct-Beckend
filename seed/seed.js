/**
 * Seed script
 * - Reads countries.json, states.json, state+city.json
 * - Inserts countries and states as-is
 * - Flattens cities and generates unique alphabetical city codes per state, pattern: STATECODE-ABC
 *
 * Rules for city code creation:
 * - Base attempt: first 3 alphabet letters of city name
 * - If duplicate within the same state, try shifting window over city name
 * - If still duplicate, alter last char to 'A','B','C'... to make unique
 *
 * Run: npm run seed
 */

const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

require("dotenv").config();

const Country = require("../models/country");
const State = require("../models/state");
const City = require("../models/city");

const MONGO_URI = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/locationdb";

async function loadJson(fileName) {
  const p = path.join(__dirname, fileName);
  if (!fs.existsSync(p)) {
    console.error(`Missing file: ${p}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function normalizeNameForCode(name) {
  // keep only ASCII letters, uppercase
  return name.replace(/[^A-Za-z]/g, "").toUpperCase();
}

function generateCandidateCodes(name) {
  // produce an ordered list of candidate 3-letter codes from the name
  const n = normalizeNameForCode(name);
  const candidates = [];

  // 1) 3-letter sliding windows from start
  for (let i = 0; i <= Math.max(0, n.length - 3); i++) {
    candidates.push(n.substring(i, i + 3));
  }

  // 2) if less than 3 chars, pad with 'X'
  if (n.length > 0 && n.length < 3) {
    candidates.push((n + "XXX").substring(0, 3));
  }

  // 3) fallback base (first 3 chars or padded)
  if (n.length >= 3) candidates.push(n.substring(0, 3));
  else candidates.push((n + "XXX").substring(0, 3));

  // 4) lastly generate variation by replacing last char with A..Z
  // (these will be considered later if needed)
  for (let i = 0; i < 26; i++) {
    const char = String.fromCharCode(65 + i);
    const base = (n.length >= 2 ? n.substring(0, 2) : (n + "X").substring(0,2)).toUpperCase();
    candidates.push(base + char);
  }

  // dedupe preserving order
  return [...new Set(candidates)];
}

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const countries = await loadJson("countries.json");
    const states = await loadJson("states.json");
    const city = await loadJson("cities.json"); // your file name

    // Clear collections
    await Country.deleteMany({});
    await State.deleteMany({});
    await City.deleteMany({});

    console.log(`Inserting ${countries.length} countries...`);
    await Country.insertMany(countries);

    console.log(`Inserting ${states.length} states...`);
    await State.insertMany(states);

    console.log("Generating and inserting cities...");

    const allCityDocs = [];

    // Build quick map for state_code resolution (some datasets use different fields)
    // Map key: state identifier used in your stateCityData (we will try multiple candidates)
    // We will attempt to derive state_code for each state object in stateCityData by checking:
    //  - state.state_code
    //  - state.iso2 or iso3166_2
    //  - falling back to matching by name to the states list
    const statesByCode = {};
    states.forEach(s => {
      if (s.state_code) statesByCode[s.state_code] = s;
      if (s.iso2) statesByCode[s.iso2] = s;
      if (s.iso3166_2) statesByCode[s.iso3166_2] = s;
    });

    function resolveStateCode(stateObj) {
      // stateObj may have fields like state_code or iso2 or iso3166_2
      if (stateObj.state_code) return stateObj.state_code;
      if (stateObj.iso2) return stateObj.iso2;
      if (stateObj.iso3166_2) return stateObj.iso3166_2;
      // Try match by name (case-insensitive)
      const found = states.find(s => s.name && stateObj.name && s.name.toLowerCase() === stateObj.name.toLowerCase());
      if (found) return found.state_code || found.iso2 || found.iso3166_2;
      return null;
    }

    for (const s of city) {
      const stateCode = resolveStateCode(s) || s.state_code || s.iso2 || s.iso3166_2;
      if (!stateCode) {
        console.warn("Warning: could not resolve state_code for state object:", s.name || s);
        continue;
      }

      // usedCodes set ensures uniqueness per state
      const usedCodes = new Set();

      // If there are cities already present with codes for same state (unlikely during seeding),
      // build usedCodes from existing DB (defensive)
      // (skipping DB query for performance during fresh seed)

      if (!Array.isArray(s.cities)) {
        console.warn(`State ${s.name || stateCode} has no cities array, skipping`);
        continue;
      }

      for (const c of s.cities) {
        const cityName = c.name || c;
        const candidates = generateCandidateCodes(cityName);

        let chosen = null;
        for (const cand of candidates) {
          if (!usedCodes.has(cand)) {
            chosen = cand;
            break;
          }
        }
        if (!chosen) {
          // worst case fallback: create incrementing suffix
          let i = 1;
          while (!chosen) {
            const alt = ("XXX" + i).slice(-3).toUpperCase();
            if (!usedCodes.has(alt)) {
              chosen = alt;
              break;
            }
            i++;
          }
        }

        usedCodes.add(chosen);

        const cityDoc = {
          id: c.id || undefined,
          name: cityName,
          latitude: c.latitude || null,
          longitude: c.longitude || null,
          state_code: stateCode,
          country_id: s.country_id || s.country_id || s.countryId || s.country_id,
          city_code: `${stateCode}${chosen}`
        };

        allCityDocs.push(cityDoc);
      }
    }

    console.log(`Prepared ${allCityDocs.length} city docs. Inserting...`);

    if (allCityDocs.length) {
      // Insert in batches to avoid huge single insert
      const BATCH = 1000;
      for (let i = 0; i < allCityDocs.length; i += BATCH) {
        const batch = allCityDocs.slice(i, i + BATCH);
        await City.insertMany(batch, { ordered: false }).catch(err => {
          // ignore duplicate errors (shouldn't happen if algorithm worked)
          if (err && err.writeErrors) {
            console.warn("Some city inserts failed (duplicates?)", err.writeErrors.length);
          } else {
            console.error("InsertMany error:", err);
          }
        });
      }
    }

    console.log("Seeding finished successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seed();
