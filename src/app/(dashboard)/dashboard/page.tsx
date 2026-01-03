import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DashboardPage() {
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

  return (
    <div className="container mx-auto max-w-4xl py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <form action={signOut}>
          <Button variant="outline" type="submit">
            Sign out
          </Button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {profile?.display_name || user.email}</CardTitle>
            <CardDescription>
              Your BlindCal account is ready
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {user.email}
            </p>
            {profile?.roles && profile.roles.length > 0 && (
              <div className="mt-2 flex gap-2">
                {profile.roles.map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                  >
                    {role}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Get started with BlindCal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              Create a Campaign
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Manage Delegations
            </Button>
            <Button variant="outline" className="w-full justify-start">
              View Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
