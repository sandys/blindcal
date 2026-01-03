'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { Database } from '@/lib/supabase/database.types'

type Delegation = Database['public']['Tables']['delegations']['Row'] & {
  wingman: {
    id: string
    email: string
    display_name: string | null
    avatar_url: string | null
  } | null
  single: {
    id: string
    email: string
    display_name: string | null
    avatar_url: string | null
  } | null
}

interface DelegationsListProps {
  delegations: Delegation[]
  currentUserId: string
  showActions?: boolean
}

function getTrustLevelLabel(level: string) {
  switch (level) {
    case 'full_delegation':
      return 'Full Delegation'
    case 'approval_required':
      return 'Approval Required'
    case 'view_only':
      return 'View Only'
    default:
      return level
  }
}

function getTrustLevelColor(level: string) {
  switch (level) {
    case 'full_delegation':
      return 'bg-green-100 text-green-800'
    case 'approval_required':
      return 'bg-yellow-100 text-yellow-800'
    case 'view_only':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function DelegationsList({ delegations, currentUserId, showActions }: DelegationsListProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleAction(delegationId: string, action: 'accept' | 'revoke') {
    setLoading(delegationId)
    try {
      const response = await fetch(`/api/delegations/${delegationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || 'Action failed')
        return
      }

      router.refresh()
    } catch {
      alert('Action failed')
    } finally {
      setLoading(null)
    }
  }

  async function handleDelete(delegationId: string) {
    if (!confirm('Are you sure you want to delete this invitation?')) return

    setLoading(delegationId)
    try {
      const response = await fetch(`/api/delegations/${delegationId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || 'Delete failed')
        return
      }

      router.refresh()
    } catch {
      alert('Delete failed')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      {delegations.map((delegation) => {
        const isWingman = delegation.wingman_id === currentUserId
        const isSingle = delegation.single_id === currentUserId
        const isPending = !delegation.accepted_at && !delegation.revoked_at
        const isRevoked = !!delegation.revoked_at
        const isActive = delegation.is_active

        const otherParty = isWingman ? delegation.single : delegation.wingman
        const otherPartyName = otherParty?.display_name || otherParty?.email || 'Unknown'

        return (
          <div
            key={delegation.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{otherPartyName}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getTrustLevelColor(delegation.trust_level)}`}>
                  {getTrustLevelLabel(delegation.trust_level)}
                </span>
                {isPending && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                )}
                {isRevoked && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                    Revoked
                  </span>
                )}
                {isActive && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {isWingman ? 'You are the wingman' : 'You are the single'}
              </div>
            </div>

            {showActions && (
              <div className="flex gap-2">
                {/* Pending invitation actions for single */}
                {isSingle && isPending && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleAction(delegation.id, 'accept')}
                      disabled={loading === delegation.id}
                    >
                      {loading === delegation.id ? 'Accepting...' : 'Accept'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(delegation.id, 'revoke')}
                      disabled={loading === delegation.id}
                    >
                      Decline
                    </Button>
                  </>
                )}

                {/* Wingman can delete pending invitations */}
                {isWingman && isPending && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(delegation.id)}
                    disabled={loading === delegation.id}
                  >
                    {loading === delegation.id ? 'Deleting...' : 'Cancel'}
                  </Button>
                )}

                {/* Active delegation can be revoked by either party */}
                {isActive && !isRevoked && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(delegation.id, 'revoke')}
                    disabled={loading === delegation.id}
                  >
                    {loading === delegation.id ? 'Revoking...' : 'Revoke'}
                  </Button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
