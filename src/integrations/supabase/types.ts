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
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
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
      community_flags: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          reporter_id: string
          status: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id: string
          status?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id?: string
          status?: string | null
          target_id?: string
          target_type?: string
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
      event_brand_products: {
        Row: {
          created_at: string
          event_brand_id: string
          id: string
          image_url: string
          product_id: string | null
          sort_order: number | null
          try_on_config: Json | null
          try_on_data: Json | null
          try_on_provider: string | null
          try_on_ready: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_brand_id: string
          id?: string
          image_url: string
          product_id?: string | null
          sort_order?: number | null
          try_on_config?: Json | null
          try_on_data?: Json | null
          try_on_provider?: string | null
          try_on_ready?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_brand_id?: string
          id?: string
          image_url?: string
          product_id?: string | null
          sort_order?: number | null
          try_on_config?: Json | null
          try_on_data?: Json | null
          try_on_provider?: string | null
          try_on_ready?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_brand_products_event_brand_id_fkey"
            columns: ["event_brand_id"]
            isOneToOne: false
            referencedRelation: "event_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_brand_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_brand_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_brands: {
        Row: {
          brand_name: string
          created_at: string
          event_id: string
          id: string
          logo_url: string | null
          updated_at: string
        }
        Insert: {
          brand_name: string
          created_at?: string
          event_id: string
          id?: string
          logo_url?: string | null
          updated_at?: string
        }
        Update: {
          brand_name?: string
          created_at?: string
          event_id?: string
          id?: string
          logo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      event_catalog: {
        Row: {
          added_at: string | null
          event_id: string | null
          featured: boolean | null
          id: string
          product_id: string | null
        }
        Insert: {
          added_at?: string | null
          event_id?: string | null
          featured?: boolean | null
          id?: string
          product_id?: string | null
        }
        Update: {
          added_at?: string | null
          event_id?: string | null
          featured?: boolean | null
          id?: string
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_catalog_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "retail_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_catalog_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_catalog_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          event_id: string | null
          id: string
          joined_at: string | null
          user_id: string | null
        }
        Insert: {
          event_id?: string | null
          id?: string
          joined_at?: string | null
          user_id?: string | null
        }
        Update: {
          event_id?: string | null
          id?: string
          joined_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "retail_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tryon_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          credits_used: number | null
          error: string | null
          event_id: string | null
          id: string
          input_outfit_path: string
          input_person_path: string
          model: string | null
          output_path: string | null
          product_id: string | null
          provider: string
          provider_job_id: string | null
          provider_raw: Json | null
          provider_status: string | null
          started_at: string | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          credits_used?: number | null
          error?: string | null
          event_id?: string | null
          id?: string
          input_outfit_path: string
          input_person_path: string
          model?: string | null
          output_path?: string | null
          product_id?: string | null
          provider?: string
          provider_job_id?: string | null
          provider_raw?: Json | null
          provider_status?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          credits_used?: number | null
          error?: string | null
          event_id?: string | null
          id?: string
          input_outfit_path?: string
          input_person_path?: string
          model?: string | null
          output_path?: string | null
          product_id?: string | null
          provider?: string
          provider_job_id?: string | null
          provider_raw?: Json | null
          provider_status?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_tryon_jobs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "retail_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tryon_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "event_brand_products"
            referencedColumns: ["id"]
          },
        ]
      }
      event_user_photos: {
        Row: {
          bitstudio_image_id: string | null
          created_at: string
          event_id: string
          id: string
          photo_url: string
          updated_at: string
          user_id: string
          vto_features: Json | null
          vto_provider: string | null
          vto_ready: boolean | null
        }
        Insert: {
          bitstudio_image_id?: string | null
          created_at?: string
          event_id: string
          id?: string
          photo_url: string
          updated_at?: string
          user_id: string
          vto_features?: Json | null
          vto_provider?: string | null
          vto_ready?: boolean | null
        }
        Update: {
          bitstudio_image_id?: string | null
          created_at?: string
          event_id?: string
          id?: string
          photo_url?: string
          updated_at?: string
          user_id?: string
          vto_features?: Json | null
          vto_provider?: string | null
          vto_ready?: boolean | null
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
            foreignKeyName: "events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
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
      fit_items: {
        Row: {
          fit_id: string
          transform: Json
          wardrobe_item_id: string
          z_index: number
        }
        Insert: {
          fit_id: string
          transform?: Json
          wardrobe_item_id: string
          z_index: number
        }
        Update: {
          fit_id?: string
          transform?: Json
          wardrobe_item_id?: string
          z_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "fit_items_fit_id_fkey"
            columns: ["fit_id"]
            isOneToOne: false
            referencedRelation: "fits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fit_items_wardrobe_item_id_fkey"
            columns: ["wardrobe_item_id"]
            isOneToOne: false
            referencedRelation: "wardrobe_items"
            referencedColumns: ["id"]
          },
        ]
      }
      fits: {
        Row: {
          canvas_json: Json
          created_at: string
          id: string
          image_preview: string | null
          is_public: boolean | null
          like_count: number
          name: string | null
          occasion: string | null
          outfit_data: Json | null
          render_path: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          canvas_json?: Json
          created_at?: string
          id?: string
          image_preview?: string | null
          is_public?: boolean | null
          like_count?: number
          name?: string | null
          occasion?: string | null
          outfit_data?: Json | null
          render_path?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          canvas_json?: Json
          created_at?: string
          id?: string
          image_preview?: string | null
          is_public?: boolean | null
          like_count?: number
          name?: string | null
          occasion?: string | null
          outfit_data?: Json | null
          render_path?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
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
          is_template: boolean | null
          mood: string | null
          occasion: string | null
          published_at: string | null
          tags: string[] | null
          template_type:
            | Database["public"]["Enums"]["outfit_template_type"]
            | null
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
          is_template?: boolean | null
          mood?: string | null
          occasion?: string | null
          published_at?: string | null
          tags?: string[] | null
          template_type?:
            | Database["public"]["Enums"]["outfit_template_type"]
            | null
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
          is_template?: boolean | null
          mood?: string | null
          occasion?: string | null
          published_at?: string | null
          tags?: string[] | null
          template_type?:
            | Database["public"]["Enums"]["outfit_template_type"]
            | null
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
          {
            foreignKeyName: "post_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
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
      product_outfit_assets: {
        Row: {
          brand_id: string
          created_at: string | null
          created_by: string
          id: string
          outfit_image_url: string
          product_id: string
          updated_at: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string | null
          created_by: string
          id?: string
          outfit_image_url: string
          product_id: string
          updated_at?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string | null
          created_by?: string
          id?: string
          outfit_image_url?: string
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_outfit_assets_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_outfit_assets_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_outfit_assets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_outfit_assets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products_public"
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
          is_event_only: boolean | null
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
          is_event_only?: boolean | null
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
          is_event_only?: boolean | null
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
      retail_events: {
        Row: {
          banner_image_url: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          event_date: string
          id: string
          location: string | null
          name: string
          retailer_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          banner_image_url?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_date: string
          id?: string
          location?: string | null
          name: string
          retailer_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          banner_image_url?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_date?: string
          id?: string
          location?: string | null
          name?: string
          retailer_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retail_events_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retail_events_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers_public"
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
            isOneToOne: true
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
          ai_tryon_limit: number | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          last_payment_intent_id: string | null
          last_payment_status: string | null
          nail_salon_reward_eligible: boolean | null
          plan: string
          provider: string
          status: string
          ugc_collaboration_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_tryon_limit?: number | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_payment_intent_id?: string | null
          last_payment_status?: string | null
          nail_salon_reward_eligible?: boolean | null
          plan?: string
          provider?: string
          status?: string
          ugc_collaboration_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_tryon_limit?: number | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_payment_intent_id?: string | null
          last_payment_status?: string | null
          nail_salon_reward_eligible?: boolean | null
          plan?: string
          provider?: string
          status?: string
          ugc_collaboration_enabled?: boolean | null
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
            foreignKeyName: "swipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
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
          retry_count: number
          source_url: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          result_url?: string | null
          retry_count?: number
          source_url: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          result_url?: string | null
          retry_count?: number
          source_url?: string
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
          {
            foreignKeyName: "tryon_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          bg_removals_quota_monthly: number | null
          bg_removals_used_monthly: number | null
          created_at: string
          credits_remaining: number
          credits_used_today: number
          id: string
          last_reset_date: string
          updated_at: string
          user_id: string
          wardrobe_items_count: number | null
        }
        Insert: {
          bg_removals_quota_monthly?: number | null
          bg_removals_used_monthly?: number | null
          created_at?: string
          credits_remaining?: number
          credits_used_today?: number
          id?: string
          last_reset_date?: string
          updated_at?: string
          user_id: string
          wardrobe_items_count?: number | null
        }
        Update: {
          bg_removals_quota_monthly?: number | null
          bg_removals_used_monthly?: number | null
          created_at?: string
          credits_remaining?: number
          credits_used_today?: number
          id?: string
          last_reset_date?: string
          updated_at?: string
          user_id?: string
          wardrobe_items_count?: number | null
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
          date_of_birth: string | null
          email: string
          gender_selected: string | null
          id: string
          last_sign_in_at: string | null
          main_goals: Json | null
          name: string | null
          onboarding_completed: boolean | null
          preferences: Json | null
          preferences_completed: boolean | null
          provider: string | null
          provider_id: string | null
          referral_source: string | null
          role: Database["public"]["Enums"]["user_role"]
          social_links: Json | null
          socials: Json | null
          updated_at: string
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          gender_selected?: string | null
          id?: string
          last_sign_in_at?: string | null
          main_goals?: Json | null
          name?: string | null
          onboarding_completed?: boolean | null
          preferences?: Json | null
          preferences_completed?: boolean | null
          provider?: string | null
          provider_id?: string | null
          referral_source?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          social_links?: Json | null
          socials?: Json | null
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          gender_selected?: string | null
          id?: string
          last_sign_in_at?: string | null
          main_goals?: Json | null
          name?: string | null
          onboarding_completed?: boolean | null
          preferences?: Json | null
          preferences_completed?: boolean | null
          provider?: string | null
          provider_id?: string | null
          referral_source?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          social_links?: Json | null
          socials?: Json | null
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      voice_sessions: {
        Row: {
          created_at: string
          id: string
          seconds_used: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          seconds_used?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          seconds_used?: number
          user_id?: string
        }
        Relationships: []
      }
      wardrobe_items: {
        Row: {
          attribution_user_id: string | null
          brand: string | null
          category: string
          color: string | null
          created_at: string | null
          id: string
          image_bg_removed_url: string | null
          image_url: string
          is_favorite: boolean | null
          public_reuse_permitted: boolean | null
          season: string | null
          source: string | null
          tags: string[] | null
          thumb_path: string | null
          user_id: string
        }
        Insert: {
          attribution_user_id?: string | null
          brand?: string | null
          category: string
          color?: string | null
          created_at?: string | null
          id?: string
          image_bg_removed_url?: string | null
          image_url: string
          is_favorite?: boolean | null
          public_reuse_permitted?: boolean | null
          season?: string | null
          source?: string | null
          tags?: string[] | null
          thumb_path?: string | null
          user_id: string
        }
        Update: {
          attribution_user_id?: string | null
          brand?: string | null
          category?: string
          color?: string | null
          created_at?: string | null
          id?: string
          image_bg_removed_url?: string | null
          image_url?: string
          is_favorite?: boolean | null
          public_reuse_permitted?: boolean | null
          season?: string | null
          source?: string | null
          tags?: string[] | null
          thumb_path?: string | null
          user_id?: string
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
            foreignKeyName: "wishlist_items_product_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
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
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
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
      categories_public: {
        Row: {
          description: string | null
          image_url: string | null
          name: string | null
          slug: string | null
          sort_order: number | null
        }
        Insert: {
          description?: string | null
          image_url?: string | null
          name?: string | null
          slug?: string | null
          sort_order?: number | null
        }
        Update: {
          description?: string | null
          image_url?: string | null
          name?: string | null
          slug?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      products_public: {
        Row: {
          brand_info: Json | null
          category_slug: Database["public"]["Enums"]["category_type"] | null
          created_at: string | null
          currency: string | null
          external_url: string | null
          id: string | null
          image_url: string | null
          media_urls: Json | null
          price_cents: number | null
          subcategory_slug:
            | Database["public"]["Enums"]["subcategory_type"]
            | null
          title: string | null
        }
        Insert: {
          brand_info?: never
          category_slug?: Database["public"]["Enums"]["category_type"] | null
          created_at?: string | null
          currency?: string | null
          external_url?: string | null
          id?: string | null
          image_url?: string | null
          media_urls?: never
          price_cents?: number | null
          subcategory_slug?:
            | Database["public"]["Enums"]["subcategory_type"]
            | null
          title?: string | null
        }
        Update: {
          brand_info?: never
          category_slug?: Database["public"]["Enums"]["category_type"] | null
          created_at?: string | null
          currency?: string | null
          external_url?: string | null
          id?: string | null
          image_url?: string | null
          media_urls?: never
          price_cents?: number | null
          subcategory_slug?:
            | Database["public"]["Enums"]["subcategory_type"]
            | null
          title?: string | null
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
      __is_read_only_tx: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
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
      admin_access_payment_secure: {
        Args:
          | {
              justification: string
              operation_type?: string
              payment_id_param: string
            }
          | { justification: string; target_payment_id: string }
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
      admin_access_payment_with_enhanced_security: {
        Args: {
          justification: string
          operation_type?: string
          payment_id_param: string
        }
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
          date_of_birth: string | null
          email: string
          gender_selected: string | null
          id: string
          last_sign_in_at: string | null
          main_goals: Json | null
          name: string | null
          onboarding_completed: boolean | null
          preferences: Json | null
          preferences_completed: boolean | null
          provider: string | null
          provider_id: string | null
          referral_source: string | null
          role: Database["public"]["Enums"]["user_role"]
          social_links: Json | null
          socials: Json | null
          updated_at: string
          username: string | null
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
          date_of_birth: string | null
          email: string
          gender_selected: string | null
          id: string
          last_sign_in_at: string | null
          main_goals: Json | null
          name: string | null
          onboarding_completed: boolean | null
          preferences: Json | null
          preferences_completed: boolean | null
          provider: string | null
          provider_id: string | null
          referral_source: string | null
          role: Database["public"]["Enums"]["user_role"]
          social_links: Json | null
          socials: Json | null
          updated_at: string
          username: string | null
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
      batch_track_analytics: {
        Args: { events_data: Json; target_user_id: string }
        Returns: Json
      }
      can_add_wardrobe_item: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      check_payment_encryption: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      check_retailer_data_security: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      check_security_definer_views: {
        Args: Record<PropertyKey, never>
        Returns: Json
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
      cleanup_old_analytics: {
        Args: { days_to_keep?: number }
        Returns: Json
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
      delete_user_completely: {
        Args:
          | { force_orphaned_deletion?: boolean; target_email: string }
          | { target_email: string }
        Returns: Json
      }
      detect_orphaned_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          brand_count: number
          created_at: string
          email: string
          product_count: number
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }[]
      }
      embed_query: {
        Args: { query_text: string }
        Returns: number[]
      }
      ensure_payment_data_encryption: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      ensure_payment_security: {
        Args: Record<PropertyKey, never>
        Returns: string
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
      get_brand_contact_secure: {
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
      get_brand_safe_fields: {
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
      get_minimal_brand_directory: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          logo_url: string
          name: string
          slug: string
        }[]
      }
      get_minimal_category_list: {
        Args: Record<PropertyKey, never>
        Returns: {
          name: string
          slug: string
        }[]
      }
      get_minimal_product_catalog: {
        Args: { limit_param?: number; offset_param?: number }
        Returns: {
          brand_name: string
          category_slug: Database["public"]["Enums"]["category_type"]
          currency: string
          id: string
          image_url: string
          price_cents: number
          title: string
        }[]
      }
      get_minimal_retailer_directory: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          logo_url: string
          name: string
          slug: string
        }[]
      }
      get_my_payment_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          amount_fils: number
          created_at: string
          currency: string
          id: string
          product: string
          status: string
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
      get_product_like_counts: {
        Args: { product_ids?: string[] }
        Returns: {
          like_count: number
          product_id: string
        }[]
      }
      get_products_with_tryon: {
        Args: { limit_count?: number }
        Returns: {
          ar_mesh_url: string
          attributes: Json
          brand_id: string
          category_slug: Database["public"]["Enums"]["category_type"]
          compare_at_price_cents: number
          created_at: string
          currency: string
          description: string
          dimensions: Json
          external_url: string
          gender: Database["public"]["Enums"]["gender_type"]
          has_outfit: boolean
          id: string
          image_url: string
          is_external: boolean
          media_urls: Json
          min_stock_alert: number
          price_cents: number
          retailer_id: string
          seo_description: string
          seo_title: string
          sku: string
          source: string
          source_imported_at: string
          source_vendor: string
          status: string
          stock_qty: number
          subcategory_slug: Database["public"]["Enums"]["subcategory_type"]
          tags: string[]
          title: string
          updated_at: string
          weight_grams: number
        }[]
      }
      get_public_brands: {
        Args: Record<PropertyKey, never> | { limit_param?: number }
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
      get_public_categories: {
        Args: Record<PropertyKey, never>
        Returns: {
          description: string | null
          image_url: string | null
          name: string | null
          slug: string | null
          sort_order: number | null
        }[]
      }
      get_public_products: {
        Args: { p_category?: string; p_limit?: number; p_offset?: number }
        Returns: {
          brand_info: Json | null
          category_slug: Database["public"]["Enums"]["category_type"] | null
          created_at: string | null
          currency: string | null
          external_url: string | null
          id: string | null
          image_url: string | null
          media_urls: Json | null
          price_cents: number | null
          subcategory_slug:
            | Database["public"]["Enums"]["subcategory_type"]
            | null
          title: string | null
        }[]
      }
      get_public_products_secure: {
        Args: {
          category_filter?: string
          limit_param?: number
          offset_param?: number
        }
        Returns: {
          brand: Json
          brand_id: string
          category_slug: string
          created_at: string
          currency: string
          description: string
          external_url: string
          gender: string
          id: string
          image_url: string
          is_external: boolean
          media_urls: Json
          merchant_name: string
          price_cents: number
          retailer: Json
          retailer_id: string
          status: string
          subcategory_slug: string
          tags: string[]
          title: string
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
        Args: Record<PropertyKey, never> | { limit_param?: number }
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
      get_retailer_contact_info_secure: {
        Args: { retailer_id_param: string }
        Returns: {
          contact_email: string
          owner_user_id: string
        }[]
      }
      get_retailer_contact_secure: {
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
      get_retailer_safe_fields: {
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
      get_security_status_summary: {
        Args: Record<PropertyKey, never>
        Returns: Json
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
      get_user_ai_tryon_limit: {
        Args: { target_user_id: string }
        Returns: number
      }
      get_user_analytics_summary: {
        Args: { target_user_id: string }
        Returns: {
          negative_swipes: number
          positive_swipes: number
          preference_confidence: number
          recent_activity: Json
          top_brands: Json
          top_categories: Json
          total_swipes: number
          wishlist_actions: number
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
      get_user_payment_summary: {
        Args: { target_user_id?: string }
        Returns: {
          amount_fils: number
          created_at: string
          currency: string
          id: string
          product: string
          provider: string
          status: string
          updated_at: string
          user_id: string
        }[]
      }
      get_user_profile_secure: {
        Args: { target_user_id: string }
        Returns: {
          avatar_url: string
          country: string
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      get_voice_usage_today: {
        Args: { target_user_id: string }
        Returns: {
          daily_limit: number
          is_premium: boolean
          remaining_seconds: number
          used_today: number
        }[]
      }
      get_wardrobe_limit: {
        Args: { target_user_id: string }
        Returns: number
      }
      infer_gender_from_text: {
        Args: { text_input: string }
        Returns: Database["public"]["Enums"]["gender_type"]
      }
      is_username_available: {
        Args: { check_username: string }
        Returns: boolean
      }
      log_admin_access_with_justification: {
        Args: {
          accessed_user_id: string
          action_type: string
          justification: string
          table_name: string
        }
        Returns: undefined
      }
      log_admin_payment_access: {
        Args: {
          accessed_user_id: string
          action_type: string
          business_justification: string
          target_table: string
        }
        Returns: undefined
      }
      log_payment_access: {
        Args: {
          access_context?: string
          action_type: string
          payment_id: string
        }
        Returns: undefined
      }
      log_sensitive_data_access: {
        Args: {
          access_type: string
          table_name: string
          user_id_accessed: string
        }
        Returns: undefined
      }
      log_user_data_access: {
        Args: {
          accessed_user_id?: string
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
      log_voice_usage: {
        Args: { seconds_used: number; target_user_id: string }
        Returns: boolean
      }
      policy_exists: {
        Args: { _name: string; _table: unknown }
        Returns: boolean
      }
      secure_update_payment_status: {
        Args: {
          new_status: string
          operation_context?: string
          payment_intent_id_param: string
        }
        Returns: boolean
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
      validate_payment_owner_access: {
        Args: { payment_user_id: string }
        Returns: boolean
      }
      validate_payment_security_compliance: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      validate_payment_security_status: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      validate_secure_user_access: {
        Args: { operation_type: string; target_user_id: string }
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
      verify_payment_ownership: {
        Args: { payment_id_param: string; user_id_param?: string }
        Returns: boolean
      }
      verify_payment_ownership_strict: {
        Args: { payment_id_param: string; user_id_param?: string }
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
      outfit_template_type:
        | "casual"
        | "formal"
        | "party"
        | "work"
        | "sporty"
        | "evening"
        | "weekend"
        | "date_night"
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
      outfit_template_type: [
        "casual",
        "formal",
        "party",
        "work",
        "sporty",
        "evening",
        "weekend",
        "date_night",
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
