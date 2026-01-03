import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

describe('Bookings API', () => {
  let supabase: ReturnType<typeof createClient<Database>>
  let wingmanUserId: string
  let singleUserId: string
  let delegationId: string
  let campaignId: string
  let candidateId: string
  const createdBookingIds: string[] = []

  beforeAll(async () => {
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

    // Create test users
    const { data: wingman } = await supabase.auth.admin.createUser({
      email: `test-booking-wingman-${Date.now()}@example.com`,
      password: 'testpassword123',
      email_confirm: true,
    })
    wingmanUserId = wingman.user!.id

    const { data: single } = await supabase.auth.admin.createUser({
      email: `test-booking-single-${Date.now()}@example.com`,
      password: 'testpassword123',
      email_confirm: true,
    })
    singleUserId = single.user!.id

    // Create delegation
    const { data: delegation } = await supabase
      .from('delegations')
      .insert({
        wingman_id: wingmanUserId,
        single_id: singleUserId,
        trust_level: 'approval_required',
        is_active: true,
        accepted_at: new Date().toISOString(),
      })
      .select()
      .single()
    delegationId = delegation!.id

    // Create campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .insert({
        delegation_id: delegationId,
        wingman_id: wingmanUserId,
        single_id: singleUserId,
        title: 'Booking Test Campaign',
        slug: `booking-test-${Date.now()}`,
        is_published: true,
        is_accepting_applications: true,
      })
      .select()
      .single()
    campaignId = campaign!.id

    // Create an approved candidate
    const { data: candidate } = await supabase
      .from('candidates')
      .insert({
        campaign_id: campaignId,
        email: `booking-candidate-${Date.now()}@example.com`,
        display_name: 'Test Booking Candidate',
        bio: 'Test bio',
        current_stage: 'approved',
        applied_at: new Date().toISOString(),
        approved_at: new Date().toISOString(),
      })
      .select()
      .single()
    candidateId = candidate!.id
  })

  afterAll(async () => {
    // Clean up bookings
    for (const id of createdBookingIds) {
      await supabase.from('booking_events').delete().eq('booking_id', id)
      await supabase.from('bookings').delete().eq('id', id)
    }
    // Clean up candidate events and candidate
    if (candidateId) {
      await supabase.from('candidate_events').delete().eq('candidate_id', candidateId)
      await supabase.from('candidates').delete().eq('id', candidateId)
    }
    if (campaignId) await supabase.from('campaigns').delete().eq('id', campaignId)
    if (delegationId) await supabase.from('delegations').delete().eq('id', delegationId)
    if (wingmanUserId) await supabase.auth.admin.deleteUser(wingmanUserId)
    if (singleUserId) await supabase.auth.admin.deleteUser(singleUserId)
  })

  async function createTestBooking(overrides = {}) {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    const endDate = new Date(futureDate.getTime() + 2 * 60 * 60 * 1000) // 2 hours later

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        candidate_id: candidateId,
        campaign_id: campaignId,
        wingman_id: wingmanUserId,
        single_id: singleUserId,
        title: 'Test Booking',
        start_time: futureDate.toISOString(),
        end_time: endDate.toISOString(),
        timezone: 'UTC',
        status: 'pending',
        ...overrides,
      })
      .select()
      .single()

    if (booking) {
      createdBookingIds.push(booking.id)
    }
    return { booking, error }
  }

  describe('Booking creation', () => {
    it('should create a pending booking', async () => {
      const { booking, error } = await createTestBooking()

      expect(error).toBeNull()
      expect(booking).not.toBeNull()
      expect(booking?.status).toBe('pending')
      expect(booking?.candidate_id).toBe(candidateId)
    })

    it('should create a confirmed booking with full_delegation', async () => {
      // Update delegation to full_delegation
      await supabase
        .from('delegations')
        .update({ trust_level: 'full_delegation' })
        .eq('id', delegationId)

      const { booking, error } = await createTestBooking({
        status: 'confirmed',
        approved_at: new Date().toISOString(),
        approved_by: wingmanUserId,
      })

      expect(error).toBeNull()
      expect(booking?.status).toBe('confirmed')

      // Restore trust level
      await supabase
        .from('delegations')
        .update({ trust_level: 'approval_required' })
        .eq('id', delegationId)
    })
  })

  describe('Booking status transitions', () => {
    it('should confirm a pending booking', async () => {
      const { booking: created } = await createTestBooking()

      const { data: booking, error } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          approved_at: new Date().toISOString(),
          approved_by: singleUserId,
        })
        .eq('id', created!.id)
        .select()
        .single()

      expect(error).toBeNull()
      expect(booking?.status).toBe('confirmed')
      expect(booking?.approved_by).toBe(singleUserId)
    })

    it('should cancel a confirmed booking', async () => {
      const { booking: created } = await createTestBooking({
        status: 'confirmed',
        approved_at: new Date().toISOString(),
        approved_by: singleUserId,
      })

      const { data: booking, error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
        })
        .eq('id', created!.id)
        .select()
        .single()

      expect(error).toBeNull()
      expect(booking?.status).toBe('cancelled')
    })

    it('should complete a booking', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      const pastEndDate = new Date(pastDate.getTime() + 2 * 60 * 60 * 1000)

      const { booking: created } = await createTestBooking({
        status: 'confirmed',
        start_time: pastDate.toISOString(),
        end_time: pastEndDate.toISOString(),
      })

      const { data: booking, error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', created!.id)
        .select()
        .single()

      expect(error).toBeNull()
      expect(booking?.status).toBe('completed')
    })

    it('should mark as no_show', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      const pastEndDate = new Date(pastDate.getTime() + 2 * 60 * 60 * 1000)

      const { booking: created } = await createTestBooking({
        status: 'confirmed',
        start_time: pastDate.toISOString(),
        end_time: pastEndDate.toISOString(),
      })

      const { data: booking, error } = await supabase
        .from('bookings')
        .update({ status: 'no_show' })
        .eq('id', created!.id)
        .select()
        .single()

      expect(error).toBeNull()
      expect(booking?.status).toBe('no_show')
    })
  })

  describe('Booking queries', () => {
    it('should filter bookings by campaign', async () => {
      await createTestBooking()

      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('campaign_id', campaignId)

      expect(error).toBeNull()
      expect(bookings?.length).toBeGreaterThan(0)
    })

    it('should filter bookings by status', async () => {
      await createTestBooking({ status: 'pending' })

      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('status', 'pending')

      expect(error).toBeNull()
      expect(bookings?.every((b) => b.status === 'pending')).toBe(true)
    })

    it('should fetch booking with candidate details', async () => {
      const { booking: created } = await createTestBooking()

      const { data: booking, error } = await supabase
        .from('bookings')
        .select(`
          *,
          candidate:candidates!bookings_candidate_id_fkey(
            id,
            display_name,
            email
          )
        `)
        .eq('id', created!.id)
        .single()

      expect(error).toBeNull()
      expect(booking?.candidate).not.toBeNull()
      expect((booking?.candidate as { display_name: string })?.display_name).toBe('Test Booking Candidate')
    })
  })

  describe('Booking events', () => {
    it('should create booking event on status change', async () => {
      const { booking: created } = await createTestBooking()

      // Insert a booking event
      const { data: event, error: eventError } = await supabase
        .from('booking_events')
        .insert({
          booking_id: created!.id,
          event_type: 'booking_confirmed',
          actor_id: singleUserId,
          actor_role: 'single',
          event_data: {
            from_status: 'pending',
            to_status: 'confirmed',
          },
        })
        .select()
        .single()

      expect(eventError).toBeNull()
      expect(event?.event_type).toBe('booking_confirmed')
      expect((event?.event_data as { from_status: string })?.from_status).toBe('pending')
      expect((event?.event_data as { to_status: string })?.to_status).toBe('confirmed')
    })

    it('should query booking events', async () => {
      const { booking: created } = await createTestBooking()

      // Insert some events
      await supabase.from('booking_events').insert({
        booking_id: created!.id,
        event_type: 'booking_requested',
        actor_id: wingmanUserId,
        actor_role: 'wingman',
        event_data: { status: 'pending' },
      })

      const { data: events, error } = await supabase
        .from('booking_events')
        .select('*')
        .eq('booking_id', created!.id)
        .order('created_at', { ascending: false })

      expect(error).toBeNull()
      expect(events?.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Booking constraints', () => {
    it('should require valid candidate', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      const endDate = new Date(futureDate.getTime() + 2 * 60 * 60 * 1000)

      const { error } = await supabase
        .from('bookings')
        .insert({
          candidate_id: '00000000-0000-0000-0000-000000000000',
          campaign_id: campaignId,
          wingman_id: wingmanUserId,
          single_id: singleUserId,
          title: 'Test Booking',
          start_time: futureDate.toISOString(),
          end_time: endDate.toISOString(),
          timezone: 'UTC',
          status: 'pending',
        })

      expect(error).not.toBeNull()
    })

    it('should enforce valid booking status', async () => {
      const { booking: created } = await createTestBooking()

      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'invalid_status' as Database['public']['Enums']['booking_status'],
        })
        .eq('id', created!.id)

      expect(error).not.toBeNull()
    })
  })
})
