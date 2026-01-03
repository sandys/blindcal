import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function MessagesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get threads where user is participant
  const { data: threads } = await supabase
    .from('message_threads')
    .select(`
      *,
      candidate:candidates!message_threads_candidate_id_fkey(
        id,
        display_name,
        email
      ),
      campaign:campaigns!message_threads_campaign_id_fkey(
        id,
        title
      )
    `)
    .eq('other_participant_id', user.id)
    .eq('is_active', true)
    .order('last_message_at', { ascending: false })

  // Also get threads where user is a candidate
  const { data: candidateData } = await supabase
    .from('candidates')
    .select(`
      id,
      threads:message_threads(
        *,
        campaign:campaigns!message_threads_campaign_id_fkey(
          id,
          title
        )
      )
    `)
    .eq('user_id', user.id)

  type ThreadType = NonNullable<typeof threads>[number]
  const allThreads: ThreadType[] = [...(threads || [])]

  if (candidateData) {
    for (const candidate of candidateData) {
      const candidateThreadsList = candidate.threads as unknown as ThreadType[]
      if (candidateThreadsList) {
        allThreads.push(
          ...candidateThreadsList.filter((t) => t.is_active)
        )
      }
    }
  }

  // Remove duplicates and sort
  const uniqueThreads = Array.from(
    new Map(allThreads.map((t) => [t.id, t])).values()
  ).sort((a, b) => {
    const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
    const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
    return bTime - aTime
  })

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground">
          Communicate with candidates through masked messaging
        </p>
      </div>

      {uniqueThreads.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No conversations yet</p>
            <p className="text-sm mt-2">
              Start a conversation from a candidate&apos;s profile in the pipeline
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {uniqueThreads.map((thread) => {
            const isUserTheOtherParticipant = thread.other_participant_id === user.id
            const displayName = isUserTheOtherParticipant
              ? thread.candidate_alias
              : thread.other_alias

            return (
              <Link
                key={thread.id}
                href={`/messages/${thread.id}`}
                className="block"
              >
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardHeader className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{displayName}</CardTitle>
                        <CardDescription>
                          {(thread.campaign as { title: string })?.title}
                        </CardDescription>
                      </div>
                      {thread.last_message_at && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(thread.last_message_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
