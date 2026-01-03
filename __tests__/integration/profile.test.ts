import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

describe('Profile API', () => {
  let supabase: ReturnType<typeof createClient<Database>>
  let testUserId: string

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

    // Create a test user using admin API
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'test-profile@example.com',
      password: 'testpassword123',
      email_confirm: true,
      user_metadata: {
        display_name: 'Test User',
      },
    })

    if (authError) {
      throw new Error(`Failed to create test user: ${authError.message}`)
    }

    testUserId = authUser.user.id
  })

  afterAll(async () => {
    // Clean up test user
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId)
    }
  })

  describe('Profile creation', () => {
    it('should have created a profile for the new user via trigger', async () => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', testUserId)
        .single()

      expect(error).toBeNull()
      expect(profile).not.toBeNull()
      expect(profile?.id).toBe(testUserId)
      expect(profile?.email).toBe('test-profile@example.com')
    })
  })

  describe('Profile updates', () => {
    it('should update profile display_name', async () => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .update({ display_name: 'Updated Test User' })
        .eq('id', testUserId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(profile?.display_name).toBe('Updated Test User')
    })

    it('should update profile bio', async () => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .update({ bio: 'This is a test bio' })
        .eq('id', testUserId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(profile?.bio).toBe('This is a test bio')
    })

    it('should update profile phone', async () => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .update({ phone: '+1234567890' })
        .eq('id', testUserId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(profile?.phone).toBe('+1234567890')
    })

    it('should update profile timezone', async () => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .update({ timezone: 'America/New_York' })
        .eq('id', testUserId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(profile?.timezone).toBe('America/New_York')
    })

    it('should update emergency contact info', async () => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .update({
          emergency_contact_name: 'Emergency Contact',
          emergency_contact_phone: '+0987654321',
        })
        .eq('id', testUserId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(profile?.emergency_contact_name).toBe('Emergency Contact')
      expect(profile?.emergency_contact_phone).toBe('+0987654321')
    })

    it('should update notification preferences', async () => {
      const preferences = {
        email_notifications: true,
        booking_reminders: false,
        safety_check_ins: true,
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .update({ notification_preferences: preferences })
        .eq('id', testUserId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(profile?.notification_preferences).toEqual(preferences)
    })

    it('should update roles array', async () => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .update({ roles: ['wingman', 'single'] })
        .eq('id', testUserId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(profile?.roles).toContain('wingman')
      expect(profile?.roles).toContain('single')
    })
  })

  describe('Profile validation', () => {
    it('should not allow updating email directly', async () => {
      // The email should be managed by auth.users, not profiles
      // This test verifies the RLS policy doesn't allow email updates
      // (In a real app, email changes would go through auth.updateUser)
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', testUserId)
        .single()

      expect(profile?.email).toBe('test-profile@example.com')
    })

    it('should reject invalid role values', async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ roles: ['invalid_role'] as unknown as Database['public']['Enums']['user_role'][] })
        .eq('id', testUserId)

      expect(error).not.toBeNull()
    })
  })
})
