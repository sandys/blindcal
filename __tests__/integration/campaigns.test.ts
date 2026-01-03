import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

describe('Campaigns API', () => {
  let supabase: ReturnType<typeof createClient<Database>>
  let wingmanUserId: string
  let singleUserId: string
  let delegationId: string
  let campaignId: string

  beforeAll(async () => {
    supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Create test users
    const { data: wingman } = await supabase.auth.admin.createUser({
      email: 'test-campaign-wingman@example.com',
      password: 'testpassword123',
      email_confirm: true,
    })
    wingmanUserId = wingman.user!.id

    const { data: single } = await supabase.auth.admin.createUser({
      email: 'test-campaign-single@example.com',
      password: 'testpassword123',
      email_confirm: true,
    })
    singleUserId = single.user!.id

    // Create an active delegation
    const { data: delegation } = await supabase
      .from('delegations')
      .insert({
        wingman_id: wingmanUserId,
        single_id: singleUserId,
        trust_level: 'approval_required',
        is_active: true,
        accepted_at: new Date().toISOString(),
      })
      .select()
      .single()

    delegationId = delegation!.id
  })

  afterAll(async () => {
    // Clean up in reverse order
    if (campaignId) await supabase.from('campaigns').delete().eq('id', campaignId)
    if (delegationId) await supabase.from('delegations').delete().eq('id', delegationId)
    if (wingmanUserId) await supabase.auth.admin.deleteUser(wingmanUserId)
    if (singleUserId) await supabase.auth.admin.deleteUser(singleUserId)
  })

  describe('Campaign creation', () => {
    it('should create a campaign for an active delegation', async () => {
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .insert({
          delegation_id: delegationId,
          wingman_id: wingmanUserId,
          single_id: singleUserId,
          title: 'Test Campaign',
          slug: 'test-campaign-abc123',
          tagline: 'A test campaign',
          description: 'This is a test campaign description',
          is_published: false,
          is_accepting_applications: false,
          initial_disclosure_level: 'first_name',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(campaign).not.toBeNull()
      expect(campaign?.title).toBe('Test Campaign')
      expect(campaign?.slug).toBe('test-campaign-abc123')
      expect(campaign?.delegation_id).toBe(delegationId)
      expect(campaign?.is_published).toBe(false)

      campaignId = campaign!.id
    })

    it('should enforce unique slugs', async () => {
      const { error } = await supabase
        .from('campaigns')
        .insert({
          delegation_id: delegationId,
          wingman_id: wingmanUserId,
          single_id: singleUserId,
          title: 'Another Campaign',
          slug: 'test-campaign-abc123', // Same slug
        })

      expect(error).not.toBeNull()
    })
  })

  describe('Campaign updates', () => {
    it('should update campaign title', async () => {
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .update({ title: 'Updated Campaign Title' })
        .eq('id', campaignId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(campaign?.title).toBe('Updated Campaign Title')
    })

    it('should publish a campaign', async () => {
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .update({
          is_published: true,
          published_at: new Date().toISOString(),
        })
        .eq('id', campaignId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(campaign?.is_published).toBe(true)
      expect(campaign?.published_at).not.toBeNull()
    })

    it('should open applications', async () => {
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .update({ is_accepting_applications: true })
        .eq('id', campaignId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(campaign?.is_accepting_applications).toBe(true)
    })

    it('should update campaign settings', async () => {
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .update({
          requires_photo: true,
          requires_bio: true,
          max_active_candidates: 10,
        })
        .eq('id', campaignId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(campaign?.requires_photo).toBe(true)
      expect(campaign?.requires_bio).toBe(true)
      expect(campaign?.max_active_candidates).toBe(10)
    })
  })

  describe('Campaign queries', () => {
    it('should fetch campaign with delegation details', async () => {
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          delegation:delegations!campaigns_delegation_id_fkey(
            id,
            trust_level,
            wingman:profiles!delegations_wingman_id_fkey(id, email),
            single:profiles!delegations_single_id_fkey(id, email)
          )
        `)
        .eq('id', campaignId)
        .single()

      expect(error).toBeNull()
      expect(campaign?.delegation).not.toBeNull()
      expect(campaign?.delegation?.trust_level).toBe('approval_required')
    })

    it('should find campaign by slug', async () => {
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('slug', 'test-campaign-abc123')
        .single()

      expect(error).toBeNull()
      expect(campaign?.id).toBe(campaignId)
    })

    it('should filter published campaigns', async () => {
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('is_published', true)

      expect(error).toBeNull()
      expect(campaigns?.some(c => c.id === campaignId)).toBe(true)
    })
  })

  describe('Campaign disclosure levels', () => {
    it('should set initial disclosure level', async () => {
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .update({ initial_disclosure_level: 'anonymous' })
        .eq('id', campaignId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(campaign?.initial_disclosure_level).toBe('anonymous')
    })

    it('should reject invalid disclosure level', async () => {
      const { error } = await supabase
        .from('campaigns')
        .update({ initial_disclosure_level: 'invalid_level' as unknown as Database['public']['Enums']['identity_disclosure_level'] })
        .eq('id', campaignId)

      expect(error).not.toBeNull()
    })
  })
})
