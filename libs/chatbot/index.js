/**
 * Chatbot module (RAG / NL2Query)
 * Database-aware, RBAC, read-only. No hallucination.
 */

const { getChatbotUserContext } = require("./auth");
const { getGuardResult } = require("./roleGuard");
const { buildQuery } = require("./queryBuilder");
const { executeQuery } = require("./retrievalEngine");
const { formatResponse } = require("./responseGenerator");

module.exports = {
  getChatbotUserContext,
  getGuardResult,
  buildQuery,
  executeQuery,
  formatResponse,
};
