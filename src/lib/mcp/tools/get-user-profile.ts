import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "./supabase-client";

export default defineTool({
  name: "get_user_profile",
  title: "Get user profile",
  description: "Return the signed-in user's public profile metadata.",
  inputSchema: {},
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }

    const userId = ctx.getUserId();
    const { data, error } = await supabaseForUser(ctx)
      .from("public_profiles")
      .select("id, name, username, avatar_url, bio, country, role, is_public, website")
      .eq("id", userId)
      .single();

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    return {
      content: [{ type: "text", text: "User profile loaded." }],
      structuredContent: { profile: data },
    };
  },
});
