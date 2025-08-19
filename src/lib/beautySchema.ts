import { z } from "zod";

// Strict Zod schemas for beauty consultation
export const RecItemSchema = z.object({
  name: z.string(),
  brand: z.string().optional(),
  finish: z.enum(["matte", "natural", "glow", "satin", "dewy", "semi-matte"]).optional(),
  why_it_matches: z.string(),
  shade_family: z.string().optional(),
  price_tier: z.enum(["drugstore", "mid", "premium"]).optional(),
  alt_options: z.array(z.string()).optional(),
  price: z.number().optional(),
  currency: z.string().optional(),
  image_url: z.string().optional(),
  url: z.string().optional(),
  availability: z.string().optional(),
  rating: z.number().min(0).max(5).optional()
});

export const SkinProfileSchema = z.object({
  tone_depth: z.enum(["fair", "light", "medium", "tan", "deep"]),
  undertone: z.enum(["cool", "warm", "neutral", "olive"]),
  skin_type: z.enum(["dry", "oily", "combination", "normal", "sensitive"]),
  visible_concerns: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  lighting_note: z.string().optional()
});

export const BeautyConsultationSchema = z.object({
  skin_profile: SkinProfileSchema,
  questions: z.array(z.string()).max(2).optional(),
  recommendations: z.object({
    primer: z.array(RecItemSchema).max(3),
    foundation_concealer: z.array(RecItemSchema).max(3),
    brows_eyeliner_bronzer: z.array(RecItemSchema).max(3),
    shadow_palette: z.array(RecItemSchema).max(3)
  }),
  technique_notes: z.array(z.string()),
  safety_warnings: z.array(z.string()).optional(),
  real_products: z.boolean().optional()
});

// JSON Schema for OpenAI Structured Outputs
export const BeautyConsultationJsonSchema = {
  name: "BeautyConsultation",
  schema: {
    type: "object",
    properties: {
      skin_profile: {
        type: "object",
        properties: {
          tone_depth: {
            type: "string",
            enum: ["fair", "light", "medium", "tan", "deep"]
          },
          undertone: {
            type: "string",
            enum: ["cool", "warm", "neutral", "olive"]
          },
          skin_type: {
            type: "string",
            enum: ["dry", "oily", "combination", "normal", "sensitive"]
          },
          visible_concerns: {
            type: "array",
            items: { type: "string" }
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1
          },
          lighting_note: {
            type: "string"
          }
        },
        required: ["tone_depth", "undertone", "skin_type", "visible_concerns", "confidence"],
        additionalProperties: false
      },
      questions: {
        type: "array",
        items: { type: "string" },
        maxItems: 2
      },
      recommendations: {
        type: "object",
        properties: {
          primer: {
            type: "array",
            maxItems: 3,
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                brand: { type: "string" },
                finish: {
                  type: "string",
                  enum: ["matte", "natural", "glow", "satin", "dewy", "semi-matte"]
                },
                why_it_matches: { type: "string" },
                shade_family: { type: "string" },
                price_tier: {
                  type: "string",
                  enum: ["drugstore", "mid", "premium"]
                },
                alt_options: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              required: ["name", "brand", "why_it_matches"],
              additionalProperties: false
            }
          },
          foundation_concealer: {
            type: "array",
            maxItems: 3,
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                brand: { type: "string" },
                finish: {
                  type: "string",
                  enum: ["matte", "natural", "glow", "satin", "dewy", "semi-matte"]
                },
                why_it_matches: { type: "string" },
                shade_family: { type: "string" },
                price_tier: {
                  type: "string",
                  enum: ["drugstore", "mid", "premium"]
                },
                alt_options: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              required: ["name", "brand", "why_it_matches"],
              additionalProperties: false
            }
          },
          brows_eyeliner_bronzer: {
            type: "array",
            maxItems: 3,
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                brand: { type: "string" },
                finish: {
                  type: "string",
                  enum: ["matte", "natural", "glow", "satin", "dewy", "semi-matte"]
                },
                why_it_matches: { type: "string" },
                shade_family: { type: "string" },
                price_tier: {
                  type: "string",
                  enum: ["drugstore", "mid", "premium"]
                },
                alt_options: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              required: ["name", "brand", "why_it_matches"],
              additionalProperties: false
            }
          },
          shadow_palette: {
            type: "array",
            maxItems: 3,
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                brand: { type: "string" },
                finish: {
                  type: "string",
                  enum: ["matte", "natural", "glow", "satin", "dewy", "semi-matte"]
                },
                why_it_matches: { type: "string" },
                shade_family: { type: "string" },
                price_tier: {
                  type: "string",
                  enum: ["drugstore", "mid", "premium"]
                },
                alt_options: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              required: ["name", "brand", "why_it_matches"],
              additionalProperties: false
            }
          }
        },
        required: ["primer", "foundation_concealer", "brows_eyeliner_bronzer", "shadow_palette"],
        additionalProperties: false
      },
      technique_notes: {
        type: "array",
        items: { type: "string" }
      },
      safety_warnings: {
        type: "array",
        items: { type: "string" }
      },
      real_products: {
        type: "boolean"
      }
    },
    required: ["skin_profile", "recommendations", "technique_notes"],
    additionalProperties: false
  },
  strict: true
};

// TypeScript types
export type RecItem = z.infer<typeof RecItemSchema>;
export type SkinProfile = z.infer<typeof SkinProfileSchema>;
export type BeautyConsultation = z.infer<typeof BeautyConsultationSchema>;