-- ===========================================
-- BlindCal Database Initialization
-- Sets up Supabase-compatible schemas and roles
-- GoTrue manages its own auth tables via migrations
-- ===========================================

-- Create extensions (available in standard postgres)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================================
-- Create Supabase roles
-- ===========================================

-- Authenticator role (used by PostgREST)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
        CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'postgres';
    END IF;
END
$$;

-- Anonymous role
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN NOINHERIT;
    END IF;
END
$$;

-- Authenticated user role
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN NOINHERIT;
    END IF;
END
$$;

-- Service role (admin)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
    END IF;
END
$$;

-- Supabase admin role
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
        CREATE ROLE supabase_admin NOLOGIN NOINHERIT BYPASSRLS;
    END IF;
END
$$;

-- Grant roles to authenticator
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;
GRANT supabase_admin TO postgres;

-- ===========================================
-- Create schemas (GoTrue will create auth tables)
-- ===========================================

-- Auth schema (for GoTrue - it will create its own tables)
CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA auth TO supabase_admin;
GRANT ALL ON SCHEMA auth TO postgres;

-- Storage schema
CREATE SCHEMA IF NOT EXISTS storage;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA storage TO supabase_admin;

-- Realtime schema
CREATE SCHEMA IF NOT EXISTS _realtime;
GRANT USAGE ON SCHEMA _realtime TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA _realtime TO supabase_admin;

-- Public schema permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO supabase_admin;

-- ===========================================
-- Helper functions (for PostgREST)
-- ===========================================

-- Function to get current user ID from JWT
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.sub', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )::uuid
$$;

-- Function to get current user role from JWT
CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.role', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
  )::text
$$;

-- Function to get current user email from JWT
CREATE OR REPLACE FUNCTION auth.email()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.email', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'email')
  )::text
$$;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.email() TO anon, authenticated, service_role;

-- ===========================================
-- Default privileges for public schema
-- ===========================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- Database initialization complete
