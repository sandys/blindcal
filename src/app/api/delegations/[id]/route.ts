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

    const { data: delegation, error } = await supabase
      .from('delegations')
      .select(`
        *,
        wingman:profiles!delegations_wingman_id_fkey(id, email, display_name, avatar_url),
        single:profiles!delegations_single_id_fkey(id, email, display_name, avatar_url)
      `)
      .eq('id', id)
      .or(`wingman_id.eq.${user.id},single_id.eq.${user.id}`)
      .single()

    if (error || !delegation) {
      return NextResponse.json({ error: 'Delegation not found' }, { status: 404 })
    }

    return NextResponse.json({ delegation })
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
    const { action, trustLevel } = body

    // First get the delegation to check permissions
    const { data: existingDelegation, error: fetchError } = await supabase
      .from('delegations')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingDelegation) {
      return NextResponse.json({ error: 'Delegation not found' }, { status: 404 })
    }

    // Check user has access to this delegation
    const isWingman = existingDelegation.wingman_id === user.id
    const isSingle = existingDelegation.single_id === user.id

    if (!isWingman && !isSingle) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Handle different actions
    if (action === 'accept') {
      // Only the single can accept
      if (!isSingle) {
        return NextResponse.json(
          { error: 'Only the single can accept a delegation' },
          { status: 403 }
        )
      }

      if (existingDelegation.is_active) {
        return NextResponse.json(
          { error: 'Delegation is already active' },
          { status: 400 }
        )
      }

      const { data: delegation, error: updateError } = await supabase
        .from('delegations')
        .update({
          is_active: true,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          wingman:profiles!delegations_wingman_id_fkey(id, email, display_name, avatar_url),
          single:profiles!delegations_single_id_fkey(id, email, display_name, avatar_url)
        `)
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      // Update wingman's roles to include 'wingman'
      const { data: wingmanProfile } = await supabase
        .from('profiles')
        .select('roles')
        .eq('id', existingDelegation.wingman_id)
        .single()

      const wingmanRoles = new Set(wingmanProfile?.roles || [])
      wingmanRoles.add('wingman')
      await supabase
        .from('profiles')
        .update({ roles: Array.from(wingmanRoles) })
        .eq('id', existingDelegation.wingman_id)

      // Update single's roles to include 'single'
      const { data: singleProfile } = await supabase
        .from('profiles')
        .select('roles')
        .eq('id', existingDelegation.single_id)
        .single()

      const singleRoles = new Set(singleProfile?.roles || [])
      singleRoles.add('single')
      await supabase
        .from('profiles')
        .update({ roles: Array.from(singleRoles) })
        .eq('id', existingDelegation.single_id)

      return NextResponse.json({ delegation })
    }

    if (action === 'revoke') {
      // Either party can revoke
      const { data: delegation, error: updateError } = await supabase
        .from('delegations')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          wingman:profiles!delegations_wingman_id_fkey(id, email, display_name, avatar_url),
          single:profiles!delegations_single_id_fkey(id, email, display_name, avatar_url)
        `)
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ delegation })
    }

    if (action === 'update_trust_level') {
      // Only the single can update trust level
      if (!isSingle) {
        return NextResponse.json(
          { error: 'Only the single can update trust level' },
          { status: 403 }
        )
      }

      const validTrustLevels = ['full_delegation', 'approval_required', 'view_only']
      if (!trustLevel || !validTrustLevels.includes(trustLevel)) {
        return NextResponse.json(
          { error: 'Invalid trust level' },
          { status: 400 }
        )
      }

      // Update permissions based on new trust level
      const permissions = {
        can_view_calendar: true,
        can_propose_times: trustLevel !== 'view_only',
        can_book_directly: trustLevel === 'full_delegation',
        can_message_candidates: trustLevel !== 'view_only',
      }

      const { data: delegation, error: updateError } = await supabase
        .from('delegations')
        .update({
          trust_level: trustLevel,
          ...permissions,
        })
        .eq('id', id)
        .select(`
          *,
          wingman:profiles!delegations_wingman_id_fkey(id, email, display_name, avatar_url),
          single:profiles!delegations_single_id_fkey(id, email, display_name, avatar_url)
        `)
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ delegation })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
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

    // Check the delegation exists and user has access
    const { data: existingDelegation, error: fetchError } = await supabase
      .from('delegations')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingDelegation) {
      return NextResponse.json({ error: 'Delegation not found' }, { status: 404 })
    }

    // Only allow deletion if not yet accepted (pending invitations)
    if (existingDelegation.accepted_at) {
      return NextResponse.json(
        { error: 'Cannot delete an accepted delegation. Use revoke instead.' },
        { status: 400 }
      )
    }

    // Only the wingman (who created it) can delete a pending invitation
    if (existingDelegation.wingman_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error: deleteError } = await supabase
      .from('delegations')
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
