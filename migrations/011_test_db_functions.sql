-- ============================================================================
-- DATABASE FUNCTIONALITY TEST SUITE
-- Run this in Supabase SQL Editor to verify your schema logic is working.
-- ============================================================================

DO LANGUAGE plpgsql $$
DECLARE
  test_user_id UUID;
  test_inquiry_id UUID;
  test_item_id UUID;
  test_match_id UUID;
  check_val UUID;
BEGIN
  -- 1. SETUP: GET A TEST USER
  -- We grab the first user we find to act as our "logged in user"
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE EXCEPTION '❌ TEST FAILED: No users found in auth.users. Please sign up at least one user in your app first.';
  END IF;

  RAISE NOTICE '🧪 STARTING TESTS with User ID: %', test_user_id;

  -- 2. TEST: CREATE INQUIRY
  INSERT INTO inquiries (user_id, inquiry_type, title, description, extracted_attributes)
  VALUES (test_user_id, 'lost', 'Test Lost Wallet', 'Black leather wallet', '{"category": "Wallet"}')
  RETURNING id INTO test_inquiry_id;
  
  RAISE NOTICE '✅ Inquiry Created: %', test_inquiry_id;

  -- 3. TEST: IMAGE UPLOAD (Verify Trigger)
  -- We insert WITHOUT user_id. The DB trigger should find it from the inquiry and fill it in.
  INSERT INTO inquiry_images (inquiry_id, image_url, storage_path)
  VALUES (test_inquiry_id, 'https://example.com/test.jpg', 'test/path.jpg');
  
  -- Check if trigger worked
  SELECT user_id INTO check_val FROM inquiry_images WHERE inquiry_id = test_inquiry_id LIMIT 1;
  
  IF check_val = test_user_id THEN
    RAISE NOTICE '✅ SUCCESS: Image trigger automatically populated user_id';
  ELSE
    RAISE EXCEPTION '❌ FAILURE: Image trigger did not populate user_id';
  END IF;

  -- 4. TEST: STATUS HISTORY (Verify Trigger)
  -- Simulate App: Update status
  UPDATE inquiries SET status = 'under_review' WHERE id = test_inquiry_id;
  
  -- Simulate App: Log history (Trigger should fill user_id)
  INSERT INTO inquiry_status_history (inquiry_id, new_status, old_status)
  VALUES (test_inquiry_id, 'under_review', 'submitted');
  
  -- Check if trigger worked
  SELECT user_id INTO check_val FROM inquiry_status_history WHERE inquiry_id = test_inquiry_id AND new_status = 'under_review';
  
  IF check_val = test_user_id THEN
    RAISE NOTICE '✅ SUCCESS: History trigger automatically populated user_id';
  ELSE
    RAISE EXCEPTION '❌ FAILURE: History trigger did not populate user_id';
  END IF;

  -- 5. TEST: CREATE INVENTORY ITEM
  INSERT INTO inventory_items (user_id, title, category, status)
  VALUES (test_user_id, 'Found Black Wallet', 'Wallet', 'available')
  RETURNING id INTO test_item_id;
  
  RAISE NOTICE '✅ Inventory Item Created: %', test_item_id;

  -- 6. TEST: MATCHING (Verify Complex Trigger)
  -- Insert match WITHOUT denormalized user IDs. Trigger should fetch both inquiry owner and item owner.
  INSERT INTO matches (inquiry_id, inventory_item_id, confidence_score)
  VALUES (test_inquiry_id, test_item_id, 0.85)
  RETURNING id INTO test_match_id;
  
  -- Check if trigger worked
  SELECT inquiry_user_id INTO check_val FROM matches WHERE id = test_match_id;
  
  IF check_val = test_user_id THEN
    RAISE NOTICE '✅ SUCCESS: Match trigger automatically populated inquiry_user_id';
  ELSE
    RAISE EXCEPTION '❌ FAILURE: Match trigger did not populate inquiry_user_id';
  END IF;

  -- 7. CLEANUP (Optional - comment out if you want to see the data in dashboard)
  -- DELETE FROM inquiries WHERE id = test_inquiry_id;
  -- DELETE FROM inventory_items WHERE id = test_item_id;

  RAISE NOTICE '🎉 ALL DATABASE FUNCTIONALITY TESTS PASSED!';
END $$;