/**
 * Chatbot Retrieval Engine
 * Executes read-only MongoDB queries from query spec with role scope and safety limits.
 * All queries are scoped to the user's company (companyIdf) for multi-tenant isolation.
 */

const mongoose = require("mongoose");
const { COLLECTIONS, DEFAULT_QUERY_LIMIT } = require("../../config/chatbot/collections-schema");

const QUERY_TIMEOUT_MS = 15000;
const DEFAULT_LIMIT = Math.min(DEFAULT_QUERY_LIMIT, 100);

/**
 * Get Mongoose model by collection key.
 */
function getModel(collectionKey) {
  const col = COLLECTIONS[collectionKey];
  if (!col || !col.modelName) return null;
  try {
    return mongoose.model(col.modelName);
  } catch (e) {
    return null;
  }
}

/**
 * Merge scope filter with user filter (both applied).
 */
function mergeFilter(userFilter, scopeFilter) {
  if (!scopeFilter || Object.keys(scopeFilter).length === 0) return userFilter;
  return { $and: [userFilter, scopeFilter].filter((f) => Object.keys(f).length > 0) };
}

/**
 * Execute read-only find with timeout and limit.
 * Automatically applies companyIdf filter for multi-tenant isolation.
 *
 * @param {object} querySpec - { collectionKey, filter, projection, limit }
 * @param {object} scopeFilter - from roleGuard.buildScopeFilter(collectionKey)
 * @param {string} [companyIdf] - company ID from user context for tenant isolation
 * @returns {Promise<{ data: any[], total: number }>}
 */
async function executeQuery(querySpec, scopeFilter, companyIdf) {
  const { collectionKey, filter = {}, projection, limit = DEFAULT_LIMIT } = querySpec;
  const Model = getModel(collectionKey);
  if (!Model) {
    return { data: [], total: 0, error: "Invalid collection" };
  }

  // Build tenant filter — scope every query to the user's company
  const tenantFilter = companyIdf ? { companyIdf: new mongoose.Types.ObjectId(companyIdf) } : {};
  const filterMerged = mergeFilter(
    mergeFilter(filter, scopeFilter),
    tenantFilter
  );

  const options = {
    limit: Math.min(limit, 500),
    maxTimeMS: QUERY_TIMEOUT_MS,
    lean: true,
  };

  let cursor = Model.find(filterMerged);

  if (projection && Object.keys(projection).length > 0) {
    cursor = cursor.select(projection);
  }

  cursor = cursor.limit(options.limit).maxTimeMS(QUERY_TIMEOUT_MS);

  const data = await cursor.lean().exec();
  const total = data.length;

  return { data, total };
}

module.exports = {
  executeQuery,
  getModel,
  mergeFilter,
  QUERY_TIMEOUT_MS,
};
