import { describe, it, expect } from 'vitest'

describe('Integration Tests', () => {
  it('should have database URL configured', () => {
    expect(process.env.DATABASE_URL).toBeDefined()
  })

  it('should have Supabase URL configured', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined()
  })
})
