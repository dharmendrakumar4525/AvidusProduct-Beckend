/**
 * Chatbot Collections Schema Metadata
 * Configuration-driven schema for NL2Query. Defines queryable collections and fields.
 * Used by Query Builder to generate valid MongoDB read-only queries only.
 *
 * Adding a new collection: add entry to COLLECTIONS with modelName (Mongoose model name)
 * and fields (array of allowed field names for projection/filter). No DB changes.
 */

module.exports = {
  /**
   * Map: logical collection key -> { modelName, fields }
   * - modelName: exact Mongoose model name (e.g. as in mongoose.model("purchase_order", ...))
   * - fields: allowed field names for filter/projection (top-level; nested use dot notation)
   */
  COLLECTIONS: {
    projects: {
      modelName: "Project",
      description: "Projects with name, location, dates, milestones",
      fields: [
        "projectName",
        "projectDate",
        "location",
        "imageUrl",
        "r0Date",
        "r1Date",
        "r2Date",
        "created_at",
        "updated_at",
      ],
    },
    purchase_orders: {
      modelName: "purchase_order",
      description: "Purchase orders with PO number, status, site, vendor, items",
      fields: [
        "po_number",
        "purchase_request_number",
        "prType",
        "order_Type",
        "title",
        "site",
        "status",
        "date",
        "poDate",
        "due_date",
        "approved_by",
        "created_at",
        "updated_at",
      ],
    },
    purchase_requests: {
      modelName: "purchase_request",
      description: "Purchase requests with PR number, status, site",
      fields: [
        "purchase_request_number",
        "site",
        "status",
        "date",
        "created_at",
        "updated_at",
      ],
    },
    inventory: {
      modelName: "Site_Inventory",
      description: "Site inventory stock by item and site",
      fields: [
        "item_id",
        "site_id",
        "stock_quantity",
        "inventoryType",
        "date",
        "updated_at",
      ],
    },
    sites: {
      modelName: "site",
      description: "Sites with name, location, code",
      fields: [
        "site_name",
        "location",
        "code",
        "address",
        "created_by",
        "updated_by",
      ],
    },
    vendors: {
      modelName: "vendor",
      description: "Vendor master data",
      fields: [
        "vendor_name",
        "code",
        "email",
        "phone_number",
        "created_at",
        "updated_at",
      ],
    },
    items: {
      modelName: "item",
      description: "Item master data",
      fields: [
        "item_name",
        "item_number",
        "item_code",
        "category",
        "sub_category",
        "uom",
        "created_at",
        "updated_at",
      ],
    },
    dmr_entries: {
      modelName: "dmr_Entry",
      description: "DMR (Delivery Material Receipt) entries",
      fields: [
        "DMR_No",
        "Site",
        "status",
        "dmrdate",
        "GateEntry_Date",
        "created_at",
        "updated_at",
      ],
    },
    debit_notes: {
      modelName: "debitNote",
      description: "Debit notes raised against vendors",
      fields: [
        "debitNoteNumber",
        "debitEntryNumber",
        "site",
        "status",
        "poNumber",
        "vendorId",
        "createdAt",
        "updatedAt",
      ],
    },
    rate_approvals: {
      modelName: "rate_approval",
      description: "Rate approval records",
      fields: [
        "site",
        "status",
        "date",
        "created_at",
        "updated_at",
      ],
    },
    categories: {
      modelName: "category",
      description: "Item categories",
      fields: ["name", "code", "type", "created_at", "updated_at"],
    },
    organisations: {
      modelName: "organisation",
      description: "Organisations / company entities",
      fields: ["companyName", "code", "contact_person", "phone_number", "gst_number", "pan_number", "created_at", "updated_at"],
    },
  },

  /**
   * Default limit for query results (prevent large payloads)
   */
  DEFAULT_QUERY_LIMIT: 100,

  /**
   * Max limit allowed for a single query
   */
  MAX_QUERY_LIMIT: 500,
};
