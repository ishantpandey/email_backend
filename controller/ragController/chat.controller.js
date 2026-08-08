const {  askRagStream } = require("../../service/ragService/rag.service");
const { HumanMessage, AIMessage } = require("@langchain/core/messages");



const askQuestionStream = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({
        message: "Valid question is required",
      });
    }

    // Generate sessionId from userId
    const session = req.user?.id;

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in nginx

    // Get the stream
    const { stream, documents, chatHistory, question: userQuestion } = await askRagStream(
      question.trim(),
      session
    );

    // Send sources first
    const sources = documents.map((document) => ({
      sourceType: document.metadata?.sourceType,
      source: document.metadata?.source,
      page: document.metadata?.loc?.pageNumber,
      content: document.pageContent,
    }));

    res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);

    // Accumulate the full answer for saving to history
    let fullAnswer = '';

    // Stream the response
    for await (const chunk of stream) {
      fullAnswer += chunk;
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
    }

    // Save to chat history
    await chatHistory.addMessage(new HumanMessage(userQuestion));
    await chatHistory.addMessage(new AIMessage(fullAnswer));

    // Send completion signal
    res.write(`data: ${JSON.stringify({ type: 'done', sessionId: session })}\n\n`);
    res.end();
  } catch (error) {
    console.error(error);
    
    // Send error through SSE if headers already sent
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    } else {
      return res.status(500).json({
        message: "Question answering failed",
        error: error.message,
      });
    }
  }
};

module.exports = {
  askQuestionStream,
};
