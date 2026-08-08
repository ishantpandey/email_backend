const { askAgent, handleApproval } = require("../../service/agentService/agent.service");


const handleAskAgent = async (req, res) => {
  try {
    const answer = await askAgent(req.body.question, req.user?.id, req.user?.email);

    res.json({
      answer,
    });
  } catch (error) {
    console.error("❌ Agent controller error:", error);
    res.status(500).json({
      error: "Failed to process agent request",
      message: error.message,
    });
  }
};

const handleEmailApproval = async (req, res) => {
  try {
    const { approved } = req.body;
    const sessionId = req.user?.id;
    const userEmail = req.user?.email;

    if (!sessionId) {
      return res.status(400).json({
        error: "Session ID is required",
      });
    }

    if (typeof approved !== "boolean") {
      return res.status(400).json({
        error: "Approval status (true/false) is required",
      });
    }

    const result = await handleApproval(sessionId, userEmail, approved);

    res.json({
      result,
    });
  } catch (error) {
    console.error("❌ Approval controller error:", error);
    res.status(500).json({
      error: "Failed to process approval",
      message: error.message,
    });
  }
};

module.exports = {
   handleAskAgent,
   handleEmailApproval,
};