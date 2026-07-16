import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "./supabase-client";

export default defineTool({
  name: "list_wishlist_items",
  title: "List wishlist items",
  description: "List products the signed-in user has added to their wishlist.",
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

    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    // Resolve the user's wishlist
    const { data: wishlist, error: wishlistError } = await supabase
      .from("wishlists")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (wishlistError) {
      return { content: [{ type: "text", text: wishlistError.message }], isError: true };
    }

    const { data, error } = await supabase
      .from("wishlist_items")
      .select("id, added_at, products(id, title, brand_id, price_cents, currency, image_url, external_url)")
      .eq("wishlist_id", wishlist.id)
      .order("added_at", { ascending: false })
      .limit(limit);

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    return {
      content: [{ type: "text", text: `Found ${data?.length ?? 0} wishlist item(s).` }],
      structuredContent: { items: data ?? [] },
    };
  },
});
