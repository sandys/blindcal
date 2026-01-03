import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

type PipelineStage = Database['public']['Enums']['pipeline_stage']

const VALID_STAGES: PipelineStage[] = [
  'new',
  'screening',
  'proposed',
  'approved',
  'scheduled',
  'completed',
  'rejected',
  'archived',
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

    const { data: candidate, error } = await supabase
      .from('candidates')
      .select(`
        *,
        campaign:campaigns!candidates_campaign_id_fkey(
          id,
          title,
          wingman_id,
          single_id
        )
      `)
      .eq('id', id)
      .single()

    if (error || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    // Check access
    const campaign = candidate.campaign as { wingman_id: string; single_id: string } | null
    if (campaign?.wingman_id !== user.id && campaign?.single_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({ candidate })
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

    // Get existing candidate with campaign info
    const { data: existingCandidate, error: fetchError } = await supabase
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
      .eq('id', id)
      .single()

    if (fetchError || !existingCandidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    const campaign = existingCandidate.campaign as {
      wingman_id: string
      single_id: string
      delegation: { trust_level: string } | null
    } | null

    const isWingman = campaign?.wingman_id === user.id
    const isSingle = campaign?.single_id === user.id
    const trustLevel = campaign?.delegation?.trust_level

    if (!isWingman && !isSingle) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Handle stage change
    if (body.current_stage) {
      const newStage = body.current_stage as PipelineStage
      const oldStage = existingCandidate.current_stage

      if (!VALID_STAGES.includes(newStage)) {
        return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
      }

      // Check permissions for stage changes
      // Singles can only approve candidates in 'proposed' stage
      if (isSingle && !isWingman) {
        if (newStage === 'approved' && oldStage !== 'proposed') {
          return NextResponse.json(
            { error: 'Can only approve candidates that are proposed' },
            { status: 403 }
          )
        }
        if (newStage !== 'approved' && newStage !== 'rejected') {
          return NextResponse.json(
            { error: 'Singles can only approve or reject candidates' },
            { status: 403 }
          )
        }
      }

      // Wingman with view_only can't change stages
      if (isWingman && trustLevel === 'view_only') {
        return NextResponse.json(
          { error: 'View-only wingmen cannot change candidate stages' },
          { status: 403 }
        )
      }

      // Update stage timestamps
      const stageUpdates: Record<string, unknown> = {
        current_stage: newStage,
        stage_changed_at: new Date().toISOString(),
      }

      if (newStage === 'proposed' && oldStage !== 'proposed') {
        stageUpdates.proposed_at = new Date().toISOString()
      }
      if (newStage === 'approved' && oldStage !== 'approved') {
        stageUpdates.approved_at = new Date().toISOString()
      }
      if (newStage === 'rejected' && oldStage !== 'rejected') {
        stageUpdates.rejected_at = new Date().toISOString()
      }

      const { data: candidate, error: updateError } = await supabase
        .from('candidates')
        .update(stageUpdates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      // Create candidate event
      await supabase.from('candidate_events').insert({
        candidate_id: id,
        event_type: 'candidate_stage_changed',
        event_data: {
          from_stage: oldStage,
          to_stage: newStage,
        },
        from_stage: oldStage,
        to_stage: newStage,
        actor_id: user.id,
        actor_role: isWingman ? 'wingman' : 'single',
      })

      return NextResponse.json({ candidate })
    }

    // Handle other updates (notes, rating, etc.)
    const allowedFields = ['wingman_notes', 'rating', 'disclosure_level']
    const updates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: candidate, error: updateError } = await supabase
      .from('candidates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ candidate })
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

    // Get candidate with campaign info
    const { data: candidate, error: fetchError } = await supabase
      .from('candidates')
      .select(`
        *,
        campaign:campaigns!candidates_campaign_id_fkey(wingman_id)
      `)
      .eq('id', id)
      .single()

    if (fetchError || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    // Only wingman can delete candidates
    const campaign = candidate.campaign as { wingman_id: string } | null
    if (campaign?.wingman_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Don't allow deleting candidates with bookings
    const { count } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('candidate_id', id)

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete candidate with existing bookings' },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from('candidates')
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
