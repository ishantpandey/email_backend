const express = require("express");

const { askQuestion } = require("../controller/ragController/chat.controller.js");

const router = express.Router();

router.post(
  "/",
  askQuestion
);

module.exports = router;