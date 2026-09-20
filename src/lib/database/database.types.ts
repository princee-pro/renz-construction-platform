export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          entity_id: string;
          entity_type: string;
          id: number;
          metadata: Json;
          occurred_at: string;
          outcome: string;
          request_id: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          entity_id: string;
          entity_type: string;
          id?: number;
          metadata?: Json;
          occurred_at?: string;
          outcome: string;
          request_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          entity_id?: string;
          entity_type?: string;
          id?: number;
          metadata?: Json;
          occurred_at?: string;
          outcome?: string;
          request_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      brand_media_settings: {
        Row: {
          default_hero_media_id: string | null;
          default_og_media_id: string | null;
          default_share_media_id: string | null;
          document_logo_media_id: string | null;
          favicon_media_id: string | null;
          id: number;
          primary_logo_media_id: string | null;
          reversed_logo_media_id: string | null;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          default_hero_media_id?: string | null;
          default_og_media_id?: string | null;
          default_share_media_id?: string | null;
          document_logo_media_id?: string | null;
          favicon_media_id?: string | null;
          id?: number;
          primary_logo_media_id?: string | null;
          reversed_logo_media_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          default_hero_media_id?: string | null;
          default_og_media_id?: string | null;
          default_share_media_id?: string | null;
          document_logo_media_id?: string | null;
          favicon_media_id?: string | null;
          id?: number;
          primary_logo_media_id?: string | null;
          reversed_logo_media_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "brand_media_settings_default_hero_media_id_fkey";
            columns: ["default_hero_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "brand_media_settings_default_og_media_id_fkey";
            columns: ["default_og_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "brand_media_settings_default_share_media_id_fkey";
            columns: ["default_share_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "brand_media_settings_document_logo_media_id_fkey";
            columns: ["document_logo_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "brand_media_settings_favicon_media_id_fkey";
            columns: ["favicon_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "brand_media_settings_primary_logo_media_id_fkey";
            columns: ["primary_logo_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "brand_media_settings_reversed_logo_media_id_fkey";
            columns: ["reversed_logo_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "brand_media_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      business_hours: {
        Row: {
          closes_at: string | null;
          is_open: boolean;
          opens_at: string | null;
          updated_at: string;
          weekday: number;
        };
        Insert: {
          closes_at?: string | null;
          is_open?: boolean;
          opens_at?: string | null;
          updated_at?: string;
          weekday: number;
        };
        Update: {
          closes_at?: string | null;
          is_open?: boolean;
          opens_at?: string | null;
          updated_at?: string;
          weekday?: number;
        };
        Relationships: [];
      };
      business_location: {
        Row: {
          city: string | null;
          country: string | null;
          directions_url: string | null;
          id: number;
          latitude: number | null;
          longitude: number | null;
          maps_url: string | null;
          postal_code: string | null;
          public_name: string | null;
          publish_location: boolean;
          region: string | null;
          service_area_text: string | null;
          street_address: string | null;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          city?: string | null;
          country?: string | null;
          directions_url?: string | null;
          id?: number;
          latitude?: number | null;
          longitude?: number | null;
          maps_url?: string | null;
          postal_code?: string | null;
          public_name?: string | null;
          publish_location?: boolean;
          region?: string | null;
          service_area_text?: string | null;
          street_address?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          city?: string | null;
          country?: string | null;
          directions_url?: string | null;
          id?: number;
          latitude?: number | null;
          longitude?: number | null;
          maps_url?: string | null;
          postal_code?: string | null;
          public_name?: string | null;
          publish_location?: boolean;
          region?: string | null;
          service_area_text?: string | null;
          street_address?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "business_location_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      business_profile: {
        Row: {
          approach_text: string | null;
          country: string | null;
          created_at: string;
          default_locale: string;
          display_name: string;
          id: number;
          legal_name: string | null;
          mission_text: string | null;
          primary_email: string;
          public_credentials_text: string | null;
          public_description: string | null;
          region: string | null;
          service_area_text: string | null;
          short_name: string;
          tagline: string | null;
          timezone: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
          website_url: string | null;
        };
        Insert: {
          approach_text?: string | null;
          country?: string | null;
          created_at?: string;
          default_locale?: string;
          display_name?: string;
          id?: number;
          legal_name?: string | null;
          mission_text?: string | null;
          primary_email?: string;
          public_credentials_text?: string | null;
          public_description?: string | null;
          region?: string | null;
          service_area_text?: string | null;
          short_name?: string;
          tagline?: string | null;
          timezone?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
          website_url?: string | null;
        };
        Update: {
          approach_text?: string | null;
          country?: string | null;
          created_at?: string;
          default_locale?: string;
          display_name?: string;
          id?: number;
          legal_name?: string | null;
          mission_text?: string | null;
          primary_email?: string;
          public_credentials_text?: string | null;
          public_description?: string | null;
          region?: string | null;
          service_area_text?: string | null;
          short_name?: string;
          tagline?: string | null;
          timezone?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
          website_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "business_profile_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      claim_evidence: {
        Row: {
          claim_id: string;
          evidence_id: string;
          required: boolean;
        };
        Insert: {
          claim_id: string;
          evidence_id: string;
          required?: boolean;
        };
        Update: {
          claim_id?: string;
          evidence_id?: string;
          required?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "claim_evidence_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "material_claims";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "claim_evidence_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "published_project_claims";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "claim_evidence_evidence_id_fkey";
            columns: ["evidence_id"];
            isOneToOne: false;
            referencedRelation: "evidence_records";
            referencedColumns: ["id"];
          },
        ];
      };
      client_notes: {
        Row: {
          archived_at: string | null;
          body: string;
          client_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          archived_at?: string | null;
          body: string;
          client_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          archived_at?: string | null;
          body?: string;
          client_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_notes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_notes_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          address: string | null;
          archived_at: string | null;
          client_tier: string;
          company: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          email_normalized: string | null;
          external_reference: string | null;
          full_name: string;
          id: string;
          phone_display: string | null;
          phone_normalized: string | null;
          referral_source: string | null;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          address?: string | null;
          archived_at?: string | null;
          client_tier?: string;
          company?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          email_normalized?: string | null;
          external_reference?: string | null;
          full_name: string;
          id?: string;
          phone_display?: string | null;
          phone_normalized?: string | null;
          referral_source?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          address?: string | null;
          archived_at?: string | null;
          client_tier?: string;
          company?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          email_normalized?: string | null;
          external_reference?: string | null;
          full_name?: string;
          id?: string;
          phone_display?: string | null;
          phone_normalized?: string | null;
          referral_source?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clients_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_channels: {
        Row: {
          active: boolean;
          calling_enabled: boolean;
          channel_type: string;
          created_at: string;
          id: string;
          is_public: boolean;
          label: string;
          purpose: string | null;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
          value: string;
        };
        Insert: {
          active?: boolean;
          calling_enabled?: boolean;
          channel_type: string;
          created_at?: string;
          id?: string;
          is_public?: boolean;
          label: string;
          purpose?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          value: string;
        };
        Update: {
          active?: boolean;
          calling_enabled?: boolean;
          channel_type?: string;
          created_at?: string;
          id?: string;
          is_public?: boolean;
          label?: string;
          purpose?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contact_channels_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      content_publications: {
        Row: {
          content_type: string;
          created_at: string;
          created_by: string | null;
          id: string;
          is_current: boolean;
          kind: string;
          revision_no: number;
          snapshot: Json;
          summary: string | null;
          target_id: string;
        };
        Insert: {
          content_type: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_current?: boolean;
          kind?: string;
          revision_no: number;
          snapshot: Json;
          summary?: string | null;
          target_id: string;
        };
        Update: {
          content_type?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_current?: boolean;
          kind?: string;
          revision_no?: number;
          snapshot?: Json;
          summary?: string | null;
          target_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_publications_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      content_section_registry: {
        Row: {
          display_name: string;
          enabled: boolean;
          key: string;
          schema_version: number;
          scope: string;
        };
        Insert: {
          display_name: string;
          enabled?: boolean;
          key: string;
          schema_version?: number;
          scope: string;
        };
        Update: {
          display_name?: string;
          enabled?: boolean;
          key?: string;
          schema_version?: number;
          scope?: string;
        };
        Relationships: [];
      };
      contractor_assignment_adjustments: {
        Row: {
          contractor_assignment_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          new_amount: number;
          previous_amount: number | null;
          reason: string;
        };
        Insert: {
          contractor_assignment_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          new_amount: number;
          previous_amount?: number | null;
          reason: string;
        };
        Update: {
          contractor_assignment_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          new_amount?: number;
          previous_amount?: number | null;
          reason?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contractor_assignment_adjustments_contractor_assignment_id_fkey";
            columns: ["contractor_assignment_id"];
            isOneToOne: false;
            referencedRelation: "contractor_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contractor_assignment_adjustments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      contractor_assignments: {
        Row: {
          agreed_amount: number | null;
          archived_at: string | null;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          currency: string | null;
          end_date: string | null;
          id: string;
          operational_project_id: string;
          payment_terms: string | null;
          performance_note: string | null;
          performance_rating: number | null;
          planned_units: number | null;
          rate_amount: number | null;
          rate_type: string | null;
          scope: string;
          specialization: string | null;
          start_date: string | null;
          status: string;
          trade_partner_id: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          agreed_amount?: number | null;
          archived_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string | null;
          end_date?: string | null;
          id?: string;
          operational_project_id: string;
          payment_terms?: string | null;
          performance_note?: string | null;
          performance_rating?: number | null;
          planned_units?: number | null;
          rate_amount?: number | null;
          rate_type?: string | null;
          scope: string;
          specialization?: string | null;
          start_date?: string | null;
          status?: string;
          trade_partner_id: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          agreed_amount?: number | null;
          archived_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string | null;
          end_date?: string | null;
          id?: string;
          operational_project_id?: string;
          payment_terms?: string | null;
          performance_note?: string | null;
          performance_rating?: number | null;
          planned_units?: number | null;
          rate_amount?: number | null;
          rate_type?: string | null;
          scope?: string;
          specialization?: string | null;
          start_date?: string | null;
          status?: string;
          trade_partner_id?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "contractor_assignments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contractor_assignments_operational_project_id_fkey";
            columns: ["operational_project_id"];
            isOneToOne: false;
            referencedRelation: "operational_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contractor_assignments_trade_partner_id_fkey";
            columns: ["trade_partner_id"];
            isOneToOne: false;
            referencedRelation: "trade_partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contractor_assignments_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      contractor_payments: {
        Row: {
          amount: number;
          contractor_assignment_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          note: string | null;
          payment_date: string;
          payment_method: string;
          reference: string | null;
          reversal_reason: string | null;
          reversed_at: string | null;
          reversed_by: string | null;
        };
        Insert: {
          amount: number;
          contractor_assignment_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          note?: string | null;
          payment_date: string;
          payment_method: string;
          reference?: string | null;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
        };
        Update: {
          amount?: number;
          contractor_assignment_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          note?: string | null;
          payment_date?: string;
          payment_method?: string;
          reference?: string | null;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contractor_payments_contractor_assignment_id_fkey";
            columns: ["contractor_assignment_id"];
            isOneToOne: false;
            referencedRelation: "contractor_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contractor_payments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contractor_payments_reversed_by_fkey";
            columns: ["reversed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      credential_claims: {
        Row: {
          claim_id: string;
          credential_id: string;
          required: boolean;
        };
        Insert: {
          claim_id: string;
          credential_id: string;
          required?: boolean;
        };
        Update: {
          claim_id?: string;
          credential_id?: string;
          required?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "credential_claims_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "material_claims";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credential_claims_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "published_project_claims";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credential_claims_credential_id_fkey";
            columns: ["credential_id"];
            isOneToOne: false;
            referencedRelation: "credentials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credential_claims_credential_id_fkey";
            columns: ["credential_id"];
            isOneToOne: false;
            referencedRelation: "published_credentials";
            referencedColumns: ["id"];
          },
        ];
      };
      credential_evidence: {
        Row: {
          credential_id: string;
          evidence_id: string;
          purpose: string | null;
          required: boolean;
        };
        Insert: {
          credential_id: string;
          evidence_id: string;
          purpose?: string | null;
          required?: boolean;
        };
        Update: {
          credential_id?: string;
          evidence_id?: string;
          purpose?: string | null;
          required?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "credential_evidence_credential_id_fkey";
            columns: ["credential_id"];
            isOneToOne: false;
            referencedRelation: "credentials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credential_evidence_credential_id_fkey";
            columns: ["credential_id"];
            isOneToOne: false;
            referencedRelation: "published_credentials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credential_evidence_evidence_id_fkey";
            columns: ["evidence_id"];
            isOneToOne: false;
            referencedRelation: "evidence_records";
            referencedColumns: ["id"];
          },
        ];
      };
      credential_localizations: {
        Row: {
          created_at: string;
          created_by: string | null;
          credential_id: string;
          description: string | null;
          locale: string;
          name: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          credential_id: string;
          description?: string | null;
          locale: string;
          name: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          credential_id?: string;
          description?: string | null;
          locale?: string;
          name?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "credential_localizations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credential_localizations_credential_id_fkey";
            columns: ["credential_id"];
            isOneToOne: false;
            referencedRelation: "credentials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credential_localizations_credential_id_fkey";
            columns: ["credential_id"];
            isOneToOne: false;
            referencedRelation: "published_credentials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credential_localizations_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      credential_verifications: {
        Row: {
          approved_public_wording: string | null;
          created_at: string;
          credential_id: string;
          internal_notes: string | null;
          review_due_at: string | null;
          source_reference: string;
          updated_at: string;
          verification_state: string;
          verified_at: string | null;
          verified_by: string | null;
          version: number;
        };
        Insert: {
          approved_public_wording?: string | null;
          created_at?: string;
          credential_id: string;
          internal_notes?: string | null;
          review_due_at?: string | null;
          source_reference: string;
          updated_at?: string;
          verification_state?: string;
          verified_at?: string | null;
          verified_by?: string | null;
          version?: number;
        };
        Update: {
          approved_public_wording?: string | null;
          created_at?: string;
          credential_id?: string;
          internal_notes?: string | null;
          review_due_at?: string | null;
          source_reference?: string;
          updated_at?: string;
          verification_state?: string;
          verified_at?: string | null;
          verified_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "credential_verifications_credential_id_fkey";
            columns: ["credential_id"];
            isOneToOne: true;
            referencedRelation: "credentials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credential_verifications_credential_id_fkey";
            columns: ["credential_id"];
            isOneToOne: true;
            referencedRelation: "published_credentials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credential_verifications_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      credentials: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          issuer: string | null;
          publication_status: string;
          published_at: string | null;
          reference: string | null;
          review_due_at: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          team_member_id: string | null;
          updated_at: string;
          updated_by: string | null;
          valid_from: string | null;
          valid_to: string | null;
          version: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          issuer?: string | null;
          publication_status?: string;
          published_at?: string | null;
          reference?: string | null;
          review_due_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          team_member_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          valid_from?: string | null;
          valid_to?: string | null;
          version?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          issuer?: string | null;
          publication_status?: string;
          published_at?: string | null;
          reference?: string | null;
          review_due_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          team_member_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          valid_from?: string | null;
          valid_to?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "credentials_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credentials_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credentials_team_member_id_fkey";
            columns: ["team_member_id"];
            isOneToOne: false;
            referencedRelation: "published_team_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credentials_team_member_id_fkey";
            columns: ["team_member_id"];
            isOneToOne: false;
            referencedRelation: "team_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credentials_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      document_defaults: {
        Row: {
          allowed_currencies: string[];
          default_currency: string;
          id: number;
          invoice_due_days: number;
          invoice_payment_terms: string | null;
          invoice_tax_label: string;
          invoice_tax_rate: number;
          po_expected_delivery_days: number;
          po_tax_label: string;
          po_tax_rate: number;
          po_terms: string | null;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          allowed_currencies?: string[];
          default_currency?: string;
          id?: number;
          invoice_due_days?: number;
          invoice_payment_terms?: string | null;
          invoice_tax_label?: string;
          invoice_tax_rate?: number;
          po_expected_delivery_days?: number;
          po_tax_label?: string;
          po_tax_rate?: number;
          po_terms?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          allowed_currencies?: string[];
          default_currency?: string;
          id?: number;
          invoice_due_days?: number;
          invoice_payment_terms?: string | null;
          invoice_tax_label?: string;
          invoice_tax_rate?: number;
          po_expected_delivery_days?: number;
          po_tax_label?: string;
          po_tax_rate?: number;
          po_terms?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "document_defaults_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      evidence_records: {
        Row: {
          approved_public_wording: string | null;
          consent_reference: string | null;
          consent_required: boolean;
          consent_state: string;
          created_at: string;
          created_by: string | null;
          fact_claim: string;
          id: string;
          internal_notes: string | null;
          owner_id: string | null;
          review_due_at: string | null;
          reviewer_id: string | null;
          sensitivity: string;
          source_reference: string;
          source_type: string;
          updated_at: string;
          updated_by: string | null;
          verification_state: string;
          verified_at: string | null;
          version: number;
        };
        Insert: {
          approved_public_wording?: string | null;
          consent_reference?: string | null;
          consent_required?: boolean;
          consent_state?: string;
          created_at?: string;
          created_by?: string | null;
          fact_claim: string;
          id?: string;
          internal_notes?: string | null;
          owner_id?: string | null;
          review_due_at?: string | null;
          reviewer_id?: string | null;
          sensitivity?: string;
          source_reference: string;
          source_type: string;
          updated_at?: string;
          updated_by?: string | null;
          verification_state?: string;
          verified_at?: string | null;
          version?: number;
        };
        Update: {
          approved_public_wording?: string | null;
          consent_reference?: string | null;
          consent_required?: boolean;
          consent_state?: string;
          created_at?: string;
          created_by?: string | null;
          fact_claim?: string;
          id?: string;
          internal_notes?: string | null;
          owner_id?: string | null;
          review_due_at?: string | null;
          reviewer_id?: string | null;
          sensitivity?: string;
          source_reference?: string;
          source_type?: string;
          updated_at?: string;
          updated_by?: string | null;
          verification_state?: string;
          verified_at?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "evidence_records_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evidence_records_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evidence_records_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evidence_records_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      intake_rate_limits: {
        Row: {
          hit_count: number;
          identity_hash: string;
          scope: string;
          window_start: string;
        };
        Insert: {
          hit_count?: number;
          identity_hash: string;
          scope: string;
          window_start: string;
        };
        Update: {
          hit_count?: number;
          identity_hash?: string;
          scope?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      intake_settings: {
        Row: {
          id: number;
          intake_enabled: boolean;
          lead_uncontacted_hours: number;
          proposal_stale_days: number;
          updated_at: string;
          updated_by: string | null;
          upload_policy: string;
          version: number;
        };
        Insert: {
          id?: number;
          intake_enabled?: boolean;
          lead_uncontacted_hours?: number;
          proposal_stale_days?: number;
          updated_at?: string;
          updated_by?: string | null;
          upload_policy?: string;
          version?: number;
        };
        Update: {
          id?: number;
          intake_enabled?: boolean;
          lead_uncontacted_hours?: number;
          proposal_stale_days?: number;
          updated_at?: string;
          updated_by?: string | null;
          upload_policy?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "intake_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_line_items: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          invoice_id: string;
          quantity: number;
          sort_order: number;
          unit_label: string | null;
          unit_price: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          invoice_id: string;
          quantity: number;
          sort_order?: number;
          unit_label?: string | null;
          unit_price: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          invoice_id?: string;
          quantity?: number;
          sort_order?: number;
          unit_label?: string | null;
          unit_price?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_number_counters: {
        Row: {
          last_value: number;
          year_key: number;
        };
        Insert: {
          last_value?: number;
          year_key: number;
        };
        Update: {
          last_value?: number;
          year_key?: number;
        };
        Relationships: [];
      };
      invoice_payments: {
        Row: {
          amount: number;
          created_at: string;
          created_by: string | null;
          id: string;
          invoice_id: string;
          note: string | null;
          payment_date: string;
          payment_method: string;
          reference: string | null;
          reversal_reason: string | null;
          reversed_at: string | null;
          reversed_by: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          invoice_id: string;
          note?: string | null;
          payment_date: string;
          payment_method: string;
          reference?: string | null;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          invoice_id?: string;
          note?: string | null;
          payment_date?: string;
          payment_method?: string;
          reference?: string | null;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_payments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_payments_reversed_by_fkey";
            columns: ["reversed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_share_links: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          invoice_id: string;
          revoked_at: string | null;
          revoked_by: string | null;
          token_hash: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          invoice_id: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          token_hash: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          invoice_id?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_share_links_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_share_links_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_share_links_revoked_by_fkey";
            columns: ["revoked_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          archived_at: string | null;
          client_id: string;
          created_at: string;
          created_by: string | null;
          currency: string;
          due_date: string | null;
          id: string;
          invoice_number: string | null;
          issue_date: string | null;
          issued_at: string | null;
          issued_by: string | null;
          issued_client_snapshot: Json | null;
          issued_issuer_snapshot: Json | null;
          issued_project_snapshot: Json | null;
          issued_subtotal: number | null;
          issued_tax_amount: number | null;
          issued_total: number | null;
          lifecycle_state: string;
          notes: string | null;
          operational_project_id: string | null;
          payment_terms: string | null;
          reference: string | null;
          tax_rate: number;
          updated_at: string;
          updated_by: string | null;
          version: number;
          void_reason: string | null;
          voided_at: string | null;
          voided_by: string | null;
        };
        Insert: {
          archived_at?: string | null;
          client_id: string;
          created_at?: string;
          created_by?: string | null;
          currency: string;
          due_date?: string | null;
          id?: string;
          invoice_number?: string | null;
          issue_date?: string | null;
          issued_at?: string | null;
          issued_by?: string | null;
          issued_client_snapshot?: Json | null;
          issued_issuer_snapshot?: Json | null;
          issued_project_snapshot?: Json | null;
          issued_subtotal?: number | null;
          issued_tax_amount?: number | null;
          issued_total?: number | null;
          lifecycle_state?: string;
          notes?: string | null;
          operational_project_id?: string | null;
          payment_terms?: string | null;
          reference?: string | null;
          tax_rate?: number;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
        };
        Update: {
          archived_at?: string | null;
          client_id?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          due_date?: string | null;
          id?: string;
          invoice_number?: string | null;
          issue_date?: string | null;
          issued_at?: string | null;
          issued_by?: string | null;
          issued_client_snapshot?: Json | null;
          issued_issuer_snapshot?: Json | null;
          issued_project_snapshot?: Json | null;
          issued_subtotal?: number | null;
          issued_tax_amount?: number | null;
          issued_total?: number | null;
          lifecycle_state?: string;
          notes?: string | null;
          operational_project_id?: string | null;
          payment_terms?: string | null;
          reference?: string | null;
          tax_rate?: number;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_issued_by_fkey";
            columns: ["issued_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_operational_project_id_fkey";
            columns: ["operational_project_id"];
            isOneToOne: false;
            referencedRelation: "operational_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_project_client_match";
            columns: ["operational_project_id", "client_id"];
            isOneToOne: false;
            referencedRelation: "operational_projects";
            referencedColumns: ["id", "client_id"];
          },
          {
            foreignKeyName: "invoices_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_voided_by_fkey";
            columns: ["voided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_attachments: {
        Row: {
          bucket_id: string;
          byte_size: number;
          checksum_sha256: string;
          detected_mime_type: string;
          id: string;
          lead_id: string | null;
          object_path: string;
          original_filename: string;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          scan_status: string;
          upload_session_id: string | null;
          uploaded_at: string;
        };
        Insert: {
          bucket_id: string;
          byte_size: number;
          checksum_sha256: string;
          detected_mime_type: string;
          id?: string;
          lead_id?: string | null;
          object_path: string;
          original_filename: string;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          scan_status?: string;
          upload_session_id?: string | null;
          uploaded_at?: string;
        };
        Update: {
          bucket_id?: string;
          byte_size?: number;
          checksum_sha256?: string;
          detected_mime_type?: string;
          id?: string;
          lead_id?: string | null;
          object_path?: string;
          original_filename?: string;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          scan_status?: string;
          upload_session_id?: string | null;
          uploaded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_attachments_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_attachments_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_attachments_upload_session_id_fkey";
            columns: ["upload_session_id"];
            isOneToOne: false;
            referencedRelation: "lead_upload_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_contact_logs: {
        Row: {
          contact_type: string;
          created_at: string;
          created_by: string | null;
          id: string;
          lead_id: string;
          note: string | null;
          occurred_at: string;
        };
        Insert: {
          contact_type: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          lead_id: string;
          note?: string | null;
          occurred_at?: string;
        };
        Update: {
          contact_type?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          lead_id?: string;
          note?: string | null;
          occurred_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_contact_logs_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_contact_logs_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_events: {
        Row: {
          actor_id: string | null;
          created_at: string;
          event_type: string;
          id: number;
          lead_id: string;
          metadata: Json;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          event_type: string;
          id?: number;
          lead_id: string;
          metadata?: Json;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          event_type?: string;
          id?: number;
          lead_id?: string;
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "lead_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_events_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_material_items: {
        Row: {
          description: string;
          id: string;
          lead_id: string;
          quantity: number | null;
          sort_order: number;
          specification: string | null;
          unit: string | null;
        };
        Insert: {
          description: string;
          id?: string;
          lead_id: string;
          quantity?: number | null;
          sort_order?: number;
          specification?: string | null;
          unit?: string | null;
        };
        Update: {
          description?: string;
          id?: string;
          lead_id?: string;
          quantity?: number | null;
          sort_order?: number;
          specification?: string | null;
          unit?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lead_material_items_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_notes: {
        Row: {
          body: string;
          created_at: string;
          created_by: string | null;
          id: string;
          lead_id: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          body: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          lead_id: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          body?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          lead_id?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "lead_notes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_notes_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_notes_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_project_details: {
        Row: {
          budget_currency: string | null;
          budget_max: number | null;
          budget_min: number | null;
          budget_preference: string;
          completion_timing: string | null;
          current_stage: string | null;
          floor_area_m2: number | null;
          floors: number | null;
          lead_id: string;
          need_key: string;
          project_type: string;
          scale_band: string | null;
          site_area_m2: number | null;
          site_state: string | null;
          source_context: string | null;
          special_requirements: string | null;
          start_timing: string | null;
          units: number | null;
        };
        Insert: {
          budget_currency?: string | null;
          budget_max?: number | null;
          budget_min?: number | null;
          budget_preference?: string;
          completion_timing?: string | null;
          current_stage?: string | null;
          floor_area_m2?: number | null;
          floors?: number | null;
          lead_id: string;
          need_key: string;
          project_type: string;
          scale_band?: string | null;
          site_area_m2?: number | null;
          site_state?: string | null;
          source_context?: string | null;
          special_requirements?: string | null;
          start_timing?: string | null;
          units?: number | null;
        };
        Update: {
          budget_currency?: string | null;
          budget_max?: number | null;
          budget_min?: number | null;
          budget_preference?: string;
          completion_timing?: string | null;
          current_stage?: string | null;
          floor_area_m2?: number | null;
          floors?: number | null;
          lead_id?: string;
          need_key?: string;
          project_type?: string;
          scale_band?: string | null;
          site_area_m2?: number | null;
          site_state?: string | null;
          source_context?: string | null;
          special_requirements?: string | null;
          start_timing?: string | null;
          units?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "lead_project_details_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: true;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_reference_counters: {
        Row: {
          last_value: number;
          year_key: number;
        };
        Insert: {
          last_value?: number;
          year_key: number;
        };
        Update: {
          last_value?: number;
          year_key?: number;
        };
        Relationships: [];
      };
      lead_service_details: {
        Row: {
          context_text: string | null;
          lead_id: string;
          preferred_timing: string | null;
          requirement_text: string;
          service_key: string;
        };
        Insert: {
          context_text?: string | null;
          lead_id: string;
          preferred_timing?: string | null;
          requirement_text: string;
          service_key: string;
        };
        Update: {
          context_text?: string | null;
          lead_id?: string;
          preferred_timing?: string | null;
          requirement_text?: string;
          service_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_service_details_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: true;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_stage_history: {
        Row: {
          changed_at: string;
          changed_by: string | null;
          from_status: string | null;
          id: number;
          lead_id: string;
          reason_code: string | null;
          to_status: string;
        };
        Insert: {
          changed_at?: string;
          changed_by?: string | null;
          from_status?: string | null;
          id?: number;
          lead_id: string;
          reason_code?: string | null;
          to_status: string;
        };
        Update: {
          changed_at?: string;
          changed_by?: string | null;
          from_status?: string | null;
          id?: number;
          lead_id?: string;
          reason_code?: string | null;
          to_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_stage_history_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_stage_history_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_upload_sessions: {
        Row: {
          consumed_at: string | null;
          created_at: string;
          expires_at: string;
          file_count: number;
          id: string;
          identity_hash: string | null;
          lead_id: string | null;
          token_hash: string;
        };
        Insert: {
          consumed_at?: string | null;
          created_at?: string;
          expires_at: string;
          file_count?: number;
          id?: string;
          identity_hash?: string | null;
          lead_id?: string | null;
          token_hash: string;
        };
        Update: {
          consumed_at?: string | null;
          created_at?: string;
          expires_at?: string;
          file_count?: number;
          id?: string;
          identity_hash?: string | null;
          lead_id?: string | null;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_upload_sessions_lead_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          archived_at: string | null;
          assigned_to: string | null;
          client_id: string | null;
          company: string | null;
          consent_revision: number | null;
          consented_at: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          email_normalized: string | null;
          first_contact_at: string | null;
          full_name: string;
          id: string;
          idempotency_key: string | null;
          lead_type: string;
          location_text: string | null;
          lost_at: string | null;
          lost_reason: string | null;
          message: string | null;
          operational_project_id: string | null;
          phone_display: string | null;
          phone_normalized: string | null;
          preferred_contact: string | null;
          priority: string | null;
          qualified_at: string | null;
          reference: string;
          service_id: string | null;
          service_key: string | null;
          site_visit_at: string | null;
          source_channel: string;
          status: string;
          submitted_at: string;
          summary: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
          won_at: string | null;
        };
        Insert: {
          archived_at?: string | null;
          assigned_to?: string | null;
          client_id?: string | null;
          company?: string | null;
          consent_revision?: number | null;
          consented_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          email_normalized?: string | null;
          first_contact_at?: string | null;
          full_name: string;
          id?: string;
          idempotency_key?: string | null;
          lead_type: string;
          location_text?: string | null;
          lost_at?: string | null;
          lost_reason?: string | null;
          message?: string | null;
          operational_project_id?: string | null;
          phone_display?: string | null;
          phone_normalized?: string | null;
          preferred_contact?: string | null;
          priority?: string | null;
          qualified_at?: string | null;
          reference: string;
          service_id?: string | null;
          service_key?: string | null;
          site_visit_at?: string | null;
          source_channel: string;
          status?: string;
          submitted_at?: string;
          summary: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
          won_at?: string | null;
        };
        Update: {
          archived_at?: string | null;
          assigned_to?: string | null;
          client_id?: string | null;
          company?: string | null;
          consent_revision?: number | null;
          consented_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          email_normalized?: string | null;
          first_contact_at?: string | null;
          full_name?: string;
          id?: string;
          idempotency_key?: string | null;
          lead_type?: string;
          location_text?: string | null;
          lost_at?: string | null;
          lost_reason?: string | null;
          message?: string | null;
          operational_project_id?: string | null;
          phone_display?: string | null;
          phone_normalized?: string | null;
          preferred_contact?: string | null;
          priority?: string | null;
          qualified_at?: string | null;
          reference?: string;
          service_id?: string | null;
          service_key?: string | null;
          site_visit_at?: string | null;
          source_channel?: string;
          status?: string;
          submitted_at?: string;
          summary?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
          won_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_operational_project_id_fkey";
            columns: ["operational_project_id"];
            isOneToOne: true;
            referencedRelation: "operational_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "published_services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      legal_page_revisions: {
        Row: {
          body: string;
          id: string;
          published_at: string;
          published_by: string | null;
          revision: number;
          slug: string;
          title: string;
        };
        Insert: {
          body: string;
          id?: string;
          published_at?: string;
          published_by?: string | null;
          revision: number;
          slug: string;
          title: string;
        };
        Update: {
          body?: string;
          id?: string;
          published_at?: string;
          published_by?: string | null;
          revision?: number;
          slug?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "legal_page_revisions_published_by_fkey";
            columns: ["published_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "legal_page_revisions_slug_fkey";
            columns: ["slug"];
            isOneToOne: false;
            referencedRelation: "legal_pages";
            referencedColumns: ["slug"];
          },
        ];
      };
      legal_pages: {
        Row: {
          draft_body: string;
          draft_is_starter: boolean;
          draft_title: string;
          published_at: string | null;
          published_body: string | null;
          published_by: string | null;
          published_revision: number | null;
          published_title: string | null;
          slug: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          draft_body?: string;
          draft_is_starter?: boolean;
          draft_title: string;
          published_at?: string | null;
          published_body?: string | null;
          published_by?: string | null;
          published_revision?: number | null;
          published_title?: string | null;
          slug: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          draft_body?: string;
          draft_is_starter?: boolean;
          draft_title?: string;
          published_at?: string | null;
          published_body?: string | null;
          published_by?: string | null;
          published_revision?: number | null;
          published_title?: string | null;
          slug?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "legal_pages_published_by_fkey";
            columns: ["published_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "legal_pages_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      material_claims: {
        Row: {
          approved_public_wording: string | null;
          claim_text: string;
          claim_type: string;
          created_at: string;
          created_by: string | null;
          id: string;
          review_due_at: string | null;
          reviewer_id: string | null;
          updated_at: string;
          updated_by: string | null;
          verification_state: string;
          verified_at: string | null;
          version: number;
        };
        Insert: {
          approved_public_wording?: string | null;
          claim_text: string;
          claim_type: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          review_due_at?: string | null;
          reviewer_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          verification_state?: string;
          verified_at?: string | null;
          version?: number;
        };
        Update: {
          approved_public_wording?: string | null;
          claim_text?: string;
          claim_type?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          review_due_at?: string | null;
          reviewer_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          verification_state?: string;
          verified_at?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "material_claims_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "material_claims_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "material_claims_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      materials: {
        Row: {
          active: boolean;
          archived_at: string | null;
          category: string | null;
          created_at: string;
          created_by: string | null;
          default_unit: string;
          id: string;
          internal_code: string | null;
          name: string;
          preferred_supplier_id: string | null;
          specification: string | null;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          active?: boolean;
          archived_at?: string | null;
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          default_unit: string;
          id?: string;
          internal_code?: string | null;
          name: string;
          preferred_supplier_id?: string | null;
          specification?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          active?: boolean;
          archived_at?: string | null;
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          default_unit?: string;
          id?: string;
          internal_code?: string | null;
          name?: string;
          preferred_supplier_id?: string | null;
          specification?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "materials_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "materials_preferred_supplier_id_fkey";
            columns: ["preferred_supplier_id"];
            isOneToOne: false;
            referencedRelation: "trade_partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "materials_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      media_assets: {
        Row: {
          alt_text: string | null;
          archived_at: string | null;
          base_alt_text: string | null;
          bucket_id: string;
          byte_size: number;
          caption: string | null;
          checksum_sha256: string;
          consent_reference: string | null;
          consent_required: boolean;
          consent_state: string;
          created_at: string;
          created_by: string | null;
          credit: string | null;
          focal_x: number;
          focal_y: number;
          height: number | null;
          id: string;
          is_decorative: boolean;
          media_kind: string;
          mime_type: string;
          object_path: string;
          original_bucket_id: string | null;
          original_filename: string | null;
          original_object_path: string | null;
          processing_status: string | null;
          provenance_class: string;
          public_use_permission: string;
          rights_holder: string | null;
          rights_notes: string | null;
          rights_review_due_at: string | null;
          rights_reviewer_id: string | null;
          rights_source: string | null;
          rights_status: string;
          rights_verified_at: string | null;
          source_asset_id: string | null;
          storage_state: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
          visibility: string | null;
          width: number | null;
        };
        Insert: {
          alt_text?: string | null;
          archived_at?: string | null;
          base_alt_text?: string | null;
          bucket_id: string;
          byte_size: number;
          caption?: string | null;
          checksum_sha256: string;
          consent_reference?: string | null;
          consent_required?: boolean;
          consent_state?: string;
          created_at?: string;
          created_by?: string | null;
          credit?: string | null;
          focal_x?: number;
          focal_y?: number;
          height?: number | null;
          id?: string;
          is_decorative?: boolean;
          media_kind?: string;
          mime_type: string;
          object_path: string;
          original_bucket_id?: string | null;
          original_filename?: string | null;
          original_object_path?: string | null;
          processing_status?: string | null;
          provenance_class?: string;
          public_use_permission?: string;
          rights_holder?: string | null;
          rights_notes?: string | null;
          rights_review_due_at?: string | null;
          rights_reviewer_id?: string | null;
          rights_source?: string | null;
          rights_status?: string;
          rights_verified_at?: string | null;
          source_asset_id?: string | null;
          storage_state?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
          visibility?: string | null;
          width?: number | null;
        };
        Update: {
          alt_text?: string | null;
          archived_at?: string | null;
          base_alt_text?: string | null;
          bucket_id?: string;
          byte_size?: number;
          caption?: string | null;
          checksum_sha256?: string;
          consent_reference?: string | null;
          consent_required?: boolean;
          consent_state?: string;
          created_at?: string;
          created_by?: string | null;
          credit?: string | null;
          focal_x?: number;
          focal_y?: number;
          height?: number | null;
          id?: string;
          is_decorative?: boolean;
          media_kind?: string;
          mime_type?: string;
          object_path?: string;
          original_bucket_id?: string | null;
          original_filename?: string | null;
          original_object_path?: string | null;
          processing_status?: string | null;
          provenance_class?: string;
          public_use_permission?: string;
          rights_holder?: string | null;
          rights_notes?: string | null;
          rights_review_due_at?: string | null;
          rights_reviewer_id?: string | null;
          rights_source?: string | null;
          rights_status?: string;
          rights_verified_at?: string | null;
          source_asset_id?: string | null;
          storage_state?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
          visibility?: string | null;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_assets_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_assets_rights_reviewer_id_fkey";
            columns: ["rights_reviewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_assets_source_asset_id_fkey";
            columns: ["source_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_assets_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      navigation_evidence: {
        Row: {
          evidence_id: string;
          navigation_menu_id: string;
          purpose: string | null;
          required: boolean;
        };
        Insert: {
          evidence_id: string;
          navigation_menu_id: string;
          purpose?: string | null;
          required?: boolean;
        };
        Update: {
          evidence_id?: string;
          navigation_menu_id?: string;
          purpose?: string | null;
          required?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "navigation_evidence_evidence_id_fkey";
            columns: ["evidence_id"];
            isOneToOne: false;
            referencedRelation: "evidence_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "navigation_evidence_navigation_menu_id_fkey";
            columns: ["navigation_menu_id"];
            isOneToOne: false;
            referencedRelation: "navigation_menus";
            referencedColumns: ["id"];
          },
        ];
      };
      navigation_item_localizations: {
        Row: {
          accessibility_text: string | null;
          created_at: string;
          created_by: string | null;
          label: string;
          locale: string;
          navigation_item_id: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          accessibility_text?: string | null;
          created_at?: string;
          created_by?: string | null;
          label: string;
          locale: string;
          navigation_item_id: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          accessibility_text?: string | null;
          created_at?: string;
          created_by?: string | null;
          label?: string;
          locale?: string;
          navigation_item_id?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "navigation_item_localizations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "navigation_item_localizations_navigation_item_id_fkey";
            columns: ["navigation_item_id"];
            isOneToOne: false;
            referencedRelation: "navigation_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "navigation_item_localizations_navigation_item_id_fkey";
            columns: ["navigation_item_id"];
            isOneToOne: false;
            referencedRelation: "published_navigation_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "navigation_item_localizations_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      navigation_items: {
        Row: {
          created_at: string;
          created_by: string | null;
          external_url: string | null;
          id: string;
          internal_path: string | null;
          link_type: string;
          menu_id: string;
          parent_id: string | null;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
          version: number;
          visibility: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          external_url?: string | null;
          id?: string;
          internal_path?: string | null;
          link_type: string;
          menu_id: string;
          parent_id?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
          visibility?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          external_url?: string | null;
          id?: string;
          internal_path?: string | null;
          link_type?: string;
          menu_id?: string;
          parent_id?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
          visibility?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "navigation_items_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "navigation_items_menu_id_fkey";
            columns: ["menu_id"];
            isOneToOne: false;
            referencedRelation: "navigation_menus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "navigation_items_parent_same_menu";
            columns: ["parent_id", "menu_id"];
            isOneToOne: false;
            referencedRelation: "navigation_items";
            referencedColumns: ["id", "menu_id"];
          },
          {
            foreignKeyName: "navigation_items_parent_same_menu";
            columns: ["parent_id", "menu_id"];
            isOneToOne: false;
            referencedRelation: "published_navigation_items";
            referencedColumns: ["id", "menu_id"];
          },
          {
            foreignKeyName: "navigation_items_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      navigation_menus: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          key: string;
          publication_status: string;
          published_at: string | null;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          key: string;
          publication_status?: string;
          published_at?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          key?: string;
          publication_status?: string;
          published_at?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "navigation_menus_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "navigation_menus_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      navigation_settings: {
        Row: {
          label_override: string | null;
          route_key: string;
          sort_order: number;
          updated_at: string;
          visible: boolean;
        };
        Insert: {
          label_override?: string | null;
          route_key: string;
          sort_order?: number;
          updated_at?: string;
          visible?: boolean;
        };
        Update: {
          label_override?: string | null;
          route_key?: string;
          sort_order?: number;
          updated_at?: string;
          visible?: boolean;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          category: string;
          in_app_enabled: boolean;
          profile_id: string;
          updated_at: string;
        };
        Insert: {
          category: string;
          in_app_enabled?: boolean;
          profile_id: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          in_app_enabled?: boolean;
          profile_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_preferences_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_sweep_runs: {
        Row: {
          actor_id: string | null;
          finished_at: string | null;
          id: number;
          produced_count: number;
          started_at: string;
          trigger_kind: string;
        };
        Insert: {
          actor_id?: string | null;
          finished_at?: string | null;
          id?: never;
          produced_count?: number;
          started_at?: string;
          trigger_kind: string;
        };
        Update: {
          actor_id?: string | null;
          finished_at?: string | null;
          id?: never;
          produced_count?: number;
          started_at?: string;
          trigger_kind?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_sweep_runs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          archived_at: string | null;
          body_short: string | null;
          category: string;
          created_at: string;
          dedupe_key: string | null;
          entity_id: string | null;
          entity_type: string | null;
          href: string | null;
          id: string;
          read_at: string | null;
          recipient_profile_id: string;
          severity: string;
          title: string;
        };
        Insert: {
          archived_at?: string | null;
          body_short?: string | null;
          category: string;
          created_at?: string;
          dedupe_key?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          href?: string | null;
          id?: string;
          read_at?: string | null;
          recipient_profile_id: string;
          severity?: string;
          title: string;
        };
        Update: {
          archived_at?: string | null;
          body_short?: string | null;
          category?: string;
          created_at?: string;
          dedupe_key?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          href?: string | null;
          id?: string;
          read_at?: string | null;
          recipient_profile_id?: string;
          severity?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_profile_id_fkey";
            columns: ["recipient_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      operational_project_notes: {
        Row: {
          archived_at: string | null;
          body: string;
          created_at: string;
          created_by: string | null;
          id: string;
          project_id: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          archived_at?: string | null;
          body: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          project_id: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          archived_at?: string | null;
          body?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          project_id?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "operational_project_notes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operational_project_notes_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "operational_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operational_project_notes_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      operational_project_phase_history: {
        Row: {
          actor_id: string | null;
          created_at: string;
          from_phase: string | null;
          id: number;
          project_id: string;
          to_phase: string;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          from_phase?: string | null;
          id?: never;
          project_id: string;
          to_phase: string;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          from_phase?: string | null;
          id?: never;
          project_id?: string;
          to_phase?: string;
        };
        Relationships: [
          {
            foreignKeyName: "operational_project_phase_history_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operational_project_phase_history_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "operational_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      operational_project_status_history: {
        Row: {
          actor_id: string | null;
          created_at: string;
          from_status: string | null;
          id: number;
          project_id: string;
          to_status: string;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          from_status?: string | null;
          id?: never;
          project_id: string;
          to_status: string;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          from_status?: string | null;
          id?: never;
          project_id?: string;
          to_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "operational_project_status_history_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operational_project_status_history_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "operational_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      operational_projects: {
        Row: {
          archived_at: string | null;
          budget_amount: number | null;
          budget_currency: string | null;
          client_id: string;
          created_at: string;
          created_by: string | null;
          current_phase: string;
          description: string | null;
          end_date: string | null;
          id: string;
          priority: string;
          public_case_study_id: string | null;
          start_date: string | null;
          status: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          archived_at?: string | null;
          budget_amount?: number | null;
          budget_currency?: string | null;
          client_id: string;
          created_at?: string;
          created_by?: string | null;
          current_phase?: string;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          priority?: string;
          public_case_study_id?: string | null;
          start_date?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          archived_at?: string | null;
          budget_amount?: number | null;
          budget_currency?: string | null;
          client_id?: string;
          created_at?: string;
          created_by?: string | null;
          current_phase?: string;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          priority?: string;
          public_case_study_id?: string | null;
          start_date?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "operational_projects_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operational_projects_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operational_projects_public_case_study_id_fkey";
            columns: ["public_case_study_id"];
            isOneToOne: true;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operational_projects_public_case_study_id_fkey";
            columns: ["public_case_study_id"];
            isOneToOne: true;
            referencedRelation: "published_project_services";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "operational_projects_public_case_study_id_fkey";
            columns: ["public_case_study_id"];
            isOneToOne: true;
            referencedRelation: "published_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "operational_projects_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      operational_settings: {
        Row: {
          assignment_ending_soon_days: number;
          id: number;
          invoice_due_soon_days: number;
          material_required_soon_days: number;
          po_expected_soon_days: number;
          project_ending_soon_days: number;
          stale_draft_invoice_days: number;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          assignment_ending_soon_days?: number;
          id?: number;
          invoice_due_soon_days?: number;
          material_required_soon_days?: number;
          po_expected_soon_days?: number;
          project_ending_soon_days?: number;
          stale_draft_invoice_days?: number;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          assignment_ending_soon_days?: number;
          id?: number;
          invoice_due_soon_days?: number;
          material_required_soon_days?: number;
          po_expected_soon_days?: number;
          project_ending_soon_days?: number;
          stale_draft_invoice_days?: number;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "operational_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      page_claims: {
        Row: {
          claim_id: string;
          page_id: string;
          required: boolean;
        };
        Insert: {
          claim_id: string;
          page_id: string;
          required?: boolean;
        };
        Update: {
          claim_id?: string;
          page_id?: string;
          required?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "page_claims_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "material_claims";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_claims_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "published_project_claims";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_claims_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "published_pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_claims_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "site_pages";
            referencedColumns: ["id"];
          },
        ];
      };
      page_evidence: {
        Row: {
          evidence_id: string;
          page_id: string;
          purpose: string | null;
          required: boolean;
        };
        Insert: {
          evidence_id: string;
          page_id: string;
          purpose?: string | null;
          required?: boolean;
        };
        Update: {
          evidence_id?: string;
          page_id?: string;
          purpose?: string | null;
          required?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "page_evidence_evidence_id_fkey";
            columns: ["evidence_id"];
            isOneToOne: false;
            referencedRelation: "evidence_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_evidence_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "published_pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_evidence_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "site_pages";
            referencedColumns: ["id"];
          },
        ];
      };
      page_localizations: {
        Row: {
          body_blocks: Json;
          canonical_override: string | null;
          created_at: string;
          created_by: string | null;
          locale: string;
          noindex: boolean;
          page_id: string;
          path: string;
          schema_version: number;
          seo_description: string | null;
          seo_title: string | null;
          social_image_id: string | null;
          summary: string | null;
          title: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          body_blocks?: Json;
          canonical_override?: string | null;
          created_at?: string;
          created_by?: string | null;
          locale: string;
          noindex?: boolean;
          page_id: string;
          path: string;
          schema_version?: number;
          seo_description?: string | null;
          seo_title?: string | null;
          social_image_id?: string | null;
          summary?: string | null;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          body_blocks?: Json;
          canonical_override?: string | null;
          created_at?: string;
          created_by?: string | null;
          locale?: string;
          noindex?: boolean;
          page_id?: string;
          path?: string;
          schema_version?: number;
          seo_description?: string | null;
          seo_title?: string | null;
          social_image_id?: string | null;
          summary?: string | null;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "page_localizations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_localizations_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "published_pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_localizations_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "site_pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_localizations_social_image_id_fkey";
            columns: ["social_image_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_localizations_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      page_section_media: {
        Row: {
          media_asset_id: string;
          role: string | null;
          section_id: string;
          sort_order: number;
        };
        Insert: {
          media_asset_id: string;
          role?: string | null;
          section_id: string;
          sort_order?: number;
        };
        Update: {
          media_asset_id?: string;
          role?: string | null;
          section_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "page_section_media_media_asset_id_fkey";
            columns: ["media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_section_media_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "page_sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_section_media_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "published_page_sections";
            referencedColumns: ["id"];
          },
        ];
      };
      page_section_projects: {
        Row: {
          project_id: string;
          section_id: string;
          sort_order: number;
        };
        Insert: {
          project_id: string;
          section_id: string;
          sort_order?: number;
        };
        Update: {
          project_id?: string;
          section_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "page_section_projects_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_section_projects_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "published_project_services";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "page_section_projects_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "published_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_section_projects_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "page_sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_section_projects_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "published_page_sections";
            referencedColumns: ["id"];
          },
        ];
      };
      page_section_services: {
        Row: {
          section_id: string;
          service_id: string;
          sort_order: number;
        };
        Insert: {
          section_id: string;
          service_id: string;
          sort_order?: number;
        };
        Update: {
          section_id?: string;
          service_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "page_section_services_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "page_sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_section_services_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "published_page_sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_section_services_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "published_services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_section_services_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      page_sections: {
        Row: {
          config: Json;
          created_at: string;
          created_by: string | null;
          enabled: boolean;
          id: string;
          page_id: string;
          schema_version: number;
          section_type: string;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          config?: Json;
          created_at?: string;
          created_by?: string | null;
          enabled?: boolean;
          id?: string;
          page_id: string;
          schema_version?: number;
          section_type: string;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          config?: Json;
          created_at?: string;
          created_by?: string | null;
          enabled?: boolean;
          id?: string;
          page_id?: string;
          schema_version?: number;
          section_type?: string;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "page_sections_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_sections_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "published_pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_sections_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "site_pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_sections_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      permissions: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          display_name: string;
          id: number;
          is_system: boolean;
          key: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          display_name: string;
          id?: number;
          is_system?: boolean;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          display_name?: string;
          id?: number;
          is_system?: boolean;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "permissions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "permissions_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      post_categories: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          publication_status: string;
          published_at: string | null;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          publication_status?: string;
          published_at?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          publication_status?: string;
          published_at?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "post_categories_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_categories_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      post_category_assignments: {
        Row: {
          category_id: string;
          post_id: string;
        };
        Insert: {
          category_id: string;
          post_id: string;
        };
        Update: {
          category_id?: string;
          post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_category_assignments_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "post_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_category_assignments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_category_assignments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "published_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_category_localizations: {
        Row: {
          category_id: string;
          created_at: string;
          created_by: string | null;
          locale: string;
          name: string;
          slug: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          created_by?: string | null;
          locale: string;
          name: string;
          slug: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          created_by?: string | null;
          locale?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "post_category_localizations_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "post_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_category_localizations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_category_localizations_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      post_claims: {
        Row: {
          claim_id: string;
          post_id: string;
          required: boolean;
        };
        Insert: {
          claim_id: string;
          post_id: string;
          required?: boolean;
        };
        Update: {
          claim_id?: string;
          post_id?: string;
          required?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "post_claims_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "material_claims";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_claims_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "published_project_claims";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_claims_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_claims_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "published_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_evidence: {
        Row: {
          evidence_id: string;
          post_id: string;
          purpose: string | null;
          required: boolean;
        };
        Insert: {
          evidence_id: string;
          post_id: string;
          purpose?: string | null;
          required?: boolean;
        };
        Update: {
          evidence_id?: string;
          post_id?: string;
          purpose?: string | null;
          required?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "post_evidence_evidence_id_fkey";
            columns: ["evidence_id"];
            isOneToOne: false;
            referencedRelation: "evidence_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_evidence_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_evidence_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "published_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_localizations: {
        Row: {
          body_blocks: Json;
          created_at: string;
          created_by: string | null;
          excerpt: string | null;
          locale: string;
          post_id: string;
          schema_version: number;
          seo_description: string | null;
          seo_title: string | null;
          slug: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          body_blocks?: Json;
          created_at?: string;
          created_by?: string | null;
          excerpt?: string | null;
          locale: string;
          post_id: string;
          schema_version?: number;
          seo_description?: string | null;
          seo_title?: string | null;
          slug: string;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          body_blocks?: Json;
          created_at?: string;
          created_by?: string | null;
          excerpt?: string | null;
          locale?: string;
          post_id?: string;
          schema_version?: number;
          seo_description?: string | null;
          seo_title?: string | null;
          slug?: string;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "post_localizations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_localizations_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_localizations_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "published_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_localizations_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          author_id: string | null;
          created_at: string;
          created_by: string | null;
          featured: boolean;
          hero_asset_id: string | null;
          id: string;
          is_time_sensitive: boolean;
          pinned: boolean;
          publication_date: string | null;
          publication_status: string;
          published_at: string | null;
          related_service_id: string | null;
          review_due_at: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          sort_priority: number;
          topic: string | null;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          author_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          featured?: boolean;
          hero_asset_id?: string | null;
          id?: string;
          is_time_sensitive?: boolean;
          pinned?: boolean;
          publication_date?: string | null;
          publication_status?: string;
          published_at?: string | null;
          related_service_id?: string | null;
          review_due_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          sort_priority?: number;
          topic?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          author_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          featured?: boolean;
          hero_asset_id?: string | null;
          id?: string;
          is_time_sensitive?: boolean;
          pinned?: boolean;
          publication_date?: string | null;
          publication_status?: string;
          published_at?: string | null;
          related_service_id?: string | null;
          review_due_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          sort_priority?: number;
          topic?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_hero_asset_id_fkey";
            columns: ["hero_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_related_service_id_fkey";
            columns: ["related_service_id"];
            isOneToOne: false;
            referencedRelation: "published_services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_related_service_id_fkey";
            columns: ["related_service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          account_status: string;
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          account_status?: string;
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          account_status?: string;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [];
      };
      project_categories: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          publication_status: string;
          published_at: string | null;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          publication_status?: string;
          published_at?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          publication_status?: string;
          published_at?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "project_categories_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_categories_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_category_assignments: {
        Row: {
          category_id: string;
          project_id: string;
          sort_order: number;
        };
        Insert: {
          category_id: string;
          project_id: string;
          sort_order?: number;
        };
        Update: {
          category_id?: string;
          project_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "project_category_assignments_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "project_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_category_assignments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_category_assignments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "published_project_services";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "project_category_assignments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "published_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_category_localizations: {
        Row: {
          category_id: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          locale: string;
          name: string;
          slug: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          locale: string;
          name: string;
          slug: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          locale?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "project_category_localizations_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "project_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_category_localizations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_category_localizations_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_claims: {
        Row: {
          claim_id: string;
          project_id: string;
          required: boolean;
        };
        Insert: {
          claim_id: string;
          project_id: string;
          required?: boolean;
        };
        Update: {
          claim_id?: string;
          project_id?: string;
          required?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "project_claims_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "material_claims";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_claims_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "published_project_claims";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_claims_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_claims_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "published_project_services";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "project_claims_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "published_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_evidence: {
        Row: {
          evidence_id: string;
          project_id: string;
          purpose: string | null;
          required: boolean;
        };
        Insert: {
          evidence_id: string;
          project_id: string;
          purpose?: string | null;
          required?: boolean;
        };
        Update: {
          evidence_id?: string;
          project_id?: string;
          purpose?: string | null;
          required?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "project_evidence_evidence_id_fkey";
            columns: ["evidence_id"];
            isOneToOne: false;
            referencedRelation: "evidence_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_evidence_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_evidence_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "published_project_services";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "project_evidence_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "published_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_localizations: {
        Row: {
          approach: string | null;
          challenge: string | null;
          created_at: string;
          created_by: string | null;
          locale: string;
          outcomes: string | null;
          project_id: string;
          seo_description: string | null;
          seo_title: string | null;
          slug: string;
          solution: string | null;
          summary: string | null;
          title: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          approach?: string | null;
          challenge?: string | null;
          created_at?: string;
          created_by?: string | null;
          locale: string;
          outcomes?: string | null;
          project_id: string;
          seo_description?: string | null;
          seo_title?: string | null;
          slug: string;
          solution?: string | null;
          summary?: string | null;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          approach?: string | null;
          challenge?: string | null;
          created_at?: string;
          created_by?: string | null;
          locale?: string;
          outcomes?: string | null;
          project_id?: string;
          seo_description?: string | null;
          seo_title?: string | null;
          slug?: string;
          solution?: string | null;
          summary?: string | null;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "project_localizations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_localizations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_localizations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "published_project_services";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "project_localizations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "published_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_localizations_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_material_requirements: {
        Row: {
          approval_state: string;
          cancelled_at: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          item_name: string;
          material_id: string | null;
          operational_project_id: string;
          priority: string;
          private_note: string | null;
          required_by: string | null;
          required_quantity: number;
          specification: string | null;
          unit_label: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          approval_state?: string;
          cancelled_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          item_name: string;
          material_id?: string | null;
          operational_project_id: string;
          priority?: string;
          private_note?: string | null;
          required_by?: string | null;
          required_quantity: number;
          specification?: string | null;
          unit_label: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          approval_state?: string;
          cancelled_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          item_name?: string;
          material_id?: string | null;
          operational_project_id?: string;
          priority?: string;
          private_note?: string | null;
          required_by?: string | null;
          required_quantity?: number;
          specification?: string | null;
          unit_label?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "project_material_requirements_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_material_requirements_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_material_requirements_operational_project_id_fkey";
            columns: ["operational_project_id"];
            isOneToOne: false;
            referencedRelation: "operational_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_material_requirements_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_media: {
        Row: {
          created_at: string;
          created_by: string | null;
          credit: string | null;
          decorative: boolean;
          focal_point: Json | null;
          id: string;
          media_asset_id: string;
          phase: string | null;
          project_id: string;
          public_status: string;
          role: string;
          sort_order: number;
          stage_id: string | null;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          credit?: string | null;
          decorative?: boolean;
          focal_point?: Json | null;
          id?: string;
          media_asset_id: string;
          phase?: string | null;
          project_id: string;
          public_status?: string;
          role: string;
          sort_order?: number;
          stage_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          credit?: string | null;
          decorative?: boolean;
          focal_point?: Json | null;
          id?: string;
          media_asset_id?: string;
          phase?: string | null;
          project_id?: string;
          public_status?: string;
          role?: string;
          sort_order?: number;
          stage_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "project_media_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_media_media_asset_id_fkey";
            columns: ["media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_media_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_media_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "published_project_services";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "project_media_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "published_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_media_stage_fk";
            columns: ["stage_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "project_stages";
            referencedColumns: ["id", "project_id"];
          },
          {
            foreignKeyName: "project_media_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_media_localizations: {
        Row: {
          alt_text: string | null;
          caption: string | null;
          created_at: string;
          created_by: string | null;
          locale: string;
          project_media_id: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          alt_text?: string | null;
          caption?: string | null;
          created_at?: string;
          created_by?: string | null;
          locale: string;
          project_media_id: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          alt_text?: string | null;
          caption?: string | null;
          created_at?: string;
          created_by?: string | null;
          locale?: string;
          project_media_id?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "project_media_localizations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_media_localizations_project_media_id_fkey";
            columns: ["project_media_id"];
            isOneToOne: false;
            referencedRelation: "project_media";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_media_localizations_project_media_id_fkey";
            columns: ["project_media_id"];
            isOneToOne: false;
            referencedRelation: "published_project_media";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_media_localizations_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_services: {
        Row: {
          project_id: string;
          scope_label: string | null;
          service_id: string;
          sort_order: number;
        };
        Insert: {
          project_id: string;
          scope_label?: string | null;
          service_id: string;
          sort_order?: number;
        };
        Update: {
          project_id?: string;
          scope_label?: string | null;
          service_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "project_services_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_services_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "published_project_services";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "project_services_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "published_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_services_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "published_services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_services_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      project_stages: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          project_id: string;
          sort_order: number;
          stage_date: string | null;
          stage_status: string | null;
          title: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          project_id: string;
          sort_order?: number;
          stage_date?: string | null;
          stage_status?: string | null;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          project_id?: string;
          sort_order?: number;
          stage_date?: string | null;
          stage_status?: string | null;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "project_stages_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_stages_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_stages_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "published_project_services";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "project_stages_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "published_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_stages_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          completion_year: number | null;
          created_at: string;
          created_by: string | null;
          delivery_status: string | null;
          evidence_class: string;
          featured: boolean;
          hero_asset_id: string | null;
          home_featured: boolean;
          id: string;
          layout_hint: string;
          materials: string | null;
          project_scope: string | null;
          project_type: string | null;
          public_location: string | null;
          public_location_granularity: string | null;
          publication_status: string;
          published_at: string | null;
          renz_role: string | null;
          review_due_at: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          sort_order: number;
          start_year: number | null;
          tags: Json;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          completion_year?: number | null;
          created_at?: string;
          created_by?: string | null;
          delivery_status?: string | null;
          evidence_class?: string;
          featured?: boolean;
          hero_asset_id?: string | null;
          home_featured?: boolean;
          id?: string;
          layout_hint?: string;
          materials?: string | null;
          project_scope?: string | null;
          project_type?: string | null;
          public_location?: string | null;
          public_location_granularity?: string | null;
          publication_status?: string;
          published_at?: string | null;
          renz_role?: string | null;
          review_due_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          sort_order?: number;
          start_year?: number | null;
          tags?: Json;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          completion_year?: number | null;
          created_at?: string;
          created_by?: string | null;
          delivery_status?: string | null;
          evidence_class?: string;
          featured?: boolean;
          hero_asset_id?: string | null;
          home_featured?: boolean;
          id?: string;
          layout_hint?: string;
          materials?: string | null;
          project_scope?: string | null;
          project_type?: string | null;
          public_location?: string | null;
          public_location_granularity?: string | null;
          publication_status?: string;
          published_at?: string | null;
          renz_role?: string | null;
          review_due_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          sort_order?: number;
          start_year?: number | null;
          tags?: Json;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_hero_asset_id_fkey";
            columns: ["hero_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      public_configuration_snapshots: {
        Row: {
          id: string;
          is_current: boolean;
          note: string | null;
          published_at: string;
          published_by: string | null;
          snapshot: Json;
        };
        Insert: {
          id?: string;
          is_current?: boolean;
          note?: string | null;
          published_at?: string;
          published_by?: string | null;
          snapshot: Json;
        };
        Update: {
          id?: string;
          is_current?: boolean;
          note?: string | null;
          published_at?: string;
          published_by?: string | null;
          snapshot?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "public_configuration_snapshots_published_by_fkey";
            columns: ["published_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      public_setting_registry: {
        Row: {
          display_name: string;
          key: string;
          namespace: string;
          public_allowed: boolean;
          requires_evidence: boolean;
          value_type: string;
        };
        Insert: {
          display_name: string;
          key: string;
          namespace: string;
          public_allowed?: boolean;
          requires_evidence?: boolean;
          value_type: string;
        };
        Update: {
          display_name?: string;
          key?: string;
          namespace?: string;
          public_allowed?: boolean;
          requires_evidence?: boolean;
          value_type?: string;
        };
        Relationships: [];
      };
      public_site_settings: {
        Row: {
          created_at: string;
          created_by: string | null;
          evidence_id: string | null;
          id: string;
          key: string;
          namespace: string;
          public_status: string;
          review_due_at: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          updated_at: string;
          updated_by: string | null;
          value: Json;
          version: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          evidence_id?: string | null;
          id?: string;
          key: string;
          namespace: string;
          public_status?: string;
          review_due_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          value: Json;
          version?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          evidence_id?: string | null;
          id?: string;
          key?: string;
          namespace?: string;
          public_status?: string;
          review_due_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "public_site_settings_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "public_site_settings_evidence_id_fkey";
            columns: ["evidence_id"];
            isOneToOne: false;
            referencedRelation: "evidence_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "public_site_settings_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "public_site_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_order_line_items: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          material_id: string | null;
          material_requirement_id: string | null;
          operational_project_id: string;
          over_order_confirmed: boolean;
          purchase_order_id: string;
          quantity: number;
          sort_order: number;
          unit_label: string;
          unit_price: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          material_id?: string | null;
          material_requirement_id?: string | null;
          operational_project_id: string;
          over_order_confirmed?: boolean;
          purchase_order_id: string;
          quantity: number;
          sort_order?: number;
          unit_label: string;
          unit_price: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          material_id?: string | null;
          material_requirement_id?: string | null;
          operational_project_id?: string;
          over_order_confirmed?: boolean;
          purchase_order_id?: string;
          quantity?: number;
          sort_order?: number;
          unit_label?: string;
          unit_price?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "po_lines_requirement_project_match";
            columns: ["material_requirement_id", "operational_project_id"];
            isOneToOne: false;
            referencedRelation: "project_material_requirements";
            referencedColumns: ["id", "operational_project_id"];
          },
          {
            foreignKeyName: "purchase_order_line_items_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_line_items_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_order_number_counters: {
        Row: {
          last_value: number;
          year_key: number;
        };
        Insert: {
          last_value?: number;
          year_key: number;
        };
        Update: {
          last_value?: number;
          year_key?: number;
        };
        Relationships: [];
      };
      purchase_order_receipt_items: {
        Row: {
          id: string;
          purchase_order_line_item_id: string;
          quantity_received: number;
          receipt_id: string;
        };
        Insert: {
          id?: string;
          purchase_order_line_item_id: string;
          quantity_received: number;
          receipt_id: string;
        };
        Update: {
          id?: string;
          purchase_order_line_item_id?: string;
          quantity_received?: number;
          receipt_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_order_receipt_items_purchase_order_line_item_id_fkey";
            columns: ["purchase_order_line_item_id"];
            isOneToOne: false;
            referencedRelation: "purchase_order_line_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_receipt_items_receipt_id_fkey";
            columns: ["receipt_id"];
            isOneToOne: false;
            referencedRelation: "purchase_order_receipts";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_order_receipts: {
        Row: {
          created_at: string;
          delivery_reference: string | null;
          id: string;
          note: string | null;
          purchase_order_id: string;
          received_at: string;
          received_by: string | null;
          reversal_reason: string | null;
          reversed_at: string | null;
          reversed_by: string | null;
        };
        Insert: {
          created_at?: string;
          delivery_reference?: string | null;
          id?: string;
          note?: string | null;
          purchase_order_id: string;
          received_at: string;
          received_by?: string | null;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
        };
        Update: {
          created_at?: string;
          delivery_reference?: string | null;
          id?: string;
          note?: string | null;
          purchase_order_id?: string;
          received_at?: string;
          received_by?: string | null;
          reversal_reason?: string | null;
          reversed_at?: string | null;
          reversed_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_order_receipts_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_receipts_received_by_fkey";
            columns: ["received_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_receipts_reversed_by_fkey";
            columns: ["reversed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_order_share_links: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          purchase_order_id: string;
          revoked_at: string | null;
          revoked_by: string | null;
          token_hash: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          purchase_order_id: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          token_hash: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          purchase_order_id?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_order_share_links_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_share_links_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_share_links_revoked_by_fkey";
            columns: ["revoked_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_orders: {
        Row: {
          cancel_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          close_reason: string | null;
          closed_at: string | null;
          closed_by: string | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          expected_delivery_date: string | null;
          id: string;
          issue_date: string | null;
          issued_at: string | null;
          issued_by: string | null;
          issued_issuer_snapshot: Json | null;
          issued_project_snapshot: Json | null;
          issued_subtotal: number | null;
          issued_supplier_snapshot: Json | null;
          issued_tax_amount: number | null;
          issued_total: number | null;
          lifecycle_state: string;
          notes: string | null;
          operational_project_id: string;
          purchase_order_number: string | null;
          reference: string | null;
          supplier_id: string;
          tax_rate: number;
          terms: string | null;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          close_reason?: string | null;
          closed_at?: string | null;
          closed_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency: string;
          expected_delivery_date?: string | null;
          id?: string;
          issue_date?: string | null;
          issued_at?: string | null;
          issued_by?: string | null;
          issued_issuer_snapshot?: Json | null;
          issued_project_snapshot?: Json | null;
          issued_subtotal?: number | null;
          issued_supplier_snapshot?: Json | null;
          issued_tax_amount?: number | null;
          issued_total?: number | null;
          lifecycle_state?: string;
          notes?: string | null;
          operational_project_id: string;
          purchase_order_number?: string | null;
          reference?: string | null;
          supplier_id: string;
          tax_rate?: number;
          terms?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          close_reason?: string | null;
          closed_at?: string | null;
          closed_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          expected_delivery_date?: string | null;
          id?: string;
          issue_date?: string | null;
          issued_at?: string | null;
          issued_by?: string | null;
          issued_issuer_snapshot?: Json | null;
          issued_project_snapshot?: Json | null;
          issued_subtotal?: number | null;
          issued_supplier_snapshot?: Json | null;
          issued_tax_amount?: number | null;
          issued_total?: number | null;
          lifecycle_state?: string;
          notes?: string | null;
          operational_project_id?: string;
          purchase_order_number?: string | null;
          reference?: string | null;
          supplier_id?: string;
          tax_rate?: number;
          terms?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_orders_cancelled_by_fkey";
            columns: ["cancelled_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_closed_by_fkey";
            columns: ["closed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_issued_by_fkey";
            columns: ["issued_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_operational_project_id_fkey";
            columns: ["operational_project_id"];
            isOneToOne: false;
            referencedRelation: "operational_projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "trade_partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      realtime_events: {
        Row: {
          action: string;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: number;
        };
        Insert: {
          action: string;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: never;
        };
        Update: {
          action?: string;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: never;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          permission_id: number;
          role_id: number;
        };
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          permission_id: number;
          role_id: number;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          permission_id?: number;
          role_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey";
            columns: ["permission_id"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          created_at: string;
          created_by: string | null;
          display_name: string;
          id: number;
          is_system: boolean;
          key: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          display_name: string;
          id?: number;
          is_system?: boolean;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          display_name?: string;
          id?: number;
          is_system?: boolean;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "roles_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "roles_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      seo_settings: {
        Row: {
          id: number;
          meta_description: string | null;
          organization_name: string | null;
          organization_url: string | null;
          site_name: string;
          title_template: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          id?: number;
          meta_description?: string | null;
          organization_name?: string | null;
          organization_url?: string | null;
          site_name?: string;
          title_template?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          id?: number;
          meta_description?: string | null;
          organization_name?: string | null;
          organization_url?: string | null;
          site_name?: string;
          title_template?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "seo_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      service_claims: {
        Row: {
          claim_id: string;
          required: boolean;
          service_id: string;
        };
        Insert: {
          claim_id: string;
          required?: boolean;
          service_id: string;
        };
        Update: {
          claim_id?: string;
          required?: boolean;
          service_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_claims_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "material_claims";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_claims_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "published_project_claims";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_claims_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "published_services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_claims_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      service_evidence: {
        Row: {
          evidence_id: string;
          purpose: string | null;
          required: boolean;
          service_id: string;
        };
        Insert: {
          evidence_id: string;
          purpose?: string | null;
          required?: boolean;
          service_id: string;
        };
        Update: {
          evidence_id?: string;
          purpose?: string | null;
          required?: boolean;
          service_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_evidence_evidence_id_fkey";
            columns: ["evidence_id"];
            isOneToOne: false;
            referencedRelation: "evidence_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_evidence_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "published_services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_evidence_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      service_localizations: {
        Row: {
          body_blocks: Json;
          client_inputs: string | null;
          coordination: string | null;
          created_at: string;
          created_by: string | null;
          deliverables: string | null;
          delivery_wording: string | null;
          exclusions: string | null;
          faqs: Json;
          locale: string;
          name: string;
          positioning: string | null;
          process_steps: Json;
          professional_terminology: string | null;
          schema_version: number;
          scope: string | null;
          seo_description: string | null;
          seo_title: string | null;
          service_id: string;
          slug: string;
          sub_services: Json;
          summary: string | null;
          updated_at: string;
          updated_by: string | null;
          use_cases: Json;
          version: number;
        };
        Insert: {
          body_blocks?: Json;
          client_inputs?: string | null;
          coordination?: string | null;
          created_at?: string;
          created_by?: string | null;
          deliverables?: string | null;
          delivery_wording?: string | null;
          exclusions?: string | null;
          faqs?: Json;
          locale: string;
          name: string;
          positioning?: string | null;
          process_steps?: Json;
          professional_terminology?: string | null;
          schema_version?: number;
          scope?: string | null;
          seo_description?: string | null;
          seo_title?: string | null;
          service_id: string;
          slug: string;
          sub_services?: Json;
          summary?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          use_cases?: Json;
          version?: number;
        };
        Update: {
          body_blocks?: Json;
          client_inputs?: string | null;
          coordination?: string | null;
          created_at?: string;
          created_by?: string | null;
          deliverables?: string | null;
          delivery_wording?: string | null;
          exclusions?: string | null;
          faqs?: Json;
          locale?: string;
          name?: string;
          positioning?: string | null;
          process_steps?: Json;
          professional_terminology?: string | null;
          schema_version?: number;
          scope?: string | null;
          seo_description?: string | null;
          seo_title?: string | null;
          service_id?: string;
          slug?: string;
          sub_services?: Json;
          summary?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          use_cases?: Json;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "service_localizations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_localizations_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "published_services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_localizations_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_localizations_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          created_at: string;
          created_by: string | null;
          featured: boolean;
          hero_asset_id: string | null;
          id: string;
          publication_status: string;
          published_at: string | null;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          featured?: boolean;
          hero_asset_id?: string | null;
          id?: string;
          publication_status?: string;
          published_at?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          featured?: boolean;
          hero_asset_id?: string | null;
          id?: string;
          publication_status?: string;
          published_at?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "services_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "services_hero_asset_id_fkey";
            columns: ["hero_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "services_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      setting_evidence: {
        Row: {
          evidence_id: string;
          key: string;
          namespace: string;
          purpose: string | null;
          required: boolean;
        };
        Insert: {
          evidence_id: string;
          key: string;
          namespace: string;
          purpose?: string | null;
          required?: boolean;
        };
        Update: {
          evidence_id?: string;
          key?: string;
          namespace?: string;
          purpose?: string | null;
          required?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "setting_evidence_evidence_id_fkey";
            columns: ["evidence_id"];
            isOneToOne: false;
            referencedRelation: "evidence_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "setting_evidence_namespace_key_fkey";
            columns: ["namespace", "key"];
            isOneToOne: false;
            referencedRelation: "public_setting_registry";
            referencedColumns: ["namespace", "key"];
          },
        ];
      };
      settings_domain_versions: {
        Row: {
          domain: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          domain: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          domain?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "settings_domain_versions_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      site_pages: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          page_key: string;
          publication_status: string;
          published_at: string | null;
          template_key: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          page_key: string;
          publication_status?: string;
          published_at?: string | null;
          template_key: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          page_key?: string;
          publication_status?: string;
          published_at?: string | null;
          template_key?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "site_pages_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_pages_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      social_links: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          label: string | null;
          platform: string;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
          url: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          label?: string | null;
          platform: string;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          url: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          label?: string | null;
          platform?: string;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "social_links_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      team_member_claims: {
        Row: {
          claim_id: string;
          required: boolean;
          team_member_id: string;
        };
        Insert: {
          claim_id: string;
          required?: boolean;
          team_member_id: string;
        };
        Update: {
          claim_id?: string;
          required?: boolean;
          team_member_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_member_claims_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "material_claims";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_member_claims_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "published_project_claims";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_member_claims_team_member_id_fkey";
            columns: ["team_member_id"];
            isOneToOne: false;
            referencedRelation: "published_team_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_member_claims_team_member_id_fkey";
            columns: ["team_member_id"];
            isOneToOne: false;
            referencedRelation: "team_members";
            referencedColumns: ["id"];
          },
        ];
      };
      team_member_evidence: {
        Row: {
          evidence_id: string;
          purpose: string | null;
          required: boolean;
          team_member_id: string;
        };
        Insert: {
          evidence_id: string;
          purpose?: string | null;
          required?: boolean;
          team_member_id: string;
        };
        Update: {
          evidence_id?: string;
          purpose?: string | null;
          required?: boolean;
          team_member_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_member_evidence_evidence_id_fkey";
            columns: ["evidence_id"];
            isOneToOne: false;
            referencedRelation: "evidence_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_member_evidence_team_member_id_fkey";
            columns: ["team_member_id"];
            isOneToOne: false;
            referencedRelation: "published_team_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_member_evidence_team_member_id_fkey";
            columns: ["team_member_id"];
            isOneToOne: false;
            referencedRelation: "team_members";
            referencedColumns: ["id"];
          },
        ];
      };
      team_member_localizations: {
        Row: {
          biography: string | null;
          created_at: string;
          created_by: string | null;
          locale: string;
          name: string;
          role_label: string | null;
          team_member_id: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          biography?: string | null;
          created_at?: string;
          created_by?: string | null;
          locale: string;
          name: string;
          role_label?: string | null;
          team_member_id: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          biography?: string | null;
          created_at?: string;
          created_by?: string | null;
          locale?: string;
          name?: string;
          role_label?: string | null;
          team_member_id?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "team_member_localizations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_member_localizations_team_member_id_fkey";
            columns: ["team_member_id"];
            isOneToOne: false;
            referencedRelation: "published_team_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_member_localizations_team_member_id_fkey";
            columns: ["team_member_id"];
            isOneToOne: false;
            referencedRelation: "team_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_member_localizations_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      team_members: {
        Row: {
          consent_reference: string | null;
          consent_state: string;
          created_at: string;
          created_by: string | null;
          id: string;
          portrait_asset_id: string | null;
          publication_status: string;
          published_at: string | null;
          review_due_at: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          consent_reference?: string | null;
          consent_state?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          portrait_asset_id?: string | null;
          publication_status?: string;
          published_at?: string | null;
          review_due_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          consent_reference?: string | null;
          consent_state?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          portrait_asset_id?: string | null;
          publication_status?: string;
          published_at?: string | null;
          review_due_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "team_members_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_members_portrait_asset_id_fkey";
            columns: ["portrait_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_members_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_members_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      testimonial_evidence: {
        Row: {
          evidence_id: string;
          purpose: string | null;
          required: boolean;
          testimonial_id: string;
        };
        Insert: {
          evidence_id: string;
          purpose?: string | null;
          required?: boolean;
          testimonial_id: string;
        };
        Update: {
          evidence_id?: string;
          purpose?: string | null;
          required?: boolean;
          testimonial_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "testimonial_evidence_evidence_id_fkey";
            columns: ["evidence_id"];
            isOneToOne: false;
            referencedRelation: "evidence_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "testimonial_evidence_testimonial_id_fkey";
            columns: ["testimonial_id"];
            isOneToOne: false;
            referencedRelation: "published_testimonials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "testimonial_evidence_testimonial_id_fkey";
            columns: ["testimonial_id"];
            isOneToOne: false;
            referencedRelation: "testimonials";
            referencedColumns: ["id"];
          },
        ];
      };
      testimonial_localizations: {
        Row: {
          attribution_presentation: string | null;
          created_at: string;
          created_by: string | null;
          locale: string;
          quote: string;
          testimonial_id: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          attribution_presentation?: string | null;
          created_at?: string;
          created_by?: string | null;
          locale: string;
          quote: string;
          testimonial_id: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          attribution_presentation?: string | null;
          created_at?: string;
          created_by?: string | null;
          locale?: string;
          quote?: string;
          testimonial_id?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "testimonial_localizations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "testimonial_localizations_testimonial_id_fkey";
            columns: ["testimonial_id"];
            isOneToOne: false;
            referencedRelation: "published_testimonials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "testimonial_localizations_testimonial_id_fkey";
            columns: ["testimonial_id"];
            isOneToOne: false;
            referencedRelation: "testimonials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "testimonial_localizations_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      testimonial_verifications: {
        Row: {
          approved_quote: string | null;
          consent_reference: string | null;
          consent_required: boolean;
          consent_state: string;
          created_at: string;
          internal_notes: string | null;
          review_due_at: string | null;
          source_reference: string;
          testimonial_id: string;
          updated_at: string;
          verification_state: string;
          verified_at: string | null;
          verified_by: string | null;
          version: number;
        };
        Insert: {
          approved_quote?: string | null;
          consent_reference?: string | null;
          consent_required?: boolean;
          consent_state?: string;
          created_at?: string;
          internal_notes?: string | null;
          review_due_at?: string | null;
          source_reference: string;
          testimonial_id: string;
          updated_at?: string;
          verification_state?: string;
          verified_at?: string | null;
          verified_by?: string | null;
          version?: number;
        };
        Update: {
          approved_quote?: string | null;
          consent_reference?: string | null;
          consent_required?: boolean;
          consent_state?: string;
          created_at?: string;
          internal_notes?: string | null;
          review_due_at?: string | null;
          source_reference?: string;
          testimonial_id?: string;
          updated_at?: string;
          verification_state?: string;
          verified_at?: string | null;
          verified_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "testimonial_verifications_testimonial_id_fkey";
            columns: ["testimonial_id"];
            isOneToOne: true;
            referencedRelation: "published_testimonials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "testimonial_verifications_testimonial_id_fkey";
            columns: ["testimonial_id"];
            isOneToOne: true;
            referencedRelation: "testimonials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "testimonial_verifications_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      testimonials: {
        Row: {
          attribution_approved: boolean;
          attribution_mode: string;
          attribution_name: string | null;
          attribution_organization: string | null;
          attribution_role: string | null;
          consent_state: string;
          created_at: string;
          created_by: string | null;
          featured: boolean;
          id: string;
          publication_status: string;
          published_at: string | null;
          review_due_at: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          sort_order: number;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          attribution_approved?: boolean;
          attribution_mode?: string;
          attribution_name?: string | null;
          attribution_organization?: string | null;
          attribution_role?: string | null;
          consent_state?: string;
          created_at?: string;
          created_by?: string | null;
          featured?: boolean;
          id?: string;
          publication_status?: string;
          published_at?: string | null;
          review_due_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          attribution_approved?: boolean;
          attribution_mode?: string;
          attribution_name?: string | null;
          attribution_organization?: string | null;
          attribution_role?: string | null;
          consent_state?: string;
          created_at?: string;
          created_by?: string | null;
          featured?: boolean;
          id?: string;
          publication_status?: string;
          published_at?: string | null;
          review_due_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          sort_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "testimonials_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "testimonials_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "testimonials_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      trade_partners: {
        Row: {
          address: string | null;
          archived_at: string | null;
          availability_status: string;
          capabilities: string[];
          company_name: string | null;
          contact_name: string | null;
          created_at: string;
          created_by: string | null;
          display_name: string;
          email: string | null;
          email_normalized: string | null;
          id: string;
          notes: string | null;
          phone_display: string | null;
          phone_normalized: string | null;
          specializations: string[];
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          address?: string | null;
          archived_at?: string | null;
          availability_status?: string;
          capabilities: string[];
          company_name?: string | null;
          contact_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          display_name: string;
          email?: string | null;
          email_normalized?: string | null;
          id?: string;
          notes?: string | null;
          phone_display?: string | null;
          phone_normalized?: string | null;
          specializations?: string[];
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          address?: string | null;
          archived_at?: string | null;
          availability_status?: string;
          capabilities?: string[];
          company_name?: string | null;
          contact_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          display_name?: string;
          email?: string | null;
          email_normalized?: string | null;
          id?: string;
          notes?: string | null;
          phone_display?: string | null;
          phone_normalized?: string | null;
          specializations?: string[];
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "trade_partners_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trade_partners_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          role_id: number;
          user_id: string;
        };
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          role_id: number;
          user_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          role_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      website_analytics_daily: {
        Row: {
          day: string;
          device_class: string;
          dimension: string;
          event_type: string;
          hit_count: number;
          path_key: string;
          updated_at: string;
        };
        Insert: {
          day: string;
          device_class?: string;
          dimension?: string;
          event_type: string;
          hit_count?: number;
          path_key: string;
          updated_at?: string;
        };
        Update: {
          day?: string;
          device_class?: string;
          dimension?: string;
          event_type?: string;
          hit_count?: number;
          path_key?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      website_page_revisions: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          kind: string;
          media_ids: string[];
          page_id: string;
          revision_no: number;
          snapshot: Json;
          summary: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind: string;
          media_ids?: string[];
          page_id: string;
          revision_no: number;
          snapshot: Json;
          summary?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind?: string;
          media_ids?: string[];
          page_id?: string;
          revision_no?: number;
          snapshot?: Json;
          summary?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "website_page_revisions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "website_page_revisions_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "website_pages";
            referencedColumns: ["id"];
          },
        ];
      };
      website_page_sections: {
        Row: {
          config: Json;
          created_at: string;
          created_by: string | null;
          hidden: boolean;
          id: string;
          label: string | null;
          locked: boolean;
          motion: string;
          page_id: string;
          section_type: string;
          sort_order: number;
          spacing: string;
          tone: string;
          updated_at: string;
          updated_by: string | null;
          variant: string;
          version: number;
        };
        Insert: {
          config?: Json;
          created_at?: string;
          created_by?: string | null;
          hidden?: boolean;
          id?: string;
          label?: string | null;
          locked?: boolean;
          motion?: string;
          page_id: string;
          section_type: string;
          sort_order?: number;
          spacing?: string;
          tone?: string;
          updated_at?: string;
          updated_by?: string | null;
          variant?: string;
          version?: number;
        };
        Update: {
          config?: Json;
          created_at?: string;
          created_by?: string | null;
          hidden?: boolean;
          id?: string;
          label?: string | null;
          locked?: boolean;
          motion?: string;
          page_id?: string;
          section_type?: string;
          sort_order?: number;
          spacing?: string;
          tone?: string;
          updated_at?: string;
          updated_by?: string | null;
          variant?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "website_page_sections_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "website_page_sections_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "website_pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "website_page_sections_section_type_fkey";
            columns: ["section_type"];
            isOneToOne: false;
            referencedRelation: "website_section_types";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "website_page_sections_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      website_pages: {
        Row: {
          archived_at: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          noindex: boolean;
          og_media_id: string | null;
          page_key: string;
          page_type: string;
          path: string;
          published_at: string | null;
          published_by: string | null;
          published_revision_id: string | null;
          seo_description: string | null;
          seo_title: string | null;
          status: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          noindex?: boolean;
          og_media_id?: string | null;
          page_key: string;
          page_type: string;
          path: string;
          published_at?: string | null;
          published_by?: string | null;
          published_revision_id?: string | null;
          seo_description?: string | null;
          seo_title?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          noindex?: boolean;
          og_media_id?: string | null;
          page_key?: string;
          page_type?: string;
          path?: string;
          published_at?: string | null;
          published_by?: string | null;
          published_revision_id?: string | null;
          seo_description?: string | null;
          seo_title?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "website_pages_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "website_pages_og_media_id_fkey";
            columns: ["og_media_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "website_pages_published_by_fkey";
            columns: ["published_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "website_pages_published_revision_fk";
            columns: ["published_revision_id"];
            isOneToOne: false;
            referencedRelation: "website_page_revisions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "website_pages_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      website_route_aliases: {
        Row: {
          created_at: string;
          created_by: string | null;
          entity_id: string | null;
          entity_type: string;
          id: string;
          source_path: string;
          target_path: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          source_path: string;
          target_path: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          source_path?: string;
          target_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "website_route_aliases_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      website_section_types: {
        Row: {
          display_name: string;
          enabled: boolean;
          key: string;
          schema_version: number;
          scope: string;
          system_module: boolean;
        };
        Insert: {
          display_name: string;
          enabled?: boolean;
          key: string;
          schema_version?: number;
          scope?: string;
          system_module?: boolean;
        };
        Update: {
          display_name?: string;
          enabled?: boolean;
          key?: string;
          schema_version?: number;
          scope?: string;
          system_module?: boolean;
        };
        Relationships: [];
      };
      website_settings: {
        Row: {
          analytics_enabled: boolean;
          analytics_provider: string | null;
          analytics_retention_days: number;
          analytics_site_id: string | null;
          announcement_active: boolean;
          announcement_text: string | null;
          canonical_base_url: string | null;
          company_summary: string | null;
          consent_required: boolean;
          contact_intro: string | null;
          first_party_analytics_enabled: boolean;
          footer_statement: string | null;
          homepage_cta_label: string;
          homepage_cta_route: string;
          id: number;
          secondary_cta_label: string | null;
          secondary_cta_route: string | null;
          service_area_wording: string | null;
          site_mode: string;
          site_mode_changed_at: string | null;
          site_mode_changed_by: string | null;
          updated_at: string;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          analytics_enabled?: boolean;
          analytics_provider?: string | null;
          analytics_retention_days?: number;
          analytics_site_id?: string | null;
          announcement_active?: boolean;
          announcement_text?: string | null;
          canonical_base_url?: string | null;
          company_summary?: string | null;
          consent_required?: boolean;
          contact_intro?: string | null;
          first_party_analytics_enabled?: boolean;
          footer_statement?: string | null;
          homepage_cta_label?: string;
          homepage_cta_route?: string;
          id?: number;
          secondary_cta_label?: string | null;
          secondary_cta_route?: string | null;
          service_area_wording?: string | null;
          site_mode?: string;
          site_mode_changed_at?: string | null;
          site_mode_changed_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          analytics_enabled?: boolean;
          analytics_provider?: string | null;
          analytics_retention_days?: number;
          analytics_site_id?: string | null;
          announcement_active?: boolean;
          announcement_text?: string | null;
          canonical_base_url?: string | null;
          company_summary?: string | null;
          consent_required?: boolean;
          contact_intro?: string | null;
          first_party_analytics_enabled?: boolean;
          footer_statement?: string | null;
          homepage_cta_label?: string;
          homepage_cta_route?: string;
          id?: number;
          secondary_cta_label?: string | null;
          secondary_cta_route?: string | null;
          service_area_wording?: string | null;
          site_mode?: string;
          site_mode_changed_at?: string | null;
          site_mode_changed_by?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "website_settings_site_mode_changed_by_fkey";
            columns: ["site_mode_changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "website_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      published_credentials: {
        Row: {
          approved_public_wording: string | null;
          description: string | null;
          id: string | null;
          issuer: string | null;
          locale: string | null;
          name: string | null;
          published_at: string | null;
          reference: string | null;
          team_member_id: string | null;
          valid_from: string | null;
          valid_to: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "credentials_team_member_id_fkey";
            columns: ["team_member_id"];
            isOneToOne: false;
            referencedRelation: "published_team_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credentials_team_member_id_fkey";
            columns: ["team_member_id"];
            isOneToOne: false;
            referencedRelation: "team_members";
            referencedColumns: ["id"];
          },
        ];
      };
      published_navigation_items: {
        Row: {
          accessibility_text: string | null;
          external_url: string | null;
          id: string | null;
          internal_path: string | null;
          label: string | null;
          link_type: string | null;
          locale: string | null;
          menu_id: string | null;
          parent_id: string | null;
          sort_order: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "navigation_items_menu_id_fkey";
            columns: ["menu_id"];
            isOneToOne: false;
            referencedRelation: "navigation_menus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "navigation_items_parent_same_menu";
            columns: ["parent_id", "menu_id"];
            isOneToOne: false;
            referencedRelation: "navigation_items";
            referencedColumns: ["id", "menu_id"];
          },
          {
            foreignKeyName: "navigation_items_parent_same_menu";
            columns: ["parent_id", "menu_id"];
            isOneToOne: false;
            referencedRelation: "published_navigation_items";
            referencedColumns: ["id", "menu_id"];
          },
        ];
      };
      published_page_sections: {
        Row: {
          config: Json | null;
          id: string | null;
          page_id: string | null;
          schema_version: number | null;
          section_type: string | null;
          sort_order: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "page_sections_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "published_pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "page_sections_page_id_fkey";
            columns: ["page_id"];
            isOneToOne: false;
            referencedRelation: "site_pages";
            referencedColumns: ["id"];
          },
        ];
      };
      published_pages: {
        Row: {
          body_blocks: Json | null;
          canonical_override: string | null;
          id: string | null;
          locale: string | null;
          noindex: boolean | null;
          page_key: string | null;
          path: string | null;
          published_at: string | null;
          schema_version: number | null;
          seo_description: string | null;
          seo_title: string | null;
          social_image_id: string | null;
          summary: string | null;
          template_key: string | null;
          title: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "page_localizations_social_image_id_fkey";
            columns: ["social_image_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      published_posts: {
        Row: {
          body_blocks: Json | null;
          excerpt: string | null;
          featured: boolean | null;
          hero_asset_id: string | null;
          id: string | null;
          locale: string | null;
          pinned: boolean | null;
          publication_date: string | null;
          published_at: string | null;
          related_service_id: string | null;
          revision_no: number | null;
          schema_version: number | null;
          seo_description: string | null;
          seo_title: string | null;
          slug: string | null;
          sort_priority: number | null;
          title: string | null;
          topic: string | null;
        };
        Relationships: [];
      };
      published_project_claims: {
        Row: {
          approved_public_wording: string | null;
          claim_type: string | null;
          id: string | null;
          project_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_claims_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_claims_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "published_project_services";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "project_claims_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "published_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      published_project_media: {
        Row: {
          alt_text: string | null;
          caption: string | null;
          credit: string | null;
          decorative: boolean | null;
          focal_point: Json | null;
          focal_x: number | null;
          focal_y: number | null;
          height: number | null;
          id: string | null;
          locale: string | null;
          media_asset_id: string | null;
          mime_type: string | null;
          phase: string | null;
          project_id: string | null;
          provenance_class: string | null;
          role: string | null;
          sort_order: number | null;
          width: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_media_media_asset_id_fkey";
            columns: ["media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_media_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_media_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "published_project_services";
            referencedColumns: ["project_id"];
          },
          {
            foreignKeyName: "project_media_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "published_projects";
            referencedColumns: ["id"];
          },
        ];
      };
      published_project_services: {
        Row: {
          project_id: string | null;
          scope_label: string | null;
          service_id: string | null;
          sort_order: number | null;
        };
        Relationships: [];
      };
      published_projects: {
        Row: {
          approach: string | null;
          challenge: string | null;
          completion_year: number | null;
          delivery_status: string | null;
          evidence_class: string | null;
          featured: boolean | null;
          hero_asset_id: string | null;
          home_featured: boolean | null;
          id: string | null;
          layout_hint: string | null;
          locale: string | null;
          materials: string | null;
          outcomes: string | null;
          project_scope: string | null;
          project_type: string | null;
          public_location: string | null;
          public_location_granularity: string | null;
          published_at: string | null;
          renz_role: string | null;
          revision_no: number | null;
          seo_description: string | null;
          seo_title: string | null;
          slug: string | null;
          solution: string | null;
          sort_order: number | null;
          stages: Json | null;
          start_year: number | null;
          summary: string | null;
          tags: Json | null;
          title: string | null;
        };
        Relationships: [];
      };
      published_services: {
        Row: {
          body_blocks: Json | null;
          client_inputs: string | null;
          coordination: string | null;
          deliverables: string | null;
          delivery_wording: string | null;
          exclusions: string | null;
          faqs: Json | null;
          featured: boolean | null;
          hero_asset_id: string | null;
          id: string | null;
          locale: string | null;
          name: string | null;
          positioning: string | null;
          process_steps: Json | null;
          published_at: string | null;
          revision_no: number | null;
          schema_version: number | null;
          scope: string | null;
          seo_description: string | null;
          seo_title: string | null;
          slug: string | null;
          sort_order: number | null;
          sub_services: Json | null;
          summary: string | null;
          use_cases: Json | null;
        };
        Relationships: [];
      };
      published_site_settings: {
        Row: {
          key: string | null;
          namespace: string | null;
          value: Json | null;
        };
        Relationships: [];
      };
      published_team_members: {
        Row: {
          biography: string | null;
          id: string | null;
          locale: string | null;
          name: string | null;
          portrait_asset_id: string | null;
          published_at: string | null;
          role_label: string | null;
          sort_order: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "team_members_portrait_asset_id_fkey";
            columns: ["portrait_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      published_testimonials: {
        Row: {
          attribution_mode: string | null;
          attribution_name: string | null;
          attribution_organization: string | null;
          attribution_presentation: string | null;
          attribution_role: string | null;
          id: string | null;
          locale: string | null;
          published_at: string | null;
          quote: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      activate_current_profile: { Args: never; Returns: boolean };
      add_trade_partner_capability: {
        Args: {
          capability: string;
          expected_version: number;
          target_id: string;
        };
        Returns: Json;
      };
      adjust_contractor_assignment_amount: {
        Args: {
          expected_version: number;
          new_amount: number;
          reason: string;
          target_id: string;
        };
        Returns: Json;
      };
      admin_action_queue: { Args: { limit_count?: number }; Returns: Json };
      admin_analytics_delivery: {
        Args: { range_from: string; range_to: string };
        Returns: Json;
      };
      admin_analytics_finance: {
        Args: { range_from: string; range_to: string };
        Returns: Json;
      };
      admin_analytics_leads: {
        Args: { range_from: string; range_to: string };
        Returns: Json;
      };
      admin_analytics_overview: {
        Args: { range_from: string; range_to: string };
        Returns: Json;
      };
      admin_analytics_projects: {
        Args: { range_from: string; range_to: string };
        Returns: Json;
      };
      admin_analytics_website: {
        Args: { range_from: string; range_to: string };
        Returns: Json;
      };
      admin_attach_project_media: {
        Args: {
          expected_version: number;
          target_alt_text?: string;
          target_caption?: string;
          target_credit?: string;
          target_decorative?: boolean;
          target_media_asset_id: string;
          target_phase?: string;
          target_project_id: string;
          target_role: string;
          target_stage_id?: string;
        };
        Returns: Json;
      };
      admin_business_timezone: { Args: never; Returns: string };
      admin_clear_and_promote_project_media: {
        Args: {
          expected_media_version: number;
          target_credit: string;
          target_project_media_id: string;
          target_rights_holder: string;
          target_rights_source: string;
        };
        Returns: Json;
      };
      admin_client_invoices: {
        Args: { target_client_id: string };
        Returns: Json;
      };
      admin_client_leads: { Args: { target_client_id: string }; Returns: Json };
      admin_clients_overview: { Args: never; Returns: Json };
      admin_confirm_media_rights: {
        Args: {
          expected_version: number;
          target_classification: string;
          target_credit?: string;
          target_id: string;
          target_rights_holder: string;
          target_rights_source?: string;
        };
        Returns: Json;
      };
      admin_delivery_action_queue: {
        Args: { limit_count?: number };
        Returns: Json;
      };
      admin_delivery_overview: { Args: never; Returns: Json };
      admin_document_defaults: { Args: never; Returns: Json };
      admin_finance_action_queue: {
        Args: { limit_count?: number };
        Returns: Json;
      };
      admin_finance_overview: { Args: never; Returns: Json };
      admin_get_business_settings: { Args: never; Returns: Json };
      admin_get_client: { Args: { target_id: string }; Returns: Json };
      admin_get_content_revision: {
        Args: { target_revision_id: string };
        Returns: Json;
      };
      admin_get_contractor_assignment: {
        Args: { target_id: string };
        Returns: Json;
      };
      admin_get_intake_settings: { Args: never; Returns: Json };
      admin_get_invoice: { Args: { target_id: string }; Returns: Json };
      admin_get_lead: { Args: { target_id: string }; Returns: Json };
      admin_get_legal_pages: { Args: never; Returns: Json };
      admin_get_material: { Args: { target_id: string }; Returns: Json };
      admin_get_media: { Args: { target_id: string }; Returns: Json };
      admin_get_notification_preferences: { Args: never; Returns: Json };
      admin_get_operational_project: {
        Args: { target_id: string };
        Returns: Json;
      };
      admin_get_operational_project_for_case_study: {
        Args: { target_case_study_id: string };
        Returns: Json;
      };
      admin_get_post: { Args: { target_id: string }; Returns: Json };
      admin_get_project: {
        Args: { target_id: string; target_locale?: string };
        Returns: Json;
      };
      admin_get_project_presentation: {
        Args: { target_id: string };
        Returns: Json;
      };
      admin_get_purchase_order: { Args: { target_id: string }; Returns: Json };
      admin_get_service: {
        Args: { target_id: string; target_locale?: string };
        Returns: Json;
      };
      admin_get_service_details: { Args: { target_id: string }; Returns: Json };
      admin_get_system_settings: { Args: never; Returns: Json };
      admin_get_trade_partner: { Args: { target_id: string }; Returns: Json };
      admin_get_website_page: { Args: { target_id: string }; Returns: Json };
      admin_get_website_page_revision: {
        Args: { target_id: string };
        Returns: Json;
      };
      admin_get_website_settings: { Args: never; Returns: Json };
      admin_global_quick_find: {
        Args: { limit_count?: number; search_query: string };
        Returns: Json;
      };
      admin_launch_readiness: { Args: never; Returns: Json };
      admin_lead_action_queue: { Args: { limit_count?: number }; Returns: Json };
      admin_lead_assignees: { Args: never; Returns: Json };
      admin_lead_attachment_path: {
        Args: { target_attachment_id: string };
        Returns: Json;
      };
      admin_leads_overview: { Args: never; Returns: Json };
      admin_list_active_clients_for_picker: {
        Args: { limit_count?: number; search_query?: string };
        Returns: Json;
      };
      admin_list_brand_media_candidates: {
        Args: { limit_count?: number; search_query?: string };
        Returns: Json;
      };
      admin_list_clients: {
        Args: {
          cursor_id?: string;
          cursor_updated_at?: string;
          page_size?: number;
          search_query?: string;
          status_scope?: string;
          tier_filter?: string;
        };
        Returns: Json;
      };
      admin_list_configuration_snapshots: {
        Args: { limit_count?: number };
        Returns: Json;
      };
      admin_list_content_revisions: {
        Args: { content_type: string; target_id: string };
        Returns: Json;
      };
      admin_list_contractor_payables: {
        Args: {
          currency_filter?: string;
          cursor_id?: string;
          cursor_updated_at?: string;
          page_size?: number;
          partner_id_filter?: string;
          payment_filter?: string;
          project_id_filter?: string;
          search_query?: string;
          status_filter?: string;
        };
        Returns: Json;
      };
      admin_list_invoices: {
        Args: {
          client_id_filter?: string;
          currency_filter?: string;
          cursor_id?: string;
          cursor_updated_at?: string;
          include_archived?: boolean;
          issued_from?: string;
          issued_to?: string;
          lifecycle_filter?: string;
          overdue_only?: boolean;
          page_size?: number;
          payment_filter?: string;
          project_id_filter?: string;
          search_query?: string;
        };
        Returns: Json;
      };
      admin_list_leads: {
        Args: {
          assigned_filter?: string;
          cursor_id?: string;
          cursor_submitted_at?: string;
          page_size?: number;
          search_query?: string;
          service_filter?: string;
          source_filter?: string;
          status_filter?: string;
          status_scope?: string;
          submitted_from?: string;
          submitted_to?: string;
          type_filter?: string;
        };
        Returns: Json;
      };
      admin_list_materials: {
        Args: {
          category_filter?: string;
          cursor_id?: string;
          cursor_updated_at?: string;
          page_size?: number;
          search_query?: string;
          status_scope?: string;
        };
        Returns: Json;
      };
      admin_list_materials_for_picker: {
        Args: { limit_count?: number; search_query?: string };
        Returns: Json;
      };
      admin_list_media: {
        Args: { filter?: string; limit_count?: number; search_query?: string };
        Returns: Json;
      };
      admin_list_notifications: {
        Args: {
          category_filter?: string;
          cursor_created_at?: string;
          cursor_id?: string;
          date_from?: string;
          date_to?: string;
          page_size?: number;
          severity_filter?: string;
          state_filter?: string;
        };
        Returns: Json;
      };
      admin_list_operational_projects: {
        Args: {
          case_study_filter?: string;
          client_id_filter?: string;
          cursor_id?: string;
          cursor_updated_at?: string;
          page_size?: number;
          phase_filter?: string;
          priority_filter?: string;
          search_query?: string;
          status_filter?: string;
          status_scope?: string;
        };
        Returns: Json;
      };
      admin_list_partners_for_picker: {
        Args: {
          capability: string;
          limit_count?: number;
          search_query?: string;
        };
        Returns: Json;
      };
      admin_list_posts: {
        Args: { search_query?: string; status_filter?: string };
        Returns: Json;
      };
      admin_list_projects: {
        Args: {
          cursor_id?: string;
          cursor_updated_at?: string;
          locale_filter?: string;
          page_size?: number;
          search_query?: string;
          status_filter?: string;
          type_filter?: string;
        };
        Returns: Json;
      };
      admin_list_purchase_orders: {
        Args: {
          currency_filter?: string;
          cursor_id?: string;
          cursor_updated_at?: string;
          delayed_only?: boolean;
          delivery_filter?: string;
          issued_from?: string;
          issued_to?: string;
          lifecycle_filter?: string;
          page_size?: number;
          project_id_filter?: string;
          search_query?: string;
          supplier_id_filter?: string;
        };
        Returns: Json;
      };
      admin_list_services: {
        Args: {
          cursor_id?: string;
          cursor_updated_at?: string;
          locale_filter?: string;
          page_size?: number;
          search_query?: string;
          status_filter?: string;
        };
        Returns: Json;
      };
      admin_list_staff: { Args: never; Returns: Json };
      admin_list_trade_partners: {
        Args: {
          availability_filter?: string;
          capability_filter?: string;
          cursor_id?: string;
          cursor_updated_at?: string;
          page_size?: number;
          search_query?: string;
          specialization_filter?: string;
          status_scope?: string;
        };
        Returns: Json;
      };
      admin_list_website_pages: { Args: never; Returns: Json };
      admin_notifications_summary: {
        Args: { limit_count?: number };
        Returns: Json;
      };
      admin_operations_overview: { Args: never; Returns: Json };
      admin_preview_website_page: { Args: { target_id: string }; Returns: Json };
      admin_project_contractors: {
        Args: { target_project_id: string };
        Returns: Json;
      };
      admin_project_delivery_summary: {
        Args: { target_project_id: string };
        Returns: Json;
      };
      admin_project_invoices: {
        Args: { target_project_id: string };
        Returns: Json;
      };
      admin_project_originating_lead: {
        Args: { target_project_id: string };
        Returns: Json;
      };
      admin_project_overview: { Args: never; Returns: Json };
      admin_project_procurement: {
        Args: { target_project_id: string };
        Returns: Json;
      };
      admin_recent_activity: { Args: { limit_count?: number }; Returns: Json };
      admin_remove_project_media: {
        Args: {
          expected_media_version: number;
          target_id: string;
          target_project_id: string;
        };
        Returns: Json;
      };
      admin_reorder_project_media: {
        Args: { ordered_ids: string[]; target_project_id: string };
        Returns: Json;
      };
      admin_replace_website_media: {
        Args: { target_new_id: string; target_old_id: string };
        Returns: Json;
      };
      admin_run_notification_sweep: { Args: never; Returns: Json };
      admin_service_overview: { Args: never; Returns: Json };
      admin_setting_href: { Args: { target_id: string }; Returns: string };
      admin_settings_overview: { Args: never; Returns: Json };
      admin_update_media_metadata: {
        Args: {
          expected_version: number;
          target_alt_text: string;
          target_caption: string;
          target_focal_x: number;
          target_focal_y: number;
          target_id: string;
        };
        Returns: Json;
      };
      admin_update_project_media: {
        Args: {
          expected_localization_version: number;
          expected_media_version: number;
          target_alt_text: string;
          target_caption: string;
          target_credit: string;
          target_decorative: boolean;
          target_id: string;
          target_phase: string;
          target_project_id: string;
          target_role: string;
          target_stage_id: string;
        };
        Returns: Json;
      };
      admin_website_media: { Args: { target_ids: string[] }; Returns: Json };
      admin_website_overview: { Args: never; Returns: Json };
      admin_website_sitemap: { Args: never; Returns: Json };
      archive_admin_client: {
        Args: { expected_version: number; target_id: string };
        Returns: Json;
      };
      archive_admin_invoice: {
        Args: { expected_version: number; target_id: string };
        Returns: Json;
      };
      archive_admin_material: {
        Args: { expected_version: number; target_id: string };
        Returns: Json;
      };
      archive_admin_operational_project: {
        Args: { expected_version: number; target_id: string };
        Returns: Json;
      };
      archive_admin_trade_partner: {
        Args: { expected_version: number; target_id: string };
        Returns: Json;
      };
      archive_content: {
        Args: {
          content_type: string;
          expected_version: number;
          target_id: string;
        };
        Returns: Json;
      };
      archive_lead: {
        Args: { expected_version: number; target_id: string };
        Returns: Json;
      };
      archive_media_asset: {
        Args: { expected_version: number; target_id: string };
        Returns: Json;
      };
      archive_notification: { Args: { target_id: string }; Returns: Json };
      archive_website_page: {
        Args: { expected_version: number; target_id: string };
        Returns: Json;
      };
      assign_invited_admin: {
        Args: { target_user_id: string };
        Returns: boolean;
      };
      assign_lead: {
        Args: {
          expected_version: number;
          target_assignee?: string;
          target_id: string;
        };
        Returns: Json;
      };
      assign_user_role: {
        Args: { requested_role_key: string; target_user_id: string };
        Returns: boolean;
      };
      cancel_admin_purchase_order: {
        Args: { expected_version: number; reason: string; target_id: string };
        Returns: Json;
      };
      change_content_publication: {
        Args: {
          content_type: string;
          expected_version: number;
          operation: string;
          target_id: string;
        };
        Returns: Json;
      };
      change_contractor_assignment_status: {
        Args: {
          expected_version: number;
          next_status: string;
          target_id: string;
        };
        Returns: Json;
      };
      change_lead_status: {
        Args: {
          expected_version: number;
          target_id: string;
          target_note?: string;
          target_reason_code?: string;
          target_status: string;
        };
        Returns: Json;
      };
      change_operational_project_phase: {
        Args: {
          expected_version: number;
          next_phase: string;
          target_id: string;
        };
        Returns: Json;
      };
      change_operational_project_priority: {
        Args: {
          expected_version: number;
          next_priority: string;
          target_id: string;
        };
        Returns: Json;
      };
      change_operational_project_status: {
        Args: {
          expected_version: number;
          next_status: string;
          target_id: string;
        };
        Returns: Json;
      };
      change_site_mode: {
        Args: { expected_version: number; next_mode: string };
        Returns: Json;
      };
      check_publication_readiness: {
        Args: { content_type: string; target_id: string };
        Returns: Json;
      };
      close_admin_purchase_order: {
        Args: { expected_version: number; reason: string; target_id: string };
        Returns: Json;
      };
      convert_lead_to_client: {
        Args: {
          existing_client_id?: string;
          expected_version: number;
          target_address?: string;
          target_company?: string;
          target_email?: string;
          target_full_name?: string;
          target_id: string;
          target_phone?: string;
          target_tier?: string;
        };
        Returns: Json;
      };
      create_admin_client: {
        Args: {
          full_name: string;
          initial_note?: string;
          target_address?: string;
          target_company?: string;
          target_email?: string;
          target_external_reference?: string;
          target_phone?: string;
          target_referral_source?: string;
          target_tier?: string;
        };
        Returns: Json;
      };
      create_admin_invoice: {
        Args: {
          lines?: Json;
          target_client_id: string;
          target_currency?: string;
          target_due_date?: string;
          target_issue_date?: string;
          target_notes?: string;
          target_payment_terms?: string;
          target_project_id?: string;
          target_reference?: string;
          target_tax_rate?: number;
        };
        Returns: Json;
      };
      create_admin_material: {
        Args: {
          target_category?: string;
          target_code?: string;
          target_name: string;
          target_specification?: string;
          target_supplier_id?: string;
          target_unit: string;
        };
        Returns: Json;
      };
      create_admin_operational_project: {
        Args: {
          description?: string;
          target_budget_amount?: number;
          target_budget_currency?: string;
          target_client_id: string;
          target_end_date?: string;
          target_phase?: string;
          target_priority?: string;
          target_start_date?: string;
          target_status?: string;
          title: string;
        };
        Returns: Json;
      };
      create_admin_post_draft: {
        Args: { target_slug: string; target_title: string };
        Returns: Json;
      };
      create_admin_project_draft: {
        Args: {
          target_locale: string;
          target_slug: string;
          target_title: string;
        };
        Returns: Json;
      };
      create_admin_project_stage: {
        Args: {
          expected_version: number;
          target_description: string;
          target_project_id: string;
          target_sort_order: number;
          target_title: string;
        };
        Returns: Json;
      };
      create_admin_purchase_order: {
        Args: {
          lines?: Json;
          target_currency: string;
          target_expected_delivery_date?: string;
          target_notes?: string;
          target_project_id: string;
          target_reference?: string;
          target_supplier_id: string;
          target_tax_rate?: number;
          target_terms?: string;
        };
        Returns: Json;
      };
      create_admin_service_draft: {
        Args: {
          target_locale: string;
          target_name: string;
          target_slug: string;
        };
        Returns: Json;
      };
      create_admin_trade_partner: {
        Args: {
          target_address?: string;
          target_availability?: string;
          target_capabilities: string[];
          target_company?: string;
          target_contact?: string;
          target_display_name: string;
          target_email?: string;
          target_notes?: string;
          target_phone?: string;
          target_specializations?: string[];
        };
        Returns: Json;
      };
      create_case_study_draft_from_operational_project: {
        Args: {
          expected_version: number;
          target_id: string;
          target_locale: string;
          target_slug: string;
          target_title: string;
        };
        Returns: Json;
      };
      create_client_note: {
        Args: { body: string; target_client_id: string };
        Returns: Json;
      };
      create_contractor_assignment: {
        Args: {
          target_agreed_amount?: number;
          target_currency?: string;
          target_end_date?: string;
          target_partner_id: string;
          target_payment_terms?: string;
          target_planned_units?: number;
          target_project_id: string;
          target_rate_amount?: number;
          target_rate_type?: string;
          target_scope: string;
          target_specialization?: string;
          target_start_date?: string;
          target_status?: string;
        };
        Returns: Json;
      };
      create_evidence_record: {
        Args: {
          consent_required?: boolean;
          fact_claim: string;
          sensitivity?: string;
          source_reference: string;
          source_type: string;
        };
        Returns: string;
      };
      create_invoice_share_link: { Args: { target_id: string }; Returns: Json };
      create_lead_manual: {
        Args: {
          assign_to_me?: boolean;
          target_company?: string;
          target_email?: string;
          target_full_name: string;
          target_lead_type: string;
          target_location_text?: string;
          target_message?: string;
          target_phone?: string;
          target_priority?: string;
          target_service_key?: string;
          target_source_channel: string;
          target_summary: string;
        };
        Returns: Json;
      };
      create_lead_note: {
        Args: { body: string; target_id: string };
        Returns: Json;
      };
      create_material_requirement: {
        Args: {
          target_item_name: string;
          target_material_id?: string;
          target_note?: string;
          target_priority?: string;
          target_project_id: string;
          target_quantity: number;
          target_required_by?: string;
          target_specification?: string;
          target_state?: string;
          target_unit: string;
        };
        Returns: Json;
      };
      create_material_requirements_from_lead: {
        Args: { expected_version: number; items: Json; target_id: string };
        Returns: Json;
      };
      create_operational_project_note: {
        Args: { body: string; target_project_id: string };
        Returns: Json;
      };
      create_project_evidence: {
        Args: {
          consent_required?: boolean;
          fact_claim: string;
          purpose?: string;
          required?: boolean;
          sensitivity?: string;
          source_reference: string;
          source_type: string;
          target_project_id: string;
        };
        Returns: Json;
      };
      create_project_from_lead: {
        Args: {
          expected_version: number;
          target_description?: string;
          target_id: string;
          target_phase?: string;
          target_priority?: string;
          target_start_date?: string;
          target_title: string;
        };
        Returns: Json;
      };
      create_purchase_order_share_link: {
        Args: { target_id: string };
        Returns: Json;
      };
      create_service_evidence: {
        Args: {
          consent_required?: boolean;
          fact_claim: string;
          purpose?: string;
          required?: boolean;
          sensitivity?: string;
          source_reference: string;
          source_type: string;
          target_service_id: string;
        };
        Returns: Json;
      };
      create_website_page: {
        Args: {
          target_page_type?: string;
          target_slug: string;
          target_title: string;
        };
        Returns: Json;
      };
      create_website_section: {
        Args: {
          expected_page_version: number;
          target_config?: Json;
          target_page_id: string;
          target_position?: number;
          target_section_type: string;
          target_spacing?: string;
          target_tone?: string;
          target_variant?: string;
        };
        Returns: Json;
      };
      current_user_access: {
        Args: never;
        Returns: {
          permission_key: string;
          role_key: string;
        }[];
      };
      current_user_has_permission: {
        Args: { requested_permission: string };
        Returns: boolean;
      };
      delete_admin_project_stage: {
        Args: {
          expected_stage_version: number;
          target_id: string;
          target_project_id: string;
        };
        Returns: Json;
      };
      delete_website_section: {
        Args: { expected_page_version: number; target_section_id: string };
        Returns: Json;
      };
      disable_user: { Args: { target_user_id: string }; Returns: boolean };
      duplicate_admin_invoice: { Args: { target_id: string }; Returns: Json };
      duplicate_admin_purchase_order: {
        Args: { target_id: string };
        Returns: Json;
      };
      duplicate_website_section: {
        Args: { expected_page_version: number; target_section_id: string };
        Returns: Json;
      };
      finalize_media_upload: {
        Args: { expected_version: number; target_id: string };
        Returns: Json;
      };
      find_possible_duplicate_clients: {
        Args: {
          candidate_email?: string;
          candidate_full_name?: string;
          candidate_phone?: string;
          exclude_id?: string;
        };
        Returns: Json;
      };
      find_possible_duplicate_materials: {
        Args: { exclude_id?: string; target_code?: string; target_name: string };
        Returns: Json;
      };
      find_possible_duplicate_trade_partners: {
        Args: {
          exclude_id?: string;
          target_company?: string;
          target_display_name?: string;
          target_email?: string;
          target_phone?: string;
        };
        Returns: Json;
      };
      intake_create_upload_session: {
        Args: {
          target_identity_hash: string;
          target_token_hash: string;
          ttl_seconds?: number;
        };
        Returns: Json;
      };
      intake_expired_upload_sessions: {
        Args: { limit_count?: number };
        Returns: Json;
      };
      intake_purge_upload_session: {
        Args: { target_session_id: string };
        Returns: Json;
      };
      intake_rate_limit_hit: {
        Args: {
          max_hits: number;
          target_identity_hash: string;
          target_scope: string;
          window_seconds: number;
        };
        Returns: Json;
      };
      intake_register_attachment: {
        Args: {
          max_files?: number;
          target_byte_size: number;
          target_checksum: string;
          target_mime_type: string;
          target_object_path: string;
          target_original_filename: string;
          target_session_id: string;
          target_token_hash: string;
        };
        Returns: Json;
      };
      intake_remove_attachment: {
        Args: {
          target_attachment_id: string;
          target_session_id: string;
          target_token_hash: string;
        };
        Returns: Json;
      };
      intake_submit_lead: { Args: { payload: Json }; Returns: Json };
      issue_admin_invoice: {
        Args: {
          expected_version: number;
          target_due_date: string;
          target_id: string;
          target_issue_date: string;
        };
        Returns: Json;
      };
      issue_admin_purchase_order: {
        Args: {
          expected_version: number;
          target_expected_delivery_date?: string;
          target_id: string;
          target_issue_date: string;
        };
        Returns: Json;
      };
      link_operational_project_case_study: {
        Args: {
          expected_version: number;
          target_case_study_id: string;
          target_id: string;
        };
        Returns: Json;
      };
      log_lead_contact: {
        Args: {
          target_contact_type: string;
          target_id: string;
          target_note?: string;
          target_occurred_at?: string;
        };
        Returns: Json;
      };
      mark_all_notifications_read: { Args: never; Returns: Json };
      mark_notification_read: {
        Args: { target_id: string; target_read?: boolean };
        Returns: Json;
      };
      mark_post_reviewed: {
        Args: { expected_version: number; target_id: string };
        Returns: Json;
      };
      mark_project_factually_reviewed: {
        Args: { expected_version: number; target_id: string };
        Returns: Json;
      };
      move_website_section: {
        Args: {
          direction: string;
          expected_page_version: number;
          target_section_id: string;
        };
        Returns: Json;
      };
      promote_media_asset: {
        Args: { expected_version: number; target_id: string };
        Returns: Json;
      };
      promote_project_media: {
        Args: { expected_version: number; target_id: string };
        Returns: Json;
      };
      public_invoice_by_share_token: {
        Args: { raw_token: string };
        Returns: Json;
      };
      public_legal_page: { Args: { target_slug: string }; Returns: Json };
      public_purchase_order_by_share_token: {
        Args: { raw_token: string };
        Returns: Json;
      };
      public_site_configuration: { Args: never; Returns: Json };
      public_website_media: { Args: { target_ids: string[] }; Returns: Json };
      public_website_page: { Args: { target_path: string }; Returns: Json };
      public_website_pages: { Args: never; Returns: Json };
      public_website_route_alias: { Args: { source: string }; Returns: string };
      publish_content: {
        Args: {
          content_type: string;
          expected_version: number;
          target_id: string;
        };
        Returns: Json;
      };
      publish_credential: {
        Args: { expected_version: number; target_id: string };
        Returns: Json;
      };
      publish_legal_page: {
        Args: { expected_version: number; target_slug: string };
        Returns: Json;
      };
      publish_navigation_menu: {
        Args: { expected_version: number; target_id: string };
        Returns: Json;
      };
      publish_page: {
        Args: { expected_version: number; target_id: string };
        Returns: Json;
      };
      publish_post: {
        Args: { expected_version: number; target_id: string };
        Returns: Json;
      };
      publish_project: {
        Args: { expected_version: number; target_id: string };
        Returns: Json;
      };
      publish_public_configuration: { Args: { note?: string }; Returns: Json };
      publish_service: {
        Args: { expected_version: number; target_id: string };
        Returns: Json;
      };
      publish_team_member: {
        Args: { expected_version: number; target_id: string };
        Returns: Json;
      };
      publish_testimonial: {
        Args: { expected_version: number; target_id: string };
        Returns: Json;
      };
      publish_website_page: {
        Args: { expected_version: number; summary?: string; target_id: string };
        Returns: Json;
      };
      rate_contractor_assignment: {
        Args: {
          expected_version: number;
          note?: string;
          rating: number;
          target_id: string;
        };
        Returns: Json;
      };
      reactivate_user: { Args: { target_user_id: string }; Returns: Json };
      record_audit_event: {
        Args: {
          event_action: string;
          event_entity_id: string;
          event_entity_type: string;
          event_metadata?: Json;
          event_outcome: string;
          event_request_id?: string;
        };
        Returns: undefined;
      };
      record_contractor_payment: {
        Args: {
          amount: number;
          target_assignment_id: string;
          target_method: string;
          target_note?: string;
          target_payment_date: string;
          target_reference?: string;
        };
        Returns: Json;
      };
      record_goods_receipt: {
        Args: {
          items: Json;
          target_note?: string;
          target_po_id: string;
          target_received_at: string;
          target_reference?: string;
        };
        Returns: Json;
      };
      record_invoice_payment: {
        Args: {
          amount: number;
          target_invoice_id: string;
          target_method: string;
          target_note?: string;
          target_payment_date: string;
          target_reference?: string;
        };
        Returns: Json;
      };
      register_media_asset: {
        Args: {
          target_bucket_id: string;
          target_byte_size: number;
          target_checksum_sha256: string;
          target_height?: number;
          target_id: string;
          target_media_kind: string;
          target_mime_type: string;
          target_object_path: string;
          target_original_filename?: string;
          target_provenance_class: string;
          target_source_asset_id?: string;
          target_width?: number;
        };
        Returns: Json;
      };
      remove_user_role: {
        Args: { requested_role_key: string; target_user_id: string };
        Returns: boolean;
      };
      reorder_website_sections: {
        Args: {
          expected_page_version: number;
          ordered_ids: Json;
          target_page_id: string;
        };
        Returns: Json;
      };
      replace_project_media_asset: {
        Args: {
          expected_version: number;
          replacement_asset_id: string;
          target_id: string;
        };
        Returns: Json;
      };
      republish_content: {
        Args: {
          content_type: string;
          expected_version: number;
          summary?: string;
          target_id: string;
        };
        Returns: Json;
      };
      resolve_brand_media_path: { Args: { target_slot: string }; Returns: Json };
      resolve_project_media_path: { Args: { target_id: string }; Returns: Json };
      resolve_website_media_path: { Args: { target_id: string }; Returns: Json };
      restore_content_revision: {
        Args: {
          content_type: string;
          expected_version: number;
          target_id: string;
          target_revision_id: string;
        };
        Returns: Json;
      };
      restore_website_page_revision: {
        Args: {
          expected_version: number;
          target_id: string;
          target_revision_id: string;
        };
        Returns: Json;
      };
      reverse_contractor_payment: {
        Args: { reason: string; target_payment_id: string };
        Returns: Json;
      };
      reverse_goods_receipt: {
        Args: { reason: string; target_receipt_id: string };
        Returns: Json;
      };
      reverse_invoice_payment: {
        Args: { reason: string; target_payment_id: string };
        Returns: Json;
      };
      review_lead_attachment: {
        Args: {
          target_attachment_id: string;
          target_reason?: string;
          target_state: string;
        };
        Returns: Json;
      };
      review_project_evidence: {
        Args: {
          expected_version: number;
          next_approved_public_wording?: string;
          next_consent_state?: string;
          next_review_due_at?: string;
          next_state: string;
          target_evidence_id: string;
          target_project_id: string;
        };
        Returns: Json;
      };
      review_service_evidence: {
        Args: {
          expected_version: number;
          next_approved_public_wording?: string;
          next_consent_state?: string;
          next_review_due_at?: string;
          next_state: string;
          target_evidence_id: string;
          target_service_id: string;
        };
        Returns: Json;
      };
      revoke_invoice_share_link: { Args: { target_id: string }; Returns: Json };
      revoke_purchase_order_share_link: {
        Args: { target_id: string };
        Returns: Json;
      };
      run_notification_sweep: { Args: { trigger_kind?: string }; Returns: Json };
      set_admin_project_services: {
        Args: {
          expected_version: number;
          target_project_id: string;
          target_services: Json;
        };
        Returns: Json;
      };
      set_staff_role: {
        Args: { requested_role_key: string; target_user_id: string };
        Returns: Json;
      };
      submit_project_evidence_for_review: {
        Args: {
          expected_version: number;
          target_evidence_id: string;
          target_project_id: string;
        };
        Returns: Json;
      };
      submit_service_evidence_for_review: {
        Args: {
          expected_version: number;
          target_evidence_id: string;
          target_service_id: string;
        };
        Returns: Json;
      };
      transition_evidence: {
        Args: {
          expected_version: number;
          next_approved_public_wording?: string;
          next_consent_state?: string;
          next_review_due_at?: string;
          next_state: string;
          target_id: string;
        };
        Returns: Json;
      };
      unlink_operational_project_case_study: {
        Args: { expected_version: number; target_id: string };
        Returns: Json;
      };
      unpublish_content: {
        Args: {
          content_type: string;
          expected_version: number;
          target_id: string;
        };
        Returns: Json;
      };
      unpublish_navigation_menu: {
        Args: { expected_version: number; target_id: string };
        Returns: Json;
      };
      unpublish_website_page: {
        Args: { expected_version: number; target_id: string };
        Returns: Json;
      };
      update_admin_client: {
        Args: {
          expected_version: number;
          target_address?: string;
          target_company?: string;
          target_email?: string;
          target_external_reference?: string;
          target_full_name: string;
          target_id: string;
          target_phone?: string;
          target_referral_source?: string;
          target_tier?: string;
        };
        Returns: Json;
      };
      update_admin_invoice: {
        Args: {
          expected_version: number;
          lines: Json;
          target_client_id: string;
          target_currency: string;
          target_due_date?: string;
          target_id: string;
          target_issue_date?: string;
          target_notes?: string;
          target_payment_terms?: string;
          target_project_id?: string;
          target_reference?: string;
          target_tax_rate: number;
        };
        Returns: Json;
      };
      update_admin_material: {
        Args: {
          expected_version: number;
          target_active?: boolean;
          target_category?: string;
          target_code?: string;
          target_id: string;
          target_name: string;
          target_specification?: string;
          target_supplier_id?: string;
          target_unit: string;
        };
        Returns: Json;
      };
      update_admin_operational_project: {
        Args: {
          expected_version: number;
          target_budget_amount?: number;
          target_budget_currency?: string;
          target_description?: string;
          target_end_date?: string;
          target_id: string;
          target_start_date?: string;
          target_title: string;
        };
        Returns: Json;
      };
      update_admin_post_draft: {
        Args: {
          expected_localization_version: number;
          expected_version: number;
          target_body_blocks: Json;
          target_excerpt: string;
          target_featured: boolean;
          target_hero_asset_id: string;
          target_id: string;
          target_pinned: boolean;
          target_publication_date: string;
          target_related_service_id: string;
          target_seo_description: string;
          target_seo_title: string;
          target_slug: string;
          target_sort_priority: number;
          target_title: string;
          target_topic: string;
        };
        Returns: Json;
      };
      update_admin_project_draft: {
        Args: {
          expected_localization_version: number;
          expected_version: number;
          target_approach: string;
          target_challenge: string;
          target_completion_year: number;
          target_delivery_status: string;
          target_featured: boolean;
          target_hero_asset_id: string;
          target_id: string;
          target_locale: string;
          target_outcomes: string;
          target_project_scope: string;
          target_project_type: string;
          target_public_location: string;
          target_public_location_granularity: string;
          target_renz_role: string;
          target_seo_description: string;
          target_seo_title: string;
          target_slug: string;
          target_solution: string;
          target_sort_order: number;
          target_start_year: number;
          target_summary: string;
          target_title: string;
        };
        Returns: Json;
      };
      update_admin_project_presentation: {
        Args: {
          expected_version: number;
          target_evidence_class: string;
          target_home_featured: boolean;
          target_id: string;
          target_layout_hint: string;
          target_materials: string;
          target_tags: Json;
        };
        Returns: Json;
      };
      update_admin_project_stage: {
        Args: {
          expected_stage_version: number;
          target_description: string;
          target_id: string;
          target_project_id: string;
          target_sort_order: number;
          target_title: string;
        };
        Returns: Json;
      };
      update_admin_purchase_order: {
        Args: {
          expected_version: number;
          lines: Json;
          target_currency: string;
          target_expected_delivery_date?: string;
          target_id: string;
          target_notes?: string;
          target_reference?: string;
          target_supplier_id: string;
          target_tax_rate: number;
          target_terms?: string;
        };
        Returns: Json;
      };
      update_admin_service_details: {
        Args: {
          expected_localization_version: number;
          target_coordination: string;
          target_faqs: Json;
          target_id: string;
          target_positioning: string;
          target_process_steps: Json;
          target_sub_services: Json;
          target_use_cases: Json;
        };
        Returns: Json;
      };
      update_admin_service_draft: {
        Args: {
          expected_localization_version: number;
          expected_version: number;
          target_body_blocks: Json;
          target_client_inputs: string;
          target_deliverables: string;
          target_delivery_wording: string;
          target_exclusions: string;
          target_featured: boolean;
          target_id: string;
          target_locale: string;
          target_name: string;
          target_professional_terminology: string;
          target_scope: string;
          target_seo_description: string;
          target_seo_title: string;
          target_slug: string;
          target_sort_order: number;
          target_summary: string;
        };
        Returns: Json;
      };
      update_admin_trade_partner: {
        Args: {
          expected_version: number;
          target_address?: string;
          target_availability?: string;
          target_company?: string;
          target_contact?: string;
          target_display_name: string;
          target_email?: string;
          target_id: string;
          target_notes?: string;
          target_phone?: string;
          target_specializations?: string[];
        };
        Returns: Json;
      };
      update_brand_media_settings: {
        Args: {
          expected_version: number;
          target_default_hero?: string;
          target_default_og?: string;
          target_default_share?: string;
          target_document_logo?: string;
          target_favicon?: string;
          target_primary_logo?: string;
          target_reversed_logo?: string;
        };
        Returns: Json;
      };
      update_business_hours: {
        Args: { expected_version: number; hours: Json };
        Returns: Json;
      };
      update_business_location: {
        Args: {
          expected_version: number;
          target_city?: string;
          target_country?: string;
          target_directions_url?: string;
          target_latitude?: number;
          target_longitude?: number;
          target_maps_url?: string;
          target_postal_code?: string;
          target_public_name?: string;
          target_publish: boolean;
          target_region?: string;
          target_service_area?: string;
          target_street?: string;
        };
        Returns: Json;
      };
      update_business_profile: {
        Args: {
          expected_version: number;
          target_approach?: string;
          target_country?: string;
          target_credentials?: string;
          target_default_locale?: string;
          target_display_name: string;
          target_legal_name?: string;
          target_mission?: string;
          target_primary_email: string;
          target_public_description?: string;
          target_region?: string;
          target_service_area?: string;
          target_short_name?: string;
          target_tagline?: string;
          target_timezone?: string;
          target_website_url?: string;
        };
        Returns: Json;
      };
      update_contractor_assignment: {
        Args: {
          expected_version: number;
          target_agreed_amount?: number;
          target_currency?: string;
          target_end_date?: string;
          target_id: string;
          target_payment_terms?: string;
          target_planned_units?: number;
          target_rate_amount?: number;
          target_rate_type?: string;
          target_scope: string;
          target_specialization?: string;
          target_start_date?: string;
        };
        Returns: Json;
      };
      update_document_defaults: {
        Args: {
          expected_version: number;
          target_allowed_currencies: string[];
          target_default_currency: string;
          target_invoice_due_days: number;
          target_invoice_payment_terms?: string;
          target_invoice_tax_label: string;
          target_invoice_tax_rate: number;
          target_po_expected_delivery_days: number;
          target_po_tax_label: string;
          target_po_tax_rate: number;
          target_po_terms?: string;
        };
        Returns: Json;
      };
      update_intake_settings: {
        Args: {
          expected_version: number;
          target_intake_enabled: boolean;
          target_lead_uncontacted_hours: number;
          target_proposal_stale_days: number;
          target_upload_policy: string;
        };
        Returns: Json;
      };
      update_lead: {
        Args: {
          expected_version: number;
          target_company?: string;
          target_email?: string;
          target_full_name: string;
          target_id: string;
          target_location_text?: string;
          target_phone?: string;
          target_preferred_contact?: string;
          target_priority?: string;
          target_service_id?: string;
          target_service_key?: string;
          target_summary: string;
        };
        Returns: Json;
      };
      update_legal_page_draft: {
        Args: {
          expected_version: number;
          target_body: string;
          target_slug: string;
          target_title: string;
        };
        Returns: Json;
      };
      update_material_requirement: {
        Args: {
          expected_version: number;
          target_id: string;
          target_item_name: string;
          target_material_id?: string;
          target_note?: string;
          target_priority?: string;
          target_quantity: number;
          target_required_by?: string;
          target_specification?: string;
          target_state?: string;
          target_unit: string;
        };
        Returns: Json;
      };
      update_media_rights: {
        Args: {
          expected_version: number;
          next_consent_state: string;
          next_credit?: string;
          next_public_use_permission: string;
          next_review_due_at?: string;
          next_rights_holder?: string;
          next_rights_notes?: string;
          next_rights_source?: string;
          next_rights_status: string;
          target_id: string;
        };
        Returns: Json;
      };
      update_navigation_settings: {
        Args: { expected_version: number; items: Json };
        Returns: Json;
      };
      update_notification_preferences: {
        Args: { preferences: Json };
        Returns: Json;
      };
      update_operational_settings: {
        Args: {
          expected_version: number;
          target_assignment_ending_soon_days: number;
          target_invoice_due_soon_days: number;
          target_material_required_soon_days: number;
          target_po_expected_soon_days: number;
          target_project_ending_soon_days: number;
          target_stale_draft_invoice_days: number;
        };
        Returns: Json;
      };
      update_public_site_setting: {
        Args: {
          expected_version: number;
          next_evidence_id?: string;
          next_public_status?: string;
          next_review_due_at?: string;
          target_key: string;
          target_namespace: string;
          target_value: Json;
        };
        Returns: Json;
      };
      update_seo_settings: {
        Args: {
          expected_version: number;
          target_meta_description?: string;
          target_organization_name?: string;
          target_organization_url?: string;
          target_site_name: string;
          target_title_template: string;
        };
        Returns: Json;
      };
      update_website_page: {
        Args: {
          expected_version: number;
          target_id: string;
          target_noindex: boolean;
          target_og_media_id: string;
          target_seo_description: string;
          target_seo_title: string;
          target_slug: string;
          target_title: string;
        };
        Returns: Json;
      };
      update_website_section: {
        Args: {
          expected_section_version: number;
          target_config: Json;
          target_hidden: boolean;
          target_label?: string;
          target_motion: string;
          target_section_id: string;
          target_spacing: string;
          target_tone: string;
          target_variant: string;
        };
        Returns: Json;
      };
      update_website_settings: {
        Args: {
          expected_version: number;
          target_analytics_enabled?: boolean;
          target_analytics_provider?: string;
          target_analytics_retention_days?: number;
          target_analytics_site_id?: string;
          target_announcement_active?: boolean;
          target_announcement_text?: string;
          target_canonical_base_url?: string;
          target_company_summary?: string;
          target_consent_required?: boolean;
          target_contact_intro?: string;
          target_first_party_analytics_enabled?: boolean;
          target_footer_statement?: string;
          target_homepage_cta_label: string;
          target_homepage_cta_route: string;
          target_secondary_cta_label?: string;
          target_secondary_cta_route?: string;
          target_service_area_wording?: string;
        };
        Returns: Json;
      };
      upsert_contact_channel: {
        Args: {
          expected_version: number;
          target_active?: boolean;
          target_calling_enabled?: boolean;
          target_channel_type: string;
          target_id?: string;
          target_is_public?: boolean;
          target_label: string;
          target_purpose?: string;
          target_sort_order?: number;
          target_value: string;
        };
        Returns: Json;
      };
      upsert_social_link: {
        Args: {
          expected_version: number;
          target_active?: boolean;
          target_id?: string;
          target_label?: string;
          target_platform: string;
          target_sort_order?: number;
          target_url: string;
        };
        Returns: Json;
      };
      void_admin_invoice: {
        Args: { expected_version: number; reason: string; target_id: string };
        Returns: Json;
      };
      website_analytics_record: { Args: { events: Json }; Returns: Json };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
