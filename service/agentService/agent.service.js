const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { Command } = require("@langchain/langgraph");

const {
  RedisChatMessageHistory,
} = require("@langchain/community/stores/message/ioredis");

const { HumanMessage, AIMessage } = require("@langchain/core/messages");

const llm = require("../../config/gemini");
const { redis } = require("../../config/redis");

const { calculatorTool } = require("../../agent/tools/calculator.tool");

const {
  createReminderTool,
  listRemindersTool,
  getAllRemindersTool,
  cancelReminderTool,
} = require("../../agent/tools/reminder.tool");

const { ragTool } = require("../../agent/tools/rag.tool");

const { webTool } = require("../../agent/tools/web.tool");

const { emailTool } = require("../../agent/tools/email.tool");

const { getUserDetailsTool } = require("../../agent/tools/user.tool");

const {
  getMemory,
  updateMemory,
} = require("../../agent/memory/memory.service");

// const {
//   initializeCheckpointer,
// } = require("../../agent/config/checkpointer.config");

/*
|--------------------------------------------------------------------------
| Agent
|--------------------------------------------------------------------------
*/

let agent = null;
// let checkpointerInstance = null;

const getAgent = async () => {
  if (agent) {
    return agent;
  }

  console.log("🔄 Initializing AI Agent...");

  /*
   * Initialize checkpointer
   */

  // checkpointerInstance =
  //   await initializeCheckpointer();

  // if (!checkpointerInstance) {
  //   throw new Error(
  //     "Checkpointer initialization failed"
  //   );
  // }

  /*
   * Create Agent
   */

  agent = createReactAgent({
    llm,

    tools: [
      calculatorTool,
      ragTool,
      webTool,
      emailTool,
      getUserDetailsTool,

      createReminderTool,
      listRemindersTool,
      getAllRemindersTool,
      cancelReminderTool,
    ],

    // checkpointer:
    //   checkpointerInstance,

    messageModifier: `
You are an intelligent AI assistant.

You can use multiple tools in a single request.

Available tools:

1. RAG
   Use RAG for information from the user's uploaded
   documents.

2. Web Search
   Use web search for current or latest information.

3. Calculator
   Use calculator for mathematical calculations.

4. Email
   Use email when the user explicitly asks to
   send information by email.

5. Reminder
   Use reminder tools when the user explicitly asks
   to create, view, or cancel reminders.

6. User Details
   Use get_user_details to fetch user information by session ID.
   If no session ID is provided, it fetches the current authenticated user's details.

Email rules:

- If the user provides an email address,
  send to that address.

- If the user does not provide an email address,
  send to the authenticated user's email.

- Never ask for the user's email when authenticated
  userEmail is available.

Reminder rules:

- If the user asks to create a reminder, use create_reminder.

- For relative reminders, ALWAYS use delayMinutes.

- **IMPORTANT**: Users provide times in Indian Standard Time (IST, UTC+5:30).
  When users say "2:36 PM today" or "tomorrow at 10 AM", they mean IST times.
  
- **CRITICAL - TIME CONVERSION**: You MUST convert IST times to UTC before 
  passing to the tool:
  * IST is UTC+5:30 (5 hours 30 minutes ahead of UTC)
  * To convert IST to UTC: subtract 5 hours and 30 minutes
  * Always provide the UTC time with 'Z' suffix in ISO format
  * Current IST time is provided in each message: [CURRENT TIME IN IST: ...]
  * Use this exact datetime to calculate "today", "tomorrow", etc.

Examples:

"Remind me in 5 minutes"
→ delayMinutes = 5

"Remind me in 2 hours"
→ delayMinutes = 120

"Remind me at 2:36 PM today" (User means 2:36 PM IST)
→ Check [CURRENT TIME IN IST: 2026-08-21T12:00:00]
→ Extract today's date: 2026-08-21
→ Create IST time: 2026-08-21T14:36:00
→ Convert to UTC: subtract 5:30 → 2026-08-21T09:06:00
→ Pass to tool: "2026-08-21T09:06:00Z"

"Remind me tomorrow at 10 AM" (User means 10 AM IST)
→ Check [CURRENT TIME IN IST: 2026-08-21T12:00:00]
→ Tomorrow = 2026-08-22
→ Create IST time: 2026-08-22T10:00:00
→ Convert to UTC: subtract 5:30 → 2026-08-22T04:30:00
→ Pass to tool: "2026-08-22T04:30:00Z"

- Do NOT calculate the current datetime for relative reminders.

- The application calculates the exact future datetime.

- Use remindAt only for specific date/time requests.

- When using remindAt, ALWAYS convert IST to UTC and add 'Z' suffix.

- Never invent userId.

- The authenticated userId is provided through
  tool configuration.

Examples:

User:
"Remind me in 1 minute to test my reminder."

Process:

1. Determine the exact future datetime.
2. Call create_reminder.
3. Return the created reminder details.

User:
"What reminders do I have?"

Process:

1. Call list_reminders.
2. Present the reminders clearly.

User:
"Cancel my reminder."

Process:

1. Identify the reminder from conversation context
   or list_reminders.
2. Call cancel_reminder.

Multi-tool rules:

- You may call multiple tools when necessary.
- The result of one tool can be used as input
  for another tool.

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

  console.log("✅ AI Agent initialized");

  return agent;
};

/*
|--------------------------------------------------------------------------
| Ask Agent
|--------------------------------------------------------------------------
*/

const askAgent = async (question, sessionId, userEmail) => {
  try {
    /*
     * Get Agent
     */

    const agent = await getAgent();

    /*
     * Get Long-Term Memory
     */

    const memory = await getMemory(sessionId);

    /*
     * Get Current IST Time
     */

    const now = new Date();
    // Convert to IST by adding 5:30 offset
    const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const istString = istTime.toISOString().replace("Z", "").slice(0, 19);
    const currentTimeContext = `[CURRENT TIME IN IST: ${istString} (Asia/Kolkata, UTC+5:30)]`;

    /*
     * Invoke Agent
     */

    const result = await agent.invoke(
      {
        messages: [
          ...memory.recentMessages,

          {
            role: "user",
            content: `${currentTimeContext}\n\n${question}`,
          },
        ],
      },

      {
        configurable: {
          thread_id: sessionId,

          userEmail: userEmail,

          userId: sessionId,
        },
      },
    );

    /*
     * Check Interrupt
     */

    if (result.__interrupt__) {
      const interruptData = result.__interrupt__[0]?.value;

      console.log("========== AGENT INTERRUPTED ==========");

      console.log(interruptData);

      return {
        type: "approval_required",

        data: interruptData,
      };
    }

    /*
     * Get Last Message
     */

    const lastMessage = result.messages[result.messages.length - 1];

    const answer = lastMessage.content;

    /*
     * Save Conversation
     */

    const chatHistory = new RedisChatMessageHistory({
      sessionId,

      client: redis,

      sessionTTL: 3600,
    });

    await chatHistory.addMessage(new HumanMessage(question));

    await chatHistory.addMessage(new AIMessage(answer));

    /*
     * Update Long-Term Memory
     */

    await updateMemory(sessionId);

    return {
      type: "answer",

      answer,
    };
  } catch (error) {
    console.error("❌ Agent Error:", error);

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| Handle Approval
|--------------------------------------------------------------------------
*/

const handleApproval = async (sessionId, userEmail, userId, approved) => {
  try {
    /*
     * Get Agent
     */

    const agent = await getAgent();

    /*
     * Resume Graph
     */

    const result = await agent.invoke(
      new Command({
        resume: {
          approved,
        },
      }),

      {
        configurable: {
          thread_id: sessionId,

          userEmail: userEmail,

          userId: sessionId,
        },
      },
    );

    /*
     * Check Another Interrupt
     */

    if (result.__interrupt__) {
      const interruptData = result.__interrupt__[0]?.value;

      return {
        type: "approval_required",

        data: interruptData,
      };
    }

    /*
     * Get Last Message
     */

    const lastMessage = result.messages[result.messages.length - 1];

    const answer = lastMessage.content;

    /*
     * Save AI Response
     */

    const chatHistory = new RedisChatMessageHistory({
      sessionId,

      client: redis,

      sessionTTL: 3600,
    });

    await chatHistory.addMessage(new AIMessage(answer));

    /*
     * Update Memory
     */

    await updateMemory(sessionId);

    return {
      type: "answer",

      answer,
    };
  } catch (error) {
    console.error("❌ Approval Error:", error);

    throw error;
  }
};

module.exports = {
  askAgent,
  handleApproval,
};
