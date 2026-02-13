/**
 * Chatbot NL2Query (Natural Language to Query) Builder
 * Converts user intent into a read-only MongoDB query spec using schema and role constraints.
 * No destructive operations; only allowed collections/fields.
 */

const OpenAI = require("openai");
const { COLLECTIONS, DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT } = require("../../config/chatbot/collections-schema");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

/**
 * Build schema context string for the LLM from allowed collections and fields.
 */
function buildSchemaContext(allowedCollectionKeys, allowedFieldsByCollection) {
  const parts = allowedCollectionKeys.map((key) => {
    const col = COLLECTIONS[key];
    if (!col) return null;
    const fields = allowedFieldsByCollection[key] || col.fields || [];
    return `- ${key}: ${col.description}. Fields: ${fields.join(", ")}`;
  }).filter(Boolean);
  return parts.join("\n");
}

/**
 * Ask LLM to produce a single query spec: collection, filter, projection, limit.
 * Output must be valid JSON only; read-only.
 */
async function nlToQuerySpec(userQuestion, allowedCollectionKeys, allowedFieldsByCollection) {
  const schemaContext = buildSchemaContext(allowedCollectionKeys, allowedFieldsByCollection);

  const systemPrompt = `You are an expert at translating natural language into MongoDB read-only query specs.
Given the user question and ONLY the allowed collections and their fields below, output a single JSON object with:
- collectionKey: one of the allowed collection keys (string)
- filter: MongoDB query filter (object). Use only field names from the allowed fields. Use $in, $gte, $lte, $eq, $regex for matching.
- projection: object of field names to 1 (to return). Use only allowed fields. Omit for all allowed fields.
- limit: number between 1 and ${MAX_QUERY_LIMIT} (default ${DEFAULT_QUERY_LIMIT})

Allowed collections and fields:
${schemaContext}

Rules:
- Read-only. No update, delete, or $where.
- Use only the collection keys and field names listed above.
- If the question is unclear or cannot be answered with the given schema, set "clarification" to a short question string and omit collectionKey.
- Output ONLY valid JSON, no markdown or extra text.`;

  const userMessage = `User question: ${userQuestion}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.1,
    max_tokens: 1024,
  });

  const content = completion.choices[0]?.message?.content?.trim() || "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : content;
  let spec;
  try {
    spec = JSON.parse(jsonStr);
  } catch (e) {
    return { clarification: "I couldn't parse the query. Please rephrase your question." };
  }

  if (spec.clarification) {
    return { clarification: spec.clarification };
  }

  return validateAndSanitizeSpec(spec, allowedCollectionKeys, allowedFieldsByCollection);
}

/**
 * Validate and sanitize query spec: only allowed collection and fields; enforce limit.
 */
function validateAndSanitizeSpec(spec, allowedCollectionKeys, allowedFieldsByCollection) {
  const collectionKey = spec.collectionKey && String(spec.collectionKey).toLowerCase();
  if (!collectionKey || !allowedCollectionKeys.includes(collectionKey)) {
    return { clarification: "I can only answer from allowed data. Please ask about data you have access to." };
  }

  const allowedFields = allowedFieldsByCollection[collectionKey] || COLLECTIONS[collectionKey]?.fields || [];
  const allowedSet = new Set(allowedFields);

  const filter = spec.filter && typeof spec.filter === "object" ? spec.filter : {};
  const sanitizedFilter = {};
  for (const [k, v] of Object.entries(filter)) {
    const key = k.startsWith("$") ? k : k.split(".")[0];
    if (key.startsWith("$") || allowedSet.has(key)) {
      sanitizedFilter[k] = v;
    }
  }

  let projection = spec.projection && typeof spec.projection === "object" ? spec.projection : null;
  if (projection) {
    const sanitizedProjection = { _id: 1 };
    for (const [k, v] of Object.entries(projection)) {
      const topLevel = k.split(".")[0];
      if (allowedSet.has(topLevel) && v === 1) sanitizedProjection[k] = 1;
    }
    projection = Object.keys(sanitizedProjection).length > 1 ? sanitizedProjection : null;
  }

  let limit = typeof spec.limit === "number" ? spec.limit : DEFAULT_QUERY_LIMIT;
  limit = Math.min(MAX_QUERY_LIMIT, Math.max(1, limit));

  return {
    collectionKey,
    filter: sanitizedFilter,
    projection,
    limit,
  };
}

/**
 * Build query spec from natural language using guard result.
 * If OPENAI_API_KEY is missing, returns a clarification asking user to rephrase or contact admin.
 *
 * @param {string} userQuestion
 * @param {object} guardResult - from roleGuard.getGuardResult
 * @returns {Promise<{ collectionKey?: string, filter?: object, projection?: object, limit?: number, clarification?: string }>}
 */
async function buildQuery(userQuestion, guardResult) {
  if (!userQuestion || typeof userQuestion !== "string" || !userQuestion.trim()) {
    return { clarification: "Please ask a question about the data." };
  }

  const { allowedCollectionKeys, allowedFieldsByCollection } = guardResult;
  if (!allowedCollectionKeys.length) {
    return { clarification: "You don't have access to any queryable data." };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      clarification: "Natural language query is not configured. Please use structured filters or contact your administrator.",
    };
  }

  try {
    return await nlToQuerySpec(userQuestion, allowedCollectionKeys, allowedFieldsByCollection);
  } catch (err) {
    console.error("chatbot queryBuilder error", err);
    return {
      clarification: "I couldn't process that question. Please try rephrasing or ask something simpler.",
    };
  }
}

module.exports = {
  buildQuery,
  validateAndSanitizeSpec,
  buildSchemaContext,
};
