import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "./supabase-client";

export default defineTool({
  name: "list_liked_products",
  title: "List liked products",
  description: "List products the signed-in user has liked.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(20).describe("Maximum products to return"),
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
      .from("likes")
      .select("id, product_id, created_at, products(id, title, brand_id, price_cents, currency, image_url, external_url)")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    return {
      content: [{ type: "text", text: `Found ${data?.length ?? 0} liked product(s).` }],
      structuredContent: { likes: data ?? [] },
    };
  },
});
