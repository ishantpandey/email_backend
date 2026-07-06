const { askRag } = require("../../service/ragService/rag.service");


/**
 * =====================================================
 * Chat with RAG
 * POST /api/chat
 * =====================================================
 *
 * Body:
 * {
 *   "question": "What is React?"
 * }
 */
const chat = async (req, res) => {
  try {
    const { question } = req.body;

    // Validate input
    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question is required.",
      });
    }

    // Get answer from RAG
    const result = await askRag(question);

    return res.status(200).json({
      success: true,
      question,
      answer: result.answer,
      sources: result.sources,
    });
  } catch (error) {
    console.error("Chat Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = {
  chat,
};
