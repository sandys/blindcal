'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { use } from 'react'

interface Message {
  id: string
  content: string
  sender_id: string
  sender_role: string
  created_at: string
  read_at: string | null
}

interface Thread {
  id: string
  candidate_alias: string
  other_alias: string
  other_participant_id: string
  campaign: {
    id: string
    title: string
  }
}

export default function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>
}) {
  const { threadId } = use(params)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [thread, setThread] = useState<Thread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchThread() {
      try {
        const response = await fetch(`/api/messages/${threadId}`)
        if (!response.ok) {
          throw new Error('Thread not found')
        }
        const data = await response.json()
        setThread(data.thread)
        setMessages(data.messages || [])

        // Get current user from first message or thread
        if (data.messages?.length > 0) {
          // We'll determine current user by comparing sender_id with other_participant_id
        }
        setCurrentUserId(data.thread.other_participant_id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load thread')
      } finally {
        setLoading(false)
      }
    }

    fetchThread()

    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchThread, 5000)
    return () => clearInterval(interval)
  }, [threadId])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      const response = await fetch(`/api/messages/${threadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send message')
      }

      const data = await response.json()
      setMessages((prev) => [...prev, data.message])
      setNewMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !thread) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-600 mb-4">{error || 'Thread not found'}</p>
            <Button asChild>
              <Link href="/messages">Back to Messages</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Determine display name - show the other person's alias
  const isOtherParticipant = thread.other_participant_id === currentUserId
  const displayAlias = isOtherParticipant
    ? thread.candidate_alias
    : thread.other_alias

  return (
    <div className="container max-w-2xl mx-auto py-4 px-4 h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <Link
          href="/messages"
          className="text-muted-foreground hover:text-foreground"
        >
          ←
        </Link>
        <div>
          <h1 className="font-semibold">{displayAlias}</h1>
          <p className="text-sm text-muted-foreground">
            {thread.campaign?.title}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === currentUserId

            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    isOwn
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}
                  >
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="pt-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1"
          />
          <Button type="submit" disabled={sending || !newMessage.trim()}>
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </form>
    </div>
  )
}
