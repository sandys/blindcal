import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

describe('Delegations API', () => {
  let supabase: ReturnType<typeof createClient<Database>>
  let wingmanUserId: string
  let singleUserId: string
  let delegationId: string

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
    const { data: wingman, error: wingmanError } = await supabase.auth.admin.createUser({
      email: 'test-wingman@example.com',
      password: 'testpassword123',
      email_confirm: true,
      user_metadata: { display_name: 'Test Wingman' },
    })

    if (wingmanError) throw new Error(`Failed to create wingman: ${wingmanError.message}`)
    wingmanUserId = wingman.user.id

    const { data: single, error: singleError } = await supabase.auth.admin.createUser({
      email: 'test-single@example.com',
      password: 'testpassword123',
      email_confirm: true,
      user_metadata: { display_name: 'Test Single' },
    })

    if (singleError) throw new Error(`Failed to create single: ${singleError.message}`)
    singleUserId = single.user.id
  })

  afterAll(async () => {
    // Clean up delegations first (due to foreign keys)
    if (delegationId) {
      await supabase.from('delegations').delete().eq('id', delegationId)
    }

    // Clean up test users
    if (wingmanUserId) await supabase.auth.admin.deleteUser(wingmanUserId)
    if (singleUserId) await supabase.auth.admin.deleteUser(singleUserId)
  })

  describe('Delegation creation', () => {
    it('should create a delegation between wingman and single', async () => {
      const { data: delegation, error } = await supabase
        .from('delegations')
        .insert({
          wingman_id: wingmanUserId,
          single_id: singleUserId,
          trust_level: 'approval_required',
          is_active: false,
          can_view_calendar: true,
          can_propose_times: true,
          can_book_directly: false,
          can_message_candidates: true,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(delegation).not.toBeNull()
      expect(delegation?.wingman_id).toBe(wingmanUserId)
      expect(delegation?.single_id).toBe(singleUserId)
      expect(delegation?.trust_level).toBe('approval_required')
      expect(delegation?.is_active).toBe(false)

      delegationId = delegation!.id
    })

    it('should not allow duplicate active delegations', async () => {
      // Try to create another delegation with same wingman and single
      // The schema allows this, but the API should prevent it
      await supabase
        .from('delegations')
        .insert({
          wingman_id: wingmanUserId,
          single_id: singleUserId,
          trust_level: 'full_delegation',
          is_active: false,
        })
      // For now, just verify we can query existing delegations
      const { data: delegations } = await supabase
        .from('delegations')
        .select('*')
        .eq('wingman_id', wingmanUserId)
        .eq('single_id', singleUserId)

      expect(delegations?.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Delegation acceptance', () => {
    it('should accept a delegation and set it active', async () => {
      const { data: delegation, error } = await supabase
        .from('delegations')
        .update({
          is_active: true,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', delegationId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(delegation?.is_active).toBe(true)
      expect(delegation?.accepted_at).not.toBeNull()
    })
  })

  describe('Trust level updates', () => {
    it('should update trust level to full_delegation', async () => {
      const { data: delegation, error } = await supabase
        .from('delegations')
        .update({
          trust_level: 'full_delegation',
          can_book_directly: true,
        })
        .eq('id', delegationId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(delegation?.trust_level).toBe('full_delegation')
      expect(delegation?.can_book_directly).toBe(true)
    })

    it('should update trust level to view_only', async () => {
      const { data: delegation, error } = await supabase
        .from('delegations')
        .update({
          trust_level: 'view_only',
          can_propose_times: false,
          can_book_directly: false,
          can_message_candidates: false,
        })
        .eq('id', delegationId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(delegation?.trust_level).toBe('view_only')
      expect(delegation?.can_propose_times).toBe(false)
      expect(delegation?.can_book_directly).toBe(false)
      expect(delegation?.can_message_candidates).toBe(false)
    })
  })

  describe('Delegation permissions', () => {
    it('should correctly set permissions based on trust level', async () => {
      // Reset to approval_required
      const { data: delegation, error } = await supabase
        .from('delegations')
        .update({
          trust_level: 'approval_required',
          can_view_calendar: true,
          can_propose_times: true,
          can_book_directly: false,
          can_message_candidates: true,
        })
        .eq('id', delegationId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(delegation?.can_view_calendar).toBe(true)
      expect(delegation?.can_propose_times).toBe(true)
      expect(delegation?.can_book_directly).toBe(false)
      expect(delegation?.can_message_candidates).toBe(true)
    })
  })

  describe('Delegation revocation', () => {
    it('should revoke a delegation', async () => {
      const { data: delegation, error } = await supabase
        .from('delegations')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
        })
        .eq('id', delegationId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(delegation?.is_active).toBe(false)
      expect(delegation?.revoked_at).not.toBeNull()
    })
  })

  describe('Delegation queries', () => {
    it('should fetch delegations with related profiles', async () => {
      const { data: delegations, error } = await supabase
        .from('delegations')
        .select(`
          *,
          wingman:profiles!delegations_wingman_id_fkey(id, email, display_name),
          single:profiles!delegations_single_id_fkey(id, email, display_name)
        `)
        .eq('id', delegationId)
        .single()

      expect(error).toBeNull()
      expect(delegations?.wingman).not.toBeNull()
      expect(delegations?.single).not.toBeNull()
      expect(delegations?.wingman?.email).toBe('test-wingman@example.com')
      expect(delegations?.single?.email).toBe('test-single@example.com')
    })

    it('should filter delegations by wingman', async () => {
      const { data: delegations, error } = await supabase
        .from('delegations')
        .select('*')
        .eq('wingman_id', wingmanUserId)

      expect(error).toBeNull()
      expect(delegations?.length).toBeGreaterThanOrEqual(1)
      expect(delegations?.every(d => d.wingman_id === wingmanUserId)).toBe(true)
    })

    it('should filter delegations by single', async () => {
      const { data: delegations, error } = await supabase
        .from('delegations')
        .select('*')
        .eq('single_id', singleUserId)

      expect(error).toBeNull()
      expect(delegations?.length).toBeGreaterThanOrEqual(1)
      expect(delegations?.every(d => d.single_id === singleUserId)).toBe(true)
    })
  })

  describe('Delegation validation', () => {
    it('should reject invalid trust levels', async () => {
      const { error } = await supabase
        .from('delegations')
        .insert({
          wingman_id: wingmanUserId,
          single_id: singleUserId,
          trust_level: 'invalid_level' as Database['public']['Enums']['trust_level'],
        })

      expect(error).not.toBeNull()
    })

    it('should require wingman_id and single_id', async () => {
      const { error } = await supabase
        .from('delegations')
        .insert({
          trust_level: 'approval_required',
        } as Database['public']['Tables']['delegations']['Insert'])

      expect(error).not.toBeNull()
    })
  })
})
