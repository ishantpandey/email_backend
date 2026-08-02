const { askRag } = require("../../service/ragService/rag.service");


const askQuestion = async (req, res) => {
  try {
    const { question, sessionId } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({
        message: "Valid question is required",
      });
    }

    // Generate sessionId if not provided (use userId from auth middleware)
    const session = sessionId || req.user?.id || `session_${Date.now()}`;

    const result = await askRag(question.trim(), session);

    return res.status(200).json({
      success: true,
      sessionId: session,
      question,
      answer: result.answer,
      sources: result.sources,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Question answering failed",
      error: error.message,
    });
  }
};
module.exports = {
  askQuestion,
};
