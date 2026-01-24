-- ============================================================================
-- CREATE TEST ASSISTANT WITH RANDOM EMAIL & NAME
-- Copy and paste this into Supabase SQL Editor
-- ============================================================================

INSERT INTO assistants (
  id,
  user_id,
  email,
  name,
  role,
  department,
  status,
  created_at
) 
SELECT 
  gen_random_uuid(),
  id,
  'testassistant' || floor(random() * 9000 + 1000)::text || '@test.com',
  'Assistant ' || floor(random() * 1000)::text,
  'assistant',
  'Lost & Found',
  'active',
  CURRENT_TIMESTAMP
FROM auth.users
LIMIT 1;

-- Show the created assistant
SELECT email, name, role, status FROM assistants ORDER BY created_at DESC LIMIT 1;
