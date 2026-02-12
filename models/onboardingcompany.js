/**
 * OnboardingCompany Model (Tenant Model)
 * Used for multi-tenant SaaS product
 */

const mongoose = require("mongoose");
const slugify = require("slugify");

const onboardingCompanySchema = new mongoose.Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
    },

    logo: {
      type: String,
      default: null,
    },

    signature: {
      type: String,
      default: null,
    },

    // SaaS Control Fields
    isActive: {
      type: Boolean,
      default: true,
    },

    subscriptionPlan: {
      type: String,
      enum: ["basic", "pro", "enterprise"],
      default: "basic",
    },

    subscriptionExpiry: {
      type: Date,
      default: null,
    },

    // Contact Details
    contactEmail: {
      type: String,
      default: null,
    },

    contactPhone: {
      type: String,
      default: null,
    },

    address: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Auto-generate slug if not provided
onboardingCompanySchema.pre("save", function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model(
  "onboardingcompany",
  onboardingCompanySchema
);