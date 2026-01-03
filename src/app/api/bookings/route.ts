import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

type BookingStatus = Database['public']['Enums']['booking_status']

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaign_id')
    const candidateId = searchParams.get('candidate_id')
    const status = searchParams.get('status') as BookingStatus | null

    let query = supabase
      .from('bookings')
      .select(`
        *,
        candidate:candidates!bookings_candidate_id_fkey(
          id,
          display_name,
          email,
          phone
        ),
        campaign:campaigns!bookings_campaign_id_fkey(
          id,
          title
        )
      `)
      .or(`wingman_id.eq.${user.id},single_id.eq.${user.id}`)
      .order('start_time', { ascending: true })

    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    if (candidateId) {
      query = query.eq('candidate_id', candidateId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: bookings, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ bookings })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const {
      candidate_id,
      campaign_id,
      start_time,
      end_time,
      title,
      location,
      notes,
      timezone,
    } = body

    if (!candidate_id || !campaign_id || !start_time || !end_time || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get candidate with campaign info
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select(`
        *,
        campaign:campaigns!candidates_campaign_id_fkey(
          id,
          wingman_id,
          single_id,
          delegation:delegations!campaigns_delegation_id_fkey(trust_level)
        )
      `)
      .eq('id', candidate_id)
      .eq('campaign_id', campaign_id)
      .single()

    if (candidateError || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    const campaign = candidate.campaign as {
      wingman_id: string
      single_id: string
      delegation: { trust_level: string } | null
    } | null

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Only wingman can create bookings (or single with full_delegation)
    const isWingman = campaign.wingman_id === user.id
    const isSingle = campaign.single_id === user.id
    const trustLevel = campaign.delegation?.trust_level

    if (!isWingman && !isSingle) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Singles can only create bookings if they have full_delegation trust level
    if (isSingle && !isWingman && trustLevel !== 'full_delegation') {
      return NextResponse.json(
        { error: 'Only wingmen can create bookings' },
        { status: 403 }
      )
    }

    // Check candidate is in approved or scheduled stage
    if (!['approved', 'scheduled'].includes(candidate.current_stage)) {
      return NextResponse.json(
        { error: 'Candidate must be approved before scheduling' },
        { status: 400 }
      )
    }

    // Determine initial status based on trust level
    let initialStatus: BookingStatus = 'pending'

    // If full_delegation, booking is confirmed immediately
    if (trustLevel === 'full_delegation') {
      initialStatus = 'confirmed'
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        candidate_id,
        campaign_id,
        wingman_id: campaign.wingman_id,
        single_id: campaign.single_id,
        start_time,
        end_time,
        title,
        location_type: location ? 'custom' : null,
        location_details: location ? { address: location } : null,
        description: notes || null,
        timezone: timezone || 'UTC',
        status: initialStatus,
        requires_approval: initialStatus === 'pending',
        ...(initialStatus === 'confirmed' && {
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        }),
      })
      .select()
      .single()

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 })
    }

    // Update candidate stage to scheduled if confirmed
    if (initialStatus === 'confirmed' && candidate.current_stage === 'approved') {
      await supabase
        .from('candidates')
        .update({ current_stage: 'scheduled' })
        .eq('id', candidate_id)
    }

    // Create booking event
    await supabase.from('booking_events').insert({
      booking_id: booking.id,
      event_type: 'booking_requested',
      actor_id: user.id,
      actor_role: isWingman ? 'wingman' : 'single',
      event_data: {
        title,
        start_time,
        end_time,
        status: initialStatus,
      },
    })

    return NextResponse.json({ booking }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
