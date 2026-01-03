export interface DateRange {
  start: Date
  end: Date
}

export interface TimeSlot {
  start: Date
  end: Date
}

export interface CreateBookingInput {
  eventTypeId: number
  start: Date
  end: Date
  name: string
  email: string
  notes?: string
  metadata?: Record<string, unknown>
}

export interface ExternalBooking {
  id: number
  uid: string
  title: string
  startTime: Date
  endTime: Date
  status: 'ACCEPTED' | 'PENDING' | 'CANCELLED' | 'REJECTED'
  attendees: Array<{
    email: string
    name: string
  }>
  meetingUrl?: string
}

export interface EventType {
  id: number
  slug: string
  title: string
  description?: string
  length: number // in minutes
  hidden: boolean
}

export interface CalendarProvider {
  getEventTypes(): Promise<EventType[]>
  getAvailability(eventTypeId: number, range: DateRange): Promise<TimeSlot[]>
  createBooking(booking: CreateBookingInput): Promise<ExternalBooking>
  getBooking(uid: string): Promise<ExternalBooking | null>
  cancelBooking(uid: string, reason?: string): Promise<void>
  rescheduleBooking(uid: string, newStart: Date): Promise<ExternalBooking>
}
