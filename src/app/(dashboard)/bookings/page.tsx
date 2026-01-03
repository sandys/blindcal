import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function BookingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get all bookings for this user
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      candidate:candidates!bookings_candidate_id_fkey(
        id,
        display_name,
        email
      ),
      campaign:campaigns!bookings_campaign_id_fkey(
        id,
        title
      )
    `)
    .or(`wingman_id.eq.${user.id},single_id.eq.${user.id}`)
    .order('start_time', { ascending: true })

  const now = new Date()
  const upcomingBookings = bookings?.filter(
    (b) => new Date(b.start_time) > now && b.status !== 'cancelled'
  ) || []
  const pastBookings = bookings?.filter(
    (b) => new Date(b.start_time) <= now || b.status === 'cancelled'
  ) || []
  const pendingBookings = bookings?.filter((b) => b.status === 'pending') || []

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Bookings</h1>
          <p className="text-muted-foreground">
            Manage your upcoming and past dates
          </p>
        </div>
      </div>

      {pendingBookings.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Pending Approval</h2>
          <div className="space-y-4">
            {pendingBookings.map((booking) => (
              <Card key={booking.id} className="border-yellow-200 bg-yellow-50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {booking.title}
                    </CardTitle>
                    <span className="text-xs px-2 py-1 bg-yellow-200 text-yellow-800 rounded">
                      Pending
                    </span>
                  </div>
                  <CardDescription>
                    with {(booking.candidate as { display_name: string })?.display_name} -{' '}
                    {(booking.campaign as { title: string })?.title}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <p className="font-medium">
                        {new Date(booking.start_time).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-muted-foreground">
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
                      {booking.location_details && (
                        <p className="text-muted-foreground">
                          {(booking.location_details as { address?: string })?.address}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {booking.single_id === user.id && (
                        <>
                          <Button size="sm" asChild>
                            <Link href={`/bookings/${booking.id}?action=approve`}>
                              Approve
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/bookings/${booking.id}?action=decline`}>
                              Decline
                            </Link>
                          </Button>
                        </>
                      )}
                      {booking.wingman_id === user.id && (
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/bookings/${booking.id}`}>View</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Upcoming</h2>
        {upcomingBookings.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No upcoming bookings
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {upcomingBookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{booking.title}</CardTitle>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        booking.status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>
                  <CardDescription>
                    with {(booking.candidate as { display_name: string })?.display_name} -{' '}
                    {(booking.campaign as { title: string })?.title}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <p className="font-medium">
                        {new Date(booking.start_time).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-muted-foreground">
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
                      {booking.location_details && (
                        <p className="text-muted-foreground">
                          {(booking.location_details as { address?: string })?.address}
                        </p>
                      )}
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/bookings/${booking.id}`}>View Details</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Past</h2>
        {pastBookings.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No past bookings
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pastBookings.slice(0, 10).map((booking) => (
              <Card key={booking.id} className="opacity-75">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{booking.title}</CardTitle>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        booking.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : booking.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : booking.status === 'no_show'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>
                  <CardDescription>
                    with {(booking.candidate as { display_name: string })?.display_name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {new Date(booking.start_time).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/bookings/${booking.id}`}>View</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
