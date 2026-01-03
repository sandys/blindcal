'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { use } from 'react'

interface Booking {
  id: string
  title: string
  start_time: string
  end_time: string
  location: string | null
  notes: string | null
  status: string
  timezone: string
  wingman_id: string
  single_id: string
  candidate_id: string
  candidate: {
    id: string
    display_name: string
    email: string
    phone: string | null
    bio: string | null
  }
  campaign: {
    id: string
    title: string
  }
  description: string | null
  approved_at: string | null
}

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const action = searchParams.get('action')

  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [showCancelForm, setShowCancelForm] = useState(action === 'decline')

  useEffect(() => {
    async function fetchBooking() {
      try {
        const response = await fetch(`/api/bookings/${id}`)
        if (!response.ok) {
          throw new Error('Booking not found')
        }
        const data = await response.json()
        setBooking(data.booking)

        // Auto-trigger approval if action=approve
        if (action === 'approve' && data.booking.status === 'pending') {
          handleApprove()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load booking')
      } finally {
        setLoading(false)
      }
    }

    fetchBooking()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleApprove() {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to approve booking')
      }

      const data = await response.json()
      setBooking(data.booking)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCancel() {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'cancelled',
          reason: cancellationReason || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to cancel booking')
      }

      const data = await response.json()
      setBooking(data.booking)
      setShowCancelForm(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleComplete(status: 'completed' | 'no_show') {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update booking')
      }

      const data = await response.json()
      setBooking(data.booking)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setActionLoading(false)
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

  if (error || !booking) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-600 mb-4">{error || 'Booking not found'}</p>
            <Button asChild>
              <Link href="/bookings">Back to Bookings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isPast = new Date(booking.end_time) < new Date()
  const canComplete = booking.status === 'confirmed' && isPast
  const canCancel = ['pending', 'confirmed'].includes(booking.status) && !isPast

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link
          href="/bookings"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Bookings
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{booking.title}</CardTitle>
            <span
              className={`text-sm px-3 py-1 rounded-full ${
                booking.status === 'confirmed'
                  ? 'bg-green-100 text-green-800'
                  : booking.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : booking.status === 'cancelled'
                  ? 'bg-red-100 text-red-800'
                  : booking.status === 'completed'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {booking.status}
            </span>
          </div>
          <CardDescription>
            {booking.campaign.title}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium mb-1">Date & Time</h3>
              <p className="text-sm">
                {new Date(booking.start_time).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-sm text-muted-foreground">
                {new Date(booking.start_time).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}{' '}
                -{' '}
                {new Date(booking.end_time).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {booking.location && (
              <div>
                <h3 className="text-sm font-medium mb-1">Location</h3>
                <p className="text-sm">{booking.location}</p>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Candidate</h3>
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{booking.candidate.display_name}</p>
              <p className="text-sm text-muted-foreground">
                {booking.candidate.email}
              </p>
              {booking.candidate.phone && (
                <p className="text-sm text-muted-foreground">
                  {booking.candidate.phone}
                </p>
              )}
              {booking.candidate.bio && (
                <p className="text-sm mt-2">{booking.candidate.bio}</p>
              )}
            </div>
          </div>

          {booking.description && (
            <div>
              <h3 className="text-sm font-medium mb-1">Notes</h3>
              <p className="text-sm whitespace-pre-wrap">{booking.description}</p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t space-y-4">
            {booking.status === 'pending' && (
              <div className="flex gap-2">
                <Button
                  onClick={handleApprove}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Approving...' : 'Approve Booking'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCancelForm(true)}
                  disabled={actionLoading}
                >
                  Decline
                </Button>
              </div>
            )}

            {canComplete && (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleComplete('completed')}
                  disabled={actionLoading}
                >
                  Mark as Completed
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleComplete('no_show')}
                  disabled={actionLoading}
                >
                  Mark as No-Show
                </Button>
              </div>
            )}

            {canCancel && booking.status === 'confirmed' && (
              <Button
                variant="destructive"
                onClick={() => setShowCancelForm(true)}
                disabled={actionLoading}
              >
                Cancel Booking
              </Button>
            )}

            {showCancelForm && (
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reason">Cancellation Reason (optional)</Label>
                  <Input
                    id="reason"
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="Why are you cancelling?"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleCancel}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelForm(false)}
                    disabled={actionLoading}
                  >
                    Keep Booking
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
