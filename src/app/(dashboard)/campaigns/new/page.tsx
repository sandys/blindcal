'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Delegation {
  id: string
  trust_level: string
  single: {
    id: string
    email: string
    display_name: string | null
  } | null
}

export default function NewCampaignPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [delegations, setDelegations] = useState<Delegation[]>([])
  const [loadingDelegations, setLoadingDelegations] = useState(true)

  useEffect(() => {
    async function fetchDelegations() {
      try {
        const response = await fetch('/api/delegations')
        const data = await response.json()

        if (response.ok) {
          // Filter to only active delegations where user is wingman
          const activeDelegations = data.delegations?.filter(
            (d: Delegation & { is_active: boolean; wingman_id: string }) =>
              d.is_active
          ) || []
          setDelegations(activeDelegations)
        }
      } catch {
        console.error('Failed to fetch delegations')
      } finally {
        setLoadingDelegations(false)
      }
    }

    fetchDelegations()
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const delegationId = formData.get('delegationId') as string
    const title = formData.get('title') as string
    const tagline = formData.get('tagline') as string
    const description = formData.get('description') as string

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delegationId, title, tagline, description }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create campaign')
        return
      }

      router.push(`/campaigns/${data.campaign.id}`)
    } catch {
      setError('Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  if (loadingDelegations) {
    return (
      <div className="container mx-auto max-w-2xl py-10">
        <p>Loading...</p>
      </div>
    )
  }

  if (delegations.length === 0) {
    return (
      <div className="container mx-auto max-w-2xl py-10">
        <Card>
          <CardHeader>
            <CardTitle>No Active Delegations</CardTitle>
            <CardDescription>
              You need an active delegation before you can create a campaign.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              First, invite someone to be your single, or wait for them to accept your invitation.
            </p>
            <Button onClick={() => router.push('/delegations')}>
              Manage Delegations
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl py-10">
      <h1 className="text-3xl font-bold mb-8">Create Campaign</h1>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
          <CardDescription>
            Create a landing page to attract potential matches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="delegationId">For Which Single?</Label>
              <select
                id="delegationId"
                name="delegationId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              >
                {delegations.map((delegation) => (
                  <option key={delegation.id} value={delegation.id}>
                    {delegation.single?.display_name || delegation.single?.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Campaign Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Find a match for Alex"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                name="tagline"
                placeholder="A fun, adventurous spirit looking for connection"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Tell potential matches about the single you're helping..."
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Campaign'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
