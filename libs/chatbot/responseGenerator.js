/**
 * Chatbot Response Generator
 * Formats retrieval results into a safe, non-hallucinating response.
 * If no data: "Data not available."
 */

const DEFAULT_NO_DATA_MESSAGE = "Data not available.";

/**
 * Format query result for the user. No free-form generation; only based on retrieved data.
 *
 * @param {{ data: any[], total: number, error?: string }} retrievalResult
 * @param {string} [noDataMessage]
 * @returns {{ text: string, data: any[], total: number, hasData: boolean }}
 */
function formatResponse(retrievalResult, noDataMessage = DEFAULT_NO_DATA_MESSAGE) {
  if (retrievalResult.error) {
    return {
      text: noDataMessage,
      data: [],
      total: 0,
      hasData: false,
    };
  }

  const data = Array.isArray(retrievalResult.data) ? retrievalResult.data : [];
  const total = retrievalResult.total ?? data.length;

  if (data.length === 0) {
    return {
      text: noDataMessage,
      data: [],
      total: 0,
      hasData: false,
    };
  }

  const text = summarizeData(data, total);
  return {
    text,
    data,
    total,
    hasData: true,
  };
}

/**
 * Simple summary from data (count + first few items). No LLM to avoid hallucination.
 */
function summarizeData(data, total) {
  const count = data.length;
  if (count === 0) return DEFAULT_NO_DATA_MESSAGE;
  const plural = total === 1 ? "record" : "records";
  let summary = `Found ${total} ${plural}.`;
  if (count <= 3) {
    summary += " " + data.map((d) => shortSummary(d)).join("; ");
  } else {
    summary += " Sample: " + data.slice(0, 2).map((d) => shortSummary(d)).join("; ") + "...";
  }
  return summary;
}

function shortSummary(doc) {
  const parts = [];
  if (doc.po_number) parts.push(`PO ${doc.po_number}`);
  else if (doc.purchase_request_number) parts.push(`PR ${doc.purchase_request_number}`);
  else if (doc.pr_number) parts.push(`PR ${doc.pr_number}`);
  else if (doc.projectName) parts.push(doc.projectName);
  else if (doc.site_name) parts.push(doc.site_name);
  else if (doc.name) parts.push(doc.name);
  else if (doc.item_name) parts.push(doc.item_name);
  else if (doc.vendor_name) parts.push(doc.vendor_name);
  else if (doc._id) parts.push(doc._id.toString().slice(-6));
  return parts.length ? parts.join(" ") : JSON.stringify(doc).slice(0, 80);
}

module.exports = {
  formatResponse,
  summarizeData,
  DEFAULT_NO_DATA_MESSAGE,
};
