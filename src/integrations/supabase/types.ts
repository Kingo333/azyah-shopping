export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
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
      ai_assets: {
        Row: {
          asset_type: string
          asset_url: string
          created_at: string
          id: string
          job_id: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          asset_type?: string
          asset_url: string
          created_at?: string
          id?: string
          job_id?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          asset_type?: string
          asset_url?: string
          created_at?: string
          id?: string
          job_id?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_tryon_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          credits_used: number | null
          error: Json | null
          id: string
          num_images: number | null
          outfit_image_id: string | null
          person_image_id: string | null
          provider: string
          provider_job_id: string | null
          resolution: string | null
          result_url: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          credits_used?: number | null
          error?: Json | null
          id?: string
          num_images?: number | null
          outfit_image_id?: string | null
          person_image_id?: string | null
          provider?: string
          provider_job_id?: string | null
          resolution?: string | null
          result_url?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          credits_used?: number | null
          error?: Json | null
          id?: string
          num_images?: number | null
          outfit_image_id?: string | null
          person_image_id?: string | null
          provider?: string
          provider_job_id?: string | null
          resolution?: string | null
          result_url?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      beauty_consult_events: {
        Row: {
          event: string
          id: string
          payload: Json | null
          ts: string
          user_id: string
        }
        Insert: {
          event: string
          id?: string
          payload?: Json | null
          ts?: string
          user_id: string
        }
        Update: {
          event?: string
          id?: string
          payload?: Json | null
          ts?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beauty_consult_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      beauty_consults: {
        Row: {
          confidence: number
          created_at: string
          id: string
          lighting_note: string | null
          recommendations: Json
          skin_profile: Json
          sources: Json | null
          user_id: string
        }
        Insert: {
          confidence: number
          created_at?: string
          id?: string
          lighting_note?: string | null
          recommendations: Json
          skin_profile: Json
          sources?: Json | null
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          lighting_note?: string | null
          recommendations?: Json
          skin_profile?: Json
          sources?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beauty_consults_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      beauty_profiles: {
        Row: {
          analysis_summary: string | null
          color_palette: string[] | null
          created_at: string
          face_shape: string | null
          id: string
          selfie_url: string | null
          skin_tone: string | null
          undertone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_summary?: string | null
          color_palette?: string[] | null
          created_at?: string
          face_shape?: string | null
          id?: string
          selfie_url?: string | null
          skin_tone?: string | null
          undertone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_summary?: string | null
          color_palette?: string[] | null
          created_at?: string
          face_shape?: string | null
          id?: string
          selfie_url?: string | null
          skin_tone?: string | null
          undertone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          attrs: Json | null
          brand: string | null
          category: string | null
          closet_id: string
          color: string | null
          currency: string | null
          external_product_id: string | null
          id: string
          image_bg_removed_url: string | null
          image_url: string | null
          price_cents: number | null
          product_id: string
          sort_order: number | null
          title: string | null
        }
        Insert: {
          added_at?: string
          attrs?: Json | null
          brand?: string | null
          category?: string | null
          closet_id: string
          color?: string | null
          currency?: string | null
          external_product_id?: string | null
          id?: string
          image_bg_removed_url?: string | null
          image_url?: string | null
          price_cents?: number | null
          product_id: string
          sort_order?: number | null
          title?: string | null
        }
        Update: {
          added_at?: string
          attrs?: Json | null
          brand?: string | null
          category?: string | null
          closet_id?: string
          color?: string | null
          currency?: string | null
          external_product_id?: string | null
          id?: string
          image_bg_removed_url?: string | null
          image_url?: string | null
          price_cents?: number | null
          product_id?: string
          sort_order?: number | null
          title?: string | null
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
      collab_applications: {
        Row: {
          collab_id: string
          created_at: string | null
          id: string
          note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          shopper_id: string
          social_links: Json | null
          status: Database["public"]["Enums"]["application_status"] | null
        }
        Insert: {
          collab_id: string
          created_at?: string | null
          id?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shopper_id: string
          social_links?: Json | null
          status?: Database["public"]["Enums"]["application_status"] | null
        }
        Update: {
          collab_id?: string
          created_at?: string | null
          id?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shopper_id?: string
          social_links?: Json | null
          status?: Database["public"]["Enums"]["application_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "collab_applications_collab_id_fkey"
            columns: ["collab_id"]
            isOneToOne: false
            referencedRelation: "collaborations"
            referencedColumns: ["id"]
          },
        ]
      }
      collab_status_history: {
        Row: {
          changed_at: string | null
          changed_by: string
          collab_id: string
          id: string
          new_status: Database["public"]["Enums"]["collab_status"]
          old_status: Database["public"]["Enums"]["collab_status"] | null
        }
        Insert: {
          changed_at?: string | null
          changed_by: string
          collab_id: string
          id?: string
          new_status: Database["public"]["Enums"]["collab_status"]
          old_status?: Database["public"]["Enums"]["collab_status"] | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string
          collab_id?: string
          id?: string
          new_status?: Database["public"]["Enums"]["collab_status"]
          old_status?: Database["public"]["Enums"]["collab_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "collab_status_history_collab_id_fkey"
            columns: ["collab_id"]
            isOneToOne: false
            referencedRelation: "collaborations"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborations: {
        Row: {
          amount: number | null
          application_deadline: string | null
          brief: string | null
          comp_type: Database["public"]["Enums"]["collab_comp_type"]
          created_at: string | null
          created_by: string
          currency: string | null
          deliverables: Json | null
          id: string
          max_creators: number | null
          owner_org_id: string
          platforms: string[] | null
          status: Database["public"]["Enums"]["collab_status"] | null
          talking_points: string[] | null
          title: string
          tone: string | null
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          amount?: number | null
          application_deadline?: string | null
          brief?: string | null
          comp_type: Database["public"]["Enums"]["collab_comp_type"]
          created_at?: string | null
          created_by: string
          currency?: string | null
          deliverables?: Json | null
          id?: string
          max_creators?: number | null
          owner_org_id: string
          platforms?: string[] | null
          status?: Database["public"]["Enums"]["collab_status"] | null
          talking_points?: string[] | null
          title: string
          tone?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          amount?: number | null
          application_deadline?: string | null
          brief?: string | null
          comp_type?: Database["public"]["Enums"]["collab_comp_type"]
          created_at?: string | null
          created_by?: string
          currency?: string | null
          deliverables?: Json | null
          id?: string
          max_creators?: number | null
          owner_org_id?: string
          platforms?: string[] | null
          status?: Database["public"]["Enums"]["collab_status"] | null
          talking_points?: string[] | null
          title?: string
          tone?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      crawl_sessions: {
        Row: {
          backoff_until: string | null
          created_at: string | null
          domain: string
          error_details: Json | null
          id: string
          job_id: string | null
          last_request_at: string | null
          rate_limit_hits: number | null
          session_metrics: Json | null
          source_id: string
          status: string | null
          updated_at: string | null
          urls_discovered: number | null
          urls_failed: number | null
          urls_processed: number | null
        }
        Insert: {
          backoff_until?: string | null
          created_at?: string | null
          domain: string
          error_details?: Json | null
          id?: string
          job_id?: string | null
          last_request_at?: string | null
          rate_limit_hits?: number | null
          session_metrics?: Json | null
          source_id: string
          status?: string | null
          updated_at?: string | null
          urls_discovered?: number | null
          urls_failed?: number | null
          urls_processed?: number | null
        }
        Update: {
          backoff_until?: string | null
          created_at?: string | null
          domain?: string
          error_details?: Json | null
          id?: string
          job_id?: string | null
          last_request_at?: string | null
          rate_limit_hits?: number | null
          session_metrics?: Json | null
          source_id?: string
          status?: string | null
          updated_at?: string | null
          urls_discovered?: number | null
          urls_failed?: number | null
          urls_processed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crawl_sessions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crawl_sessions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "import_sources"
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
            foreignKeyName: "events_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_public"
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
            foreignKeyName: "events_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers_public"
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
      image_cache: {
        Row: {
          created_at: string
          dimensions: Json | null
          file_size: number | null
          id: string
          optimized_url: string
          original_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dimensions?: Json | null
          file_size?: number | null
          id?: string
          optimized_url: string
          original_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dimensions?: Json | null
          file_size?: number | null
          id?: string
          optimized_url?: string
          original_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      import_job_status: {
        Row: {
          completed_at: string | null
          config: Json
          created_at: string
          error_message: string | null
          id: string
          job_type: string
          progress: number | null
          result: Json | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          config?: Json
          created_at?: string
          error_message?: string | null
          id?: string
          job_type?: string
          progress?: number | null
          result?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          config?: Json
          created_at?: string
          error_message?: string | null
          id?: string
          job_type?: string
          progress?: number | null
          result?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      import_jobs: {
        Row: {
          created_at: string
          error_log: string | null
          finished_at: string | null
          id: string
          pages_crawled: number | null
          products_extracted: number | null
          products_imported: number | null
          source_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_log?: string | null
          finished_at?: string | null
          id?: string
          pages_crawled?: number | null
          products_extracted?: number | null
          products_imported?: number | null
          source_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error_log?: string | null
          finished_at?: string | null
          id?: string
          pages_crawled?: number | null
          products_extracted?: number | null
          products_imported?: number | null
          source_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "import_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      import_products_staging: {
        Row: {
          created_at: string
          currency: string | null
          description: string | null
          external_url: string
          extracted_data: Json | null
          id: string
          images: Json | null
          job_id: string
          price_cents: number | null
          status: string
          suggested_attributes: Json | null
          suggested_category:
            | Database["public"]["Enums"]["category_type"]
            | null
          suggested_subcategory:
            | Database["public"]["Enums"]["subcategory_type"]
            | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          description?: string | null
          external_url: string
          extracted_data?: Json | null
          id?: string
          images?: Json | null
          job_id: string
          price_cents?: number | null
          status?: string
          suggested_attributes?: Json | null
          suggested_category?:
            | Database["public"]["Enums"]["category_type"]
            | null
          suggested_subcategory?:
            | Database["public"]["Enums"]["subcategory_type"]
            | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          description?: string | null
          external_url?: string
          extracted_data?: Json | null
          id?: string
          images?: Json | null
          job_id?: string
          price_cents?: number | null
          status?: string
          suggested_attributes?: Json | null
          suggested_category?:
            | Database["public"]["Enums"]["category_type"]
            | null
          suggested_subcategory?:
            | Database["public"]["Enums"]["subcategory_type"]
            | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_products_staging_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_sources: {
        Row: {
          consent_given: boolean | null
          crawl_settings: Json | null
          crawl_strategy: string
          created_at: string
          domain: string
          id: string
          last_crawl_at: string | null
          last_robots_check: string | null
          max_concurrent: number | null
          name: string
          notes: string | null
          owner_contact: string | null
          rate_limit_rps: number | null
          respect_robots: boolean | null
          robots_allowed: boolean | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consent_given?: boolean | null
          crawl_settings?: Json | null
          crawl_strategy?: string
          created_at?: string
          domain: string
          id?: string
          last_crawl_at?: string | null
          last_robots_check?: string | null
          max_concurrent?: number | null
          name: string
          notes?: string | null
          owner_contact?: string | null
          rate_limit_rps?: number | null
          respect_robots?: boolean | null
          robots_allowed?: boolean | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consent_given?: boolean | null
          crawl_settings?: Json | null
          crawl_strategy?: string
          created_at?: string
          domain?: string
          id?: string
          last_crawl_at?: string | null
          last_robots_check?: string | null
          max_concurrent?: number | null
          name?: string
          notes?: string | null
          owner_contact?: string | null
          rate_limit_rps?: number | null
          respect_robots?: boolean | null
          robots_allowed?: boolean | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      look_items: {
        Row: {
          closet_item_id: string | null
          created_at: string | null
          id: string
          look_id: string
          product_snapshot: Json | null
          slot: Json
          z_index: number | null
        }
        Insert: {
          closet_item_id?: string | null
          created_at?: string | null
          id?: string
          look_id: string
          product_snapshot?: Json | null
          slot?: Json
          z_index?: number | null
        }
        Update: {
          closet_item_id?: string | null
          created_at?: string | null
          id?: string
          look_id?: string
          product_snapshot?: Json | null
          slot?: Json
          z_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "look_items_closet_item_id_fkey"
            columns: ["closet_item_id"]
            isOneToOne: false
            referencedRelation: "closet_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_items_look_id_fkey"
            columns: ["look_id"]
            isOneToOne: false
            referencedRelation: "looks"
            referencedColumns: ["id"]
          },
        ]
      }
      look_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          template_data: Json
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          template_data?: Json
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          template_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      look_votes: {
        Row: {
          created_at: string | null
          id: string
          look_id: string
          value: number
          voter_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          look_id: string
          value: number
          voter_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          look_id?: string
          value?: number
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "look_votes_look_id_fkey"
            columns: ["look_id"]
            isOneToOne: false
            referencedRelation: "looks"
            referencedColumns: ["id"]
          },
        ]
      }
      looks: {
        Row: {
          canvas: Json
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          mood: string | null
          occasion: string | null
          published_at: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          canvas?: Json
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          mood?: string | null
          occasion?: string | null
          published_at?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          canvas?: Json
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          mood?: string | null
          occasion?: string | null
          published_at?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_fils: number
          cancel_url: string | null
          created_at: string | null
          currency: string | null
          failure_url: string | null
          fee_amount_fils: number | null
          id: string
          latest_error_code: string | null
          latest_error_message: string | null
          operation_id: string
          payment_intent_id: string
          product: string
          provider: string | null
          redirect_url: string | null
          status: string
          success_url: string | null
          tip_amount_fils: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount_fils: number
          cancel_url?: string | null
          created_at?: string | null
          currency?: string | null
          failure_url?: string | null
          fee_amount_fils?: number | null
          id?: string
          latest_error_code?: string | null
          latest_error_message?: string | null
          operation_id: string
          payment_intent_id: string
          product?: string
          provider?: string | null
          redirect_url?: string | null
          status: string
          success_url?: string | null
          tip_amount_fils?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount_fils?: number
          cancel_url?: string | null
          created_at?: string | null
          currency?: string | null
          failure_url?: string | null
          fee_amount_fils?: number | null
          id?: string
          latest_error_code?: string | null
          latest_error_message?: string | null
          operation_id?: string
          payment_intent_id?: string
          product?: string
          provider?: string | null
          redirect_url?: string | null
          status?: string
          success_url?: string | null
          tip_amount_fils?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          image_url: string | null
          is_external: boolean | null
          media_urls: Json | null
          merchant_name: string | null
          min_stock_alert: number | null
          price_cents: number
          price_raw: string | null
          retailer_id: string | null
          seo_description: string | null
          seo_title: string | null
          sku: string
          source: string | null
          source_imported_at: string | null
          source_vendor: string | null
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
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          image_url?: string | null
          is_external?: boolean | null
          media_urls?: Json | null
          merchant_name?: string | null
          min_stock_alert?: number | null
          price_cents: number
          price_raw?: string | null
          retailer_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          sku: string
          source?: string | null
          source_imported_at?: string | null
          source_vendor?: string | null
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
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          image_url?: string | null
          is_external?: boolean | null
          media_urls?: Json | null
          merchant_name?: string | null
          min_stock_alert?: number | null
          price_cents?: number
          price_raw?: string | null
          retailer_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          sku?: string
          source?: string | null
          source_imported_at?: string | null
          source_vendor?: string | null
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
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string | null
          id: string
          is_public: boolean
          name: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string | null
          id: string
          is_public?: boolean
          name?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean
          name?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
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
      robots_cache: {
        Row: {
          allows_crawling: boolean | null
          created_at: string | null
          domain: string
          id: string
          last_fetched: string | null
          robots_content: string | null
          updated_at: string | null
          user_agent_checked: string | null
        }
        Insert: {
          allows_crawling?: boolean | null
          created_at?: string | null
          domain: string
          id?: string
          last_fetched?: string | null
          robots_content?: string | null
          updated_at?: string | null
          user_agent_checked?: string | null
        }
        Update: {
          allows_crawling?: boolean | null
          created_at?: string | null
          domain?: string
          id?: string
          last_fetched?: string | null
          robots_content?: string | null
          updated_at?: string | null
          user_agent_checked?: string | null
        }
        Relationships: []
      }
      role_audit_log: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          new_role: Database["public"]["Enums"]["user_role"]
          old_role: Database["public"]["Enums"]["user_role"] | null
          reason: string | null
          user_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          new_role: Database["public"]["Enums"]["user_role"]
          old_role?: Database["public"]["Enums"]["user_role"] | null
          reason?: string | null
          user_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          new_role?: Database["public"]["Enums"]["user_role"]
          old_role?: Database["public"]["Enums"]["user_role"] | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          accessed_user_id: string | null
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          accessed_user_id?: string | null
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          accessed_user_id?: string | null
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          last_payment_intent_id: string | null
          last_payment_status: string | null
          plan: string
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_payment_intent_id?: string | null
          last_payment_status?: string | null
          plan?: string
          provider?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_payment_intent_id?: string | null
          last_payment_status?: string | null
          plan?: string
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      swipes: {
        Row: {
          action: Database["public"]["Enums"]["swipe_action"]
          confidence_score: number | null
          created_at: string
          id: number
          learning_weight: number | null
          metadata: Json | null
          product_id: string | null
          session_id: string | null
          user_id: string | null
          view_duration_ms: number | null
        }
        Insert: {
          action: Database["public"]["Enums"]["swipe_action"]
          confidence_score?: number | null
          created_at?: string
          id?: number
          learning_weight?: number | null
          metadata?: Json | null
          product_id?: string | null
          session_id?: string | null
          user_id?: string | null
          view_duration_ms?: number | null
        }
        Update: {
          action?: Database["public"]["Enums"]["swipe_action"]
          confidence_score?: number | null
          created_at?: string
          id?: number
          learning_weight?: number | null
          metadata?: Json | null
          product_id?: string | null
          session_id?: string | null
          user_id?: string | null
          view_duration_ms?: number | null
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
      toy_replicas: {
        Row: {
          created_at: string
          error: string | null
          id: string
          result_url: string | null
          source_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          result_url?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          result_url?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tryon_jobs: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          meta: Json
          output_url: string | null
          product_id: string
          status: string
          updated_at: string
          user_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          meta?: Json
          output_url?: string | null
          product_id: string
          status: string
          updated_at?: string
          user_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          meta?: Json
          output_url?: string | null
          product_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tryon_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          created_at: string
          credits_remaining: number
          credits_used_today: number
          id: string
          last_reset_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_remaining?: number
          credits_used_today?: number
          id?: string
          last_reset_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_remaining?: number
          credits_used_today?: number
          id?: string
          last_reset_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          conversation_history: Json | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_activity: string | null
          preferences: Json | null
          session_data: Json | null
          session_expires_at: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          conversation_history?: Json | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_activity?: string | null
          preferences?: Json | null
          session_data?: Json | null
          session_expires_at?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          conversation_history?: Json | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_activity?: string | null
          preferences?: Json | null
          session_data?: Json | null
          session_expires_at?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_taste_profiles: {
        Row: {
          brand_preferences: Json | null
          category_preferences: Json | null
          color_preferences: Json | null
          id: string
          last_updated_at: string | null
          negative_swipes: number | null
          positive_swipes: number | null
          preference_confidence: number | null
          price_preferences: Json | null
          profile_created_at: string | null
          seasonal_patterns: Json | null
          style_preferences: Json | null
          time_patterns: Json | null
          total_swipes: number | null
          user_id: string
        }
        Insert: {
          brand_preferences?: Json | null
          category_preferences?: Json | null
          color_preferences?: Json | null
          id?: string
          last_updated_at?: string | null
          negative_swipes?: number | null
          positive_swipes?: number | null
          preference_confidence?: number | null
          price_preferences?: Json | null
          profile_created_at?: string | null
          seasonal_patterns?: Json | null
          style_preferences?: Json | null
          time_patterns?: Json | null
          total_swipes?: number | null
          user_id: string
        }
        Update: {
          brand_preferences?: Json | null
          category_preferences?: Json | null
          color_preferences?: Json | null
          id?: string
          last_updated_at?: string | null
          negative_swipes?: number | null
          positive_swipes?: number | null
          preference_confidence?: number | null
          price_preferences?: Json | null
          profile_created_at?: string | null
          seasonal_patterns?: Json | null
          style_preferences?: Json | null
          time_patterns?: Json | null
          total_swipes?: number | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          email: string
          id: string
          last_sign_in_at: string | null
          name: string | null
          preferences: Json | null
          provider: string | null
          provider_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          social_links: Json | null
          socials: Json | null
          updated_at: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          email: string
          id?: string
          last_sign_in_at?: string | null
          name?: string | null
          preferences?: Json | null
          provider?: string | null
          provider_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          social_links?: Json | null
          socials?: Json | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          last_sign_in_at?: string | null
          name?: string | null
          preferences?: Json | null
          provider?: string | null
          provider_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          social_links?: Json | null
          socials?: Json | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string | null
          event: string
          id: string
          ip: unknown | null
          pi_id: string
          processed: boolean | null
          provider: string | null
          raw_body: Json
          signature: string
        }
        Insert: {
          created_at?: string | null
          event: string
          id?: string
          ip?: unknown | null
          pi_id: string
          processed?: boolean | null
          provider?: string | null
          raw_body: Json
          signature: string
        }
        Update: {
          created_at?: string | null
          event?: string
          id?: string
          ip?: unknown | null
          pi_id?: string
          processed?: boolean | null
          provider?: string | null
          raw_body?: Json
          signature?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          added_at: string
          id: string
          product_id: string
          sort_order: number | null
          wishlist_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          product_id: string
          sort_order?: number | null
          wishlist_id: string
        }
        Update: {
          added_at?: string
          id?: string
          product_id?: string
          sort_order?: number | null
          wishlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_wishlist_fkey"
            columns: ["wishlist_id"]
            isOneToOne: false
            referencedRelation: "wishlists"
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
      brands_public: {
        Row: {
          bio: string | null
          cover_image_url: string | null
          created_at: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          shipping_regions: string[] | null
          slug: string | null
          socials: Json | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          shipping_regions?: string[] | null
          slug?: string | null
          socials?: Json | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          shipping_regions?: string[] | null
          slug?: string | null
          socials?: Json | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      retailers_public: {
        Row: {
          bio: string | null
          cover_image_url: string | null
          created_at: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          shipping_regions: string[] | null
          slug: string | null
          socials: Json | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          shipping_regions?: string[] | null
          slug?: string | null
          socials?: Json | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          shipping_regions?: string[] | null
          slug?: string | null
          socials?: Json | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_access_payment_data: {
        Args: { payment_id: string }
        Returns: {
          amount_fils: number
          cancel_url: string | null
          created_at: string | null
          currency: string | null
          failure_url: string | null
          fee_amount_fils: number | null
          id: string
          latest_error_code: string | null
          latest_error_message: string | null
          operation_id: string
          payment_intent_id: string
          product: string
          provider: string | null
          redirect_url: string | null
          status: string
          success_url: string | null
          tip_amount_fils: number | null
          updated_at: string | null
          user_id: string | null
        }[]
      }
      admin_access_payment_with_justification: {
        Args: { justification: string; payment_id_param: string }
        Returns: {
          amount_fils: number
          cancel_url: string | null
          created_at: string | null
          currency: string | null
          failure_url: string | null
          fee_amount_fils: number | null
          id: string
          latest_error_code: string | null
          latest_error_message: string | null
          operation_id: string
          payment_intent_id: string
          product: string
          provider: string | null
          redirect_url: string | null
          status: string
          success_url: string | null
          tip_amount_fils: number | null
          updated_at: string | null
          user_id: string | null
        }[]
      }
      admin_access_user_data: {
        Args: { target_user_id: string }
        Returns: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          email: string
          id: string
          last_sign_in_at: string | null
          name: string | null
          preferences: Json | null
          provider: string | null
          provider_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          social_links: Json | null
          socials: Json | null
          updated_at: string
          website: string | null
        }[]
      }
      admin_access_user_profile: {
        Args: { justification: string; target_user_id: string }
        Returns: {
          user_created_at: string
          user_email: string
          user_id: string
          user_name: string
          user_role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      admin_get_subscription_details: {
        Args: { target_user_id: string }
        Returns: {
          created_at: string
          current_period_end: string
          current_period_start: string
          last_payment_status: string
          plan: string
          status: string
          subscription_id: string
          user_email: string
        }[]
      }
      admin_get_user_data: {
        Args: { user_id_param: string }
        Returns: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          email: string
          id: string
          last_sign_in_at: string | null
          name: string | null
          preferences: Json | null
          provider: string | null
          provider_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          social_links: Json | null
          socials: Json | null
          updated_at: string
          website: string | null
        }[]
      }
      admin_get_user_email: {
        Args: { justification: string; target_user_id: string }
        Returns: string
      }
      admin_update_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["user_role"]
          reason?: string
          target_user_id: string
        }
        Returns: boolean
      }
      check_payment_encryption: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_ai_assets: {
        Args: Record<PropertyKey, never>
        Returns: {
          cleanup_summary: string
          deleted_assets_count: number
          deleted_files_count: number
          deleted_jobs_count: number
        }[]
      }
      cleanup_old_events: {
        Args: Record<PropertyKey, never>
        Returns: {
          cleanup_summary: string
          deleted_count: number
        }[]
      }
      create_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      deduct_user_credit: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      embed_query: {
        Args: { query_text: string }
        Returns: number[]
      }
      get_beauty_profile: {
        Args: { target_user_id: string }
        Returns: {
          analysis_summary: string
          color_palette: string[]
          created_at: string
          face_shape: string
          id: string
          selfie_url: string
          skin_tone: string
          undertone: string
          updated_at: string
          user_id: string
        }[]
      }
      get_brand_contact_info: {
        Args: { brand_id_param: string }
        Returns: {
          contact_email: string
          owner_user_id: string
        }[]
      }
      get_brand_safe_data: {
        Args: { brand_id_param: string }
        Returns: {
          bio: string
          cover_image_url: string
          created_at: string
          id: string
          logo_url: string
          name: string
          shipping_regions: string[]
          slug: string
          socials: Json
          updated_at: string
          website: string
        }[]
      }
      get_cleanup_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          assets_eligible_for_cleanup: number
          jobs_eligible_for_cleanup: number
          next_cleanup_estimate: string
          total_assets: number
          total_jobs: number
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_fallback_trending_categories: {
        Args: { limit_count?: number }
        Returns: {
          category_slug: Database["public"]["Enums"]["category_type"]
          product_count: number
          recent_products: Json
          subcategory_slug: Database["public"]["Enums"]["subcategory_type"]
        }[]
      }
      get_my_profile: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_avatar_url: string
          user_bio: string
          user_country: string
          user_created_at: string
          user_id: string
          user_name: string
          user_role: Database["public"]["Enums"]["user_role"]
          user_website: string
        }[]
      }
      get_my_subscription_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          expires_at: string
          is_active: boolean
          plan: string
          status: string
          subscription_id: string
        }[]
      }
      get_personalized_product_scores: {
        Args: { product_ids: string[]; target_user_id: string }
        Returns: {
          brand_score: number
          category_score: number
          personalization_score: number
          price_score: number
          product_id: string
        }[]
      }
      get_public_brands: {
        Args: { limit_param?: number }
        Returns: {
          bio: string
          created_at: string
          id: string
          logo_url: string
          name: string
          slug: string
          updated_at: string
        }[]
      }
      get_public_profile: {
        Args: { profile_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          country: string
          created_at: string
          display_name: string
          user_id: string
          website: string
        }[]
      }
      get_public_retailers: {
        Args: { limit_param?: number }
        Returns: {
          bio: string
          created_at: string
          id: string
          logo_url: string
          name: string
          slug: string
          updated_at: string
        }[]
      }
      get_retailer_contact_info: {
        Args: { retailer_id_param: string }
        Returns: {
          contact_email: string
          owner_user_id: string
        }[]
      }
      get_retailer_safe_data: {
        Args: { retailer_id_param: string }
        Returns: {
          bio: string
          cover_image_url: string
          created_at: string
          id: string
          logo_url: string
          name: string
          shipping_regions: string[]
          slug: string
          socials: Json
          updated_at: string
          website: string
        }[]
      }
      get_safe_user_profile: {
        Args: { target_user_id?: string }
        Returns: {
          user_avatar_url: string
          user_bio: string
          user_country: string
          user_created_at: string
          user_id: string
          user_name: string
          user_role: Database["public"]["Enums"]["user_role"]
          user_website: string
        }[]
      }
      get_similar_products: {
        Args: {
          limit_count?: number
          offset_count?: number
          target_product_id: string
        }
        Returns: {
          brand: Json
          brand_id: string
          category_slug: Database["public"]["Enums"]["category_type"]
          currency: string
          external_url: string
          id: string
          image_url: string
          media_urls: Json
          price_cents: number
          subcategory_slug: Database["public"]["Enums"]["subcategory_type"]
          title: string
        }[]
      }
      get_trending_categories: {
        Args: { days_back?: number; limit_count?: number }
        Returns: {
          category_slug: Database["public"]["Enums"]["category_type"]
          growth_percentage: number
          like_count: number
          recent_products: Json
          subcategory_slug: Database["public"]["Enums"]["subcategory_type"]
          swipe_count: number
        }[]
      }
      get_user_credits: {
        Args: { target_user_id: string }
        Returns: {
          credits_remaining: number
          is_premium: boolean
        }[]
      }
      get_user_email_secure: {
        Args: { target_user_id: string }
        Returns: string
      }
      infer_gender_from_text: {
        Args: { text_input: string }
        Returns: Database["public"]["Enums"]["gender_type"]
      }
      log_admin_access_with_justification: {
        Args: {
          action_type: string
          justification: string
          target_table: string
          target_user_id: string
        }
        Returns: undefined
      }
      log_user_data_access: {
        Args: {
          accessed_user_id: string
          action_type: string
          table_name: string
        }
        Returns: undefined
      }
      log_user_data_access_enhanced: {
        Args: {
          accessed_user_id: string
          action_type: string
          additional_context?: Json
          table_name: string
        }
        Returns: undefined
      }
      tier_from_price_aed: {
        Args: { aed_price: number }
        Returns: string
      }
      upsert_beauty_profile: {
        Args: { profile_updates: Json; target_user_id: string }
        Returns: string
      }
      validate_category_subcategory: {
        Args: {
          cat: Database["public"]["Enums"]["category_type"]
          subcat: Database["public"]["Enums"]["subcategory_type"]
        }
        Returns: boolean
      }
      validate_category_subcategory_gender: {
        Args: {
          cat: Database["public"]["Enums"]["category_type"]
          gend?: Database["public"]["Enums"]["gender_type"]
          subcat: Database["public"]["Enums"]["subcategory_type"]
        }
        Returns: boolean
      }
      validate_event_access: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      validate_payment_access: {
        Args: { payment_id_param: string }
        Returns: boolean
      }
      validate_session_security: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      validate_user_data_access: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      validate_user_profile_access: {
        Args: { target_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      application_status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN"
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
        | "men"
        | "women"
        | "bags"
      collab_comp_type: "PRODUCT_EXCHANGE" | "PRODUCT_AND_PAID"
      collab_status: "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED"
      gender_type: "men" | "women" | "unisex" | "kids"
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
        | "mens clothing"
        | "mens footwear"
        | "mens accessories"
        | "womens clothing"
        | "womens footwear"
        | "womens accessories"
        | "all beauty"
        | "fragrances"
        | "home fragrances"
        | "tools & accessories"
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
      application_status: ["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"],
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
        "men",
        "women",
        "bags",
      ],
      collab_comp_type: ["PRODUCT_EXCHANGE", "PRODUCT_AND_PAID"],
      collab_status: ["DRAFT", "ACTIVE", "PAUSED", "CLOSED"],
      gender_type: ["men", "women", "unisex", "kids"],
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
        "mens clothing",
        "mens footwear",
        "mens accessories",
        "womens clothing",
        "womens footwear",
        "womens accessories",
        "all beauty",
        "fragrances",
        "home fragrances",
        "tools & accessories",
      ],
      swipe_action: ["right", "up", "left"],
      user_role: ["shopper", "brand", "retailer", "admin"],
    },
  },
} as const
