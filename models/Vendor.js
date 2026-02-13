/**
 * Vendor Model
 * Defines the schema for vendor master data including:
 * - Vendor identification (name, code, unique code)
 * - Contact information (address, phone, email)
 * - Business details (PAN, GST, MSME number)
 * - Category and subcategory associations
 * - Payment terms and conditions
 */

const mongoose = require("mongoose");
const config = require("../config/env");
const schema = mongoose.Schema;

const VendorSchema = new mongoose.Schema(
  {
    companyIdf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "onboardingcompany",
        required: true
    },
    // Vendor identification
    vendor_name: {
      type: String,
      required: true,
    },
    code: {
      type: Number,
      required: true,
    },
    Uniquecode: {
      type: String,
      required: true,
    },
    // category:{
    //     type:Array,
    //     required:true
    // },
    // SubCategory:{
    //     type:Array,
    //     required:true
    // },

    // Category associations - vendors can be associated with multiple categories
    category: [
      {
        type: schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    SubCategory: [
      {
        type: schema.Types.ObjectId,
        ref: "SubCategory",
      },
    ],
    // Address information
    address: {
      street_address: {
        type: String,
        default: "",
      },
      street_address2: {
        type: String,
        default: "",
      },
      state: {
        type: String,
        default: "",
      },
      city: {
        type: String,
        default: "",
      },
      zip_code: {
        type: String,
        default: "",
      },
      country: {
        type: String,
        default: "",
      },
    },

    // Contact information
    contact_person: {
      type: String,
    },
    dialcode: {
      type: Number,
      required: true,
    },
    phone_number: {
      type: [],
    },
    en: {
      type: String,
      default: "",
    },
    
    // Business registration details
    pan_number: {
      type: String,
      default: "",
    },
    MSME_number: {
      type: String,
      default: "",
    },
    scope: {
      type: String,
      default: "",
    },
    vendor_type: {
      type: String,
      default: "",
    },
    gst_number: {
      type: String,
      default: "",
    },
    
    // Email addresses - supports multiple emails with validation
    email: {
      type: [String], // Array of email addresses
      lowercase: true,
      trim: true,
      validate: {
        validator: function (emails) {
          // Validate each email in the array
          return emails.every((email) =>
            /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)
          );
        },
        message: (props) =>
          `One or more emails in ${props.value} are not valid.`,
      },
    },

    // Payment and terms
    payment_terms: {
      type: String,
      default: "",
    },
    terms_condition: {
      type: String,
      default: "",
    },
    created_by: String,
    updated_by: String,
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

VendorSchema.set("autoIndex", config.db.autoIndex);
module.exports = mongoose.model("vendor", VendorSchema);
