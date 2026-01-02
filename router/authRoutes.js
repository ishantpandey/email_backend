const express = require("express");
const { 
  register, 
  login, 
  getProfile, 
  logout,
  verifyEmail,
  requestPasswordReset,
  resetPassword
} = require("../controller/authController");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Public Authentication Routes
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

// Password Reset Routes
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

// Email Verification Routes
router.get("/verify-email", verifyEmail);

// Protected Routes
router.get("/profile", authMiddleware, getProfile);

module.exports = router;
