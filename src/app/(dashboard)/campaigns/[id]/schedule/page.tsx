'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { use } from 'react'

interface Candidate {
  id: string
  display_name: string
  email: string
  current_stage: string
}

export default function SchedulePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: campaignId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const candidateId = searchParams.get('candidate')

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<string>(candidateId || '')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    notes: '',
  })

  useEffect(() => {
    async function fetchCandidates() {
      try {
        const response = await fetch(`/api/campaigns/${campaignId}/candidates`)
        if (!response.ok) {
          throw new Error('Failed to load candidates')
        }
        const data = await response.json()
        // Filter to only approved candidates
        const approvedCandidates = data.candidates.filter(
          (c: Candidate) => c.current_stage === 'approved' || c.current_stage === 'scheduled'
        )
        setCandidates(approvedCandidates)

        if (candidateId && approvedCandidates.some((c: Candidate) => c.id === candidateId)) {
          setSelectedCandidate(candidateId)
          const candidate = approvedCandidates.find((c: Candidate) => c.id === candidateId)
          if (candidate) {
            setFormData((prev) => ({
              ...prev,
              title: `Date with ${candidate.display_name}`,
            }))
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load candidates')
      } finally {
        setLoading(false)
      }
    }

    fetchCandidates()
  }, [campaignId, candidateId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (!selectedCandidate) {
        throw new Error('Please select a candidate')
      }

      if (!formData.date || !formData.startTime || !formData.endTime) {
        throw new Error('Please fill in date and time')
      }

      const startTime = new Date(`${formData.date}T${formData.startTime}`)
      const endTime = new Date(`${formData.date}T${formData.endTime}`)

      if (endTime <= startTime) {
        throw new Error('End time must be after start time')
      }

      if (startTime < new Date()) {
        throw new Error('Cannot schedule a date in the past')
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: selectedCandidate,
          campaign_id: campaignId,
          title: formData.title || 'Date',
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          location: formData.location || null,
          notes: formData.notes || null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create booking')
      }

      const data = await response.json()
      router.push(`/bookings/${data.booking.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link
          href={`/campaigns/${campaignId}/pipeline`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Pipeline
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schedule a Date</CardTitle>
          <CardDescription>
            Create a new booking for an approved candidate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No approved candidates available for scheduling
              </p>
              <Button asChild variant="outline">
                <Link href={`/campaigns/${campaignId}/pipeline`}>
                  Go to Pipeline
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="candidate">Candidate</Label>
                <select
                  id="candidate"
                  value={selectedCandidate}
                  onChange={(e) => {
                    setSelectedCandidate(e.target.value)
                    const candidate = candidates.find((c) => c.id === e.target.value)
                    if (candidate) {
                      setFormData((prev) => ({
                        ...prev,
                        title: `Date with ${candidate.display_name}`,
                      }))
                    }
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select a candidate</option>
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.display_name} ({candidate.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Date with..."
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, date: e.target.value }))
                    }
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, startTime: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, endTime: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, location: e.target.value }))
                  }
                  placeholder="Restaurant name, address, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Any additional details..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Booking'}
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
