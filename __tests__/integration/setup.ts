import { vi, beforeAll, afterAll } from 'vitest'

// Set environment variables for integration tests
vi.stubEnv('DATABASE_URL', process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz')

beforeAll(async () => {
  // Setup before all integration tests
  console.log('Starting integration tests with local Supabase...')
})

afterAll(async () => {
  // Cleanup after all integration tests
  console.log('Finished integration tests.')
})
