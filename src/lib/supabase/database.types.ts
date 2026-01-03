export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      booking_events: {
        Row: {
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          booking_id: string
          correlation_id: string | null
          created_at: string | null
          event_data: Json
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          idempotency_key: string | null
          source: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          booking_id: string
          correlation_id?: string | null
          created_at?: string | null
          event_data?: Json
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          idempotency_key?: string | null
          source?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          booking_id?: string
          correlation_id?: string | null
          created_at?: string | null
          event_data?: Json
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          idempotency_key?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          campaign_id: string
          candidate_confirmed: boolean | null
          candidate_id: string
          created_at: string | null
          description: string | null
          emergency_contact_notified: boolean | null
          end_time: string
          external_booking_id: string | null
          external_event_type_id: string | null
          feedback_completed_at: string | null
          feedback_requested_at: string | null
          id: string
          location_details: Json | null
          location_type: string | null
          requires_approval: boolean | null
          reschedule_count: number | null
          rescheduled_from: string | null
          safety_check_in_enabled: boolean | null
          safety_check_in_interval_minutes: number | null
          single_confirmed: boolean | null
          single_id: string
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          timezone: string
          title: string
          updated_at: string | null
          wingman_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          campaign_id: string
          candidate_confirmed?: boolean | null
          candidate_id: string
          created_at?: string | null
          description?: string | null
          emergency_contact_notified?: boolean | null
          end_time: string
          external_booking_id?: string | null
          external_event_type_id?: string | null
          feedback_completed_at?: string | null
          feedback_requested_at?: string | null
          id?: string
          location_details?: Json | null
          location_type?: string | null
          requires_approval?: boolean | null
          reschedule_count?: number | null
          rescheduled_from?: string | null
          safety_check_in_enabled?: boolean | null
          safety_check_in_interval_minutes?: number | null
          single_confirmed?: boolean | null
          single_id: string
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          timezone: string
          title: string
          updated_at?: string | null
          wingman_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          campaign_id?: string
          candidate_confirmed?: boolean | null
          candidate_id?: string
          created_at?: string | null
          description?: string | null
          emergency_contact_notified?: boolean | null
          end_time?: string
          external_booking_id?: string | null
          external_event_type_id?: string | null
          feedback_completed_at?: string | null
          feedback_requested_at?: string | null
          id?: string
          location_details?: Json | null
          location_type?: string | null
          requires_approval?: boolean | null
          reschedule_count?: number | null
          rescheduled_from?: string | null
          safety_check_in_enabled?: boolean | null
          safety_check_in_interval_minutes?: number | null
          single_confirmed?: boolean | null
          single_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          timezone?: string
          title?: string
          updated_at?: string | null
          wingman_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_rescheduled_from_fkey"
            columns: ["rescheduled_from"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_single_id_fkey"
            columns: ["single_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_wingman_id_fkey"
            columns: ["wingman_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          application_questions: Json | null
          auto_reject_incomplete: boolean | null
          cover_image_url: string | null
          created_at: string | null
          custom_css: string | null
          custom_template: string | null
          delegation_id: string
          description: string | null
          gallery_urls: string[] | null
          id: string
          initial_disclosure_level:
            | Database["public"]["Enums"]["identity_disclosure_level"]
            | null
          is_accepting_applications: boolean | null
          is_published: boolean | null
          max_active_candidates: number | null
          published_at: string | null
          requires_bio: boolean | null
          requires_photo: boolean | null
          single_id: string
          slug: string
          tagline: string | null
          template_id: string | null
          theme_config: Json | null
          title: string
          updated_at: string | null
          wingman_id: string
        }
        Insert: {
          application_questions?: Json | null
          auto_reject_incomplete?: boolean | null
          cover_image_url?: string | null
          created_at?: string | null
          custom_css?: string | null
          custom_template?: string | null
          delegation_id: string
          description?: string | null
          gallery_urls?: string[] | null
          id?: string
          initial_disclosure_level?:
            | Database["public"]["Enums"]["identity_disclosure_level"]
            | null
          is_accepting_applications?: boolean | null
          is_published?: boolean | null
          max_active_candidates?: number | null
          published_at?: string | null
          requires_bio?: boolean | null
          requires_photo?: boolean | null
          single_id: string
          slug: string
          tagline?: string | null
          template_id?: string | null
          theme_config?: Json | null
          title: string
          updated_at?: string | null
          wingman_id: string
        }
        Update: {
          application_questions?: Json | null
          auto_reject_incomplete?: boolean | null
          cover_image_url?: string | null
          created_at?: string | null
          custom_css?: string | null
          custom_template?: string | null
          delegation_id?: string
          description?: string | null
          gallery_urls?: string[] | null
          id?: string
          initial_disclosure_level?:
            | Database["public"]["Enums"]["identity_disclosure_level"]
            | null
          is_accepting_applications?: boolean | null
          is_published?: boolean | null
          max_active_candidates?: number | null
          published_at?: string | null
          requires_bio?: boolean | null
          requires_photo?: boolean | null
          single_id?: string
          slug?: string
          tagline?: string | null
          template_id?: string | null
          theme_config?: Json | null
          title?: string
          updated_at?: string | null
          wingman_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_delegation_id_fkey"
            columns: ["delegation_id"]
            isOneToOne: false
            referencedRelation: "delegations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_single_id_fkey"
            columns: ["single_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_wingman_id_fkey"
            columns: ["wingman_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_events: {
        Row: {
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          candidate_id: string
          created_at: string | null
          event_data: Json
          event_type: Database["public"]["Enums"]["event_type"]
          from_stage: Database["public"]["Enums"]["pipeline_stage"] | null
          id: string
          idempotency_key: string | null
          to_stage: Database["public"]["Enums"]["pipeline_stage"] | null
        }
        Insert: {
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          candidate_id: string
          created_at?: string | null
          event_data?: Json
          event_type: Database["public"]["Enums"]["event_type"]
          from_stage?: Database["public"]["Enums"]["pipeline_stage"] | null
          id?: string
          idempotency_key?: string | null
          to_stage?: Database["public"]["Enums"]["pipeline_stage"] | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          candidate_id?: string
          created_at?: string | null
          event_data?: Json
          event_type?: Database["public"]["Enums"]["event_type"]
          from_stage?: Database["public"]["Enums"]["pipeline_stage"] | null
          id?: string
          idempotency_key?: string | null
          to_stage?: Database["public"]["Enums"]["pipeline_stage"] | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_events_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          application_responses: Json | null
          applied_at: string | null
          approved_at: string | null
          avatar_url: string | null
          bio: string | null
          campaign_id: string
          created_at: string | null
          current_stage: Database["public"]["Enums"]["pipeline_stage"]
          disclosure_level:
            | Database["public"]["Enums"]["identity_disclosure_level"]
            | null
          display_name: string
          email: string
          id: string
          masked_email: string | null
          phone: string | null
          proposed_at: string | null
          rating: number | null
          rejected_at: string | null
          stage_changed_at: string | null
          updated_at: string | null
          user_id: string | null
          wingman_notes: string | null
        }
        Insert: {
          application_responses?: Json | null
          applied_at?: string | null
          approved_at?: string | null
          avatar_url?: string | null
          bio?: string | null
          campaign_id: string
          created_at?: string | null
          current_stage?: Database["public"]["Enums"]["pipeline_stage"]
          disclosure_level?:
            | Database["public"]["Enums"]["identity_disclosure_level"]
            | null
          display_name: string
          email: string
          id?: string
          masked_email?: string | null
          phone?: string | null
          proposed_at?: string | null
          rating?: number | null
          rejected_at?: string | null
          stage_changed_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          wingman_notes?: string | null
        }
        Update: {
          application_responses?: Json | null
          applied_at?: string | null
          approved_at?: string | null
          avatar_url?: string | null
          bio?: string | null
          campaign_id?: string
          created_at?: string | null
          current_stage?: Database["public"]["Enums"]["pipeline_stage"]
          disclosure_level?:
            | Database["public"]["Enums"]["identity_disclosure_level"]
            | null
          display_name?: string
          email?: string
          id?: string
          masked_email?: string | null
          phone?: string | null
          proposed_at?: string | null
          rating?: number | null
          rejected_at?: string | null
          stage_changed_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          wingman_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delegations: {
        Row: {
          accepted_at: string | null
          calendar_access_granted: boolean | null
          calendar_credentials_encrypted: string | null
          calendar_provider: string | null
          can_book_directly: boolean | null
          can_message_candidates: boolean | null
          can_propose_times: boolean | null
          can_view_calendar: boolean | null
          created_at: string | null
          id: string
          is_active: boolean | null
          revoked_at: string | null
          single_id: string
          trust_level: Database["public"]["Enums"]["trust_level"]
          updated_at: string | null
          wingman_id: string
        }
        Insert: {
          accepted_at?: string | null
          calendar_access_granted?: boolean | null
          calendar_credentials_encrypted?: string | null
          calendar_provider?: string | null
          can_book_directly?: boolean | null
          can_message_candidates?: boolean | null
          can_propose_times?: boolean | null
          can_view_calendar?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          revoked_at?: string | null
          single_id: string
          trust_level?: Database["public"]["Enums"]["trust_level"]
          updated_at?: string | null
          wingman_id: string
        }
        Update: {
          accepted_at?: string | null
          calendar_access_granted?: boolean | null
          calendar_credentials_encrypted?: string | null
          calendar_provider?: string | null
          can_book_directly?: boolean | null
          can_message_candidates?: boolean | null
          can_propose_times?: boolean | null
          can_view_calendar?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          revoked_at?: string | null
          single_id?: string
          trust_level?: Database["public"]["Enums"]["trust_level"]
          updated_at?: string | null
          wingman_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delegations_single_id_fkey"
            columns: ["single_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegations_wingman_id_fkey"
            columns: ["wingman_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          booking_id: string
          chemistry_rating: number | null
          created_at: string | null
          from_role: Database["public"]["Enums"]["user_role"]
          from_user_id: string
          highlights: string | null
          id: string
          improvements: string | null
          overall_rating: number | null
          private_notes: string | null
          safety_concerns: boolean | null
          safety_details: string | null
          would_meet_again: boolean | null
        }
        Insert: {
          booking_id: string
          chemistry_rating?: number | null
          created_at?: string | null
          from_role: Database["public"]["Enums"]["user_role"]
          from_user_id: string
          highlights?: string | null
          id?: string
          improvements?: string | null
          overall_rating?: number | null
          private_notes?: string | null
          safety_concerns?: boolean | null
          safety_details?: string | null
          would_meet_again?: boolean | null
        }
        Update: {
          booking_id?: string
          chemistry_rating?: number | null
          created_at?: string | null
          from_role?: Database["public"]["Enums"]["user_role"]
          from_user_id?: string
          highlights?: string | null
          id?: string
          improvements?: string | null
          overall_rating?: number | null
          private_notes?: string | null
          safety_concerns?: boolean | null
          safety_details?: string | null
          would_meet_again?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          campaign_id: string
          candidate_alias: string
          candidate_id: string
          candidate_masked_email: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_message_at: string | null
          other_alias: string
          other_masked_email: string
          other_participant_id: string
          other_participant_role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          campaign_id: string
          candidate_alias: string
          candidate_id: string
          candidate_masked_email: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          other_alias: string
          other_masked_email: string
          other_participant_id: string
          other_participant_role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          campaign_id?: string
          candidate_alias?: string
          candidate_id?: string
          candidate_masked_email?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          other_alias?: string
          other_masked_email?: string
          other_participant_id?: string
          other_participant_role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_other_participant_id_fkey"
            columns: ["other_participant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          external_message_id: string | null
          id: string
          is_inbound: boolean | null
          read_at: string | null
          sender_id: string
          sender_role: Database["public"]["Enums"]["user_role"]
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          external_message_id?: string | null
          id?: string
          is_inbound?: boolean | null
          read_at?: string | null
          sender_id: string
          sender_role: Database["public"]["Enums"]["user_role"]
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          external_message_id?: string | null
          id?: string
          is_inbound?: boolean | null
          read_at?: string | null
          sender_id?: string
          sender_role?: Database["public"]["Enums"]["user_role"]
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      outbox: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          next_retry_at: string | null
          payload: Json
          processed_at: string | null
          retry_count: number | null
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          next_retry_at?: string | null
          payload: Json
          processed_at?: string | null
          retry_count?: number | null
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          next_retry_at?: string | null
          payload?: Json
          processed_at?: string | null
          retry_count?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          id: string
          notification_preferences: Json | null
          phone: string | null
          roles: Database["public"]["Enums"]["user_role"][] | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id: string
          notification_preferences?: Json | null
          phone?: string | null
          roles?: Database["public"]["Enums"]["user_role"][] | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          notification_preferences?: Json | null
          phone?: string | null
          roles?: Database["public"]["Enums"]["user_role"][] | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      safety_check_ins: {
        Row: {
          booking_id: string
          created_at: string | null
          due_at: string
          emergency_contact_notified_at: string | null
          escalated_at: string | null
          escalation_reason: string | null
          id: string
          location_accuracy_meters: number | null
          location_lat: number | null
          location_lng: number | null
          requested_at: string
          responded_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          due_at: string
          emergency_contact_notified_at?: string | null
          escalated_at?: string | null
          escalation_reason?: string | null
          id?: string
          location_accuracy_meters?: number | null
          location_lat?: number | null
          location_lng?: number | null
          requested_at: string
          responded_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          due_at?: string
          emergency_contact_notified_at?: string | null
          escalated_at?: string | null
          escalation_reason?: string | null
          id?: string
          location_accuracy_meters?: number | null
          location_lat?: number | null
          location_lng?: number | null
          requested_at?: string
          responded_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_check_ins_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_check_ins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      booking_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "no_show"
      event_type:
        | "booking_requested"
        | "booking_confirmed"
        | "booking_cancelled"
        | "booking_rescheduled"
        | "booking_completed"
        | "booking_no_show"
        | "candidate_applied"
        | "candidate_stage_changed"
        | "candidate_approved"
        | "candidate_rejected"
        | "candidate_archived"
        | "check_in_requested"
        | "check_in_received"
        | "check_in_missed"
        | "location_shared"
        | "emergency_triggered"
      identity_disclosure_level:
        | "anonymous"
        | "first_name"
        | "full_profile"
        | "contact_shared"
      pipeline_stage:
        | "new"
        | "screening"
        | "proposed"
        | "approved"
        | "scheduled"
        | "completed"
        | "rejected"
        | "archived"
      trust_level: "full_delegation" | "approval_required" | "view_only"
      user_role: "wingman" | "single" | "candidate"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      booking_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "no_show",
      ],
      event_type: [
        "booking_requested",
        "booking_confirmed",
        "booking_cancelled",
        "booking_rescheduled",
        "booking_completed",
        "booking_no_show",
        "candidate_applied",
        "candidate_stage_changed",
        "candidate_approved",
        "candidate_rejected",
        "candidate_archived",
        "check_in_requested",
        "check_in_received",
        "check_in_missed",
        "location_shared",
        "emergency_triggered",
      ],
      identity_disclosure_level: [
        "anonymous",
        "first_name",
        "full_profile",
        "contact_shared",
      ],
      pipeline_stage: [
        "new",
        "screening",
        "proposed",
        "approved",
        "scheduled",
        "completed",
        "rejected",
        "archived",
      ],
      trust_level: ["full_delegation", "approval_required", "view_only"],
      user_role: ["wingman", "single", "candidate"],
    },
  },
} as const

