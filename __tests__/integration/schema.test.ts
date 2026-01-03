import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

describe('Database Schema', () => {
  let supabase: ReturnType<typeof createClient<Database>>

  beforeAll(() => {
    supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  })

  describe('Tables exist', () => {
    const expectedTables = [
      'profiles',
      'delegations',
      'campaigns',
      'candidates',
      'bookings',
      'booking_events',
      'candidate_events',
      'outbox',
      'message_threads',
      'messages',
      'safety_check_ins',
      'feedback',
    ]

    it.each(expectedTables)('table %s exists and is queryable', async (tableName) => {
      const { error } = await supabase
        .from(tableName as keyof Database['public']['Tables'])
        .select('*')
        .limit(0)

      expect(error).toBeNull()
    })
  })

  describe('Enums', () => {
    it('user_role enum works via profiles.roles', async () => {
      const { error } = await supabase
        .from('profiles')
        .select('roles')
        .limit(0)

      expect(error).toBeNull()
    })

    it('trust_level enum exists', async () => {
      const { error } = await supabase
        .from('delegations')
        .select('trust_level')
        .limit(0)

      expect(error).toBeNull()
    })

    it('pipeline_stage enum exists', async () => {
      const { error } = await supabase
        .from('candidates')
        .select('current_stage')
        .limit(0)

      expect(error).toBeNull()
    })

    it('booking_status enum exists', async () => {
      const { error } = await supabase
        .from('bookings')
        .select('status')
        .limit(0)

      expect(error).toBeNull()
    })

    it('identity_disclosure_level enum exists', async () => {
      const { error } = await supabase
        .from('campaigns')
        .select('initial_disclosure_level')
        .limit(0)

      expect(error).toBeNull()
    })

    it('event_type enum exists', async () => {
      const { error } = await supabase
        .from('booking_events')
        .select('event_type')
        .limit(0)

      expect(error).toBeNull()
    })
  })

  describe('Profiles table', () => {
    it('has correct columns', async () => {
      const { error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          display_name,
          roles,
          avatar_url,
          bio,
          phone,
          timezone,
          emergency_contact_name,
          emergency_contact_phone,
          notification_preferences,
          created_at,
          updated_at
        `)
        .limit(0)

      expect(error).toBeNull()
    })
  })

  describe('Delegations table', () => {
    it('has correct columns for wingman-single relationship', async () => {
      const { error } = await supabase
        .from('delegations')
        .select(`
          id,
          wingman_id,
          single_id,
          trust_level,
          is_active,
          accepted_at,
          revoked_at,
          can_view_calendar,
          can_propose_times,
          can_book_directly,
          can_message_candidates,
          calendar_provider,
          calendar_access_granted,
          created_at,
          updated_at
        `)
        .limit(0)

      expect(error).toBeNull()
    })
  })

  describe('Campaigns table', () => {
    it('has correct columns', async () => {
      const { error } = await supabase
        .from('campaigns')
        .select(`
          id,
          delegation_id,
          wingman_id,
          single_id,
          title,
          slug,
          tagline,
          description,
          is_published,
          is_accepting_applications,
          published_at,
          initial_disclosure_level,
          cover_image_url,
          gallery_urls,
          theme_config,
          custom_css,
          template_id,
          custom_template,
          requires_photo,
          requires_bio,
          application_questions,
          auto_reject_incomplete,
          max_active_candidates,
          created_at,
          updated_at
        `)
        .limit(0)

      expect(error).toBeNull()
    })
  })

  describe('Candidates table', () => {
    it('has correct columns', async () => {
      const { error } = await supabase
        .from('candidates')
        .select(`
          id,
          campaign_id,
          user_id,
          email,
          masked_email,
          phone,
          display_name,
          avatar_url,
          bio,
          current_stage,
          disclosure_level,
          application_responses,
          wingman_notes,
          rating,
          applied_at,
          proposed_at,
          approved_at,
          rejected_at,
          stage_changed_at,
          created_at,
          updated_at
        `)
        .limit(0)

      expect(error).toBeNull()
    })
  })

  describe('Bookings table', () => {
    it('has correct columns', async () => {
      const { error } = await supabase
        .from('bookings')
        .select(`
          id,
          campaign_id,
          candidate_id,
          wingman_id,
          single_id,
          status,
          title,
          description,
          start_time,
          end_time,
          timezone,
          location_type,
          location_details,
          requires_approval,
          approved_by,
          approved_at,
          single_confirmed,
          candidate_confirmed,
          external_booking_id,
          external_event_type_id,
          rescheduled_from,
          reschedule_count,
          safety_check_in_enabled,
          safety_check_in_interval_minutes,
          emergency_contact_notified,
          feedback_requested_at,
          feedback_completed_at,
          created_at,
          updated_at
        `)
        .limit(0)

      expect(error).toBeNull()
    })
  })

  describe('Event sourcing tables', () => {
    it('booking_events has correct structure', async () => {
      const { error } = await supabase
        .from('booking_events')
        .select(`
          id,
          booking_id,
          event_type,
          event_data,
          actor_id,
          actor_role,
          correlation_id,
          idempotency_key,
          source,
          created_at
        `)
        .limit(0)

      expect(error).toBeNull()
    })

    it('candidate_events has correct structure', async () => {
      const { error } = await supabase
        .from('candidate_events')
        .select(`
          id,
          candidate_id,
          event_type,
          event_data,
          from_stage,
          to_stage,
          actor_id,
          actor_role,
          idempotency_key,
          created_at
        `)
        .limit(0)

      expect(error).toBeNull()
    })

    it('outbox has correct structure for transactional outbox pattern', async () => {
      const { error } = await supabase
        .from('outbox')
        .select(`
          id,
          aggregate_type,
          aggregate_id,
          event_type,
          payload,
          processed_at,
          retry_count,
          next_retry_at,
          error_message,
          created_at
        `)
        .limit(0)

      expect(error).toBeNull()
    })
  })

  describe('Messaging tables', () => {
    it('message_threads has correct structure', async () => {
      const { error } = await supabase
        .from('message_threads')
        .select(`
          id,
          candidate_id,
          campaign_id,
          other_participant_id,
          other_participant_role,
          candidate_alias,
          other_alias,
          candidate_masked_email,
          other_masked_email,
          is_active,
          last_message_at,
          created_at
        `)
        .limit(0)

      expect(error).toBeNull()
    })

    it('messages has correct structure', async () => {
      const { error } = await supabase
        .from('messages')
        .select(`
          id,
          thread_id,
          sender_id,
          sender_role,
          content,
          is_inbound,
          external_message_id,
          read_at,
          created_at
        `)
        .limit(0)

      expect(error).toBeNull()
    })
  })

  describe('Safety and feedback tables', () => {
    it('safety_check_ins has correct structure', async () => {
      const { error } = await supabase
        .from('safety_check_ins')
        .select(`
          id,
          booking_id,
          user_id,
          status,
          requested_at,
          due_at,
          responded_at,
          location_lat,
          location_lng,
          location_accuracy_meters,
          escalated_at,
          escalation_reason,
          emergency_contact_notified_at,
          created_at
        `)
        .limit(0)

      expect(error).toBeNull()
    })

    it('feedback has correct structure', async () => {
      const { error } = await supabase
        .from('feedback')
        .select(`
          id,
          booking_id,
          from_user_id,
          from_role,
          overall_rating,
          chemistry_rating,
          would_meet_again,
          highlights,
          improvements,
          private_notes,
          safety_concerns,
          safety_details,
          created_at
        `)
        .limit(0)

      expect(error).toBeNull()
    })
  })
})
