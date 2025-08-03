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
      affiliate_links: {
        Row: {
          active: boolean | null
          clicks: number | null
          code: string
          commission_rate: number | null
          created_at: string
          id: string
          orders: number | null
          product_id: string | null
          revenue_cents: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          clicks?: number | null
          code: string
          commission_rate?: number | null
          created_at?: string
          id?: string
          orders?: number | null
          product_id?: string | null
          revenue_cents?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          clicks?: number | null
          code?: string
          commission_rate?: number | null
          created_at?: string
          id?: string
          orders?: number | null
          product_id?: string | null
          revenue_cents?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
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
      cart_items: {
        Row: {
          color_variant: string | null
          created_at: string
          id: string
          product_id: string | null
          quantity: number
          size_variant: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          color_variant?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          quantity?: number
          size_variant?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          color_variant?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          quantity?: number
          size_variant?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
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
      events: {
        Row: {
          brand_id: string | null
          created_at: string
          event_data: Json | null
          event_type: string
          id: number
          ip_address: unknown | null
          product_id: string | null
          referrer: string | null
          retailer_id: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: number
          ip_address?: unknown | null
          product_id?: string | null
          referrer?: string | null
          retailer_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: number
          ip_address?: unknown | null
          product_id?: string | null
          referrer?: string | null
          retailer_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          product_id: string | null
          product_snapshot: Json | null
          quantity: number
          total_price_cents: number
          unit_price_cents: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          product_id?: string | null
          product_snapshot?: Json | null
          quantity?: number
          total_price_cents: number
          unit_price_cents: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          product_id?: string | null
          product_snapshot?: Json | null
          quantity?: number
          total_price_cents?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          created_at: string
          currency: string | null
          id: string
          notes: string | null
          order_number: string
          payment_method: Json | null
          shipping_address: Json | null
          shipping_cents: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal_cents: number
          tax_cents: number | null
          total_cents: number
          tracking_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          billing_address?: Json | null
          created_at?: string
          currency?: string | null
          id?: string
          notes?: string | null
          order_number: string
          payment_method?: Json | null
          shipping_address?: Json | null
          shipping_cents?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal_cents?: number
          tax_cents?: number | null
          total_cents?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          billing_address?: Json | null
          created_at?: string
          currency?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: Json | null
          shipping_address?: Json | null
          shipping_cents?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal_cents?: number
          tax_cents?: number | null
          total_cents?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      swipes: {
        Row: {
          action: Database["public"]["Enums"]["swipe_action"]
          created_at: string
          id: number
          product_id: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["swipe_action"]
          created_at?: string
          id?: number
          product_id?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["swipe_action"]
          created_at?: string
          id?: number
          product_id?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "swipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swipes_user_id_fkey"
            columns: ["user_id"]
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
      wishlist_items: {
        Row: {
          added_at: string
          id: string
          product_id: string | null
          sort_order: number | null
          wishlist_id: string | null
        }
        Insert: {
          added_at?: string
          id?: string
          product_id?: string | null
          sort_order?: number | null
          wishlist_id?: string | null
        }
        Update: {
          added_at?: string
          id?: string
          product_id?: string | null
          sort_order?: number | null
          wishlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_wishlist_id_fkey"
            columns: ["wishlist_id"]
            isOneToOne: false
            referencedRelation: "wishlists"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          sort_order: number | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          sort_order?: number | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          sort_order?: number | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
