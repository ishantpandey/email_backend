const { handleAskAgent, handleEmailApproval } = require("../controller/agentController/agent.controller");
const express = require("express");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

router.post("/chat", authMiddleware, handleAskAgent);
router.post("/approve", authMiddleware, handleEmailApproval);

module.exports = router;