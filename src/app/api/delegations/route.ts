import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get delegations where user is either wingman or single
    const { data: delegations, error } = await supabase
      .from('delegations')
      .select(`
        *,
        wingman:profiles!delegations_wingman_id_fkey(id, email, display_name, avatar_url),
        single:profiles!delegations_single_id_fkey(id, email, display_name, avatar_url)
      `)
      .or(`wingman_id.eq.${user.id},single_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ delegations })
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
    const { singleEmail, trustLevel } = body

    if (!singleEmail || !trustLevel) {
      return NextResponse.json(
        { error: 'singleEmail and trustLevel are required' },
        { status: 400 }
      )
    }

    // Validate trust level
    const validTrustLevels = ['full_delegation', 'approval_required', 'view_only']
    if (!validTrustLevels.includes(trustLevel)) {
      return NextResponse.json(
        { error: 'Invalid trust level' },
        { status: 400 }
      )
    }

    // Find the single by email
    const { data: singleProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, display_name')
      .eq('email', singleEmail)
      .single()

    if (profileError || !singleProfile) {
      return NextResponse.json(
        { error: 'User not found with that email' },
        { status: 404 }
      )
    }

    // Can't delegate to yourself
    if (singleProfile.id === user.id) {
      return NextResponse.json(
        { error: 'Cannot create a delegation with yourself' },
        { status: 400 }
      )
    }

    // Check for existing active delegation
    const { data: existingDelegation } = await supabase
      .from('delegations')
      .select('id')
      .eq('wingman_id', user.id)
      .eq('single_id', singleProfile.id)
      .eq('is_active', true)
      .single()

    if (existingDelegation) {
      return NextResponse.json(
        { error: 'An active delegation already exists with this user' },
        { status: 409 }
      )
    }

    // Set permissions based on trust level
    const permissions = {
      can_view_calendar: true,
      can_propose_times: trustLevel !== 'view_only',
      can_book_directly: trustLevel === 'full_delegation',
      can_message_candidates: trustLevel !== 'view_only',
    }

    // Create the delegation (pending acceptance)
    const { data: delegation, error: createError } = await supabase
      .from('delegations')
      .insert({
        wingman_id: user.id,
        single_id: singleProfile.id,
        trust_level: trustLevel,
        is_active: false, // Not active until accepted
        ...permissions,
      })
      .select(`
        *,
        wingman:profiles!delegations_wingman_id_fkey(id, email, display_name, avatar_url),
        single:profiles!delegations_single_id_fkey(id, email, display_name, avatar_url)
      `)
      .single()

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // TODO: Send email notification to single about the invitation

    return NextResponse.json({ delegation }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
