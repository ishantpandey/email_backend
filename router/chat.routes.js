const express = require("express");

const {
  askQuestionStream,
} = require("../controller/ragController/chat.controller.js");
const authMiddleware = require("../middleware/auth.js");

const router = express.Router();


router.post("/stream", authMiddleware, askQuestionStream);

module.exports = router;
