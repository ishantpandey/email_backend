const { tool } = require("@langchain/core/tools");
const { z } = require("zod");

const calculatorTool = tool(
  async ({ expression }) => {
    console.log("========== CALCULATOR TOOL CALLED ==========");
    try {
      const result = Function(`"use strict"; return (${expression})`)();

      return result.toString();
    } catch (error) {
      return "Invalid mathematical expression.";
    }
  },
  {
    name: "calculator",
    description: "Perform mathematical calculations.",
    schema: z.object({
      expression: z
        .string()
        .describe("Mathematical expression to evaluate."),
    }),
    
  }
);

module.exports = {
  calculatorTool,
};