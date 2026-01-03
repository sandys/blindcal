import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the Supabase client
const mockGetUser = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}))

// Import after mocking
import { updateSession } from '@/lib/supabase/middleware'

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createRequest(pathname: string) {
    return new NextRequest(new URL(`http://localhost:3000${pathname}`), {
      headers: new Headers({
        cookie: '',
      }),
    })
  }

  describe('Protected routes', () => {
    it('redirects unauthenticated users to login for /dashboard', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const request = createRequest('/dashboard')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
      expect(response.headers.get('location')).toContain('redirectTo=%2Fdashboard')
    })

    it('redirects unauthenticated users to login for /campaigns', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const request = createRequest('/campaigns')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })

    it('redirects unauthenticated users to login for /bookings', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const request = createRequest('/bookings')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })

    it('redirects unauthenticated users to login for /messages', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const request = createRequest('/messages')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })

    it('redirects unauthenticated users to login for /settings', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const request = createRequest('/settings')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })

    it('allows authenticated users to access /dashboard', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } } })

      const request = createRequest('/dashboard')
      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Auth routes', () => {
    it('redirects authenticated users from /login to /dashboard', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } } })

      const request = createRequest('/login')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/dashboard')
    })

    it('redirects authenticated users from /signup to /dashboard', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } } })

      const request = createRequest('/signup')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/dashboard')
    })

    it('allows unauthenticated users to access /login', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const request = createRequest('/login')
      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })

    it('allows unauthenticated users to access /signup', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const request = createRequest('/signup')
      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Root path redirects', () => {
    it('redirects unauthenticated users from / to /login', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const request = createRequest('/')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })

    it('redirects authenticated users from / to /dashboard', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } } })

      const request = createRequest('/')
      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/dashboard')
    })

  })

  describe('Public routes', () => {
    it('allows unauthenticated users to access campaign landing pages', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const request = createRequest('/c/some-campaign-slug')
      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })
  })
})
