/**
 * Cache TTL Configuration
 * Centralized Time To Live (TTL) values for Redis cache
 * 
 * These values are optimized based on data volatility:
 * - Transactional data: Short TTL (frequent changes)
 * - Master data: Medium TTL (occasional changes)
 * - Static data: Long TTL (rarely changes)
 */

module.exports = {
  // Transactional data - changes frequently (POs, DMRs, Inventory, Purchase Requests)
  TRANSACTIONAL: 300,        // 5 minutes
  
  // Master data - changes occasionally (Items, Vendors, Categories, Brands, UOM, GST)
  MASTER_DATA: 600,          // 10 minutes
  
  // Dashboard/Aggregate data - needs freshness (Counts, Statistics)
  DASHBOARD: 300,            // 5 minutes
  
  // Projects - changes less frequently
  PROJECT: 1800,             // 30 minutes
  
  // Static data - rarely changes (Countries, States, Cities)
  STATIC: 86400              // 24 hours
};
