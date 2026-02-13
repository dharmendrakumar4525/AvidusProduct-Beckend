/**
 * Line Graph Controller
 * Handles all operations related to Line Graph data for project progress visualization including:
 * - Querying line graph data by project and date
 * - Activity logging
 */

const LineGraph = require('../../models/LineGraph');
const Response = require('../../libs/response');

// Export all controller functions
module.exports = {
    createData,
    getList,
    getDetails,
};

/**
 * Get Line Graph Data
 * POST /api/web/lineGraph
 * Retrieves line graph data up to a specific date for a project
 * Used for progress visualization
 * 
 * @param {String} req.body.projectId - Project ID (required)
 * @param {Date} req.body.date - Date to query up to (required)
 * 
 * @returns {Array} Array of line graph entries up to the specified date
 */
async function createData(req, res) {
    try {
        // Find all line graph entries for the project up to the specified date
        const lineGraph = await LineGraph.find(
            {
                $and: [
                    {
                        date: {
                            $lte: new Date(req.body.date) // All entries up to this date
                        }
                    },
                    { projectId: req.body.projectId }, // Filter by project
                    { companyIdf: req.user.companyIdf }
                ]
            }
        );
        
        if (!lineGraph) return res.send('no lineGraph exits');

        // Log activity
        let recentActivity = new RecentActivity({
            description: `item information updated`
        });
        recentActivity = await recentActivity.save();
        
        res.send(lineGraph);
    } catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            }, error, req)
        );
    }
}

/**
 * Get Line Graph List
 * GET /api/web/lineGraph
 * Retrieves all line graph entries
 * 
 * @returns {Array} List of all line graph entries
 */
async function getList(req, res) {
    try {
        const lineGraph = await LineGraph.find({ companyIdf: req.user.companyIdf });
        res.send(lineGraph);
    } catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            }, error, req)
        );
    }
}

/**
 * Get Line Graph Details By Project
 * GET /api/web/lineGraph/:id
 * Retrieves all line graph entries for a specific project
 * 
 * @param {String} req.params.id - Project ID (required)
 * 
 * @returns {Array} Array of line graph entries for the project
 */
async function getDetails(req, res) {
    try {
        // Find all line graph entries for the project
        const lineGraph = await LineGraph.find({ projectId: req.params.id, companyIdf: req.user.companyIdf });
        
        if (!lineGraph) return res.send('no lineGraph exits');
        
        res.send(lineGraph);
    } catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            }, error, req)
        );
    }
}





