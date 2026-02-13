/**
 * Chatbot Auth Layer
 * Resolves current user and role for RBAC. Works with existing JWT middleware.
 * When JWT is enabled: req.user is set by middleware; we use it.
 * Fallback: optional role in request body for development/testing.
 */

const User = require("../../models/User");

/**
 * Get user context for chatbot: { userId, role, sites }.
 * - If req.user exists (JWT), use it and optionally load full user for sites.
 * - Else if body.role is provided, use it with empty sites (no scope).
 *
 * @param {object} req - Express request (req.user, req.body.role)
 * @returns {Promise<{ userId?: string, role: string, sites: ObjectId[] }>}
 */
async function getChatbotUserContext(req) {
  if (req.user && (req.user.id || req.user._id)) {
    const userId = req.user.id || req.user._id.toString();
    let role = req.user.role;
    let sites = req.user.sites || [];
    let companyIdf = req.user.companyIdf || null;

    // If role or sites missing, load full user from DB
    if (!role || !companyIdf) {
      const lookupId = req.user.sub || req.user.id || req.user._id;
      const user = await User.findById(lookupId)
        .select("role sites companyIdf")
        .lean()
        .exec();
      if (user) {
        role = role || user.role;
        sites = sites.length ? sites : (user.sites || []);
        companyIdf = companyIdf || (user.companyIdf ? user.companyIdf.toString() : null);
      }
    }

    return {
      userId,
      role: role || "default",
      sites: Array.isArray(sites) ? sites : [],
      companyIdf: companyIdf ? companyIdf.toString() : null,
    };
  }

  const bodyRole = req.body && req.body.role;
  return {
    role: bodyRole && typeof bodyRole === "string" ? bodyRole : "default",
    sites: [],
    companyIdf: null,
  };
}

module.exports = {
  getChatbotUserContext,
};
