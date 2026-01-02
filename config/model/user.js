const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: validator.isEmail,
        message: "Please provide a valid email",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    verificationExpiresAt: {
      type: Date,
      default: undefined // Only set explicitly for unverified users
    },

    // Email verification token
    emailVerificationToken: {
      type: String,
      default: undefined
    },

    // Password reset fields
    resetPasswordToken: {
      type: String,
      default: undefined,
    },
    resetPasswordExpiresAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
userSchema.index({ email: 1 }); // Unique index for email
userSchema.index({ createdAt: -1 }); // Index for sorting by creation date

// TTL index for automatic cleanup - documents expire based on verificationExpiresAt
userSchema.index({ verificationExpiresAt: 1 }, { expireAfterSeconds: 0 });

// Add instance methods
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model("User", userSchema);
