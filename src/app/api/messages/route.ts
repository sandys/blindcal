import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

type UserRole = Database['public']['Enums']['user_role']

function generateAlias(): string {
  const adjectives = ['Swift', 'Bright', 'Kind', 'Calm', 'Bold', 'Warm', 'Wise', 'True']
  const nouns = ['Star', 'Moon', 'Sun', 'Cloud', 'Wave', 'Wind', 'Light', 'Dream']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 100)
  return `${adj}${noun}${num}`
}

function generateMaskedEmail(threadId: string, role: string): string {
  return `thread-${threadId.slice(0, 8)}-${role}@relay.blindcal.app`
}

// GET all threads for current user
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get threads where user is either candidate or other_participant
    // First get threads where user is the other_participant (wingman/single)
    const { data: threads, error } = await supabase
      .from('message_threads')
      .select(`
        *,
        candidate:candidates!message_threads_candidate_id_fkey(
          id,
          display_name,
          email
        ),
        campaign:campaigns!message_threads_campaign_id_fkey(
          id,
          title
        )
      `)
      .eq('other_participant_id', user.id)
      .eq('is_active', true)
      .order('last_message_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also get threads where user is a candidate (via user_id in candidates table)
    const { data: candidateThreads } = await supabase
      .from('candidates')
      .select(`
        id,
        threads:message_threads(
          *,
          campaign:campaigns!message_threads_campaign_id_fkey(
            id,
            title
          )
        )
      `)
      .eq('user_id', user.id)

    // Flatten candidate threads and add to main threads
    const allThreads = [...(threads || [])]

    if (candidateThreads) {
      for (const candidate of candidateThreads) {
        const candidateThreadsList = candidate.threads as unknown as typeof threads
        if (candidateThreadsList) {
          allThreads.push(
            ...candidateThreadsList.filter((t) => t.is_active)
          )
        }
      }
    }

    // Remove duplicates and sort
    const uniqueThreads = Array.from(
      new Map(allThreads.map((t) => [t.id, t])).values()
    ).sort((a, b) => {
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
      return bTime - aTime
    })

    return NextResponse.json({ threads: uniqueThreads })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create a new thread
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { candidate_id, campaign_id } = body

    if (!candidate_id || !campaign_id) {
      return NextResponse.json(
        { error: 'candidate_id and campaign_id are required' },
        { status: 400 }
      )
    }

    // Get campaign to verify access and determine user's role
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('wingman_id, single_id')
      .eq('id', campaign_id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const isWingman = campaign.wingman_id === user.id
    const isSingle = campaign.single_id === user.id

    if (!isWingman && !isSingle) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if thread already exists
    const { data: existingThread } = await supabase
      .from('message_threads')
      .select('*')
      .eq('candidate_id', candidate_id)
      .eq('other_participant_id', user.id)
      .single()

    if (existingThread) {
      return NextResponse.json({ thread: existingThread })
    }

    // Create new thread
    const threadId = crypto.randomUUID()
    const userRole: UserRole = isWingman ? 'wingman' : 'single'

    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .insert({
        id: threadId,
        campaign_id,
        candidate_id,
        candidate_alias: generateAlias(),
        candidate_masked_email: generateMaskedEmail(threadId, 'candidate'),
        other_participant_id: user.id,
        other_participant_role: userRole,
        other_alias: generateAlias(),
        other_masked_email: generateMaskedEmail(threadId, userRole),
        is_active: true,
      })
      .select()
      .single()

    if (threadError) {
      return NextResponse.json({ error: threadError.message }, { status: 500 })
    }

    return NextResponse.json({ thread }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
