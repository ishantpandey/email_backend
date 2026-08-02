const { askRag } = require("../../service/ragService/rag.service");


const askQuestion = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({
        message: "Valid question is required",
      });
    }

    const result = await askRag(question.trim());

        return res.status(200).json({
      success: true,
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
