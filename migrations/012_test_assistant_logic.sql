-- ============================================================================
-- ASSISTANT FUNCTIONALITY TEST SUITE
-- Run this in Supabase SQL Editor to verify assistant logic and setup a test assistant.
-- ============================================================================

DO LANGUAGE plpgsql $$
DECLARE
  test_user_id UUID;
  test_email TEXT;
  assistant_id UUID;
  check_val TIMESTAMP;
  new_check_val TIMESTAMP;

  -- 🛠 CONFIGURATION: Edit these values to test different scenarios
  target_name TEXT := 'Test Assistant User';
  target_role TEXT := 'assistant'; -- Try changing to: 'admin' or 'supervisor'
  target_dept TEXT := 'Lost & Found';
BEGIN
  -- 1. SETUP: GET A TEST USER
  SELECT id, email INTO test_user_id, test_email FROM auth.users LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE EXCEPTION '❌ TEST FAILED: No users found in auth.users. Please sign up at least one user first.';
  END IF;

  RAISE NOTICE '🧪 STARTING ASSISTANT TESTS with User: % (%)', test_email, test_user_id;

  -- 2. TEST: CREATE ASSISTANT (Upsert to avoid unique constraint error if running multiple times)
  -- We use ON CONFLICT to update if exists, ensuring we have a record to test with.
  INSERT INTO assistants (user_id, email, name, role, department, status)
  VALUES (test_user_id, test_email, target_name, target_role, target_dept, 'active')
  ON CONFLICT (email) DO UPDATE 
  SET role = target_role, status = 'active', name = target_name, department = target_dept
  RETURNING id, updated_at INTO assistant_id, check_val;
  
  RAISE NOTICE '✅ Assistant Record Managed: %', assistant_id;

  -- 3. TEST: TRIGGER (updated_at)
  -- Sleep for 1 second to ensure timestamp difference for the test
  PERFORM pg_sleep(1);
  
  UPDATE assistants SET name = 'Updated Assistant Name' WHERE id = assistant_id;
  
  SELECT updated_at INTO new_check_val FROM assistants WHERE id = assistant_id;
  
  IF new_check_val > check_val THEN
    RAISE NOTICE '✅ SUCCESS: updated_at trigger worked. Old: %, New: %', check_val, new_check_val;
  ELSE
    RAISE EXCEPTION '❌ FAILURE: updated_at did not change after update.';
  END IF;

  -- 4. VERIFY EXISTENCE
  IF EXISTS (SELECT 1 FROM assistants WHERE user_id = test_user_id) THEN
    RAISE NOTICE '✅ SUCCESS: Assistant record exists and is linked to user.';
  ELSE
    RAISE EXCEPTION '❌ FAILURE: Could not find assistant record.';
  END IF;

  RAISE NOTICE '🎉 ASSISTANT TESTS PASSED! User % is now an assistant.', test_email;
END $$;