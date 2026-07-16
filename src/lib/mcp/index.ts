import { auth, defineMcp } from "@lovable.dev/mcp-js";

import listWardrobeItemsTool from "./tools/list-wardrobe-items";
import addWardrobeItemTool from "./tools/add-wardrobe-item";
import listLikedProductsTool from "./tools/list-liked-products";
import listWishlistItemsTool from "./tools/list-wishlist-items";
import listUserOutfitsTool from "./tools/list-user-outfits";
import getUserProfileTool from "./tools/get-user-profile";

// The OAuth issuer MUST be the direct Supabase host. Built from the project
// ref so it survives publish and matches the discovery document's issuer.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "azyah-style-mcp",
  title: "Azyah Style MCP",
  version: "0.1.0",
  instructions:
    "Azyah Style personal fashion assistant. Tools let a signed-in user inspect and manage their wardrobe items, liked products, wishlist, outfits, and public profile. All tools operate as the authenticated user via Supabase RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listWardrobeItemsTool,
    addWardrobeItemTool,
    listLikedProductsTool,
    listWishlistItemsTool,
    listUserOutfitsTool,
    getUserProfileTool,
  ],
});
