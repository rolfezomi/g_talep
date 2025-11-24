-- =====================================================
-- FIX: Allow unauthenticated users to view departments
-- =====================================================

-- The signup page needs to show departments to users who aren't logged in yet
-- Current policy only works for authenticated users

-- Drop existing policy
DROP POLICY IF EXISTS "Everyone can view departments" ON departments;

-- Create new policy that works for both authenticated and anonymous users
CREATE POLICY "Public can view departments"
    ON departments FOR SELECT
    TO public  -- This includes both authenticated and anonymous users
    USING (true);

-- Verify the policy was created
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'departments'
    AND policyname = 'Public can view departments'
    AND cmd = 'SELECT';

    IF policy_count > 0 THEN
        RAISE NOTICE '✅ SUCCESS: Departments are now viewable by everyone (including anonymous users)';
    ELSE
        RAISE WARNING '❌ FAILED: Policy was not created';
    END IF;
END $$;

-- Show current departments for verification
SELECT id, name, description, color
FROM departments
ORDER BY name;
