const multer = require("multer");
const fs = require("fs");
const path = require("path");

/**
 * Upload directory
 */
const uploadDir = path.join(process.cwd(), "uploads");

/**
 * Create uploads directory if it doesn't exist
 */
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Configure storage
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const timestamp = Date.now();

    // Remove spaces from filename
    const originalName = file.originalname.replace(/\s+/g, "_");

    cb(null, `${timestamp}_${originalName}`);
  },
});

/**
 * Allow only PDF files
 */
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["application/pdf"];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error("Only PDF files are allowed."));
  }

  cb(null, true);
};

/**
 * Configure multer
 */
const upload = multer({
  storage,

  fileFilter,

  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
  },
});

module.exports = upload;
