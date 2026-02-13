/**
 * GST (Goods and Services Tax) Model
 * Defines the schema for GST master data including:
 * - GST name/description
 * - GST percentage rate (e.g., 5, 12, 18, 28)
 * - User tracking (created_by, updated_by)
 */

const mongoose = require("mongoose");
const config = require("../config/env");

const GstSchema = new mongoose.Schema(
  {
    companyIdf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "onboardingcompany",
        required: true
    },
    // GST identification
    gst_name: {
      type: String,
      required: true, // GST name/description (e.g., "GST 18%")
    },
    gst_percentage: {
      type: Number,
      required: true, // GST rate percentage (e.g., 5, 12, 18, 28)
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

GstSchema.set("autoIndex", config.db.autoIndex);
module.exports = mongoose.model("Gst", GstSchema);
