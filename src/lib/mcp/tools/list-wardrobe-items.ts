import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "./supabase-client";

export default defineTool({
  name: "list_wardrobe_items",
  title: "List wardrobe items",
  description: "List the signed-in user's wardrobe clothing items.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(20).describe("Maximum items to return"),
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
      .from("wardrobe_items")
      .select("id, name, category, brand, color, image_url, image_bg_removed_url, tags, created_at")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    return {
      content: [{ type: "text", text: `Found ${data?.length ?? 0} wardrobe item(s).` }],
      structuredContent: { items: data ?? [] },
    };
  },
});
