/**
 * SubCategory Model
 * Defines the schema for subcategory master data including:
 * - Subcategory name and code
 * - Parent category reference
 * - User tracking (created_by, updated_by)
 */

const mongoose = require("mongoose");
const schema = mongoose.Schema;
const config = require("../config/env");

const SubCategorySchema = new mongoose.Schema(
  {
    // Subcategory identification
    subcategory_name: {
      type: String,
      required: true,
    },
    subcategory_code: {
      type: String,
      required: true,
      default: "",
    },
    
    // Parent category reference
    category: {
      type: schema.Types.ObjectId,
      ref: "category", // Reference to Category model
      required: true,
    },

    created_by: {
      type: String,
      default: null,
    },

    updated_by: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Set autoIndex
SubCategorySchema.set("autoIndex", config.db.autoIndex);

// SAFE EXPORT (prevents overwrite error)
module.exports =
  mongoose.models.sub_category ||
  mongoose.model("sub_category", SubCategorySchema);
