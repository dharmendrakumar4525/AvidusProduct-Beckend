/**
 * Chatbot Role Guard
 * Resolves allowed collections, allowed fields per collection, and scope filter
 * from config. Used by Query Builder and Retrieval Engine.
 */

const { getPermissionsForRole } = require("../../config/chatbot/role-permissions");
const { COLLECTIONS } = require("../../config/chatbot/collections-schema");

/**
 * Build scope filter for MongoDB from user context and scope config.
 * e.g. { site: true } + user.sites -> { site: { $in: user.sites } }
 *
 * @param {{ site?: boolean }} scope - from role permissions
 * @param {object} userContext - { sites: ObjectId[] }
 * @param {string} collectionKey - collection key (e.g. purchase_orders)
 * @returns {object} MongoDB filter fragment to merge with query filter
 */
function buildScopeFilter(scope, userContext, collectionKey) {
  if (!scope || !scope.site || !userContext.sites || userContext.sites.length === 0) {
    return {};
  }

  const col = COLLECTIONS[collectionKey];
  if (!col) return {};

  const modelName = col.modelName;
  const siteFieldByModel = {
    purchase_order: "site",
    purchase_request: "site",
    Site_Inventory: "site_id",
    dmr_Entry: "Site",
    debitNote: "site",
    rate_approval: "site",
    site: "_id", // for sites collection, filter by _id in user.sites
  };

  const siteField = siteFieldByModel[modelName];
  if (!siteField) return {};

  if (siteField === "_id") {
    return { _id: { $in: userContext.sites } };
  }
  return { [siteField]: { $in: userContext.sites } };
}

/**
 * Get guard result: allowed collections, field list per collection, and scope builder.
 *
 * @param {string} role
 * @param {{ sites: any[] }} userContext
 * @returns {{
 *   allowedCollectionKeys: string[],
 *   allowedFieldsByCollection: Record<string, string[]>,
 *   buildScopeFilter: (collectionKey: string) => object
 * }}
 */
function getGuardResult(role, userContext) {
  const { collections: allowedCollectionKeys, scope } = getPermissionsForRole(role);
  const allowedFieldsByCollection = {};

  allowedCollectionKeys.forEach((key) => {
    const col = COLLECTIONS[key];
    if (col) allowedFieldsByCollection[key] = col.fields || [];
  });

  return {
    allowedCollectionKeys,
    allowedFieldsByCollection,
    buildScopeFilter: (collectionKey) => buildScopeFilter(scope, userContext, collectionKey),
  };
}

module.exports = {
  getGuardResult,
  buildScopeFilter,
};
