# Chatbot Architecture (RAG / NL2Query)

## Overview

The chatbot is **database-aware** and **RBAC-driven**. It answers only from existing MongoDB data, with no hallucination. If data is not present, the response is "Data not available."

## Layers (modular)

1. **Auth** (`libs/chatbot/auth.js`)  
   Resolves user context: `userId`, `role`, `sites`. Uses `req.user` when JWT is enabled; supports `body.role` for testing when JWT is disabled.

2. **Role Guard** (`libs/chatbot/roleGuard.js`)  
   From config, resolves:
   - Allowed collection keys for the role
   - Allowed fields per collection
   - Scope filter builder (e.g. filter by `user.sites` for site-scoped collections)

3. **Query Builder (NL2Query)** (`libs/chatbot/queryBuilder.js`)  
   Converts natural language to a **read-only** query spec:
   - Uses allowed collections and fields only
   - Outputs `{ collectionKey, filter, projection, limit }`
   - Returns a clarification message if intent is unclear or not allowed

4. **Retrieval Engine** (`libs/chatbot/retrievalEngine.js`)  
   Executes the query:
   - Merges role scope filter with user filter
   - Applies timeout and limit
   - Read-only (find), no write operations

5. **Response Generator** (`libs/chatbot/responseGenerator.js`)  
   Formats results from retrieved data only:
   - No free-form generation
   - Empty result → "Data not available."

## Configuration (no hardcoded logic)

- **`config/chatbot/collections-schema.js`**  
  - Defines queryable collections and their fields.  
  - Add a new collection by adding an entry; no DB model change required.

- **`config/chatbot/role-permissions.js`**  
  - Maps role → allowed collections and scope (e.g. `site`).  
  - Add a new role or change access by editing this file.

## Scalability

- **Large datasets:** Query limit and `maxTimeMS` cap result size and execution time.
- **Multiple roles:** Add or change roles in `role-permissions.js`.
- **Future tenants:** Add a `tenant` scope in config and merge a tenant filter in the retrieval engine.

## Security

- Only read-only queries (find with filter/projection/limit).
- Role guard restricts collections and fields.
- Site scope restricts results to the user’s assigned sites where applicable.
- No destructive operations (no update, delete, or `$where`).

## Adding a new collection

1. In `config/chatbot/collections-schema.js`, add an entry under `COLLECTIONS` with `modelName` (Mongoose model name) and `fields`.
2. In `config/chatbot/role-permissions.js`, add the collection key to the appropriate roles’ `collections` arrays.
3. If the collection is site-scoped, add its model name and site field in `libs/chatbot/roleGuard.js` → `siteFieldByModel`.

## Environment

- `OPENAI_API_KEY`: required for natural language → query conversion (NL2Query). If missing, the API returns a clarification message.
