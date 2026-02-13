const ActivitySchema = require('../../models/Activity')
const Response = require('../../libs/response')
const { responseMessage } = require("../../libs/responseMessages");
const ObjectID = require('mongodb').ObjectID;



module.exports = {
    createData,
    updateData,
    deleteData,
    getDetails,
    getList
}

/**
 * Create Activity
 * POST /api/web/activity
 * Creates a new activity in the master data
 * 
 * @param {Object} req.body - Activity data
 * @param {String} req.body.activity_name - Activity name (required)
 * @param {String} req.body.structure - Structure ID (required)
 * @param {String} req.body.langCode - Language code for response messages
 * @param {String} req.body.login_user_id - User creating the activity
 * 
 * @returns {Object} Created activity object
 */
async function createData(req, res) {
    try {
        let reqObj = req.body;
        reqObj.companyIdf = req.user.companyIdf;
        reqObj.created_by = reqObj.login_user_id;
        reqObj.updated_by = reqObj.login_user_id;

        // Create new activity record
        let newData = await new ActivitySchema(reqObj).save();

        if (newData) {
            res.status(200).json(await Response.success(newData, responseMessage(reqObj.langCode, 'RECORD_CREATED'), req));
        } else {
            throw {
                errors: [],
                message: responseMessage(reqObj.langCode, 'SOMETHING_WRONG'),
                statusCode: 412
            };
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


async function updateData(req, res) {

    try {
        let reqObj = req.body;
        let loginUserId = reqObj.login_user_id;


        if (!reqObj._id) {
            throw {
                errors: [],
                message: responseMessage(reqObj.langCode, 'ID_MISSING'),
                statusCode: 412
            }
        }

        let requestedData = { ...reqObj, ...{ updated_by: loginUserId } };

        let updatedData = await ActivitySchema.findOneAndUpdate({
            _id: ObjectID(reqObj._id),
            companyIdf: req.user.companyIdf
        }, requestedData, {
            new: true
        });

        if (updatedData) {
            res.status(200).json(await Response.success(updatedData, responseMessage(reqObj.langCode, 'RECORD_UPDATED'), req));
        }
        else {
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


async function deleteData(req, res) {

    try {
        let reqObj = req.body;
        let { _id } = req.query;

        if (!_id) {
            throw {
                errors: [],
                message: responseMessage(reqObj.langCode, 'ID_MISSING'),
                statusCode: 412
            }
        }

        let getData = await ActivitySchema.findOne({ "_id": ObjectID(_id), companyIdf: req.user.companyIdf });

        if (!getData) {
            throw {
                errors: [],
                message: responseMessage(reqObj.langCode, 'NO_RECORD_FOUND'),
                statusCode: 412
            }
        }

        const dataRemoved = await ActivitySchema.deleteOne({ "_id": ObjectID(_id), companyIdf: req.user.companyIdf });
        
        res.status(200).json(await Response.success({}, responseMessage(reqObj.langCode,'RECORD_DELETED'),req));

    } catch (error) {
        return res.status(error.statusCode || 422).json(
            await Response.errors({
                errors: error.errors,
                message: error.message
            }, error, req)
        );

    }
}

async function getDetails(req, res) {
    try {

        let reqObj = req.body;
        let { _id } = req.query;

        if (!_id) {
            throw {
                errors: [],
                message: responseMessage(reqObj.langCode, 'ID_MISSING'),
                statusCode: 412
            }
        }

        const recordDetail = await ActivitySchema.findOne({_id:ObjectID(_id), companyIdf: req.user.companyIdf});

        if(recordDetail){
            res.status(200).json(await Response.success(recordDetail, responseMessage(reqObj.langCode, 'SUCCESS')));
        } else {
            res.status(422).json(await Response.success({}, responseMessage(reqObj.langCode, 'NO_RECORD_FOUND'),req));
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


async function getList(req, res) {

    try {
        let reqObj = req.body;

        let {page,per_page,sort_by,sort_order} = req.query; 
        let pageData = Response.validationPagination(page,per_page);

        if (page > 0) {

            let sort = {
                '_id' : -1
            }
            if(sort_by){
                let order = (sort_order=='desc')? -1:1;
                sort = {
                    [sort_by]:order
                }
            } 
        
            let allRecords = await ActivitySchema.aggregate([
                { $match: { companyIdf: ObjectID(req.user.companyIdf) } },
                {
                   $facet:{
                      data:[
                          
                           { '$sort'     : sort },
                           { "$skip"     : pageData.offset },
                           { "$limit"    : pageData.limit }
                       ],
                      total: [{ $count: 'total' }] 
                   }
                }
             ]);
           res.status(200).json(await Response.pagination(allRecords, responseMessage(reqObj.langCode,'SUCCESS'),pageData,req));

        } else {
            let allRecords = await ActivitySchema.find({ companyIdf: req.user.companyIdf }).lean();
            res.status(200).json(await Response.success(allRecords, responseMessage(reqObj.langCode,'SUCCESS'),req));
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