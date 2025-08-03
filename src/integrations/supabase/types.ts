export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      brands: {
        Row: {
          bio: string | null
          contact_email: string | null
          cover_image_url: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_user_id: string | null
          shipping_regions: string[] | null
          slug: string
          socials: Json | null
          updated_at: string
          website: string | null
        }
        Insert: {
          bio?: string | null
          contact_email?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_user_id?: string | null
          shipping_regions?: string[] | null
          slug: string
          socials?: Json | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          bio?: string | null
          contact_email?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_user_id?: string | null
          shipping_regions?: string[] | null
          slug?: string
          socials?: Json | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ar_mesh_url: string | null
          attributes: Json | null
          brand_id: string | null
          category_slug: string
          compare_at_price_cents: number | null
          created_at: string
          currency: string | null
          description: string | null
          dimensions: Json | null
          id: string
          media_urls: Json | null
          min_stock_alert: number | null
          price_cents: number
          retailer_id: string | null
          seo_description: string | null
          seo_title: string | null
          sku: string
          status: Database["public"]["Enums"]["product_status"] | null
          stock_qty: number | null
          subcategory_slug: string | null
          tags: string[] | null
          title: string
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          ar_mesh_url?: string | null
          attributes?: Json | null
          brand_id?: string | null
          category_slug: string
          compare_at_price_cents?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          dimensions?: Json | null
          id?: string
          media_urls?: Json | null
          min_stock_alert?: number | null
          price_cents: number
          retailer_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          sku: string
          status?: Database["public"]["Enums"]["product_status"] | null
          stock_qty?: number | null
          subcategory_slug?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          ar_mesh_url?: string | null
          attributes?: Json | null
          brand_id?: string | null
          category_slug?: string
          compare_at_price_cents?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          dimensions?: Json | null
          id?: string
          media_urls?: Json | null
          min_stock_alert?: number | null
          price_cents?: number
          retailer_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          sku?: string
          status?: Database["public"]["Enums"]["product_status"] | null
          stock_qty?: number | null
          subcategory_slug?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
      }
      retailers: {
        Row: {
          bio: string | null
          contact_email: string | null
          cover_image_url: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_user_id: string | null
          shipping_regions: string[] | null
          slug: string
          socials: Json | null
          updated_at: string
          website: string | null
        }
        Insert: {
          bio?: string | null
          contact_email?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_user_id?: string | null
          shipping_regions?: string[] | null
          slug: string
          socials?: Json | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          bio?: string | null
          contact_email?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_user_id?: string | null
          shipping_regions?: string[] | null
          slug?: string
          socials?: Json | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retailers_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          billing_address: Json | null
          bio: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          phone: string | null
          preferences: Json | null
          role: Database["public"]["Enums"]["user_role"]
          shipping_address: Json | null
          socials: Json | null
          updated_at: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          billing_address?: Json | null
          bio?: string | null
          created_at?: string
          email: string
          id?: string
          name?: string | null
          phone?: string | null
          preferences?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          shipping_address?: Json | null
          socials?: Json | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          billing_address?: Json | null
          bio?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          phone?: string | null
          preferences?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          shipping_address?: Json | null
          socials?: Json | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      order_status:
        | "pending"
        | "confirmed"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "returned"
      product_status: "active" | "inactive" | "archived" | "out_of_stock"
      swipe_action: "right" | "up" | "left"
      user_role: "shopper" | "brand" | "retailer" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      order_status: [
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
      ],
      product_status: ["active", "inactive", "archived", "out_of_stock"],
      swipe_action: ["right", "up", "left"],
      user_role: ["shopper", "brand", "retailer", "admin"],
    },
  },
} as const
