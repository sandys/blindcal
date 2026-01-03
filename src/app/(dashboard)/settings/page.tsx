import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from './profile-form'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto max-w-2xl py-10">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      <ProfileForm profile={profile} />
    </div>
  )
}
