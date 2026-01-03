import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        delegation:delegations!campaigns_delegation_id_fkey(
          id,
          trust_level,
          wingman:profiles!delegations_wingman_id_fkey(id, email, display_name, avatar_url),
          single:profiles!delegations_single_id_fkey(id, email, display_name, avatar_url)
        )
      `)
      .eq('id', id)
      .or(`wingman_id.eq.${user.id},single_id.eq.${user.id}`)
      .single()

    if (error || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json({ campaign })
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

    // Verify the campaign exists and user has access
    const { data: existingCampaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Only wingman can update campaign
    if (existingCampaign.wingman_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Only allow updating certain fields
    const allowedFields = [
      'title',
      'tagline',
      'description',
      'is_published',
      'is_accepting_applications',
      'initial_disclosure_level',
      'cover_image_url',
      'gallery_urls',
      'theme_config',
      'custom_css',
      'requires_photo',
      'requires_bio',
      'application_questions',
      'max_active_candidates',
    ]

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    // Handle publishing
    if (body.is_published === true && !existingCampaign.published_at) {
      updates.published_at = new Date().toISOString()
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: campaign, error: updateError } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        delegation:delegations!campaigns_delegation_id_fkey(
          id,
          trust_level,
          wingman:profiles!delegations_wingman_id_fkey(id, email, display_name, avatar_url),
          single:profiles!delegations_single_id_fkey(id, email, display_name, avatar_url)
        )
      `)
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ campaign })
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

    // Verify the campaign exists and user is the wingman
    const { data: existingCampaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (existingCampaign.wingman_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Don't allow deleting published campaigns with candidates
    if (existingCampaign.is_published) {
      const { count } = await supabase
        .from('candidates')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', id)

      if (count && count > 0) {
        return NextResponse.json(
          { error: 'Cannot delete a campaign with candidates. Archive it instead.' },
          { status: 400 }
        )
      }
    }

    const { error: deleteError } = await supabase
      .from('campaigns')
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
