'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ProfileUpdateResult = {
  success?: boolean
  error?: string
}

export async function updateProfile(formData: FormData): Promise<ProfileUpdateResult> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  const displayName = formData.get('displayName') as string
  const bio = formData.get('bio') as string | null
  const phone = formData.get('phone') as string | null
  const timezone = formData.get('timezone') as string | null
  const emergencyContactName = formData.get('emergencyContactName') as string | null
  const emergencyContactPhone = formData.get('emergencyContactPhone') as string | null

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      display_name: displayName,
      bio: bio || null,
      phone: phone || null,
      timezone: timezone || null,
      emergency_contact_name: emergencyContactName || null,
      emergency_contact_phone: emergencyContactPhone || null,
    })
    .eq('id', user.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/settings')
  revalidatePath('/dashboard')

  return { success: true }
}

export async function updateNotificationPreferences(formData: FormData): Promise<ProfileUpdateResult> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  const emailNotifications = formData.get('emailNotifications') === 'on'
  const bookingReminders = formData.get('bookingReminders') === 'on'
  const safetyCheckIns = formData.get('safetyCheckIns') === 'on'

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      notification_preferences: {
        email_notifications: emailNotifications,
        booking_reminders: bookingReminders,
        safety_check_ins: safetyCheckIns,
      },
    })
    .eq('id', user.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/settings')

  return { success: true }
}
