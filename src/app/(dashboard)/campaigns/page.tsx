import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function CampaignsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select(`
      *,
      delegation:delegations!campaigns_delegation_id_fkey(
        id,
        trust_level,
        wingman:profiles!delegations_wingman_id_fkey(id, email, display_name),
        single:profiles!delegations_single_id_fkey(id, email, display_name)
      )
    `)
    .or(`wingman_id.eq.${user.id},single_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  const myCampaigns = campaigns?.filter(c => c.wingman_id === user.id) || []
  const sharedCampaigns = campaigns?.filter(c => c.single_id === user.id) || []

  return (
    <div className="container mx-auto max-w-4xl py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Campaigns</h1>
        <Button asChild>
          <Link href="/campaigns/new">Create Campaign</Link>
        </Button>
      </div>

      {myCampaigns.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">My Campaigns</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {myCampaigns.map((campaign) => (
              <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{campaign.title}</CardTitle>
                      <div className="flex gap-1">
                        {campaign.is_published ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                            Published
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
                            Draft
                          </span>
                        )}
                        {campaign.is_accepting_applications && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            Open
                          </span>
                        )}
                      </div>
                    </div>
                    <CardDescription>
                      {campaign.tagline || 'No tagline set'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      For: {campaign.delegation?.single?.display_name || campaign.delegation?.single?.email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      /{campaign.slug}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {sharedCampaigns.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Campaigns For Me</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {sharedCampaigns.map((campaign) => (
              <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{campaign.title}</CardTitle>
                      <div className="flex gap-1">
                        {campaign.is_published ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                            Published
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
                            Draft
                          </span>
                        )}
                      </div>
                    </div>
                    <CardDescription>
                      {campaign.tagline || 'No tagline set'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Managed by: {campaign.delegation?.wingman?.display_name || campaign.delegation?.wingman?.email}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {campaigns?.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground mb-4">
              No campaigns yet. Create one to start finding matches for your singles.
            </p>
            <Button asChild>
              <Link href="/campaigns/new">Create Your First Campaign</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
