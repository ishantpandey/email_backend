const axios = require("axios");
const { tool } = require("@langchain/core/tools");
const { z } = require("zod");

const webTool = tool(
  async ({ query }) => {
    console.log("========== WEB TOOL CALLED ==========");
    console.log("api key:", process.env.TWILIO_API_KEY);
    try {
      const { data } = await axios.post(
        "https://api.tavily.com/search",
        {
          api_key: process.env.TWILIO_API_KEY,
          query,
          search_depth: "advanced",
          max_results: 5,
          include_answer: true,
          include_raw_content: false,
        }
      );

      return JSON.stringify({
        answer: data.answer,
        results: data.results,
      });
    } catch (error) {
      console.error(error.response?.data || error.message);
      return "Unable to search the web.";
    }
  },
  {
    name: "web_search",
    description: `
Search the internet for recent or real-time information.

Use this tool whenever the user asks about:
- latest news
- current events
- recent releases
- latest versions
- sports
- weather
- stock prices
- cryptocurrency
- anything requiring current information
`,
    schema: z.object({
      query: z.string(),
    }),
  }
);

module.exports = {
  webTool,
};