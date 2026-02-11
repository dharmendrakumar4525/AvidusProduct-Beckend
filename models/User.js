/**
 * User Model
 * Defines the schema for user accounts including:
 * - User identification (name, email, phone)
 * - Site associations (users can be assigned to multiple sites)
 * - Role assignment (string-based role name)
 * - Notification preferences
 * - Password (hashed)
 * - Virtual field for role details (populated from Role model)
 */

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  // User identification
  name: {
    type: String,
    required: true,
  },

  // Site associations - users can be assigned to multiple sites
  sites: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "site",
    },
  ],

  // Contact information
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },

  // Role assignment - string-based role name (e.g., "superadmin", "project_manager")
  role: {
    type: String,
    required: true,
  },

  // Notification preferences - array of notification types this user should receive
  notifications: {
    type: [String],  // Array of notification type strings
    enum: [
      "RR_approval_project_manager",
      "RR_approval_project_director",
      "RR_approved",
      "RC_initial_approval",
      "RC_final_approval",
      "rate_approved",
      "RO_approval",
      "RO_approved",
      "PR_revise_reject_PM",
      "PR_revise_reject_PD",
      "PR_revised",
      "PR_edited_by_superadmin",
      "RC_revise_initial",
      "RC_revise_final",
      "RC_reject_initial",
      "RC_reject_final",
      "RC_revised",
      "PO_reject",
      "PO_revised_by_superadmin",
      "debit_note_vendor"
    ],
    default: []
  },
  
  // Password (should be hashed using bcrypt)
  password: {
    type: String,
    required: true,
  },
  
  // Account creation date
  date: {
    type: Date,
    default: Date.now,
  },
});

// Virtual field to populate role details from Role model
// Links User.role (string) to Role.role (string) for one-to-one relationship
userSchema.virtual("roleDetails", {
  ref: "Role",          // The model to use for population
  localField: "role",   // Field in User (string role name)
  foreignField: "role", // Field in Role (string role name)
  justOne: true         // One-to-one relationship
});

userSchema.set("toObject", { virtuals: true });
userSchema.set("toJSON", { virtuals: true });


module.exports = mongoose.model("User", userSchema);
