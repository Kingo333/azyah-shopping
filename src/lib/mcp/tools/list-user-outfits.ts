import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "./supabase-client";

export default defineTool({
  name: "list_user_outfits",
  title: "List user outfits",
  description: "List outfits created by the signed-in user.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(20).describe("Maximum outfits to return"),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }

    const { data, error } = await supabaseForUser(ctx)
      .from("fits")
      .select("id, name, title, occasion, context, image_preview, is_public, created_at")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    return {
      content: [{ type: "text", text: `Found ${data?.length ?? 0} outfit(s).` }],
      structuredContent: { outfits: data ?? [] },
    };
  },
});
