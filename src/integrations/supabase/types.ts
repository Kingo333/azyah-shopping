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
          affiliate_code: string | null
          affiliate_url: string
          brand_name: string
          clicks: number | null
          commission_rate: number | null
          created_at: string
          description: string | null
          expiry_date: string | null
          id: string
          is_public: boolean | null
          orders: number | null
          revenue_cents: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          affiliate_code?: string | null
          affiliate_url: string
          brand_name: string
          clicks?: number | null
          commission_rate?: number | null
          created_at?: string
          description?: string | null
          expiry_date?: string | null
          id?: string
          is_public?: boolean | null
          orders?: number | null
          revenue_cents?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          affiliate_code?: string | null
          affiliate_url?: string
          brand_name?: string
          clicks?: number | null
          commission_rate?: number | null
          created_at?: string
          description?: string | null
          expiry_date?: string | null
          id?: string
          is_public?: boolean | null
          orders?: number | null
          revenue_cents?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
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
      closet_items: {
        Row: {
          added_at: string
          closet_id: string
          id: string
          product_id: string
          sort_order: number | null
        }
        Insert: {
          added_at?: string
          closet_id: string
          id?: string
          product_id: string
          sort_order?: number | null
        }
        Update: {
          added_at?: string
          closet_id?: string
          id?: string
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "closet_items_closet_id_fkey"
            columns: ["closet_id"]
            isOneToOne: false
            referencedRelation: "closets"
            referencedColumns: ["id"]
          },
        ]
      }
      closet_ratings: {
        Row: {
          closet_id: string
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          closet_id: string
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          closet_id?: string
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "closet_ratings_closet_id_fkey"
            columns: ["closet_id"]
            isOneToOne: false
            referencedRelation: "closets"
            referencedColumns: ["id"]
          },
        ]
      }
      closets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      follows: {
        Row: {
          created_at: string | null
          follower_id: string | null
          following_id: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id?: string | null
          following_id?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string | null
          following_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: []
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
      post_images: {
        Row: {
          id: string
          image_url: string
          post_id: string | null
          sort_order: number | null
        }
        Insert: {
          id?: string
          image_url: string
          post_id?: string | null
          sort_order?: number | null
        }
        Update: {
          id?: string
          image_url?: string
          post_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_images_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_products: {
        Row: {
          id: string
          post_id: string | null
          product_id: string | null
        }
        Insert: {
          id?: string
          post_id?: string | null
          product_id?: string | null
        }
        Update: {
          id?: string
          post_id?: string | null
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_products_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
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
          category_slug: Database["public"]["Enums"]["category_type"]
          compare_at_price_cents: number | null
          created_at: string
          currency: string | null
          description: string | null
          dimensions: Json | null
          external_url: string | null
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
          subcategory_slug:
            | Database["public"]["Enums"]["subcategory_type"]
            | null
          tags: string[] | null
          title: string
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          ar_mesh_url?: string | null
          attributes?: Json | null
          brand_id?: string | null
          category_slug: Database["public"]["Enums"]["category_type"]
          compare_at_price_cents?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          dimensions?: Json | null
          external_url?: string | null
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
          subcategory_slug?:
            | Database["public"]["Enums"]["subcategory_type"]
            | null
          tags?: string[] | null
          title: string
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          ar_mesh_url?: string | null
          attributes?: Json | null
          brand_id?: string | null
          category_slug?: Database["public"]["Enums"]["category_type"]
          compare_at_price_cents?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          dimensions?: Json | null
          external_url?: string | null
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
          subcategory_slug?:
            | Database["public"]["Enums"]["subcategory_type"]
            | null
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
          country: string | null
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
          country?: string | null
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
          country?: string | null
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
      create_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      validate_category_subcategory: {
        Args: {
          cat: Database["public"]["Enums"]["category_type"]
          subcat: Database["public"]["Enums"]["subcategory_type"]
        }
        Returns: boolean
      }
    }
    Enums: {
      category_type:
        | "clothing"
        | "footwear"
        | "accessories"
        | "jewelry"
        | "beauty"
        | "modestwear"
        | "kids"
        | "fragrance"
        | "home"
        | "giftcards"
      order_status:
        | "pending"
        | "confirmed"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "returned"
      product_status:
        | "active"
        | "inactive"
        | "archived"
        | "out_of_stock"
        | "draft"
        | "sold_out"
      subcategory_type:
        | "dresses"
        | "abayas"
        | "tops"
        | "blouses"
        | "shirts"
        | "t-shirts"
        | "sweaters"
        | "jackets"
        | "coats"
        | "blazers"
        | "cardigans"
        | "trousers"
        | "jeans"
        | "skirts"
        | "shorts"
        | "activewear"
        | "loungewear"
        | "sleepwear"
        | "swimwear"
        | "lingerie"
        | "heels"
        | "flats"
        | "sandals"
        | "sneakers"
        | "boots"
        | "loafers"
        | "slippers"
        | "handbags"
        | "clutches"
        | "totes"
        | "backpacks"
        | "wallets"
        | "belts"
        | "scarves"
        | "hats"
        | "sunglasses"
        | "watches"
        | "jewelry"
        | "necklaces"
        | "earrings"
        | "bracelets"
        | "rings"
        | "anklets"
        | "brooches"
        | "perfume"
        | "eau-de-toilette"
        | "eau-de-parfum"
        | "skincare"
        | "makeup"
        | "nailcare"
        | "haircare"
        | "hijabs"
        | "niqabs"
        | "jilbabs"
        | "kaftans"
        | "baby clothing"
        | "girls clothing"
        | "boys clothing"
        | "kids footwear"
        | "kids accessories"
        | "oriental"
        | "floral"
        | "woody"
        | "citrus"
        | "gourmand"
        | "oud"
        | "scented candles"
        | "diffusers"
        | "room sprays"
        | "fashion books"
        | "digital gift card"
        | "physical voucher"
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
      category_type: [
        "clothing",
        "footwear",
        "accessories",
        "jewelry",
        "beauty",
        "modestwear",
        "kids",
        "fragrance",
        "home",
        "giftcards",
      ],
      order_status: [
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
      ],
      product_status: [
        "active",
        "inactive",
        "archived",
        "out_of_stock",
        "draft",
        "sold_out",
      ],
      subcategory_type: [
        "dresses",
        "abayas",
        "tops",
        "blouses",
        "shirts",
        "t-shirts",
        "sweaters",
        "jackets",
        "coats",
        "blazers",
        "cardigans",
        "trousers",
        "jeans",
        "skirts",
        "shorts",
        "activewear",
        "loungewear",
        "sleepwear",
        "swimwear",
        "lingerie",
        "heels",
        "flats",
        "sandals",
        "sneakers",
        "boots",
        "loafers",
        "slippers",
        "handbags",
        "clutches",
        "totes",
        "backpacks",
        "wallets",
        "belts",
        "scarves",
        "hats",
        "sunglasses",
        "watches",
        "jewelry",
        "necklaces",
        "earrings",
        "bracelets",
        "rings",
        "anklets",
        "brooches",
        "perfume",
        "eau-de-toilette",
        "eau-de-parfum",
        "skincare",
        "makeup",
        "nailcare",
        "haircare",
        "hijabs",
        "niqabs",
        "jilbabs",
        "kaftans",
        "baby clothing",
        "girls clothing",
        "boys clothing",
        "kids footwear",
        "kids accessories",
        "oriental",
        "floral",
        "woody",
        "citrus",
        "gourmand",
        "oud",
        "scented candles",
        "diffusers",
        "room sprays",
        "fashion books",
        "digital gift card",
        "physical voucher",
      ],
      swipe_action: ["right", "up", "left"],
      user_role: ["shopper", "brand", "retailer", "admin"],
    },
  },
} as const
