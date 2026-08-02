const express = require("express");
const multer = require("multer");
const {
  uploadFile,
  uploadWebsite,
  uploadText,
} = require("../controller/ragController/ingestion.controller.js");

const router = express.Router();

const upload = multer({
  dest: "uploads/",
});

router.post("/file", upload.single("file"), uploadFile);

router.post("/website", uploadWebsite);

router.post("/text", uploadText);

module.exports = router;
