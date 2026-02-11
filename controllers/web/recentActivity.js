/**
 * Recent Activity Controller
 * Handles operations related to recent activity logging including:
 * - Retrieving activity logs sorted by most recent
 */

const RecentActivity = require('../../models/recentActivity');
const Response = require('../../libs/response');

// Export all controller functions
module.exports = {
    getList
};

/**
 * Get Recent Activity List
 * GET /api/web/recentActivity
 * Retrieves all recent activities sorted by most recent first
 * 
 * @returns {Array} List of recent activities (sorted by _id descending)
 */
async function getList(req, res) {
    try {
        // Fetch all activities sorted by most recent first
        const tasks = await RecentActivity.find().sort({ _id: -1 });
        res.send(tasks);
    } catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            }, error, req)
        );
    }
}




