const express = require("express");
const { chat } = require("../controller/ragController/chat.controller");
const authMiddleware = require("../middleware/auth");

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
router.post("/", authMiddleware, chat);

module.exports = router;
