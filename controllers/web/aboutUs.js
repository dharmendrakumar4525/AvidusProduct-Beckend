/**
 * About Us Controller
 * Handles all operations related to About Us content management including:
 * - Creating and updating about us information
 * - Activity logging for content updates
 */

const AboutUs = require('../../models/AboutUs');
const RecentActivity = require('../../models/recentActivity');
const Response = require('../../libs/response');

// Export all controller functions
module.exports = {
    createData,
    updateData,
    getList,
    getDetails
};



/**
 * Create About Us
 * POST /api/web/aboutUs
 * Creates new about us content and logs the activity
 * 
 * @param {String} req.body.about - About us description/content (required)
 * 
 * @returns {Object} Created about us object
 */
async function createData(req, res) {
    try {
        let reqObj = req.body;

        // Create new about us record
        let aboutUs = new AboutUs({
            description: reqObj.about
        });
        aboutUs = await aboutUs.save();
        
        if (!aboutUs) return res.send('aboutUs not created');

        // Log activity
        let recentActivity = new RecentActivity({
            description: `about us information updated`
        });
        recentActivity = await recentActivity.save();

        res.send(aboutUs);
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
 * Update About Us
 * PUT /api/web/aboutUs/:id
 * Updates existing about us content and logs the activity
 * 
 * @param {String} req.params.id - About Us ID (required)
 * @param {String} req.body.about - Updated about us description/content (required)
 * 
 * @returns {Object} Updated about us object
 */
async function updateData(req, res) {
    try {
        let { id } = req.params;
        let reqObj = req.body;

        // Update about us content
        const about = await AboutUs.findByIdAndUpdate(id, {
            description: reqObj.about,
        }, { new: true });

        // Log activity
        let recentActivity = new RecentActivity({
            description: `about us information updated`
        });
        recentActivity = await recentActivity.save();
        
        res.send(about);
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
 * Get About Us List
 * GET /api/web/aboutUs
 * Retrieves all about us records
 * 
 * @returns {Array} List of all about us records
 */
async function getList(req, res) {
    try {
        let reqObj = req.body;
        const aboutUs = await AboutUs.find({});
        res.send(aboutUs);
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
 * Get About Us Details
 * GET /api/web/aboutUs/:id
 * Retrieves detailed information about a specific about us record
 * 
 * @param {String} req.params.id - About Us ID (required)
 * 
 * @returns {Object} About us details
 */
async function getDetails(req, res) {
    try {
        let reqObj = req.params;

        const aboutUs = await AboutUs.findById(reqObj.id);

        if (!aboutUs) return res.send('no aboutUs exits');

        res.send(aboutUs);
    } catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            }, error, req)
        );
    }
}


