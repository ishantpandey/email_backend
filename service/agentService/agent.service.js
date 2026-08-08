const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { Command } = require("@langchain/langgraph");

const {
  RedisChatMessageHistory,
} = require("@langchain/community/stores/message/ioredis");

const { HumanMessage, AIMessage } = require("@langchain/core/messages");

const llm = require("../../config/gemini");
const { redis } = require("../../config/redis");

const { calculatorTool } = require("../../agent/tools/calculator.tool");

const { ragTool } = require("../../agent/tools/rag.tool");

const { webTool } = require("../../agent/tools/web.tool");

const { emailTool } = require("../../agent/tools/email.tool");

const {
  getMemory,
  updateMemory,
} = require("../../agent/memory/memory.service");

const { initializeCheckpointer } = require("../../agent/config/checkpointer.config");

/*
|--------------------------------------------------------------------------
| Agent
|--------------------------------------------------------------------------
*/

let agent = null;
let checkpointerInstance = null;

const getAgent = async () => {
  if (agent) {
    return agent;
  }

  // Initialize checkpointer first
  checkpointerInstance = await initializeCheckpointer();

  agent = createReactAgent({
    llm,

    tools: [calculatorTool, ragTool, webTool, emailTool],

    checkpointer: checkpointerInstance,

    messageModifier: `
You are an intelligent AI assistant.

You can use multiple tools in a single request.

Available tools:

1. RAG
Use for information from the user's uploaded documents.

2. Web Search
Use for current or latest information.

3. Calculator
Use for mathematical calculations.

4. Email
Use when the user explicitly asks to send information by email.

Email rules:

- If the user provides an email address, send to that address.
- If the user does not provide an email address,
  send to the authenticated user's email.
- Never ask for the user's email when an authenticated
  userEmail is available.

Multi-tool rules:

- You may call multiple tools when necessary.
- The result of one tool can be used as input to another tool.

Example:

User:
"Find today's AI news and email me a summary."

Process:

1. Use web search.
2. Analyze the results.
3. Create a concise summary.
4. Call the email tool.
5. The email tool will request user approval.
`,
  });

  return agent;
};

/*
|--------------------------------------------------------------------------
| Ask Agent
|--------------------------------------------------------------------------
*/

const askAgent = async (
  question,
  sessionId,
  userEmail
) => {
  const agent = await getAgent();
  const memory = await getMemory(sessionId);

  const systemContext = `
Conversation Summary:

${memory.summary || "No summary available."}

----------------------------

User Preferences:

${JSON.stringify(
  memory.preferences || {},
  null,
  2
)}

----------------------------

Use this information whenever relevant.
`;

  const result = await agent.invoke(
    {
      messages: [
        ...memory.recentMessages,

        {
          role: "user",
          content: question,
        },
      ],
    },
    {
      configurable: {
        thread_id: sessionId,
        userEmail,
      },
    }
  );

  /*
   * Check email approval interrupt
   */
  if (result.__interrupt__) {
    const interruptData =
      result.__interrupt__[0]?.value;

    console.log(
      "========== AGENT INTERRUPTED =========="
    );

    console.log(interruptData);

    return {
      type: "approval_required",
      data: interruptData,
    };
  }

  const lastMessage =
    result.messages[
      result.messages.length - 1
    ];

  const answer = lastMessage.content;

  /*
   * Save conversation
   */
  const chatHistory =
    new RedisChatMessageHistory({
      sessionId,
      client: redis,
      sessionTTL: 3600,
    });

  await chatHistory.addMessage(
    new HumanMessage(question)
  );

  await chatHistory.addMessage(
    new AIMessage(answer)
  );

  /*
   * Update long-term memory
   */
  await updateMemory(sessionId);

  return {
    type: "answer",
    answer,
  };
};

/*
|--------------------------------------------------------------------------
| Handle Email Approval
|--------------------------------------------------------------------------
*/

const handleApproval = async (
  sessionId,
  userEmail,
  approved
) => {
  const agent = await getAgent();
  const memory = await getMemory(sessionId);

  // Resume the graph with approval decision using Command
  const result = await agent.invoke(
    new Command({
      resume: { approved },
    }),
    {
      configurable: {
        thread_id: sessionId,
        userEmail,
      },
    }
  );

  // Check if there's another interrupt
  if (result.__interrupt__) {
    const interruptData = result.__interrupt__[0]?.value;
    
    return {
      type: "approval_required",
      data: interruptData,
    };
  }

  const lastMessage = result.messages[result.messages.length - 1];
  const answer = lastMessage.content;

  /*
   * Save conversation
   */
  const chatHistory = new RedisChatMessageHistory({
    sessionId,
    client: redis,
    sessionTTL: 3600,
  });

  await chatHistory.addMessage(new AIMessage(answer));

  /*
   * Update long-term memory
   */
  await updateMemory(sessionId);

  return {
    type: "answer",
    answer,
  };
};

module.exports = {
  askAgent,
  handleApproval,
};
