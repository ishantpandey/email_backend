const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../config/model/user");
const { generateToken } = require("../service/service");
const queueHelpers = require("../service/queueHelpers");
const jwt = require('jsonwebtoken');
require('dotenv').config();


// Register Controller
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Name, email, and password are required" 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: "User already exists with this email" 
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user (unverified by default, will auto-delete after 24 hours if not verified)
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      isEmailVerified: false,
      verificationExpiresAt: new Date(Date.now() + 2 * 60 * 1000) // 2 minutes for verification
    });

    await newUser.save();

    // Generate secure verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Hash the token before storing (for security)
    const hashedVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    
    // Set verification token
    newUser.emailVerificationToken = hashedVerificationToken;
    await newUser.save();

    // Create verification link with crypto token
    const baseUrl = process.env.CLIENT_BASE_URL || 'http://localhost:3000';
    const verificationLink = `${baseUrl}/verify?token=${verificationToken}&email=${encodeURIComponent(newUser.email)}`;

    // Queue verification email with JWT token link
    try {
      await queueHelpers.addEmailVerificationEmail(newUser.email, newUser.name, verificationLink);
    } catch (emailError) {
      console.error('Failed to queue verification email:', emailError);
      // Don't fail registration if email queueing fails
    }

    res.status(201).json({
      success: true,
      message: "User registered successfully. Please check your email to verify your account.",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        isEmailVerified: newUser.isEmailVerified
      }
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
};

// Login Controller
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Email and password are required" 
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email"
      });
    }

    // Generate token
    const payload = { 
      id: user._id, 
      email: user.email, 
      name: user.name 
    };
    const token = generateToken(payload);

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified
      },
      token
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
};

// Get Profile Controller (for protected routes)
const getProfile = async (req, res) => {
  try {
    // User information is already available in req.user from middleware
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified
      }
    });

  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
};

// Logout Controller (client-side token removal)
const logout = (req, res) => {
  // Since we're using JWT tokens, logout is handled client-side
  // by removing the token from localStorage/sessionStorage
  res.status(200).json({
    success: true,
    message: "Logout successful. Please remove token from client storage."
  });
};

// Verify Email Controller
const verifyEmail = async (req, res) => {
  try {
    const { token, email } = req.query;

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        message: "Token and email are required"
      });
    }

    // Hash the provided token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with matching email, valid verification token, and not expired
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      emailVerificationToken: hashedToken,
     // verificationExpiresAt: { $gt: new Date() } // Check if token hasn't expired
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token"
      });
    }

    // Update user as verified and clear verification fields
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.verificationExpiresAt = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified
      }
    });

  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Request Password Reset Controller
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    // Find user by email (case insensitive)
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });

    // Always return success message for security (don't reveal if email exists)
    const successMessage = "If the email exists in our system, you will receive a password reset link shortly.";
    
    if (!user) {
      return res.status(200).json({
        success: true,
        message: successMessage
      });
    }

    // Check if user's email is verified
    if (!user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify your email address first before requesting a password reset."
      });
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash the token before storing (for security)
    const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set reset token and expiration (24 hours from now)
    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await user.save();

    // Create reset link with plain token (not hashed)
    const baseUrl = process.env.CLIENT_BASE_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    // Queue password reset email
    try {
      await queueHelpers.addPasswordResetEmail(user.email, user.name, resetLink);
    } catch (emailError) {
      console.error('Failed to queue password reset email:', emailError);
      // Don't fail the request if email queueing fails
    }

    res.status(200).json({
      success: true,
      message: successMessage
    });

  } catch (error) {
    console.error("Request password reset error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Reset Password Controller
const resetPassword = async (req, res) => {
  try {
    const { token, email, newPassword } = req.body;

    // Validation
    if (!token || !email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token, email, and new password are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long"
      });
    }

    // Hash the provided token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with matching email and valid reset token
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      resetPasswordToken: hashedToken,
      resetPasswordExpiresAt: { $gt: new Date() } // Check if token hasn't expired
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token"
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password and clear reset token fields
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;
    
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successful. You can now log in with your new password."
    });

  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  logout,
  verifyEmail,
  requestPasswordReset,
  resetPassword
};