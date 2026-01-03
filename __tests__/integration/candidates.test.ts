import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

describe('Candidates Pipeline', () => {
  let supabase: ReturnType<typeof createClient<Database>>
  let wingmanUserId: string
  let singleUserId: string
  let delegationId: string
  let campaignId: string
  const createdCandidateIds: string[] = []

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
      email: `test-pipeline-wingman-${Date.now()}@example.com`,
      password: 'testpassword123',
      email_confirm: true,
    })
    wingmanUserId = wingman.user!.id

    const { data: single } = await supabase.auth.admin.createUser({
      email: `test-pipeline-single-${Date.now()}@example.com`,
      password: 'testpassword123',
      email_confirm: true,
    })
    singleUserId = single.user!.id

    // Create delegation
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

    // Create campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .insert({
        delegation_id: delegationId,
        wingman_id: wingmanUserId,
        single_id: singleUserId,
        title: 'Pipeline Test Campaign',
        slug: `pipeline-test-${Date.now()}`,
        is_published: true,
        is_accepting_applications: true,
      })
      .select()
      .single()
    campaignId = campaign!.id
  })

  afterAll(async () => {
    // Clean up candidates first
    for (const id of createdCandidateIds) {
      await supabase.from('candidate_events').delete().eq('candidate_id', id)
      await supabase.from('candidates').delete().eq('id', id)
    }
    if (campaignId) await supabase.from('campaigns').delete().eq('id', campaignId)
    if (delegationId) await supabase.from('delegations').delete().eq('id', delegationId)
    if (wingmanUserId) await supabase.auth.admin.deleteUser(wingmanUserId)
    if (singleUserId) await supabase.auth.admin.deleteUser(singleUserId)
  })

  async function createTestCandidate(overrides = {}) {
    const { data: candidate, error } = await supabase
      .from('candidates')
      .insert({
        campaign_id: campaignId,
        email: `candidate-${Date.now()}@example.com`,
        display_name: 'Test Candidate',
        bio: 'Test bio',
        current_stage: 'new',
        applied_at: new Date().toISOString(),
        ...overrides,
      })
      .select()
      .single()

    if (candidate) {
      createdCandidateIds.push(candidate.id)
    }
    return { candidate, error }
  }

  describe('Candidate creation', () => {
    it('should create a candidate application', async () => {
      const { candidate, error } = await createTestCandidate({
        display_name: 'New Test Candidate',
      })

      expect(error).toBeNull()
      expect(candidate).not.toBeNull()
      expect(candidate?.display_name).toBe('New Test Candidate')
      expect(candidate?.current_stage).toBe('new')
    })

    it('should reject duplicate email in same campaign', async () => {
      const email = `duplicate-${Date.now()}@example.com`

      await createTestCandidate({ email })
      const { error } = await createTestCandidate({ email })

      // Should fail due to unique constraint
      expect(error).not.toBeNull()
    })
  })

  describe('Pipeline stage transitions', () => {
    it('should move candidate from new to screening', async () => {
      const { candidate: created } = await createTestCandidate()

      const { data: candidate, error } = await supabase
        .from('candidates')
        .update({
          current_stage: 'screening',
          stage_changed_at: new Date().toISOString(),
        })
        .eq('id', created!.id)
        .select()
        .single()

      expect(error).toBeNull()
      expect(candidate?.current_stage).toBe('screening')
    })

    it('should move candidate through full pipeline', async () => {
      const { candidate: created } = await createTestCandidate()
      const id = created!.id

      // screening
      await supabase
        .from('candidates')
        .update({ current_stage: 'screening' })
        .eq('id', id)

      // proposed
      const { data: proposed } = await supabase
        .from('candidates')
        .update({
          current_stage: 'proposed',
          proposed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
      expect(proposed?.current_stage).toBe('proposed')

      // approved
      const { data: approved } = await supabase
        .from('candidates')
        .update({
          current_stage: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
      expect(approved?.current_stage).toBe('approved')

      // scheduled
      const { data: scheduled } = await supabase
        .from('candidates')
        .update({ current_stage: 'scheduled' })
        .eq('id', id)
        .select()
        .single()
      expect(scheduled?.current_stage).toBe('scheduled')

      // completed
      const { data: completed } = await supabase
        .from('candidates')
        .update({ current_stage: 'completed' })
        .eq('id', id)
        .select()
        .single()
      expect(completed?.current_stage).toBe('completed')
    })

    it('should reject a candidate', async () => {
      const { candidate: created } = await createTestCandidate({
        current_stage: 'proposed',
      })

      const { data: candidate, error } = await supabase
        .from('candidates')
        .update({
          current_stage: 'rejected',
          rejected_at: new Date().toISOString(),
        })
        .eq('id', created!.id)
        .select()
        .single()

      expect(error).toBeNull()
      expect(candidate?.current_stage).toBe('rejected')
      expect(candidate?.rejected_at).not.toBeNull()
    })

    it('should archive a candidate', async () => {
      const { candidate: created } = await createTestCandidate()

      const { data: candidate, error } = await supabase
        .from('candidates')
        .update({ current_stage: 'archived' })
        .eq('id', created!.id)
        .select()
        .single()

      expect(error).toBeNull()
      expect(candidate?.current_stage).toBe('archived')
    })
  })

  describe('Candidate notes and rating', () => {
    it('should update wingman notes', async () => {
      const { candidate: created } = await createTestCandidate()

      const { data: candidate, error } = await supabase
        .from('candidates')
        .update({ wingman_notes: 'Great first impression!' })
        .eq('id', created!.id)
        .select()
        .single()

      expect(error).toBeNull()
      expect(candidate?.wingman_notes).toBe('Great first impression!')
    })

    it('should set candidate rating', async () => {
      const { candidate: created } = await createTestCandidate()

      const { data: candidate, error } = await supabase
        .from('candidates')
        .update({ rating: 4 })
        .eq('id', created!.id)
        .select()
        .single()

      expect(error).toBeNull()
      expect(candidate?.rating).toBe(4)
    })
  })

  describe('Candidate events', () => {
    it('should auto-create event on candidate insert (via trigger)', async () => {
      const { candidate: created } = await createTestCandidate()

      const { data: events, error } = await supabase
        .from('candidate_events')
        .select('*')
        .eq('candidate_id', created!.id)

      expect(error).toBeNull()
      expect(events?.length).toBeGreaterThanOrEqual(1)
      expect(events?.some(e => e.event_type === 'candidate_stage_changed')).toBe(true)
    })

    it('should create event on stage change (via trigger)', async () => {
      const { candidate: created } = await createTestCandidate()

      // Change stage
      await supabase
        .from('candidates')
        .update({ current_stage: 'screening' })
        .eq('id', created!.id)

      const { data: events, error } = await supabase
        .from('candidate_events')
        .select('*')
        .eq('candidate_id', created!.id)
        .order('created_at', { ascending: false })

      expect(error).toBeNull()
      // Should have at least 2 events: initial insert + stage change
      expect(events?.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Candidate queries', () => {
    it('should filter candidates by campaign', async () => {
      await createTestCandidate()

      const { data: candidates, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('campaign_id', campaignId)

      expect(error).toBeNull()
      expect(candidates?.length).toBeGreaterThan(0)
    })

    it('should filter candidates by stage', async () => {
      await createTestCandidate({ current_stage: 'screening' })

      const { data: candidates, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('current_stage', 'screening')

      expect(error).toBeNull()
      expect(candidates?.every(c => c.current_stage === 'screening')).toBe(true)
    })

    it('should order candidates by stage change time', async () => {
      const { data: candidates, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('stage_changed_at', { ascending: false })

      expect(error).toBeNull()
      expect(candidates).not.toBeNull()
    })
  })

  describe('Candidate disclosure levels', () => {
    it('should set disclosure level', async () => {
      const { candidate: created } = await createTestCandidate()

      const { data: candidate, error } = await supabase
        .from('candidates')
        .update({ disclosure_level: 'full_profile' })
        .eq('id', created!.id)
        .select()
        .single()

      expect(error).toBeNull()
      expect(candidate?.disclosure_level).toBe('full_profile')
    })

    it('should reject invalid disclosure level', async () => {
      const { candidate: created } = await createTestCandidate()

      const { error } = await supabase
        .from('candidates')
        .update({
          disclosure_level: 'invalid' as Database['public']['Enums']['identity_disclosure_level'],
        })
        .eq('id', created!.id)

      expect(error).not.toBeNull()
    })
  })
})
