const express = require("express");
const { chat } = require("../controller/ragController/chat.controller");

const router = express.Router();

/**
 * ============================================
 * Chat with RAG
 * ============================================
 *
 * POST /api/chat
 *
 * Body:
 * {
 *   "question": "What is React?"
 * }
 */
router.post("/", chat);

module.exports = router;
