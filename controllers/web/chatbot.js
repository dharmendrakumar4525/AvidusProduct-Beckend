/**
 * Chatbot Controller
 * Database-aware RAG/NL2Query: Auth -> Role Guard -> Query Builder -> Retrieval -> Response.
 * All responses are RBAC and data-only; no hallucination.
 */

const { getChatbotUserContext } = require("../../libs/chatbot/auth");
const { getGuardResult } = require("../../libs/chatbot/roleGuard");
const { buildQuery } = require("../../libs/chatbot/queryBuilder");
const { executeQuery } = require("../../libs/chatbot/retrievalEngine");
const { formatResponse } = require("../../libs/chatbot/responseGenerator");
const Response = require("../../libs/response");

/**
 * POST /api/web/chatbot/ask
 * Body: { message: string, role?: string }
 * JWT: when enabled, user and role come from req.user; else body.role can be used for testing.
 */
async function ask(req, res) {
  try {
    const message = req.body?.message;
    if (!message || typeof message !== "string") {
      return res.status(400).json(
        await Response.errors(
          { message: "Missing or invalid 'message' in request body." },
          { code: 400 }
        )
      );
    }

    const userContext = await getChatbotUserContext(req);
    const guardResult = getGuardResult(userContext.role, userContext);

    const querySpec = await buildQuery(message.trim(), guardResult);

    if (querySpec.clarification) {
      return res.status(200).json(
        await Response.success(
          {
            text: querySpec.clarification,
            data: [],
            total: 0,
            hasData: false,
            clarification: true,
          },
          "success"
        )
      );
    }

    const scopeFilter = guardResult.buildScopeFilter(querySpec.collectionKey);
    const retrievalResult = await executeQuery(querySpec, scopeFilter, userContext.companyIdf);
    const response = formatResponse(retrievalResult);

    return res.status(200).json(
      await Response.success(
        {
          text: response.text,
          data: response.data,
          total: response.total,
          hasData: response.hasData,
        },
        "success"
      )
    );
  } catch (err) {
    console.error("chatbot ask error", err);
    return res.status(500).json(
      await Response.errors(
        { message: "An error occurred while processing your question." },
        { code: 500 }
      )
    );
  }
}

module.exports = {
  ask,
};
