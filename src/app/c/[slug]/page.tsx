import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ApplicationForm } from './application-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { renderTemplate, type CampaignTemplateContext } from '@/lib/templates'
import { getTemplate } from '@/lib/templates/defaults'

export default async function CampaignLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select(`
      id,
      title,
      slug,
      tagline,
      description,
      is_published,
      is_accepting_applications,
      requires_photo,
      requires_bio,
      cover_image_url,
      initial_disclosure_level,
      custom_template,
      template_id,
      created_at,
      published_at,
      delegation:delegations!campaigns_delegation_id_fkey(
        wingman:profiles!delegations_wingman_id_fkey(
          display_name,
          bio
        ),
        single:profiles!delegations_single_id_fkey(
          display_name,
          avatar_url,
          bio,
          date_of_birth
        )
      )
    `)
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (error || !campaign) {
    notFound()
  }

  const wingman = campaign.delegation?.wingman as { display_name?: string; bio?: string } | null
  const single = campaign.delegation?.single as { display_name?: string; bio?: string; date_of_birth?: string } | null

  // Get candidate stats
  const { count: totalCandidates } = await supabase
    .from('candidates')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaign.id)

  const { count: activeCandidates } = await supabase
    .from('candidates')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaign.id)
    .not('current_stage', 'in', '("rejected","archived")')

  // Calculate age from date_of_birth
  const calculateAge = (dob?: string): number | undefined => {
    if (!dob) return undefined
    const birth = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  // Get initials from name
  const getInitials = (name?: string): string => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2)
  }

  // Determine visibility based on disclosure level
  const isAnonymous = campaign.initial_disclosure_level === 'anonymous'
  const showWingmanName = !isAnonymous
  const showSingleBio = !isAnonymous && single?.bio

  // Build template context
  const templateContext: CampaignTemplateContext = {
    campaign: {
      title: campaign.title,
      tagline: campaign.tagline || undefined,
      description: campaign.description || undefined,
      slug: campaign.slug,
      is_accepting_applications: campaign.is_accepting_applications || false,
      requires_photo: campaign.requires_photo || false,
      requires_bio: campaign.requires_bio || false,
      created_at: campaign.created_at || new Date().toISOString(),
      published_at: campaign.published_at || undefined,
    },
    wingman: {
      display_name: showWingmanName ? wingman?.display_name : undefined,
      bio: showWingmanName ? wingman?.bio : undefined,
      initials: getInitials(wingman?.display_name),
    },
    single: {
      display_name: isAnonymous ? undefined : single?.display_name,
      bio: showSingleBio ? single?.bio : undefined,
      age: calculateAge(single?.date_of_birth),
      initials: getInitials(single?.display_name),
    },
    stats: {
      total_candidates: totalCandidates || 0,
      active_candidates: activeCandidates || 0,
    },
    config: {
      show_wingman_name: showWingmanName,
      show_single_bio: Boolean(showSingleBio),
    },
  }

  // Get template - use custom template if set, otherwise use named template or default
  const customTemplate = campaign.custom_template as string | null
  const templateId = (campaign.template_id as 'default' | 'minimal' | 'detailed' | 'elegant' | 'playful' | null) || 'default'
  const template = customTemplate || getTemplate(templateId)

  // Render the Liquid template
  const renderedHtml = await renderTemplate(template, templateContext)

  return (
    <div className="min-h-screen">
      {/* Rendered Liquid Template */}
      <div
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />

      {/* Application Form (always React, not templated) */}
      <div id="application-form" className="max-w-2xl mx-auto px-4 py-8">
        {campaign.is_accepting_applications ? (
          <Card>
            <CardHeader>
              <CardTitle>Apply to Connect</CardTitle>
              <CardDescription>
                Fill out this form to express your interest
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApplicationForm
                campaignId={campaign.id}
                requiresPhoto={campaign.requires_photo || false}
                requiresBio={campaign.requires_bio || false}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">
                This campaign is not currently accepting applications.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Check back later!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
