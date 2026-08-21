const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const { interrupt } = require("@langchain/langgraph");

const queueHelpers = require("../../service/emailService/queueHelpers");

const emailTool = tool(
  async ({ email, subject, message, priority }, config) => {
    console.log("========== EMAIL TOOL CALLED ==========");
    
    const recipientEmail =
      email || config?.configurable?.userEmail;

    if (!recipientEmail) {
      return JSON.stringify({
        success: false,
        message: "Recipient email is required.",
      });
    }

    // Request approval - this will throw GraphInterrupt and pause execution
    // When resumed, it will return the approval value
    // const approval = interrupt({
    //   type: "email_approval",
    //   message: "Do you want me to send this email?",
    //   email: recipientEmail,
    //   subject,
    //   message,
    //   priority,
    // });

    // // This code runs after the graph is resumed
    // console.log("========== EMAIL APPROVAL RESPONSE ==========");
    // console.log(approval);

    // Check if user approved
    // if (!approval?.approved) {
    //   return JSON.stringify({
    //     success: false,
    //     message: "Email sending cancelled by user.",
    //   });
    // }

    // User approved, send the email
    try {
      const job = await queueHelpers.addCustomEmail(
        recipientEmail,
        "AI Assistant",
        subject,
        message,
        {
          priority,
        }
      );

      return JSON.stringify({
        success: true,
        message: `Email queued successfully for ${recipientEmail}`,
        jobId: job.id,
      });
    } catch (error) {
      console.error("❌ Agent email tool error:", error);

      return JSON.stringify({
        success: false,
        message: error.message,
      });
    }
  },
  {
    name: "send_email",

    description: `
Send an email.

If the user provides an email address,
send it to that address.

If the user does not provide an email address,
send it to the authenticated user's email.

Use this tool only when the user explicitly
asks to send an email.
`,

    schema: z.object({
      email: z
        .string()
        .email()
        .optional()
        .describe("Recipient email address"),

      subject: z
        .string()
        .describe("Email subject"),

      message: z
        .string()
        .describe("Complete email message"),

      priority: z
        .enum(["low", "normal", "high"])
        .default("normal")
        .describe("Email priority"),
    }),
  }
);

module.exports = {
  emailTool,
};