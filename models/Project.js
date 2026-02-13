/**
 * Project Model
 * Defines the schema for project management including:
 * - Project identification (name, date, location, image)
 * - Project members
 * - Milestone dates (R0, R1, R2)
 * - Hierarchical structure: locations -> structures -> activities
 * - Activity tracking with dates, quantities, and progress metrics
 */

const mongoose = require('mongoose');
const schema = mongoose.Schema;

const projectSchema = new mongoose.Schema({
    companyIdf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "onboardingcompany",
        required: true
    },

    projectName: {
        type: String,
        required: true

    },
    projectDate: {
        type: Date,
        //default:Date.now
    },
    location: {
        type: String,
        required: true

    },
    imageUrl: {
        type: String,
        //required:true

    },
    members: { type: Array, "default": [] },

    r0Date: {
        type: Date
    },
    r1Date: {
        type: Date
    },
    r2Date: {
        type: Date
    },
    // Hierarchical project structure: locations -> structures -> activities
    locations: [
        {
            location_name: {
                type: String,
                default: ""
            },
            location_id: {
                type: schema.Types.ObjectId
            },
            structures: [
                {
                    structure_name: {
                        type: String,
                        default: ""
                    },
                    structure_id: {
                        type: schema.Types.ObjectId,
                    },
                    activities: [
                        {
                            // Activity identification
                            activity_name: {
                                type: String,
                                default: ""
                            },
                            activity_id: {
                                type: schema.Types.ObjectId
                            },
                            
                            // Activity dates
                            actual_revised_start_date: {
                                type: Date,
                                default: null
                            },
                            base_line_start_date: {
                                type: Date,
                                default: null
                            },
                            base_line_end_date: {
                                type: Date,
                                default: null
                            },
                            
                            // Activity metrics
                            uom: {
                                type: String,
                                default: null
                            },
                            quantity: {
                                type: Number,
                                default: 0
                            },
                            workingDaysRevised:{
                                type:String,
                                //required:true
                            },
                            noofDaysBalanceasperrevisedEnddate:{
                                type:String,
                                //required:true
                            },
                        
                            dailyAskingRateasperRevisedEndDate:{
                                type:String,
                                //required:true
                            },
                            noofDaysBalanceasperbaseLine:{
                                type:String,
                                //required:true
                            },
                            dailyAskingRateasperbaseLine:{
                                type:String,
                                //required:true
                            },
                        
                            currentDailyAskingRate:{
                                type:String,
                                //required:true
                            },
                        
                            ActivityBalanceInPercentage:{
                                type:String,
                                //required:true
                            },
                        
                            dailyCumulativeTotal:{
                                type:Number,
                                "default" : 0
                            },
                            baseLineWorkingDays:{
                                type:String,
                                //required:true
                            },
                            
                            r1EndDate:{
                                type:Date,
                            },
                            r2EndDate:{
                                type:Date,
                            },
                            r3EndDate:{
                                type:Date,
                            },
                            addRevisesDates:{type : Array , "default" : []},
                        }
                    ],
                }
            ],
        }
    ],
    created_by: String,
    updated_by: String

},
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at"
        }
    })

module.exports = mongoose.model('Project', projectSchema)