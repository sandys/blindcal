'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Database } from '@/lib/supabase/database.types'

type Campaign = Database['public']['Tables']['campaigns']['Row']

interface CampaignEditorProps {
  campaign: Campaign
}

export function CampaignEditor({ campaign }: CampaignEditorProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const updates = {
      title: formData.get('title') as string,
      tagline: formData.get('tagline') as string,
      description: formData.get('description') as string,
      requires_photo: formData.get('requires_photo') === 'on',
      requires_bio: formData.get('requires_bio') === 'on',
    }

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to update' })
        return
      }

      setMessage({ type: 'success', text: 'Campaign updated successfully' })
      router.refresh()
    } catch {
      setMessage({ type: 'error', text: 'Failed to update' })
    } finally {
      setLoading(false)
    }
  }

  async function togglePublish() {
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !campaign.is_published }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to update' })
        return
      }

      setMessage({
        type: 'success',
        text: campaign.is_published ? 'Campaign unpublished' : 'Campaign published!',
      })
      router.refresh()
    } catch {
      setMessage({ type: 'error', text: 'Failed to update' })
    } finally {
      setLoading(false)
    }
  }

  async function toggleApplications() {
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_accepting_applications: !campaign.is_accepting_applications }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to update' })
        return
      }

      setMessage({
        type: 'success',
        text: campaign.is_accepting_applications ? 'Applications closed' : 'Applications opened!',
      })
      router.refresh()
    } catch {
      setMessage({ type: 'error', text: 'Failed to update' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Campaign Settings</CardTitle>
          <CardDescription>
            Control who can see and apply to this campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              onClick={togglePublish}
              disabled={loading}
              variant={campaign.is_published ? 'outline' : 'default'}
            >
              {campaign.is_published ? 'Unpublish' : 'Publish Campaign'}
            </Button>
            <Button
              onClick={toggleApplications}
              disabled={loading || !campaign.is_published}
              variant={campaign.is_accepting_applications ? 'outline' : 'secondary'}
            >
              {campaign.is_accepting_applications ? 'Close Applications' : 'Open Applications'}
            </Button>
          </div>
          {!campaign.is_published && (
            <p className="text-sm text-muted-foreground mt-2">
              Publish the campaign to make it visible to potential matches.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit Campaign</CardTitle>
          <CardDescription>
            Update the campaign details and requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
              <div
                className={`rounded-md p-3 text-sm ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-destructive/15 text-destructive'
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                defaultValue={campaign.title}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                name="tagline"
                defaultValue={campaign.tagline || ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                defaultValue={campaign.description || ''}
              />
            </div>

            <div className="space-y-4">
              <Label>Application Requirements</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="requires_photo"
                  name="requires_photo"
                  defaultChecked={campaign.requires_photo || false}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="requires_photo" className="font-normal">
                  Require photo
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="requires_bio"
                  name="requires_bio"
                  defaultChecked={campaign.requires_bio || false}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="requires_bio" className="font-normal">
                  Require bio
                </Label>
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
