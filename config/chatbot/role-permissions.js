/**
 * Chatbot Role-Based Permissions
 * Configuration-driven: which collections and scope each role can query.
 * Add new roles or collections here without code changes.
 *
 * Scope keys:
 * - site: if present, retrieval will filter by user.sites (e.g. site_id: { $in: user.sites })
 * - tenant: reserved for future multi-tenant filtering
 */

const { COLLECTIONS } = require("./collections-schema");

const ALL_COLLECTION_KEYS = Object.keys(COLLECTIONS);

/**
 * Role -> { collections, scope }
 * - collections: array of collection keys from COLLECTIONS (subset of ALL_COLLECTION_KEYS)
 * - scope: { site: true } to restrict by user.sites; omit for no scope filter
 */
const ROLE_PERMISSIONS = {
  superadmin: {
    collections: ALL_COLLECTION_KEYS,
    scope: {}, // no restriction
  },
  project_director: {
    collections: [
      "projects",
      "purchase_orders",
      "purchase_requests",
      "inventory",
      "sites",
      "vendors",
      "items",
      "dmr_entries",
      "debit_notes",
      "rate_approvals",
      "categories",
      "organisations",
    ],
    scope: { site: true }, // filter by user.sites where applicable
  },
  project_manager: {
    collections: [
      "projects",
      "purchase_orders",
      "purchase_requests",
      "inventory",
      "sites",
      "vendors",
      "items",
      "dmr_entries",
      "debit_notes",
      "rate_approvals",
      "categories",
      "organisations",
    ],
    scope: { site: true },
  },
  store_manager: {
    collections: [
      "purchase_orders",
      "purchase_requests",
      "inventory",
      "sites",
      "items",
      "dmr_entries",
      "debit_notes",
      "categories",
      "organisations",
    ],
    scope: { site: true },
  },
  // Default for unknown roles: minimal read
  default: {
    collections: ["sites"],
    scope: { site: true },
  },
};

/**
 * Get allowed collection keys and scope for a role.
 * Normalizes role strings: lowercased, trimmed, spaces replaced with underscores
 * so "Project Director" matches "project_director" config key.
 * @param {string} role - User role (e.g. from User.role)
 * @returns {{ collections: string[], scope: { site?: boolean } }}
 */
function getPermissionsForRole(role) {
  const normalizedRole = (role || "").toLowerCase().trim().replace(/\s+/g, "_");
  const config = ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS.default;
  return {
    collections: config.collections.filter((c) => ALL_COLLECTION_KEYS.includes(c)),
    scope: config.scope || {},
  };
}

module.exports = {
  ROLE_PERMISSIONS,
  getPermissionsForRole,
};
