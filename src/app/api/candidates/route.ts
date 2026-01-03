import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })
    }

    // Verify user has access to this campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, wingman_id, single_id')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.wingman_id !== user.id && campaign.single_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get candidates for this campaign
    const { data: candidates, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ candidates })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { campaignId, email, displayName, phone, bio } = body

    if (!campaignId || !email || !displayName) {
      return NextResponse.json(
        { error: 'campaignId, email, and displayName are required' },
        { status: 400 }
      )
    }

    // Verify the campaign exists and is accepting applications
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, is_published, is_accepting_applications, requires_bio, initial_disclosure_level')
      .eq('id', campaignId)
      .eq('is_published', true)
      .eq('is_accepting_applications', true)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or not accepting applications' },
        { status: 404 }
      )
    }

    // Check if bio is required
    if (campaign.requires_bio && !bio) {
      return NextResponse.json({ error: 'Bio is required' }, { status: 400 })
    }

    // Check for existing application with same email
    const { data: existingCandidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('email', email)
      .single()

    if (existingCandidate) {
      return NextResponse.json(
        { error: 'An application with this email already exists' },
        { status: 409 }
      )
    }

    // Create the candidate
    const { data: candidate, error: createError } = await supabase
      .from('candidates')
      .insert({
        campaign_id: campaignId,
        email,
        display_name: displayName,
        phone: phone || null,
        bio: bio || null,
        current_stage: 'new',
        disclosure_level: campaign.initial_disclosure_level,
        applied_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // Create a candidate event for the application
    await supabase.from('candidate_events').insert({
      candidate_id: candidate.id,
      event_type: 'candidate_applied',
      event_data: {
        email,
        display_name: displayName,
      },
      to_stage: 'new',
    })

    return NextResponse.json({ candidate }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
