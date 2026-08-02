const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const dotenv = require("dotenv");
dotenv.config();
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: `${process.env.GEMINI_API_KEY}`,
  model: `${process.env.GEMINI_EMBEDDING_MODEL}`,
});

module.exports = {
  embeddings,
};
