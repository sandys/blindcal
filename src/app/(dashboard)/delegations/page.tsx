import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DelegationsList } from './delegations-list'
import { InviteWingmanForm } from './invite-wingman-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DelegationsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: delegations } = await supabase
    .from('delegations')
    .select(`
      *,
      wingman:profiles!delegations_wingman_id_fkey(id, email, display_name, avatar_url),
      single:profiles!delegations_single_id_fkey(id, email, display_name, avatar_url)
    `)
    .or(`wingman_id.eq.${user.id},single_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  // Separate delegations by role
  const asWingman = delegations?.filter(d => d.wingman_id === user.id) || []
  const asSingle = delegations?.filter(d => d.single_id === user.id) || []

  // Pending invitations where user is the single
  const pendingInvitations = asSingle.filter(d => !d.accepted_at && !d.revoked_at)

  return (
    <div className="container mx-auto max-w-4xl py-10">
      <h1 className="text-3xl font-bold mb-8">Delegations</h1>

      {pendingInvitations.length > 0 && (
        <Card className="mb-8 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">Pending Invitations</CardTitle>
            <CardDescription className="text-yellow-700">
              You have {pendingInvitations.length} pending delegation request(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DelegationsList
              delegations={pendingInvitations}
              currentUserId={user.id}
              showActions
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>As Wingman</CardTitle>
            <CardDescription>
              Singles you are helping manage their dating life
            </CardDescription>
          </CardHeader>
          <CardContent>
            {asWingman.length > 0 ? (
              <DelegationsList
                delegations={asWingman}
                currentUserId={user.id}
                showActions
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                No singles yet. Invite someone to get started.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>As Single</CardTitle>
            <CardDescription>
              Wingmen who are helping you
            </CardDescription>
          </CardHeader>
          <CardContent>
            {asSingle.filter(d => d.accepted_at).length > 0 ? (
              <DelegationsList
                delegations={asSingle.filter(d => d.accepted_at)}
                currentUserId={user.id}
                showActions
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                No wingmen yet. Wait for an invitation or ask a friend.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Invite a Single</CardTitle>
          <CardDescription>
            Send an invitation to become someone&apos;s wingman
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteWingmanForm />
        </CardContent>
      </Card>
    </div>
  )
}
