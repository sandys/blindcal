import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

type UserRole = Database['public']['Enums']['user_role']

// GET messages in a thread
export async function GET(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get thread and verify access
    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .select(`
        *,
        candidate:candidates!message_threads_candidate_id_fkey(
          id,
          user_id,
          display_name
        )
      `)
      .eq('id', threadId)
      .single()

    if (threadError || !thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Check access - user must be either other_participant or the candidate
    const candidate = thread.candidate as { user_id: string | null } | null
    const isParticipant = thread.other_participant_id === user.id
    const isCandidate = candidate?.user_id === user.id

    if (!isParticipant && !isCandidate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get messages
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (messagesError) {
      return NextResponse.json({ error: messagesError.message }, { status: 500 })
    }

    // Mark unread messages as read
    const unreadMessages = messages?.filter(
      (m) => m.sender_id !== user.id && !m.read_at
    )

    if (unreadMessages && unreadMessages.length > 0) {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in(
          'id',
          unreadMessages.map((m) => m.id)
        )
    }

    return NextResponse.json({ thread, messages })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST send a message
export async function POST(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    // Get thread and verify access
    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .select(`
        *,
        candidate:candidates!message_threads_candidate_id_fkey(
          id,
          user_id
        ),
        campaign:campaigns!message_threads_campaign_id_fkey(
          wingman_id,
          single_id
        )
      `)
      .eq('id', threadId)
      .single()

    if (threadError || !thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    if (!thread.is_active) {
      return NextResponse.json(
        { error: 'This thread is no longer active' },
        { status: 400 }
      )
    }

    // Check access and determine role
    const candidate = thread.candidate as { user_id: string | null } | null
    const campaign = thread.campaign as { wingman_id: string; single_id: string } | null

    const isParticipant = thread.other_participant_id === user.id
    const isCandidate = candidate?.user_id === user.id

    if (!isParticipant && !isCandidate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Determine sender role
    let senderRole: UserRole = 'candidate'
    if (isParticipant) {
      senderRole = thread.other_participant_role
    } else if (campaign?.wingman_id === user.id) {
      senderRole = 'wingman'
    } else if (campaign?.single_id === user.id) {
      senderRole = 'single'
    }

    // Create message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        sender_id: user.id,
        sender_role: senderRole,
        content: content.trim(),
        is_inbound: isCandidate, // inbound if sent by candidate
      })
      .select()
      .single()

    if (messageError) {
      return NextResponse.json({ error: messageError.message }, { status: 500 })
    }

    // Update thread's last_message_at
    await supabase
      .from('message_threads')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', threadId)

    return NextResponse.json({ message }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
