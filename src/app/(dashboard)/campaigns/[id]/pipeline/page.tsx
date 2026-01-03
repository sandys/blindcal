import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from './kanban-board'
import { Button } from '@/components/ui/button'

export default async function PipelinePage({
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

  // Get campaign with delegation info
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select(`
      id,
      title,
      wingman_id,
      single_id,
      slug,
      delegation:delegations!campaigns_delegation_id_fkey(
        trust_level,
        wingman:profiles!delegations_wingman_id_fkey(display_name),
        single:profiles!delegations_single_id_fkey(display_name)
      )
    `)
    .eq('id', id)
    .single()

  if (campaignError || !campaign) {
    notFound()
  }

  const isWingman = campaign.wingman_id === user.id
  const isSingle = campaign.single_id === user.id

  if (!isWingman && !isSingle) {
    notFound()
  }

  // Get candidates for this campaign
  const { data: candidates } = await supabase
    .from('candidates')
    .select('*')
    .eq('campaign_id', id)
    .order('stage_changed_at', { ascending: false })

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/campaigns/${id}`}
              className="text-muted-foreground hover:text-foreground"
            >
              ← Back
            </Link>
            <span className="text-muted-foreground">/</span>
            <h1 className="text-xl font-semibold">{campaign.title}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {candidates?.length || 0} candidates in pipeline
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/c/${campaign.slug}`} target="_blank">
              View Landing Page
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          campaignId={id}
          candidates={candidates || []}
          isWingman={isWingman}
          isSingle={isSingle}
          trustLevel={(campaign.delegation as { trust_level: string } | null)?.trust_level || 'view_only'}
        />
      </div>
    </div>
  )
}
