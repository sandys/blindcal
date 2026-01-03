import { describe, it, expect } from 'vitest'

describe('Example Tests', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should have environment variables mocked', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe('http://localhost:54321')
  })
})
