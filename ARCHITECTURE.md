# Architecture Documentation

## System Architecture

### Overview

Pragati Infra Backend follows a **Model-View-Controller (MVC)** architecture pattern with a RESTful API design. The application is built using Node.js and Express.js, with MongoDB as the primary database and Redis for caching.

```
┌─────────────────┐
│   Client App    │
│  (Frontend)     │
└────────┬────────┘
         │ HTTP/HTTPS
         │ REST API
         ▼
┌─────────────────────────────────────┐
│      Express.js Application         │
│  ┌───────────────────────────────┐ │
│  │      Middleware Layer         │ │
│  │  - JWT Authentication          │ │
│  │  - CORS                        │ │
│  │  - Compression                │ │
│  │  - Error Handling              │ │
│  └───────────────────────────────┘ │
│  ┌───────────────────────────────┐ │
│  │      Routes Layer              │ │
│  │  - /api/web/*                 │ │
│  └───────────────────────────────┘ │
│  ┌───────────────────────────────┐ │
│  │      Controllers Layer         │ │
│  │  - Business Logic             │ │
│  │  - Request Processing         │ │
│  └───────────────────────────────┘ │
│  ┌───────────────────────────────┐ │
│  │      Models Layer              │ │
│  │  - Mongoose Schemas           │ │
│  │  - Data Validation            │ │
│  └───────────────────────────────┘ │
└────────┬───────────────────────────┘
         │
    ┌────┴─────┐
    │          │
    ▼          ▼
┌─────────┐ ┌─────────┐
│ MongoDB │ │ Redis  │
│Database │ │ Cache  │
└─────────┘ └─────────┘
```

## Component Architecture

### 1. Application Layer (`app.js`)

The main Express application configuration:
- Middleware setup (CORS, compression, body parsing)
- Route mounting
- Error handling
- PDF generation endpoints
- AWS S3 integration

### 2. Routes Layer (`routes/`)

**File Structure:**
- `routes/index.js` - Route aggregator
- `routes/web.js` - All web API routes

**Route Pattern:**
```javascript
router.METHOD('/endpoint', middleware.jwtVerify, controller.method)
```

Routes are automatically loaded from controllers using dynamic require based on file names.

### 3. Controllers Layer (`controllers/web/`)

Each controller handles business logic for a specific domain:

**Controller Structure:**
```javascript
const getList = async (req, res) => {
  // Fetch and return list
};

const getDetails = async (req, res) => {
  // Fetch single item details
};

const createData = async (req, res) => {
  // Create new record
};

const updateData = async (req, res) => {
  // Update existing record
};

const deleteData = async (req, res) => {
  // Delete record
};

module.exports = {
  getList,
  getDetails,
  createData,
  updateData,
  deleteData
};
```

**Key Controllers:**
- `debitNote.js` - Debit note management
- `creditNote.js` - Credit note management
- `purchaseOrder.js` - Purchase order operations
- `purchaseRequest.js` - Purchase request workflow
- `dmrEntry.js` - DMR entry processing
- `inventory.js` - Inventory management
- `user.js` - User authentication and management
- `vendor.js` - Vendor master data
- `item.js` - Item master data

### 4. Models Layer (`models/`)

Mongoose schemas define data structure and validation:

**Model Structure:**
```javascript
const schema = mongoose.Schema({
  field1: { type: String, required: true },
  field2: { type: Number, default: 0 },
  // ... more fields
}, {
  timestamps: true  // Adds createdAt, updatedAt
});

module.exports = mongoose.model('ModelName', schema);
```

**Key Models:**
- `DebitNote.js` - Debit note schema
- `CreditNote.js` - Credit note schema
- `PurchaseOrder.js` - Purchase order schema
- `DmrPurchaseOrder.js` - DMR order schema
- `dmrEntry.js` - DMR entry schema
- `User.js` - User schema with authentication
- `Site.js` - Site/location schema
- `Inventory.js` - Inventory tracking schema

### 5. Middleware Layer (`middleware/`)

**JWT Authentication:**
```javascript
const jwtVerify = (req, res, next) => {
  // Extract token from header
  // Verify token
  // Attach user to request
  // Call next() or return error
};
```

### 6. Libraries Layer (`libs/`)

**Utility Libraries:**
- `response.js` - Standardized API responses
- `responseMessages.js` - Localized response messages
- `mongoose.js` - Database connection
- `mailer.js` - Email sending utilities
- `constant.js` - Application constants

### 7. PDF Generation (`pdf/`)

PDF generation modules using `html-pdf-node`:
- Template-based PDF generation
- S3 upload support
- Email attachment support

**PDF Generation Flow:**
```
Request → Controller → PDF Generator → HTML Template → PDF Buffer → Response/S3/Email
```

### 8. Email Services (`emails/`)

Email functionality with templates:
- Handlebars templates
- SendGrid integration
- SMTP fallback
- Batch sending

## Data Flow

### Request Flow

```
1. Client Request
   ↓
2. Express Middleware
   - CORS
   - Body Parser
   - Compression
   ↓
3. JWT Authentication Middleware
   - Token Validation
   - User Extraction
   ↓
4. Route Handler
   - Parameter Extraction
   - Query Parsing
   ↓
5. Controller
   - Business Logic
   - Data Validation
   - Model Interaction
   ↓
6. Model/Database
   - Query Execution
   - Data Retrieval/Modification
   ↓
7. Response
   - Data Formatting
   - Error Handling
   - JSON Response
```

### Debit Note Creation Flow

```
1. GET /debitNote/open-debit-invoices
   → Fetch eligible DMR entries for PO
   
2. GET /debitNote/getDebitNoteFromDmr?dmrIds=...
   → Generate debit note structure from DMR entries
   → Calculate totals, GST, consolidate items
   
3. POST /debitNote
   → Create debit note record
   → Link to DMR entries
   
4. POST /generate/debitNote-pdf
   → Generate PDF document
   → Optionally send email with PDF
```

## Database Design

### Key Relationships

```
User ──┬── Site (Many-to-Many)
       │
       ├── Role (Many-to-One)
       │
       └── Project (Many-to-Many)

PurchaseRequest ──→ PurchaseOrder ──→ DmrPurchaseOrder
                                          │
                                          └──→ dmrEntry ──→ DebitNote
                                                              │
                                                              └──→ CreditNote

Site ──→ Inventory ──→ InventoryIn
    │                  InventoryOut
    │                  InventoryOutRecord
    │
    └──→ SiteInventoryTransfer (fromSite, toSite)

Item ──→ Category ──→ SubCategory
    │
    └──→ Vendor (Many-to-Many via Purchase Orders)
```

### Indexing Strategy

Key indexes for performance:
- `debitNoteNumber` - Unique index
- `poNumber` - Index for filtering
- `site` - Index for site-based queries
- `vendorId` - Index for vendor filtering
- `createdAt` - Index for sorting
- `status` - Index for status filtering

## Security Architecture

### Authentication Flow

```
1. User Login
   POST /users/login
   ↓
2. Credential Validation
   - Email lookup
   - Password verification (bcrypt)
   ↓
3. JWT Token Generation
   - User ID and name
   - Secret key signing
   ↓
4. Token Return
   - Token + User + Permissions
   ↓
5. Subsequent Requests
   - Token in Authorization header
   - Middleware validation
   - User attached to request
```

### Authorization

Role-Based Access Control (RBAC):
- **Roles**: Define user roles (admin, manager, user, etc.)
- **Permissions**: Module-level permissions
- **Dashboard Permissions**: UI access control
- **Child Permissions**: Action-level permissions (create, read, update, delete)

## Caching Strategy

### Redis Usage

- **Purpose**: Performance optimization
- **Use Cases**:
  - Frequently accessed data
  - Dashboard statistics
  - Session data (if implemented)
- **Configuration**: `config/redis.js`

## File Management

### Upload Flow

```
1. Client Upload Request
   POST /upload_file
   ↓
2. Multer Middleware
   - File validation
   - Storage configuration
   ↓
3. File Storage
   - Local: uploads/ directory
   - Cloud: AWS S3 (optional)
   ↓
4. Response
   - File URL/path
```

### PDF Storage

- **Local**: Temporary storage during generation
- **S3**: Permanent storage for documents
- **Email**: Attachments sent directly

## Error Handling

### Error Flow

```
1. Error Occurs
   ↓
2. Try-Catch Block
   ↓
3. Error Logging
   - Console.error
   - Error details
   ↓
4. Response Formatting
   - Response.error()
   - Status code
   - Error message
   ↓
5. Client Receives Error
```

### Error Types

- **Validation Errors**: 400/422
- **Authentication Errors**: 401
- **Not Found Errors**: 404
- **Server Errors**: 500

## Performance Considerations

### Optimization Strategies

1. **Database Indexing**: Key fields indexed
2. **Response Compression**: Gzip compression enabled
3. **Pagination**: Large datasets paginated
4. **Caching**: Redis for frequently accessed data
5. **Query Optimization**: Lean queries where possible
6. **Connection Pooling**: MongoDB connection pooling

### Scalability

- **Horizontal Scaling**: Stateless design allows multiple instances
- **Load Balancing**: Can be placed behind load balancer
- **Database Sharding**: MongoDB supports sharding
- **Caching Layer**: Redis can be clustered

## Deployment Architecture

### Production Setup

```
┌─────────────┐
│ Load Balancer│
└──────┬───────┘
       │
   ┌───┴───┐
   │       │
   ▼       ▼
┌─────┐ ┌─────┐
│App 1│ │App 2│
└──┬──┘ └──┬──┘
   │       │
   └───┬───┘
       │
       ▼
┌─────────────┐
│   MongoDB    │
│  (Replica    │
│    Set)      │
└─────────────┘
       │
       ▼
┌─────────────┐
│    Redis     │
│   Cluster    │
└─────────────┘
```

## Environment Configuration

### Configuration Files

- `config/env/local.js` - Local development
- `config/env/stage.js` - Staging environment
- `config/env/production.js` - Production environment

### Configuration Loading

```javascript
NODE_ENV → config/env/${NODE_ENV}.js → Application Config
```

## API Design Principles

1. **RESTful**: Follows REST conventions
2. **Consistent**: Uniform response format
3. **Stateless**: No server-side sessions
4. **Versioned**: API versioning via base path
5. **Documented**: Comprehensive API documentation

## Testing Strategy

### Recommended Testing

1. **Unit Tests**: Controller and model logic
2. **Integration Tests**: API endpoint testing
3. **E2E Tests**: Complete workflow testing
4. **Load Tests**: Performance testing

## Monitoring and Logging

### Logging

- Console logging for development
- Error logging with stack traces
- Request logging (if Morgan enabled)

### Monitoring Recommendations

- Application performance monitoring (APM)
- Database query monitoring
- Error tracking (e.g., Sentry)
- Uptime monitoring

## Future Enhancements

### Potential Improvements

1. **API Versioning**: `/api/v1/web`, `/api/v2/web`
2. **Rate Limiting**: Prevent abuse
3. **Request Validation**: Schema validation (Joi/Yup)
4. **GraphQL**: Alternative API layer
5. **WebSockets**: Real-time updates
6. **Microservices**: Split into smaller services
7. **Event-Driven**: Message queue integration
8. **Advanced Caching**: More aggressive caching strategy

---

**Last Updated**: 2024
