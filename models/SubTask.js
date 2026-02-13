/**
 * SubTask Model
 * Schema for storing project subtasks with progress tracking
 * 
 * Subtasks track daily progress, cumulative totals, baseline and revised dates,
 * and milestone dates (R1, R2, R3). Used for project progress monitoring.
 * 
 * Fields:
 * - subTaskName: Name of the subtask
 * - projectId: Project ID this subtask belongs to
 * - taskName: Parent task name
 * - Date fields: R1, R2, R3 end dates, baseline dates, revised dates
 * - Progress tracking: dailyCumulativeTotal, previousValue, total
 * - Working days and asking rates
 * - Remarks array for notes
 */

const mongoose = require('mongoose');

const subTaskSchema = new mongoose.Schema({
    companyIdf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "onboardingcompany",
        required: true
    },
    /**
     * SubTask Name
     * @type {String}
     */
    subTaskName: {
        type: String,
    },

    /**
     * Project ID
     * ID of the project this subtask belongs to
     * @type {String}
     */
    projectId: {
        type: String,
    },

    /**
     * Task Name
     * Name of the parent task
     * @type {String}
     */
    taskName: {
        type: String,
    },
    /**
     * R1 End Date
     * First revision milestone end date
     * @type {Date}
     */
    r1EndDate: {
        type: Date,
    },
    
    /**
     * R2 End Date
     * Second revision milestone end date
     * @type {Date}
     */
    r2EndDate: {
        type: Date,
    },
    
    /**
     * R3 End Date
     * Third revision milestone end date
     * @type {Date}
     */
    r3EndDate: {
        type: Date,
    },
    
    /**
     * Revised Dates Array
     * Array of revised dates
     * @type {Array}
     * @default []
     */
    addRevisesDates: {
        type: Array,
        "default": []
    },

    /**
     * Actual Revised Start Date
     * Actual start date after revision
     * @type {Date}
     */
    actualRevisedStartDate: {
        type: Date,
    },
    
    /**
     * Working Days Revised
     * Number of working days after revision
     * @type {String}
     */
    workingDaysRevised: {
        type: String,
    },

    /**
     * Baseline Start Date
     * Original planned start date
     * @type {Date}
     */
    baseLineStartDate: {
        type: Date,
    },
    
    /**
     * Baseline End Date
     * Original planned end date
     * @type {Date}
     */
    baseLineEndDate: {
        type: Date,
    },

    /**
     * Baseline Working Days
     * Original planned working days
     * @type {String}
     */
    baseLineWorkingDays: {
        type: String,
    },
    
    /**
     * Unit of Measurement (UOM)
     * @type {String}
     */
    uom: {
        type: String,
    },

    /**
     * Total Quantity
     * Total quantity for the subtask
     * @type {Number}
     * @default 0
     */
    total: {
        type: Number,
        "default": 0
    },
    
    /**
     * Cumulative Completed
     * Cumulative completed quantity
     * @type {String}
     */
    cumulativeCompleted: {
        type: String,
    },

    /**
     * Target Status
     * Current target status
     * @type {String}
     */
    targetStatus: {
        type: String,
    },

    /**
     * Number of Days Balance as per Revised End Date
     * @type {String}
     */
    noofDaysBalanceasperrevisedEnddate: {
        type: String,
    },

    /**
     * Daily Asking Rate as per Revised End Date
     * @type {String}
     */
    dailyAskingRateasperRevisedEndDate: {
        type: String,
    },
    
    /**
     * Number of Days Balance as per Baseline
     * @type {String}
     */
    noofDaysBalanceasperbaseLine: {
        type: String,
    },
    
    /**
     * Daily Asking Rate as per Baseline
     * @type {String}
     */
    dailyAskingRateasperbaseLine: {
        type: String,
    },

    /**
     * Current Daily Asking Rate
     * @type {String}
     */
    currentDailyAskingRate: {
        type: String,
    },

    /**
     * Activity Balance In Percentage
     * @type {String}
     */
    ActivityBalanceInPercentage: {
        type: String,
    },

    /**
     * Daily Cumulative Total
     * Running total of daily cumulative values
     * @type {Number}
     * @default 0
     */
    dailyCumulativeTotal: {
        type: Number,
        "default": 0
    },

    /**
     * Previous Value
     * Previous cumulative value for update calculations
     * @type {Number}
     * @default 0
     */
    previousValue: {
        type: Number,
        "default": 0
    },
    
    /**
     * Total Date
     * Date of the last total update
     * @type {Date}
     */
    totalDate: {
        type: Date,
    },
    
    /**
     * Date String
     * String representation of the date
     * @type {String}
     */
    dateStr: {
        type: String,
    },
    
    /**
     * Remarks
     * Array of remarks/notes
     * @type {Array}
     * @default []
     */
    remarks: {
        type: Array,
        "default": []
    },







     



    


})

module.exports = mongoose.model('SubTask',subTaskSchema)