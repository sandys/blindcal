'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { updateProfile, updateNotificationPreferences } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Database } from '@/lib/supabase/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving...' : children}
    </Button>
  )
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [notifMessage, setNotifMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const notificationPrefs = profile.notification_preferences as {
    email_notifications?: boolean
    booking_reminders?: boolean
    safety_check_ins?: boolean
  } | null

  async function handleProfileUpdate(formData: FormData) {
    const result = await updateProfile(formData)
    if (result.error) {
      setProfileMessage({ type: 'error', text: result.error })
    } else {
      setProfileMessage({ type: 'success', text: 'Profile updated successfully' })
    }
    setTimeout(() => setProfileMessage(null), 3000)
  }

  async function handleNotificationUpdate(formData: FormData) {
    const result = await updateNotificationPreferences(formData)
    if (result.error) {
      setNotifMessage({ type: 'error', text: result.error })
    } else {
      setNotifMessage({ type: 'success', text: 'Preferences updated successfully' })
    }
    setTimeout(() => setNotifMessage(null), 3000)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your personal information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleProfileUpdate} className="space-y-4">
            {profileMessage && (
              <div
                className={`rounded-md p-3 text-sm ${
                  profileMessage.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-destructive/15 text-destructive'
                }`}
              >
                {profileMessage.text}
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  defaultValue={profile.display_name || ''}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={profile.phone || ''}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                name="bio"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                defaultValue={profile.bio || ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                name="timezone"
                defaultValue={profile.timezone || ''}
                placeholder="America/New_York"
              />
            </div>
            <SubmitButton>Save Changes</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency Contact</CardTitle>
          <CardDescription>
            This contact will be notified if you miss a safety check-in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleProfileUpdate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">Contact Name</Label>
                <Input
                  id="emergencyContactName"
                  name="emergencyContactName"
                  defaultValue={profile.emergency_contact_name || ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
                <Input
                  id="emergencyContactPhone"
                  name="emergencyContactPhone"
                  type="tel"
                  defaultValue={profile.emergency_contact_phone || ''}
                />
              </div>
            </div>
            <input type="hidden" name="displayName" value={profile.display_name || ''} />
            <SubmitButton>Update Emergency Contact</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Choose how you want to be notified
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleNotificationUpdate} className="space-y-4">
            {notifMessage && (
              <div
                className={`rounded-md p-3 text-sm ${
                  notifMessage.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-destructive/15 text-destructive'
                }`}
              >
                {notifMessage.text}
              </div>
            )}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="emailNotifications"
                  name="emailNotifications"
                  defaultChecked={notificationPrefs?.email_notifications ?? true}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="emailNotifications" className="font-normal">
                  Email notifications for new messages and updates
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="bookingReminders"
                  name="bookingReminders"
                  defaultChecked={notificationPrefs?.booking_reminders ?? true}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="bookingReminders" className="font-normal">
                  Booking reminders (24h and 1h before)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="safetyCheckIns"
                  name="safetyCheckIns"
                  defaultChecked={notificationPrefs?.safety_check_ins ?? true}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="safetyCheckIns" className="font-normal">
                  Safety check-in requests during dates
                </Label>
              </div>
            </div>
            <SubmitButton>Save Preferences</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
