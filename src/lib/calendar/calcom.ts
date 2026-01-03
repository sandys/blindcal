import type {
  CalendarProvider,
  DateRange,
  TimeSlot,
  CreateBookingInput,
  ExternalBooking,
  EventType,
} from './types'

interface CalComConfig {
  apiKey: string
  baseUrl?: string
}

export class CalComProvider implements CalendarProvider {
  private apiKey: string
  private baseUrl: string

  constructor(config: CalComConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl || 'https://api.cal.com/v2'
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'cal-api-version': '2024-08-13',
        Authorization: `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(`Cal.com API error: ${error.message || response.statusText}`)
    }

    return response.json()
  }

  async getEventTypes(): Promise<EventType[]> {
    const response = await this.fetch<{
      status: string
      data: Array<{
        id: number
        slug: string
        title: string
        description?: string
        lengthInMinutes: number
        hidden: boolean
      }>
    }>('/event-types')

    return response.data.map((et) => ({
      id: et.id,
      slug: et.slug,
      title: et.title,
      description: et.description,
      length: et.lengthInMinutes,
      hidden: et.hidden,
    }))
  }

  async getAvailability(eventTypeId: number, range: DateRange): Promise<TimeSlot[]> {
    const params = new URLSearchParams({
      startTime: range.start.toISOString(),
      endTime: range.end.toISOString(),
      eventTypeId: eventTypeId.toString(),
    })

    const response = await this.fetch<{
      status: string
      data: {
        slots: Record<string, Array<{ time: string }>>
      }
    }>(`/slots/available?${params}`)

    const slots: TimeSlot[] = []

    for (const [, daySlots] of Object.entries(response.data.slots || {})) {
      for (const slot of daySlots) {
        const start = new Date(slot.time)
        // Cal.com returns just start times, we need to calculate end based on event type
        // For now, assume 30-minute slots (will be refined when we have event type info)
        const end = new Date(start.getTime() + 30 * 60 * 1000)
        slots.push({ start, end })
      }
    }

    return slots
  }

  async createBooking(booking: CreateBookingInput): Promise<ExternalBooking> {
    const response = await this.fetch<{
      status: string
      data: {
        id: number
        uid: string
        title: string
        startTime: string
        endTime: string
        status: 'ACCEPTED' | 'PENDING' | 'CANCELLED' | 'REJECTED'
        attendees: Array<{ email: string; name: string }>
        metadata?: { videoCallUrl?: string }
      }
    }>('/bookings', {
      method: 'POST',
      body: JSON.stringify({
        eventTypeId: booking.eventTypeId,
        start: booking.start.toISOString(),
        attendee: {
          name: booking.name,
          email: booking.email,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        metadata: booking.metadata,
        notes: booking.notes,
      }),
    })

    const data = response.data
    return {
      id: data.id,
      uid: data.uid,
      title: data.title,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      status: data.status,
      attendees: data.attendees,
      meetingUrl: data.metadata?.videoCallUrl,
    }
  }

  async getBooking(uid: string): Promise<ExternalBooking | null> {
    try {
      const response = await this.fetch<{
        status: string
        data: {
          id: number
          uid: string
          title: string
          startTime: string
          endTime: string
          status: 'ACCEPTED' | 'PENDING' | 'CANCELLED' | 'REJECTED'
          attendees: Array<{ email: string; name: string }>
          metadata?: { videoCallUrl?: string }
        }
      }>(`/bookings/${uid}`)

      const data = response.data
      return {
        id: data.id,
        uid: data.uid,
        title: data.title,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        status: data.status,
        attendees: data.attendees,
        meetingUrl: data.metadata?.videoCallUrl,
      }
    } catch {
      return null
    }
  }

  async cancelBooking(uid: string, reason?: string): Promise<void> {
    await this.fetch(`/bookings/${uid}/cancel`, {
      method: 'POST',
      body: JSON.stringify({
        cancellationReason: reason,
      }),
    })
  }

  async rescheduleBooking(uid: string, newStart: Date): Promise<ExternalBooking> {
    const response = await this.fetch<{
      status: string
      data: {
        id: number
        uid: string
        title: string
        startTime: string
        endTime: string
        status: 'ACCEPTED' | 'PENDING' | 'CANCELLED' | 'REJECTED'
        attendees: Array<{ email: string; name: string }>
        metadata?: { videoCallUrl?: string }
      }
    }>(`/bookings/${uid}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({
        start: newStart.toISOString(),
      }),
    })

    const data = response.data
    return {
      id: data.id,
      uid: data.uid,
      title: data.title,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      status: data.status,
      attendees: data.attendees,
      meetingUrl: data.metadata?.videoCallUrl,
    }
  }
}

// Factory function for creating providers
export function createCalendarProvider(): CalendarProvider {
  const apiKey = process.env.CALCOM_API_KEY

  if (!apiKey) {
    throw new Error('CALCOM_API_KEY environment variable is required')
  }

  return new CalComProvider({ apiKey })
}
