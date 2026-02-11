/**
 * Category Model
 * Defines the schema for category master data including:
 * - Category name and code
 * - Category type (Project Site Purchase or Plant & Machinery)
 * - User tracking (created_by, updated_by)
 */

const mongoose = require("mongoose");
const schema = mongoose.Schema;
const config = require("../config/env");

const CategorySchema = new mongoose.Schema(
  {
    // Category identification
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      default: "Project Site Purchase",
      enum: ["Project Site Purchase", "Plant & Machinery"], // Allowed category types
      required: true,
    },
    code: {
      type: String,
      required: true,
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

CategorySchema.set("autoIndex", config.db.autoIndex);
module.exports = mongoose.model("category", CategorySchema);
