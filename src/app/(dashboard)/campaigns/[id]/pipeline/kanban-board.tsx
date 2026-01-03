'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Database } from '@/lib/supabase/database.types'

type Candidate = Database['public']['Tables']['candidates']['Row']
type PipelineStage = Database['public']['Enums']['pipeline_stage']

interface KanbanBoardProps {
  campaignId: string
  candidates: Candidate[]
  isWingman: boolean
  isSingle: boolean
  trustLevel: string
}

const STAGES: { id: PipelineStage; label: string; color: string }[] = [
  { id: 'new', label: 'New', color: 'bg-gray-100' },
  { id: 'screening', label: 'Screening', color: 'bg-blue-50' },
  { id: 'proposed', label: 'Proposed', color: 'bg-yellow-50' },
  { id: 'approved', label: 'Approved', color: 'bg-green-50' },
  { id: 'scheduled', label: 'Scheduled', color: 'bg-purple-50' },
  { id: 'completed', label: 'Completed', color: 'bg-emerald-50' },
]

const ARCHIVED_STAGES: PipelineStage[] = ['rejected', 'archived']

export function KanbanBoard({
  campaignId,
  candidates: initialCandidates,
  isWingman,
  isSingle,
  trustLevel,
}: KanbanBoardProps) {
  const router = useRouter()
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates)
  const [loading, setLoading] = useState<string | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)

  // Subscribe to realtime updates
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`candidates:${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candidates',
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCandidates((prev) => [payload.new as Candidate, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setCandidates((prev) =>
              prev.map((c) => (c.id === payload.new.id ? (payload.new as Candidate) : c))
            )
          } else if (payload.eventType === 'DELETE') {
            setCandidates((prev) => prev.filter((c) => c.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [campaignId])

  async function moveCandidate(candidateId: string, newStage: PipelineStage) {
    setLoading(candidateId)

    try {
      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_stage: newStage }),
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || 'Failed to move candidate')
        return
      }

      // Optimistic update
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidateId
            ? { ...c, current_stage: newStage, stage_changed_at: new Date().toISOString() }
            : c
        )
      )

      router.refresh()
    } catch {
      alert('Failed to move candidate')
    } finally {
      setLoading(null)
    }
  }

  function getCandidatesForStage(stage: PipelineStage) {
    return candidates.filter((c) => c.current_stage === stage)
  }

  function canMoveToStage(fromStage: PipelineStage, toStage: PipelineStage): boolean {
    // View-only wingmen can't move anything
    if (isWingman && trustLevel === 'view_only') return false

    // Singles can only approve/reject from proposed
    if (isSingle && !isWingman) {
      if (fromStage !== 'proposed') return false
      return toStage === 'approved' || toStage === 'rejected'
    }

    // Wingmen can move through most stages
    return true
  }

  const archivedCandidates = candidates.filter((c) =>
    ARCHIVED_STAGES.includes(c.current_stage)
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 h-full min-w-max">
          {STAGES.map((stage) => {
            const stageCandidates = getCandidatesForStage(stage.id)

            return (
              <div
                key={stage.id}
                className={`w-72 flex-shrink-0 rounded-lg ${stage.color} p-3`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-sm">{stage.label}</h3>
                  <span className="text-xs text-muted-foreground bg-white px-2 py-0.5 rounded-full">
                    {stageCandidates.length}
                  </span>
                </div>

                <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-16rem)]">
                  {stageCandidates.map((candidate) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      isLoading={loading === candidate.id}
                      onSelect={() => setSelectedCandidate(candidate)}
                      onMove={(toStage) => moveCandidate(candidate.id, toStage)}
                      canMove={canMoveToStage(candidate.current_stage, 'new')}
                      isWingman={isWingman}
                      isSingle={isSingle}
                    />
                  ))}

                  {stageCandidates.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No candidates
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {archivedCandidates.length > 0 && (
        <div className="border-t p-4">
          <details>
            <summary className="text-sm font-medium cursor-pointer">
              Archived ({archivedCandidates.length})
            </summary>
            <div className="mt-2 flex gap-2 flex-wrap">
              {archivedCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="text-sm px-3 py-1 bg-muted rounded-full"
                >
                  {candidate.display_name}
                  <span className="text-muted-foreground ml-1">
                    ({candidate.current_stage})
                  </span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {selectedCandidate && (
        <CandidateModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onMove={(toStage) => {
            moveCandidate(selectedCandidate.id, toStage)
            setSelectedCandidate(null)
          }}
          isWingman={isWingman}
          isSingle={isSingle}
          trustLevel={trustLevel}
        />
      )}
    </div>
  )
}

interface CandidateCardProps {
  candidate: Candidate
  isLoading: boolean
  onSelect: () => void
  onMove: (stage: PipelineStage) => void
  canMove: boolean
  isWingman: boolean
  isSingle: boolean
}

function CandidateCard({
  candidate,
  isLoading,
  onSelect,
  onMove,
  isWingman,
  isSingle,
}: CandidateCardProps) {
  const stage = candidate.current_stage

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow ${isLoading ? 'opacity-50' : ''}`}
      onClick={onSelect}
    >
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm font-medium">
          {candidate.display_name}
        </CardTitle>
        <CardDescription className="text-xs">
          {candidate.email}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {candidate.bio && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {candidate.bio}
          </p>
        )}

        {candidate.rating && (
          <div className="text-xs text-muted-foreground mb-2">
            Rating: {'⭐'.repeat(candidate.rating)}
          </div>
        )}

        {/* Quick actions based on stage */}
        <div className="flex gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
          {stage === 'new' && isWingman && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-6 px-2"
              onClick={() => onMove('screening')}
              disabled={isLoading}
            >
              Start Screening
            </Button>
          )}

          {stage === 'screening' && isWingman && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-6 px-2"
              onClick={() => onMove('proposed')}
              disabled={isLoading}
            >
              Propose
            </Button>
          )}

          {stage === 'proposed' && (isSingle || isWingman) && (
            <>
              <Button
                size="sm"
                variant="default"
                className="text-xs h-6 px-2"
                onClick={() => onMove('approved')}
                disabled={isLoading}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-6 px-2"
                onClick={() => onMove('rejected')}
                disabled={isLoading}
              >
                Reject
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface CandidateModalProps {
  candidate: Candidate
  onClose: () => void
  onMove: (stage: PipelineStage) => void
  isWingman: boolean
  isSingle: boolean
  trustLevel: string
}

function CandidateModal({
  candidate,
  onClose,
  onMove,
  isWingman,
  isSingle,
  trustLevel,
}: CandidateModalProps) {
  const canEdit = isWingman && trustLevel !== 'view_only'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-lg max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">{candidate.display_name}</h2>
              <p className="text-muted-foreground">{candidate.email}</p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-1">Status</h3>
              <span className="text-sm px-2 py-1 bg-muted rounded">
                {candidate.current_stage}
              </span>
            </div>

            {candidate.phone && (
              <div>
                <h3 className="text-sm font-medium mb-1">Phone</h3>
                <p className="text-sm">{candidate.phone}</p>
              </div>
            )}

            {candidate.bio && (
              <div>
                <h3 className="text-sm font-medium mb-1">Bio</h3>
                <p className="text-sm whitespace-pre-wrap">{candidate.bio}</p>
              </div>
            )}

            {candidate.wingman_notes && (
              <div>
                <h3 className="text-sm font-medium mb-1">Wingman Notes</h3>
                <p className="text-sm whitespace-pre-wrap">{candidate.wingman_notes}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium mb-1">Applied</h3>
              <p className="text-sm">
                {candidate.applied_at
                  ? new Date(candidate.applied_at).toLocaleDateString()
                  : 'Unknown'}
              </p>
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-2">Move to Stage</h3>
              <div className="flex flex-wrap gap-2">
                {STAGES.map((stage) => {
                  const isCurrent = candidate.current_stage === stage.id
                  const canMove =
                    !isCurrent &&
                    (canEdit ||
                      (isSingle &&
                        candidate.current_stage === 'proposed' &&
                        (stage.id === 'approved' || stage.id === 'rejected')))

                  return (
                    <Button
                      key={stage.id}
                      size="sm"
                      variant={isCurrent ? 'default' : 'outline'}
                      disabled={!canMove}
                      onClick={() => canMove && onMove(stage.id)}
                    >
                      {stage.label}
                    </Button>
                  )
                })}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    candidate.current_stage === 'rejected' ||
                    (!canEdit && !isSingle)
                  }
                  onClick={() => onMove('rejected')}
                >
                  Reject
                </Button>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={candidate.current_stage === 'archived'}
                    onClick={() => onMove('archived')}
                  >
                    Archive
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
