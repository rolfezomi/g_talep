-- =====================================================
-- FIX: Admin Update Permissions
-- =====================================================

-- Current problem: Admins can't update other users' profiles because RLS blocks it
-- Current policy only allows: "Users can update own profile"

-- Add policy to allow admins to update ANY profile
CREATE POLICY "Admins can update any profile"
    ON profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Verify the policy was created
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'profiles'
    AND policyname = 'Admins can update any profile'
    AND cmd = 'UPDATE';

    IF policy_count > 0 THEN
        RAISE NOTICE '✅ SUCCESS: Admins can now update any user profile';
    ELSE
        RAISE WARNING '❌ FAILED: Policy was not created';
    END IF;
END $$;

-- Show all UPDATE policies on profiles table for verification
SELECT
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles'
AND cmd = 'UPDATE'
ORDER BY policyname;
