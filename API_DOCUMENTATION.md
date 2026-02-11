# API Documentation

Complete API reference for Pragati Infra Backend.

## Base URL

All API endpoints are prefixed with `/api/web` unless otherwise specified.

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Authentication Endpoints

### Register User
**POST** `/api/web/users/register`

Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "user",
  "sites": ["siteId1", "siteId2"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": { ... }
}
```

---

### Login
**POST** `/api/web/users/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt-token-here",
  "user": { ... },
  "permissions": { ... },
  "modules": ["module1", "module2"],
  "module_permissions": { ... }
}
```

---

## Purchase Request Endpoints

### Get Purchase Requests
**GET** `/api/web/purchase-request`

Get list of purchase requests with optional filters.

**Query Parameters:**
- `site`: Filter by site ID
- `status`: Filter by status
- `page`: Page number
- `limit`: Items per page

**Response:**
```json
[
  {
    "prNumber": "PR-2024-0001",
    "site": "siteId",
    "items": [ ... ],
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### Create Purchase Request
**POST** `/api/web/purchase-request`

Create a new purchase request.

**Request Body:**
```json
{
  "prNumber": "PR-2024-0001",
  "site": "siteId",
  "items": [
    {
      "item_id": "itemId",
      "quantity": 100,
      "specification": "Item description"
    }
  ],
  "remarks": "Additional notes"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Purchase request created",
  "data": { ... }
}
```

---

### Update Purchase Request
**PUT** `/api/web/purchase-request`

Update an existing purchase request.

**Request Body:** Same as create, with `_id` field included.

---

### Get Purchase Request Details
**GET** `/api/web/purchase-request/detail`

Get detailed information about a specific purchase request.

**Query Parameters:**
- `id`: Purchase request ID

---

## Purchase Order Endpoints

### Get Purchase Orders
**GET** `/api/web/purchase_order`

Get list of purchase orders.

**Query Parameters:**
- `site`: Filter by site
- `vendorId`: Filter by vendor
- `status`: Filter by status

---

### Get PO Number
**GET** `/api/web/getPONumber`

Get the next available purchase order number.

**Query Parameters:**
- `siteId`: Site ID for PO number generation

**Response:**
```json
{
  "poNumber": "PO-2024-0001"
}
```

---

### Get PO Status Count
**GET** `/api/web/getPOStatusCount`

Get count of purchase orders by status.

**Response:**
```json
{
  "pending": 10,
  "approved": 25,
  "rejected": 2
}
```

---

## Rate Approval Endpoints

### Get Rate Approvals
**GET** `/api/web/rate-approval`

Get list of rate approvals.

**Query Parameters:**
- `prNumber`: Filter by PR number
- `status`: Filter by status

---

### Create Split Rate Approval
**POST** `/api/web/rate-approval/split-comparitive`

Split a rate approval into multiple approvals.

**Request Body:**
```json
{
  "rateApprovalId": "approvalId",
  "splitItems": [ ... ]
}
```

---

### Get Pending Rate Approvals
**GET** `/api/web/pending-rate-approval`

Get list of pending rate approvals.

---

## DMR Endpoints

### Get DMR Purchase Orders
**GET** `/api/web/dmr_purchase_order`

Get list of DMR purchase orders.

**Query Parameters:**
- `poNumber`: Filter by PO number
- `status`: Filter by status

---

### Create DMR Purchase Order
**POST** `/api/web/dmr_purchase_order`

Create a new DMR purchase order.

**Request Body:**
```json
{
  "po_number": "PO-2024-0001",
  "vendor_detail": { ... },
  "delivery_address": { ... },
  "items": [ ... ]
}
```

---

### Get DMR List
**GET** `/api/web/dmr_list`

Get list of DMR entries.

**Query Parameters:**
- `poNumber`: Filter by PO number
- `entry_type`: Filter by entry type (InvoiceNumber/ChallanNumber)

---

### Create DMR Entry
**POST** `/api/web/dmr_entry`

Create a new DMR entry.

**Request Body:**
```json
{
  "DMR_No": "DMR-2024-0001",
  "PONumber": "PO-2024-0001",
  "entry_type": "InvoiceNumber",
  "InvoiceNumber": "INV-001",
  "invoice_date": "2024-01-01",
  "dmritem": [
    {
      "item": { ... },
      "RequiredQuantity": 100,
      "invoiceQty": 100,
      "Rate": 50,
      "gst": 18
    }
  ],
  "Freight": { ... },
  "otherCharges": { ... }
}
```

---

### Update DMR Entry
**PUT** `/api/web/dmr_entry`

Update an existing DMR entry.

---

### Get DMR Number
**GET** `/api/web/getDMRNumber`

Get the next available DMR number.

**Query Parameters:**
- `siteId`: Site ID

**Response:**
```json
{
  "dmrNumber": "DMR-2024-0001"
}
```

---

### Check Duplicate Invoice
**GET** `/api/web/dmr_purchase_order/check-duplicate-invoice`

Check if an invoice number already exists.

**Query Parameters:**
- `invoiceNumber`: Invoice number to check
- `poNumber`: PO number

**Response:**
```json
{
  "isDuplicate": true/false
}
```

---

## Debit Note Endpoints

### Get Debit Notes
**GET** `/api/web/debitNote`

Get list of debit notes.

**Query Parameters:**
- `site`: Filter by site
- `vendorId`: Filter by vendor
- `poNumber`: Filter by PO number
- `status`: Filter by status (raised, sent, partial, settled)

**Response:**
```json
[
  {
    "_id": "debitNoteId",
    "debitNoteNumber": "DN-2024-2025-0001",
    "poNumber": "PO-2024-0001",
    "vendorId": "vendorId",
    "totalAmount": 10000,
    "totalGST": 1800,
    "grandTotal": 11800,
    "status": "raised",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### Create Debit Note
**POST** `/api/web/debitNote`

Create a new debit note.

**Request Body:**
```json
{
  "debitNoteNumber": "DN-2024-2025-0001",
  "debitEntryNumber": 1,
  "poNumber": "PO-2024-0001",
  "vendorId": "vendorId",
  "site": "siteId",
  "dmrEntries": ["dmrEntryId1", "dmrEntryId2"],
  "InvoiceNumber": ["INV-001", "INV-002"],
  "items": [
    {
      "item_id": "itemId",
      "item_name": "Item Name",
      "description": "Item description",
      "po_qty": 100,
      "invoice_qty": 100,
      "received_qty": 95,
      "rate": 50,
      "debit_qty": 5,
      "debit_reason": "Short supply",
      "amount": 250,
      "gst": 45,
      "gst_percentage": 18
    }
  ],
  "additionalDebits": [
    {
      "type": "Rate Difference",
      "debit_reason": "Rate mismatch",
      "amount": 500,
      "gst": 90
    }
  ],
  "totalAmount": 750,
  "totalGST": 135,
  "grandTotal": 885,
  "remarks": "Additional notes",
  "status": "raised"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Debit note created successfully",
  "data": { ... }
}
```

---

### Update Debit Note
**PUT** `/api/web/debitNote`

Update an existing debit note.

**Request Body:** Same as create, with `_id` field.

**Note:** Totals are automatically recalculated if items or additionalDebits are updated.

---

### Get Eligible Invoices for Debit Note
**GET** `/api/web/debitNote/open-debit-invoices`

Get list of invoices eligible for debit note creation (not already used in other debit notes).

**Query Parameters:**
- `poNumber`: Purchase order number (required)

**Response:**
```json
[
  {
    "success": true,
    "data": [
      {
        "_id": "dmrEntryId",
        "InvoiceNumber": "INV-001",
        "PONumber": "PO-2024-0001",
        "invoice_date": "2024-01-01",
        "vendorInvoiceTotal": 10000,
        "DebitNoteDetails": { ... },
        "dmritem": [ ... ]
      }
    ]
  }
]
```

---

### Get Debit Note Data from DMR
**GET** `/api/web/debitNote/getDebitNoteFromDmr`

Generate debit note data structure from selected DMR entries.

**Query Parameters:**
- `dmrIds`: Comma-separated DMR entry IDs (required)

**Example:**
```
GET /api/web/debitNote/getDebitNoteFromDmr?dmrIds=id1,id2,id3
```

**Response:**
```json
[
  {
    "data": {
      "debitNoteNumber": "DNN_SITE001_0001",
      "debitEntryNumber": 1,
      "poNumber": "PO-2024-0001",
      "vendorId": "vendorId",
      "vendorDetail": { ... },
      "billingAddress": { ... },
      "delivery_address": { ... },
      "site": "siteId",
      "dmrEntries": ["id1", "id2"],
      "InvoiceNumber": ["INV-001", "INV-002"],
      "items": [ ... ],
      "additionalDebits": [ ... ],
      "totalAmount": 10000,
      "totalGST": 1800,
      "grandTotal": 11800,
      "status": "raised"
    }
  }
]
```

---

## Credit Note Endpoints

### Create Credit Note
**POST** `/api/web/creditNote`

Create a credit note linked to a debit note.

**Request Body:**
```json
{
  "creditNoteNumber": "CN-2024-0001",
  "debitNoteId": "debitNoteId",
  "settledAmount": 5000,
  "creditNoteDoc": "document-url"
}
```

---

## Inventory Endpoints

### Get Inventory Data
**GET** `/api/web/inventory`

Get inventory data for a site.

**Query Parameters:**
- `siteId`: Site ID (required)
- `itemId`: Filter by item ID

---

### Search Inventory
**GET** `/api/web/inventory/search`

Search inventory items.

**Query Parameters:**
- `siteId`: Site ID
- `search`: Search term
- `category`: Filter by category

---

### Get Inventory Report
**GET** `/api/web/inventory-report`

Get inventory report data.

**Query Parameters:**
- `siteId`: Site ID
- `startDate`: Start date
- `endDate`: End date

---

### Get Issued Stock
**GET** `/api/web/inventory-issued-stock`

Get list of issued stock items.

**Query Parameters:**
- `siteId`: Site ID
- `itemId`: Filter by item

---

### Get Received Stock
**GET** `/api/web/inventory-received-stock`

Get list of received stock items.

---

### Create Material Issue Slip
**POST** `/api/web/material_issue_slip`

Create a material issue slip.

**Request Body:**
```json
{
  "issueSlipNumber": "IS-2024-0001",
  "site": "siteId",
  "items": [
    {
      "item_id": "itemId",
      "quantity": 10,
      "rate": 50
    }
  ],
  "issuedTo": "Contractor/Staff",
  "remarks": "Notes"
}
```

---

### Get Issue Slip Number
**GET** `/api/web/issue-slip-number`

Get next available issue slip number.

**Query Parameters:**
- `siteId`: Site ID

---

## Inventory Transfer Endpoints

### Create Transfer Request
**POST** `/api/web/inventory-transfer/create_request`

Create an inventory transfer request between sites.

**Request Body:**
```json
{
  "fromSite": "siteId1",
  "toSite": "siteId2",
  "items": [
    {
      "item_id": "itemId",
      "quantity": 10
    }
  ],
  "remarks": "Transfer notes"
}
```

---

### Approve Transfer
**PUT** `/api/web/inventory-transfer/approve`

Approve an inventory transfer request.

**Request Body:**
```json
{
  "transferId": "transferId",
  "approvedBy": "userId"
}
```

---

### Dispatch Transfer
**PUT** `/api/web/inventory-transfer/dispatch`

Mark transfer as dispatched.

---

### Receive Transfer
**PUT** `/api/web/inventory-transfer/receive`

Mark transfer as received.

---

### Get Transfer List
**GET** `/api/web/inventory-transfer`

Get list of inventory transfers.

**Query Parameters:**
- `fromSite`: Filter by source site
- `toSite`: Filter by destination site
- `status`: Filter by status

---

## Master Data Endpoints

### Vendors

- **GET** `/api/web/vendor` - Get vendors list
- **GET** `/api/web/vendor/detail` - Get vendor details
- **POST** `/api/web/vendor` - Create vendor
- **PUT** `/api/web/vendor` - Update vendor
- **DELETE** `/api/web/vendor` - Delete vendor
- **POST** `/api/web/vendor/upload-csv` - Bulk upload vendors

### Items

- **GET** `/api/web/item` - Get items list
- **GET** `/api/web/item/detail` - Get item details
- **GET** `/api/web/item/getItemNumber` - Get next item number
- **POST** `/api/web/item` - Create item
- **PUT** `/api/web/item` - Update item
- **DELETE** `/api/web/item` - Delete item
- **POST** `/api/web/item/upload-csv` - Bulk upload items

### Sites

- **GET** `/api/web/site` - Get sites list
- **GET** `/api/web/site/detail` - Get site details
- **POST** `/api/web/site` - Create site
- **PUT** `/api/web/site` - Update site
- **DELETE** `/api/web/site` - Delete site

### Projects

- **GET** `/api/web/projects` - Get projects list
- **GET** `/api/web/projects/:id` - Get project details
- **POST** `/api/web/projects` - Create project
- **PUT** `/api/web/projects` - Update project
- **PUT** `/api/web/projects/update-project/:id` - Update project details
- **DELETE** `/api/web/projects/:id` - Delete project

### Users

- **GET** `/api/web/users` - Get users list
- **GET** `/api/web/users/:id` - Get user details
- **POST** `/api/web/users` - Create user
- **PUT** `/api/web/users/:id` - Update user
- **POST** `/api/web/users/add-site` - Add site to user
- **DELETE** `/api/web/users/:id` - Delete user

### Roles

- **GET** `/api/web/roles` - Get roles list
- **GET** `/api/web/roles/:id` - Get role details
- **POST** `/api/web/roles` - Create role
- **PUT** `/api/web/roles/:id` - Update role
- **PUT** `/api/web/roles/update-perm/:role` - Update role permissions
- **GET** `/api/web/user/permission` - Get user permissions

---

## PDF Generation Endpoints

All PDF endpoints are at the base path (not `/api/web`).

### Generate Debit Note PDF
**POST** `/generate/debitNote-pdf`

Generate PDF for a debit note.

**Request Body:**
```json
{
  "id": "debitNoteId",
  "isMailData": false  // If true, sends email with PDF
}
```

**Response:**
- If `isMailData` is false: Returns PDF binary
- If `isMailData` is true: Returns JSON with success message

---

### Generate DMR Inventory PDF
**POST** `/generate/DMR-Inventory-pdf`

Generate DMR inventory PDF.

**Request Body:**
```json
{
  "dmrData": { ... },
  "isFile": 0  // 0: return binary, 1: upload to S3, 2: return as file
}
```

---

### Generate Gate Pass PDF
**POST** `/generate/material-gatePass`

Generate material gate pass PDF.

---

### Generate PR PDF
**POST** `/generate/prpdf`

Generate purchase request PDF.

---

### Generate Issue Slip PDF
**POST** `/generate/issueSlip`

Generate material issue slip PDF.

---

## Utility Endpoints

### Get Dashboard Statistics
**GET** `/api/web/dasboard-stats`

Get dashboard statistics and counts.

**Response:**
```json
{
  "totalPRs": 100,
  "pendingPRs": 20,
  "totalPOs": 50,
  "pendingPOs": 5,
  "totalDMRs": 200,
  "pendingDMRs": 10
}
```

---

### Download Vendor Quotations
**GET** `/api/web/vendor-quotations`

Download vendor quotations as ZIP file.

**Query Parameters:**
- `rateApprovalId`: Rate approval ID

---

### Download DMR Documents
**GET** `/api/web/dmr-documents`

Download DMR documents as ZIP file.

**Query Parameters:**
- `poNumber`: PO number

---

### Upload File
**POST** `/api/web/upload_file`

Upload files (max 10 files).

**Request:** Multipart form data with `files` field.

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "filename": "file1.pdf",
      "url": "file-url"
    }
  ]
}
```

---

## Location Endpoints

### Get Countries
**GET** `/api/web/countries`

Get list of all countries.

---

### Get States
**GET** `/api/web/states`

Get states by country.

**Query Parameters:**
- `country`: Country ISO2 code

---

### Get Cities
**GET** `/api/web/cities`

Get cities by state.

**Query Parameters:**
- `state`: State code

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error information"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

---

## Rate Limiting

Currently, no rate limiting is implemented. Consider implementing rate limiting for production use.

---

## Pagination

Most list endpoints support pagination via query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 1000)

---

## Filtering and Sorting

Many endpoints support filtering via query parameters:
- Filter by specific fields (e.g., `site`, `vendorId`, `status`)
- Sorting is typically by `createdAt` descending

---

## Notes

1. All timestamps are in ISO 8601 format
2. All monetary values are in the base currency (typically INR)
3. All quantities are numeric values
4. Object IDs are MongoDB ObjectIds
5. File uploads are limited by Multer configuration
6. PDF generation may take a few seconds for complex documents

---

**Last Updated**: 2024
