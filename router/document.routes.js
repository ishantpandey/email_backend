const express = require("express");

const router = express.Router();

const upload = require("../middleware/upload.middleware");
const {
  uploadPdf,
  addWebsite,
  addText,
  deleteDocument,
  getDocuments,
} = require("../controller/ragController/document.controller");
const authMiddleware = require("../middleware/auth");

router.post("/pdf", authMiddleware, upload.single("file"), uploadPdf);

router.post("/website", authMiddleware, addWebsite);

router.post("/text", authMiddleware, addText);

router.get("/", authMiddleware, getDocuments);

router.delete("/:documentId", authMiddleware, deleteDocument);

module.exports = router;
