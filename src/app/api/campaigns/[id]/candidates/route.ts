import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

type PipelineStage = Database['public']['Enums']['pipeline_stage']

const VALID_STAGES: PipelineStage[] = [
  'new', 'screening', 'proposed', 'approved', 'scheduled', 'completed', 'rejected', 'archived',
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

    // Check user has access to this campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('wingman_id, single_id')
      .eq('id', id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.wingman_id !== user.id && campaign.single_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get candidates
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')

    let query = supabase
      .from('candidates')
      .select('*')
      .eq('campaign_id', id)
      .order('stage_changed_at', { ascending: false })

    if (stage && VALID_STAGES.includes(stage as PipelineStage)) {
      query = query.eq('current_stage', stage as PipelineStage)
    }

    const { data: candidates, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ candidates })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
