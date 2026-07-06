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

router.post("/pdf", upload.single("file"), uploadPdf);

router.post("/website", addWebsite);

router.post("/text", addText);

router.get("/", getDocuments);

router.delete("/:documentId", deleteDocument);

module.exports = router;
