-- ============================================================================
-- CREATE TEST ASSISTANT ACCOUNT
-- ============================================================================

-- First, create a user in auth.users using the admin API
-- Note: In Supabase, you can use the auth functions to create users

-- For testing purposes, we'll insert an assistant record
-- You'll need to create the auth user first through the UI or use the auth API

-- This SQL assumes you already have a user ID from Supabase Auth
-- Replace 'YOUR_USER_ID_HERE' with an actual UUID from your auth.users table

INSERT INTO assistants (
  id,
  email,
  name,
  role,
  department,
  status,
  created_at
) VALUES (
  gen_random_uuid(),
  'assistant@test.com',
  'Test Assistant',
  'assistant',
  'Lost & Found',
  'active',
  CURRENT_TIMESTAMP
);

-- ============================================================================
-- OPTION 2: Create a regular user and use it as assistant
-- ============================================================================

-- Go to your app and register with:
-- Email: assistant@test.com
-- Password: Test123!@
-- Then use that account to access assistant features

-- Check if assistants table has any records
SELECT * FROM assistants LIMIT 5;

-- Check if there are any users
SELECT id, email FROM auth.users LIMIT 5;
