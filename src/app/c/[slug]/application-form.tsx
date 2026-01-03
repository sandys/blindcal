'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ApplicationFormProps {
  campaignId: string
  requiresPhoto: boolean
  requiresBio: boolean
}

export function ApplicationForm({
  campaignId,
  requiresPhoto,
  requiresBio,
}: ApplicationFormProps) {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const application = {
      campaignId,
      email: formData.get('email') as string,
      displayName: formData.get('displayName') as string,
      phone: formData.get('phone') as string || null,
      bio: formData.get('bio') as string || null,
    }

    try {
      const response = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(application),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to submit application')
        return
      }

      setSubmitted(true)
    } catch {
      setError('Failed to submit application')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-6">
        <div className="text-4xl mb-4">🎉</div>
        <h3 className="text-xl font-semibold mb-2">Application Submitted!</h3>
        <p className="text-muted-foreground">
          Thanks for your interest! You&apos;ll hear back if there&apos;s a match.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="displayName">Your Name</Label>
        <Input
          id="displayName"
          name="displayName"
          placeholder="How you'd like to be called"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="your@email.com"
          required
        />
        <p className="text-xs text-muted-foreground">
          We&apos;ll use this to contact you if there&apos;s a match
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder="+1 (555) 123-4567"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">
          Tell us about yourself {requiresBio && '*'}
        </Label>
        <textarea
          id="bio"
          name="bio"
          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Share a bit about yourself, your interests, and what you're looking for..."
          required={requiresBio}
        />
      </div>

      {requiresPhoto && (
        <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
          Photo upload coming soon! For now, just submit your application and
          we&apos;ll reach out if we need more info.
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Application'}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        By submitting, you agree to be contacted about potential matches.
      </p>
    </form>
  )
}
