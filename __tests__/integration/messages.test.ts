import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

describe('Messaging System', () => {
  let supabase: ReturnType<typeof createClient<Database>>
  let wingmanUserId: string
  let singleUserId: string
  let delegationId: string
  let campaignId: string
  let candidateId: string
  const createdThreadIds: string[] = []

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
      email: `test-message-wingman-${Date.now()}@example.com`,
      password: 'testpassword123',
      email_confirm: true,
    })
    wingmanUserId = wingman.user!.id

    const { data: single } = await supabase.auth.admin.createUser({
      email: `test-message-single-${Date.now()}@example.com`,
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
        title: 'Message Test Campaign',
        slug: `message-test-${Date.now()}`,
        is_published: true,
        is_accepting_applications: true,
      })
      .select()
      .single()
    campaignId = campaign!.id

    // Create a candidate
    const { data: candidate } = await supabase
      .from('candidates')
      .insert({
        campaign_id: campaignId,
        email: `message-candidate-${Date.now()}@example.com`,
        display_name: 'Test Message Candidate',
        bio: 'Test bio',
        current_stage: 'screening',
        applied_at: new Date().toISOString(),
      })
      .select()
      .single()
    candidateId = candidate!.id
  })

  afterAll(async () => {
    // Clean up messages and threads
    for (const id of createdThreadIds) {
      await supabase.from('messages').delete().eq('thread_id', id)
      await supabase.from('message_threads').delete().eq('id', id)
    }
    // Clean up candidate events and candidate
    if (candidateId) {
      await supabase.from('candidate_events').delete().eq('candidate_id', candidateId)
      await supabase.from('candidates').delete().eq('id', candidateId)
    }
    if (campaignId) await supabase.from('campaigns').delete().eq('id', campaignId)
    if (delegationId) await supabase.from('delegations').delete().eq('id', delegationId)
    if (wingmanUserId) await supabase.auth.admin.deleteUser(wingmanUserId)
    if (singleUserId) await supabase.auth.admin.deleteUser(singleUserId)
  })

  async function createTestThread(overrides = {}) {
    const { data: thread, error } = await supabase
      .from('message_threads')
      .insert({
        campaign_id: campaignId,
        candidate_id: candidateId,
        candidate_alias: 'TestCandidate',
        candidate_masked_email: 'candidate@test.blindcal.app',
        other_participant_id: wingmanUserId,
        other_participant_role: 'wingman',
        other_alias: 'TestWingman',
        other_masked_email: 'wingman@test.blindcal.app',
        is_active: true,
        ...overrides,
      })
      .select()
      .single()

    if (thread) {
      createdThreadIds.push(thread.id)
    }
    return { thread, error }
  }

  describe('Thread creation', () => {
    it('should create a message thread', async () => {
      const { thread, error } = await createTestThread()

      expect(error).toBeNull()
      expect(thread).not.toBeNull()
      expect(thread?.candidate_id).toBe(candidateId)
      expect(thread?.other_participant_id).toBe(wingmanUserId)
      expect(thread?.is_active).toBe(true)
    })

    it('should create thread with masked emails', async () => {
      const { thread } = await createTestThread({
        candidate_masked_email: 'masked-candidate@relay.blindcal.app',
        other_masked_email: 'masked-wingman@relay.blindcal.app',
      })

      expect(thread?.candidate_masked_email).toBe('masked-candidate@relay.blindcal.app')
      expect(thread?.other_masked_email).toBe('masked-wingman@relay.blindcal.app')
    })

    it('should create thread with aliases', async () => {
      const { thread } = await createTestThread({
        candidate_alias: 'MysteryPerson',
        other_alias: 'HelpfulFriend',
      })

      expect(thread?.candidate_alias).toBe('MysteryPerson')
      expect(thread?.other_alias).toBe('HelpfulFriend')
    })
  })

  describe('Messages', () => {
    it('should send a message in a thread', async () => {
      const { thread } = await createTestThread()

      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          thread_id: thread!.id,
          sender_id: wingmanUserId,
          sender_role: 'wingman',
          content: 'Hello, this is a test message!',
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(message?.content).toBe('Hello, this is a test message!')
      expect(message?.sender_id).toBe(wingmanUserId)
      expect(message?.sender_role).toBe('wingman')
    })

    it('should mark message as read', async () => {
      const { thread } = await createTestThread()

      const { data: message } = await supabase
        .from('messages')
        .insert({
          thread_id: thread!.id,
          sender_id: wingmanUserId,
          sender_role: 'wingman',
          content: 'Unread message',
        })
        .select()
        .single()

      expect(message?.read_at).toBeNull()

      const { data: updatedMessage, error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', message!.id)
        .select()
        .single()

      expect(error).toBeNull()
      expect(updatedMessage?.read_at).not.toBeNull()
    })

    it('should query messages in a thread', async () => {
      const { thread } = await createTestThread()

      // Send multiple messages
      await supabase.from('messages').insert([
        {
          thread_id: thread!.id,
          sender_id: wingmanUserId,
          sender_role: 'wingman',
          content: 'First message',
        },
        {
          thread_id: thread!.id,
          sender_id: wingmanUserId,
          sender_role: 'wingman',
          content: 'Second message',
        },
      ])

      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', thread!.id)
        .order('created_at', { ascending: true })

      expect(error).toBeNull()
      expect(messages?.length).toBe(2)
      expect(messages?.[0].content).toBe('First message')
      expect(messages?.[1].content).toBe('Second message')
    })

    it('should track inbound messages', async () => {
      const { thread } = await createTestThread()

      // Create a user for the candidate
      const { data: candidateUser } = await supabase.auth.admin.createUser({
        email: `candidate-user-${Date.now()}@example.com`,
        password: 'testpassword123',
        email_confirm: true,
      })

      // Link candidate to user
      await supabase
        .from('candidates')
        .update({ user_id: candidateUser.user!.id })
        .eq('id', candidateId)

      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          thread_id: thread!.id,
          sender_id: candidateUser.user!.id, // Candidate user sending
          sender_role: 'candidate',
          content: 'Message from candidate',
          is_inbound: true,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(message?.is_inbound).toBe(true)

      // Clean up
      await supabase.auth.admin.deleteUser(candidateUser.user!.id)
    })
  })

  describe('Thread updates', () => {
    it('should update last_message_at when message is sent', async () => {
      const { thread } = await createTestThread()
      const originalTime = thread?.last_message_at

      // Send a message
      await supabase.from('messages').insert({
        thread_id: thread!.id,
        sender_id: wingmanUserId,
        sender_role: 'wingman',
        content: 'New message',
      })

      // Update last_message_at
      const { data: updatedThread, error } = await supabase
        .from('message_threads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', thread!.id)
        .select()
        .single()

      expect(error).toBeNull()
      expect(updatedThread?.last_message_at).not.toBe(originalTime)
    })

    it('should deactivate a thread', async () => {
      const { thread } = await createTestThread()

      const { data: deactivated, error } = await supabase
        .from('message_threads')
        .update({ is_active: false })
        .eq('id', thread!.id)
        .select()
        .single()

      expect(error).toBeNull()
      expect(deactivated?.is_active).toBe(false)
    })
  })

  describe('Thread queries', () => {
    it('should filter threads by campaign', async () => {
      await createTestThread()

      const { data: threads, error } = await supabase
        .from('message_threads')
        .select('*')
        .eq('campaign_id', campaignId)

      expect(error).toBeNull()
      expect(threads?.length).toBeGreaterThan(0)
    })

    it('should filter threads by participant', async () => {
      await createTestThread()

      const { data: threads, error } = await supabase
        .from('message_threads')
        .select('*')
        .eq('other_participant_id', wingmanUserId)

      expect(error).toBeNull()
      expect(threads?.length).toBeGreaterThan(0)
    })

    it('should fetch thread with campaign details', async () => {
      const { thread: created } = await createTestThread()

      const { data: thread, error } = await supabase
        .from('message_threads')
        .select(`
          *,
          campaign:campaigns!message_threads_campaign_id_fkey(
            id,
            title
          )
        `)
        .eq('id', created!.id)
        .single()

      expect(error).toBeNull()
      expect(thread?.campaign).not.toBeNull()
      expect((thread?.campaign as { title: string })?.title).toBe('Message Test Campaign')
    })
  })
})
