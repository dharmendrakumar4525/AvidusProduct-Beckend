/**
 * Routes Index
 * Main route aggregator that exports all route modules
 * Currently exports web routes for the API
 */

const webRoutes = require('./web');

module.exports = {
    webRoutes: webRoutes
};