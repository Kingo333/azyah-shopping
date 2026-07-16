import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "./supabase-client";

export default defineTool({
  name: "add_wardrobe_item",
  title: "Add wardrobe item",
  description: "Add a clothing item to the signed-in user's wardrobe by image URL and category.",
  inputSchema: {
    image_url: z.string().url().describe("Public URL of the clothing item image"),
    category: z.string().min(1).describe("Clothing category, e.g. tops, bottoms, dresses, shoes"),
    name: z.string().optional().describe("Optional display name for the item"),
    brand: z.string().optional().describe("Optional brand name"),
    color: z.string().optional().describe("Optional color"),
  },
  annotations: {
    readOnlyHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async ({ image_url, category, name, brand, color }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }

    const { data, error } = await supabaseForUser(ctx)
      .from("wardrobe_items")
      .insert({
        user_id: ctx.getUserId(),
        image_url,
        category,
        name: name ?? null,
        brand: brand ?? null,
        color: color ?? null,
      })
      .select("id, name, category, brand, color, image_url, created_at")
      .single();

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    return {
      content: [{ type: "text", text: "Wardrobe item added." }],
      structuredContent: { item: data },
    };
  },
});
