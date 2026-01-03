'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function InviteWingmanForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const singleEmail = formData.get('email') as string
    const trustLevel = formData.get('trustLevel') as string

    try {
      const response = await fetch('/api/delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ singleEmail, trustLevel }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to send invitation')
        return
      }

      setSuccess(true)
      router.refresh()

      // Reset form
      e.currentTarget.reset()
    } catch {
      setError('Failed to send invitation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Invitation sent successfully!
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Single&apos;s Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="friend@example.com"
          required
        />
        <p className="text-xs text-muted-foreground">
          The person you want to help find dates
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="trustLevel">Trust Level</Label>
        <select
          id="trustLevel"
          name="trustLevel"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          defaultValue="approval_required"
          required
        >
          <option value="full_delegation">
            Full Delegation - Can book dates directly
          </option>
          <option value="approval_required">
            Approval Required - Must get approval before booking
          </option>
          <option value="view_only">
            View Only - Can only view and advise
          </option>
        </select>
        <p className="text-xs text-muted-foreground">
          This can be changed later by the single
        </p>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Invitation'}
      </Button>
    </form>
  )
}
