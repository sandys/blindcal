import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

type BookingStatus = Database['public']['Enums']['booking_status']

const VALID_STATUSES: BookingStatus[] = [
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show',
]

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        candidate:candidates!bookings_candidate_id_fkey(
          id,
          display_name,
          email,
          phone,
          bio,
          photo_urls
        ),
        campaign:campaigns!bookings_campaign_id_fkey(
          id,
          title
        )
      `)
      .eq('id', id)
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check access
    if (booking.wingman_id !== user.id && booking.single_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({ booking })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Get existing booking
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        campaign:campaigns!bookings_campaign_id_fkey(
          delegation:delegations!campaigns_delegation_id_fkey(trust_level)
        )
      `)
      .eq('id', id)
      .single()

    if (fetchError || !existingBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const isWingman = existingBooking.wingman_id === user.id
    const isSingle = existingBooking.single_id === user.id
    const campaign = existingBooking.campaign as {
      delegation: { trust_level: string } | null
    } | null
    const trustLevel = campaign?.delegation?.trust_level

    if (!isWingman && !isSingle) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Handle status change
    if (body.status) {
      const newStatus = body.status as BookingStatus
      const oldStatus = existingBooking.status

      if (!VALID_STATUSES.includes(newStatus)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }

      // Validation based on who is making the change
      if (newStatus === 'confirmed' && oldStatus === 'pending') {
        // Only single can approve (or wingman with full_delegation)
        if (isSingle || (isWingman && trustLevel === 'full_delegation')) {
          // OK to confirm
        } else {
          return NextResponse.json(
            { error: 'Only the single can approve bookings' },
            { status: 403 }
          )
        }
      }

      if (newStatus === 'cancelled') {
        // Both wingman and single can cancel
        // But only if booking is pending or confirmed
        if (!['pending', 'confirmed'].includes(oldStatus)) {
          return NextResponse.json(
            { error: 'Cannot cancel a booking that is already completed or cancelled' },
            { status: 400 }
          )
        }
      }

      if (newStatus === 'completed' || newStatus === 'no_show') {
        // Only can mark completed/no_show after the booking time has passed
        const bookingEnd = new Date(existingBooking.end_time)
        if (bookingEnd > new Date()) {
          return NextResponse.json(
            { error: 'Cannot mark booking as completed before it ends' },
            { status: 400 }
          )
        }
      }

      const updates: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      }

      if (newStatus === 'confirmed') {
        updates.approved_at = new Date().toISOString()
        updates.approved_by = user.id
      }

      // Note: cancellation details are tracked in booking_events, not the bookings table

      const { data: booking, error: updateError } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      // Map status to event type
      const eventTypeMap: Record<string, Database['public']['Enums']['event_type']> = {
        confirmed: 'booking_confirmed',
        cancelled: 'booking_cancelled',
        completed: 'booking_completed',
        no_show: 'booking_no_show',
      }
      const eventType = eventTypeMap[newStatus] || 'booking_requested'

      // Create booking event
      await supabase.from('booking_events').insert({
        booking_id: id,
        event_type: eventType,
        actor_id: user.id,
        actor_role: isWingman ? 'wingman' : 'single',
        event_data: {
          from_status: oldStatus,
          to_status: newStatus,
          ...(body.reason && { reason: body.reason }),
        },
      })

      // Update candidate stage based on booking status
      if (newStatus === 'confirmed' || newStatus === 'cancelled') {
        const candidateStage = newStatus === 'confirmed' ? 'scheduled' : 'approved'
        await supabase
          .from('candidates')
          .update({ current_stage: candidateStage })
          .eq('id', existingBooking.candidate_id)
      }

      if (newStatus === 'completed') {
        await supabase
          .from('candidates')
          .update({ current_stage: 'completed' })
          .eq('id', existingBooking.candidate_id)
      }

      return NextResponse.json({ booking })
    }

    // Handle other updates (notes, location, etc.) - only wingman or full_delegation single
    if (!isWingman && trustLevel !== 'full_delegation') {
      return NextResponse.json(
        { error: 'Only wingmen can update booking details' },
        { status: 403 }
      )
    }

    const allowedFields = ['description', 'location_details', 'title']
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: booking, error: updateError } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ booking })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get booking
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Only wingman can delete bookings
    if (booking.wingman_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Can only delete pending bookings
    if (booking.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only delete pending bookings. Use cancel instead.' },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
