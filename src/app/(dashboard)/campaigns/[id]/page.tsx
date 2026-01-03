import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CampaignEditor } from './campaign-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select(`
      *,
      delegation:delegations!campaigns_delegation_id_fkey(
        id,
        trust_level,
        wingman:profiles!delegations_wingman_id_fkey(id, email, display_name, avatar_url),
        single:profiles!delegations_single_id_fkey(id, email, display_name, avatar_url)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !campaign) {
    notFound()
  }

  // Check access
  const isWingman = campaign.wingman_id === user.id
  const isSingle = campaign.single_id === user.id

  if (!isWingman && !isSingle) {
    notFound()
  }

  // Get candidate count
  const { count: candidateCount } = await supabase
    .from('candidates')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', id)

  const publicUrl = `/c/${campaign.slug}`

  return (
    <div className="container mx-auto max-w-4xl py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">{campaign.title}</h1>
          <p className="text-muted-foreground mt-1">
            For: {campaign.delegation?.single?.display_name || campaign.delegation?.single?.email}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={publicUrl} target="_blank">
              View Public Page
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/campaigns/${id}/pipeline`}>
              View Pipeline ({candidateCount || 0})
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {campaign.is_published ? (
                <span className="inline-flex items-center gap-1 text-green-600">
                  <span className="h-2 w-2 rounded-full bg-green-600" />
                  Published
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-gray-600">
                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                  Draft
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {campaign.is_accepting_applications ? (
                <span className="inline-flex items-center gap-1 text-blue-600">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  Open
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-gray-600">
                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                  Closed
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Candidates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{candidateCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      {isWingman ? (
        <CampaignEditor campaign={campaign} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
            <CardDescription>
              This campaign is managed by your wingman
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tagline</p>
                <p>{campaign.tagline || 'No tagline set'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p>{campaign.description || 'No description set'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Public URL</p>
                <code className="text-sm bg-muted px-2 py-1 rounded">{publicUrl}</code>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
