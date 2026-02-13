/**
 * Project Controller
 * Handles all operations related to Project management including:
 * - Creating and updating projects
 * - Managing project tasks and subtasks
 * - Project member management
 * - Activity logging for project operations
 * - Project queries with task/subtask aggregation
 */

const Project = require('../../models/Project');
const Task = require('../../models/Task');
const SubTask = require('../../models/SubTask');
const mongoose = require('mongoose');
const Response = require('../../libs/response');
const ObjectId = mongoose.Types.ObjectId;
const { responseMessage } = require("../../libs/responseMessages");
const { updateActivityLog } = require("./utilityController");
const {
  getCache,
  setCache,
  deleteCache,
  invalidateEntity,
  invalidateEntityList,
} = require("../../utils/cache");
const { PROJECT } = require("../../libs/cacheConfig");

require('dotenv').config();
const sendEmailsInBatches = require('../../emails/sendEmail');

// Export all controller functions
module.exports = {
    getList,
    createData,
    updateData,
    getDetails,
    deleteById,
    updateMoreActivityData,
    postDataById,
    getListById,
    updateProject,
    updateProjectById,
    updateMenberById
};

/**
 * Get Project List
 * GET /api/web/project
 * Retrieves all projects
 * 
 * @returns {Array} List of all projects
 */
async function getList(req, res) {
    try {
        const cacheKey = "project:list:all";
        
        // Check cache first
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.status(200).json(cached);
        }
        
        // Fetch all projects from database
        const projects = await Project.find({ companyIdf: req.user.companyIdf }).lean();
        
        // Cache the result for 30 minutes
        await setCache(cacheKey, projects, PROJECT);
        
        res.send(projects);
        /*const payload = {
            "subject": "Test Email",
            "to": ["vittyanshika@gmail.com"],
            "cc": ["anshika.mishra120797@gmail.com"],
            "htmlContent": "<h2>Testing API Email</h2><p>This is a test email.</p>"
          } */
          //const { subject, to, cc, htmlContent } = payload;
          //await sendEmailsInBatches(subject, to, cc || [], htmlContent);
        //console.log("lets check itfirst here >>>>>>>>>>>>>>>>>>>>>>>>>")
       /* const recipients = ['anshika.mishra1297@gmail.com','vittyanshika@gmail.com']; // Multiple emails
const subject = 'Test Email to Multiple Recipients';
const text = 'This is a test email sent to multiple recipients.';
const html = '<strong>This is a test email sent to multiple recipients.</strong>';

sendEmail(recipients, subject, text, html); */
        //console.log("lets check it here>>>>>>>>>>>>>>>>>>>>>>>>>")
        
       

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
 * Get Project Details
 * GET /api/web/project/:id
 * Retrieves detailed information about a specific project
 * 
 * @param {String} req.params.id - Project ID
 * 
 * @returns {Object} Project details
 */
async function getDetails(req, res) {
    try {
        const projectId = req.params.id;
        const cacheKey = `project:details:${projectId}`;
        
        // Check cache first
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.status(200).json(cached);
        }
        
        // Find project by ID
        const project = await Project.findOne({ _id: projectId, companyIdf: req.user.companyIdf }).lean();
        if (!project) return res.send('no project exits');
        
        // Cache the result for 30 minutes
        await setCache(cacheKey, project, PROJECT);
        
        res.send(project);

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
 * Create Project
 * POST /api/web/project
 * Creates a new project and logs the activity
 * 
 * @param {String} req.body.projectName - Project name (required)
 * @param {Date} req.body.projectDate - Project start date
 * @param {String} req.body.location - Project location
 * @param {Array} req.body.members - Project members array
 * @param {Date} req.body.r0Date - R0 milestone date
 * @param {Date} req.body.r1Date - R1 milestone date
 * @param {Date} req.body.r2Date - R2 milestone date
 * @param {String} req.body.imageUrl - Project image URL
 * @param {Array} req.body.locations - Additional locations array
 * 
 * @returns {Object} Created project object
 */
async function createData(req, res) {
    try {
        // Create new project instance
        let project = new Project({
            companyIdf: req.user.companyIdf,
            projectName: req.body.projectName,
            projectDate: req.body.projectDate,
            location: req.body.location,
            members: req.body.members,
            r0Date: req.body.r0Date,
            r1Date: req.body.r1Date,
            r2Date: req.body.r2Date,
            imageUrl: req.body.imageUrl,
            locations: req.body.locations
        });
        
        // Save project to database
        project = await project.save();

        // Invalidate project list cache
        await invalidateEntity("project");
        await invalidateEntityList("project");

        // Log activity
        await updateActivityLog(`${project.projectName} project created`);      

        res.send(project);

    } catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            }, error, req)
        );

    }
}

async function updateMoreActivityData(req, res) {

    try {
        let sections = req.body.sections
        let mapped = sections.map(ele => {
            return { taskName: ele.taskName, subTaskName: ele.subTaskName, projectId: req.params.id }
        })

        let subTasks = await SubTask.insertMany(mapped)

        res.send(subTasks);

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
 * Update Project
 * PUT /api/web/project
 * Updates an existing project and logs the activity
 * 
 * @param {String} req.body._id - Project ID (required)
 * @param {Object} req.body - Project fields to update
 * @param {String} req.body.langCode - Language code for response messages
 * @param {String} req.body.login_user_id - User updating the project
 * 
 * @returns {Object} Updated project object
 */
async function updateData(req, res) {
    try {
        let reqObj = req.body;
        let loginUserId = reqObj.login_user_id;

        // Validate project ID
        if (!reqObj._id) {
            throw {
                errors: [],
                message: responseMessage(reqObj.langCode, 'ID_MISSING'),
                statusCode: 412
            };
        }

        // Prepare update data with user tracking
        let requestedData = { ...reqObj, ...{ updated_by: loginUserId } };

        // Update project and return updated document
        let updatedData = await Project.findOneAndUpdate({
            _id: ObjectId(reqObj._id),
            companyIdf: req.user.companyIdf
        }, requestedData, {
            new: true // Return updated document
        });

        if (updatedData) {
            // Invalidate cache for this project and project list
            await invalidateEntity("project");
            await invalidateEntityList("project");
            await deleteCache(`project:details:${reqObj._id}`);
            
            // Log activity
            await updateActivityLog(`${updatedData.projectName} project updated`); 

            res.status(200).json(await Response.success(updatedData, responseMessage(reqObj.langCode, 'RECORD_UPDATED'), req));
        } else {
            res.status(400).json(await Response.success({}, responseMessage(reqObj.langCode, 'NO_RECORD_FOUND'), req));
        }        
    } catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            }, error, req)
        );
    }
}



// Still working here 

async function postDataById(req, res) {
    try {
        let sections = req.body
        let mapped = sections.map(ele => {
            return { taskId: ele.taskId, taskName: ele.taskName, projectId: req.params.id }
        })
        let gg = []
        allTasks = await Task.find()
        for (let single of allTasks) {
            for (let one of mapped) {
                if (single.taskId !== one.taskId) {
                    gg.push(one)
                }
            }
        }
        const uniqueIds = [];

        const unique = gg.filter(element => {
            const isDuplicate = uniqueIds.includes(element.taskId);

            if (!isDuplicate) {
                uniqueIds.push(element.taskId);

                return true;
            }

            return false;
        });
        let tasks = await Task.insertMany(unique)
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


async function updateProject(req, res) {
    try {
        const project = await Project.findOneAndUpdate({ _id: req.params.id, companyIdf: req.user.companyIdf }, {

            projectName: req.body.projectName,
            projectDate: req.body.projectDate,
            location: req.body.location,
            members: req.body.members,
            r0Date: req.body.r0Date,
            r1Date: req.body.r1Date,
            r2Date: req.body.r2Date,
            imageUrl: req.body.imageUrl

        }, { new: true });

        if (!project) return res.send('project not updated')

        // Invalidate cache for this project and project list
        await invalidateEntity("project");
        await invalidateEntityList("project");
        await deleteCache(`project:details:${req.params.id}`);

        await updateActivityLog(`${req.body.projectName} project updated`); 

        res.send(project)
    } catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            }, error, req)
        );

    }

}


async function updateProjectById(req, res) {
    try {
        const project = await Project.findOneAndUpdate({ _id: req.params.id, companyIdf: req.user.companyIdf }, {

            projectName: req.body.projectName,
            location: req.body.location,
            startDate: req.body.startDate,
            endDate: req.body.endDate

        }, { new: true });

        if (!project) return res.send('project not updated')

        // Invalidate cache for this project and project list
        await invalidateEntity("project");
        await invalidateEntityList("project");
        await deleteCache(`project:details:${req.params.id}`);

        res.send(project)
    }
    catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            }, error, req)
        );

    }
}


async function updateMenberById(req, res) {
    try {
        const project = await Project.findOneAndUpdate({ _id: req.params.id, companyIdf: req.user.companyIdf }, {

            members: req.body.members,


        }, { new: true });

        if (!project) return res.send('project not updated')

        // Invalidate cache for this project and project list
        await invalidateEntity("project");
        await invalidateEntityList("project");
        await deleteCache(`project:details:${req.params.id}`);

        let newMember = req.body.members.slice(-1)[0]

        await updateActivityLog(`new member ${newMember} added to ${project.projectName} project`);  

        res.send(project)
    }
    catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            }, error, req)
        );

    }
}

async function deleteById(req, res) {
    try {
        const projectId = req.params.id;
        const project = await Project.findOneAndRemove({ _id: projectId, companyIdf: req.user.companyIdf })

        if (!project) return res.send('project not deleted')

        // Invalidate cache for this project and project list
        await invalidateEntity("project");
        await invalidateEntityList("project");
        await deleteCache(`project:details:${projectId}`);

        res.send(project)
    }
    catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            }, error, req)
        );

    }
}


async function getListById(req, res) {
    try {
        const task = await Project.aggregate([
            { $match: { companyIdf: ObjectId(req.user.companyIdf) } },
            { $project: { projectName: 1 } },
            { "$addFields": { "projectId": { "$toString": "$_id" } } },
            {
                $lookup:
                {
                    from: "tasks",
                    localField: "projectId",
                    foreignField: "projectId",
                    as: "result"
                }
            },
            {
                $lookup:
                {
                    from: "subtasks",
                    localField: "result.taskName",
                    foreignField: "taskName",
                    as: "subtasksData"
                }
            },           
            {
                $match: { _id: ObjectId('63970d336ec0b89a7afcb987') }
            }
        ])

        if (!task) return res.send('no task exits')

        res.send(task)
    }
    catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            }, error, req)
        );

    }
}


