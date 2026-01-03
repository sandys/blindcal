import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get campaigns where user is wingman or single
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        delegation:delegations!campaigns_delegation_id_fkey(
          id,
          trust_level,
          wingman:profiles!delegations_wingman_id_fkey(id, email, display_name),
          single:profiles!delegations_single_id_fkey(id, email, display_name)
        )
      `)
      .or(`wingman_id.eq.${user.id},single_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ campaigns })
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
    const { delegationId, title, description, tagline } = body

    if (!delegationId || !title) {
      return NextResponse.json(
        { error: 'delegationId and title are required' },
        { status: 400 }
      )
    }

    // Verify the delegation exists and user is the wingman
    const { data: delegation, error: delegationError } = await supabase
      .from('delegations')
      .select('*')
      .eq('id', delegationId)
      .eq('wingman_id', user.id)
      .eq('is_active', true)
      .single()

    if (delegationError || !delegation) {
      return NextResponse.json(
        { error: 'Active delegation not found or you are not the wingman' },
        { status: 404 }
      )
    }

    // Generate a unique slug
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30)
    const slug = `${baseSlug}-${nanoid(6)}`

    // Create the campaign
    const { data: campaign, error: createError } = await supabase
      .from('campaigns')
      .insert({
        delegation_id: delegationId,
        wingman_id: user.id,
        single_id: delegation.single_id,
        title,
        slug,
        description: description || null,
        tagline: tagline || null,
        is_published: false,
        is_accepting_applications: false,
        initial_disclosure_level: 'first_name',
        requires_photo: false,
        requires_bio: true,
      })
      .select(`
        *,
        delegation:delegations!campaigns_delegation_id_fkey(
          id,
          trust_level,
          wingman:profiles!delegations_wingman_id_fkey(id, email, display_name),
          single:profiles!delegations_single_id_fkey(id, email, display_name)
        )
      `)
      .single()

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ campaign }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
