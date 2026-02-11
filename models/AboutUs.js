/**
 * AboutUs Model
 * Schema for storing About Us page content
 * 
 * Fields:
 * - description: About us content/description text
 * - createdAt: Timestamp when the record was created
 */

const mongoose = require('mongoose');

const aboutUsSchema = new mongoose.Schema({
    /**
     * About Us Description
     * The main content/description for the About Us page
     * @type {String}
     * @required
     */
    description: {
        type: String,
        required: true
    },

    /**
     * Created At
     * Timestamp when the record was created
     * @type {Date}
     * @default Date.now
     */
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('AboutUs', aboutUsSchema);