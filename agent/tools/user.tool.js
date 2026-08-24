const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const User = require("../../model/user");

const getUserDetailsTool = tool(
  async ({ sessionId }, config) => {
    console.log("========== GET USER DETAILS TOOL CALLED ==========");
    
    // Use provided sessionId or get from config
    const userId = sessionId || config?.configurable?.userId;

    if (!userId) {
      return JSON.stringify({
        success: false,
        message: "Session ID (user ID) is required.",
      });
    }

    try {
      // Fetch user from database
      const user = await User.findById(userId).select("-password -emailVerificationToken -resetPasswordToken");

      if (!user) {
        return JSON.stringify({
          success: false,
          message: "User not found with the provided session ID.",
        });
      }

      // Return user details
      return JSON.stringify({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          authProvider: user.authProvider,
          profileImage: user.profileImage,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      console.error("❌ Error fetching user details:", error);
      return JSON.stringify({
        success: false,
        message: "Failed to fetch user details.",
        error: error.message,
      });
    }
  },
  {
    name: "get_user_details",
    description: `Fetches user details by session ID (user ID). 
    Returns user information including name, email, auth provider, profile image, verification status, and timestamps.
    If no session ID is provided, it will use the current user's session ID from the configuration.`,
    schema: z.object({
      sessionId: z
        .string()
        .optional()
        .describe("The session ID (user ID) to fetch details for. Optional if using current user's session."),
    }),
  }
);

module.exports = {
  getUserDetailsTool,
};
