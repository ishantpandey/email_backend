const { createRagChain } = require("./chains/rag.chain");
const { getVectorStore } = require("./vectorStore.service");
const { RedisChatMessageHistory } = require("@langchain/community/stores/message/ioredis");
const { HumanMessage, AIMessage } = require("@langchain/core/messages");
const { redis } = require("../../config/redis");

const askRagStream = async (question, sessionId) => {
    // Initialize chat history for this session
    const chatHistory = new RedisChatMessageHistory({
        sessionId,
        client: redis,
        sessionTTL: 3600, // 1 hour expiry
    });

    // Get previous messages
    const previousMessages = await chatHistory.getMessages();
    const chatHistoryText = previousMessages
        .map(msg => `${msg._getType() === 'human' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');

    // Retrieve documents
    const vectorStore = await getVectorStore();
    const retriever = vectorStore.asRetriever({ k: 5 });
    const documents = await retriever.invoke(question);
    
    // Map documents to context with full content
    const context = documents
        .map((document, index) => {
            return `
Document ${index + 1}

Source Type:
${document.metadata?.sourceType}

Source:
${document.metadata?.source}

Page:
${document.metadata?.loc?.pageNumber || "N/A"}

Content:
${document.pageContent}
`;
        })
        .join("\n\n");

    // Create chain for streaming
    const chain = createRagChain();
    
    // Return a stream generator
    const stream = await chain.stream({
        context,
        chatHistory: chatHistoryText || "No previous conversation.",
        question,
    });

    return {
        stream,
        documents,
        chatHistory,
        question,
    };
};

const askRag = async (question, sessionId) => {
  // Chat History
  const chatHistory = new RedisChatMessageHistory({
    sessionId,
    client: redis,
    sessionTTL: 3600,
  });

  // Previous Messages
  const previousMessages = await chatHistory.getMessages();

  const chatHistoryText = previousMessages
    .map((msg) =>
      `${msg._getType() === "human" ? "User" : "Assistant"}: ${msg.content}`
    )
    .join("\n");

  // Vector Search
  const vectorStore = await getVectorStore();

  const retriever = vectorStore.asRetriever({
    searchType: "mmr",
    k: 5,
  });

  const documents = await retriever.invoke(question);

  // Context
  const context = documents
    .map(
      (document, index) => `
Document ${index + 1}

Source Type:
${document.metadata?.sourceType}

Source:
${document.metadata?.source}

Page:
${document.metadata?.loc?.pageNumber || "N/A"}

Content:
${document.pageContent}
`
    )
    .join("\n\n");

  // LCEL Chain
  const chain = createRagChain();

  // Generate Answer
  const answer = await chain.invoke({
    context,
    chatHistory: chatHistoryText || "No previous conversation.",
    question,
  });

  // Save Conversation
  await chatHistory.addMessage(new HumanMessage(question));
  await chatHistory.addMessage(new AIMessage(answer));

  return {
    answer,
    sources: documents.map((document) => ({
      sourceType: document.metadata?.sourceType,
      source: document.metadata?.source,
      page: document.metadata?.loc?.pageNumber,
      content: document.pageContent,
    })),
  };
};

module.exports = {
    askRagStream,
    askRag,
};