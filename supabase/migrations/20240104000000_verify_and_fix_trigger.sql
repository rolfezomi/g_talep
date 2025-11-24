-- =====================================================
-- EMERGENCY FIX: Ticket Number Generation
-- =====================================================

-- First, let's see what's currently happening
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DIAGNOSTIC INFORMATION';
    RAISE NOTICE '========================================';
END $$;

-- Check current trigger
SELECT
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'tickets'
AND trigger_name = 'set_ticket_number';

-- Check current function
SELECT
    proname,
    prosrc
FROM pg_proc
WHERE proname = 'generate_ticket_number';

-- Check existing ticket numbers to see the pattern
SELECT
    ticket_number,
    created_at
FROM tickets
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- COMPLETE CLEANUP AND RECREATION
-- =====================================================

-- Drop everything related to ticket number generation
DROP TRIGGER IF EXISTS set_ticket_number ON tickets CASCADE;
DROP FUNCTION IF EXISTS generate_ticket_number() CASCADE;
DROP SEQUENCE IF EXISTS ticket_number_seq CASCADE;

-- Create a more robust function with better error handling
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    year TEXT;
    sequence_num INTEGER;
    new_ticket_number TEXT;
    retry_count INTEGER := 0;
    max_retries INTEGER := 20;
BEGIN
    -- Only generate if ticket_number is not already set
    IF NEW.ticket_number IS NOT NULL AND NEW.ticket_number != '' THEN
        RETURN NEW;
    END IF;

    -- Get current year
    year := TO_CHAR(NOW(), 'YYYY');

    -- Use a transaction-level advisory lock
    -- This ensures only one ticket number is generated at a time
    PERFORM pg_advisory_xact_lock(hashtext('ticket_number_gen_' || year));

    -- Retry loop for generating unique ticket number
    LOOP
        -- Get the maximum sequence number for this year
        SELECT COALESCE(
            MAX(
                CASE
                    WHEN ticket_number ~ ('^TLP-' || year || '-[0-9]+$')
                    THEN CAST(SUBSTRING(ticket_number FROM '[0-9]+$') AS INTEGER)
                    ELSE 0
                END
            ), 0
        ) + 1
        INTO sequence_num
        FROM tickets
        WHERE ticket_number LIKE 'TLP-' || year || '-%';

        -- Generate the new ticket number
        new_ticket_number := 'TLP-' || year || '-' || LPAD(sequence_num::TEXT, 4, '0');

        -- Double-check uniqueness
        IF NOT EXISTS (
            SELECT 1 FROM tickets WHERE ticket_number = new_ticket_number
        ) THEN
            NEW.ticket_number := new_ticket_number;

            RAISE NOTICE 'Generated ticket number: %', new_ticket_number;

            RETURN NEW;
        END IF;

        -- Increment retry counter
        retry_count := retry_count + 1;

        IF retry_count >= max_retries THEN
            RAISE EXCEPTION 'Failed to generate unique ticket number after % attempts. Last attempt: %',
                max_retries, new_ticket_number;
        END IF;

        -- Small delay before retry (in microseconds)
        PERFORM pg_sleep(0.01);
    END LOOP;
END;
$$;

-- Create the trigger
CREATE TRIGGER set_ticket_number
    BEFORE INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION generate_ticket_number();

-- Add comment for documentation
COMMENT ON FUNCTION generate_ticket_number() IS
'Generates unique ticket numbers in format TLP-YYYY-NNNN with advisory locks to prevent race conditions';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
    trigger_exists BOOLEAN;
    function_exists BOOLEAN;
BEGIN
    -- Check if trigger exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE event_object_table = 'tickets'
        AND trigger_name = 'set_ticket_number'
    ) INTO trigger_exists;

    -- Check if function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'generate_ticket_number'
    ) INTO function_exists;

    IF trigger_exists AND function_exists THEN
        RAISE NOTICE '✅ SUCCESS: Trigger and function are properly configured';
        RAISE NOTICE '✅ Ticket number generation should now work correctly';
    ELSE
        IF NOT trigger_exists THEN
            RAISE WARNING '❌ FAILED: Trigger "set_ticket_number" not found';
        END IF;
        IF NOT function_exists THEN
            RAISE WARNING '❌ FAILED: Function "generate_ticket_number" not found';
        END IF;
    END IF;
END $$;

-- Test the pattern matching
DO $$
DECLARE
    test_result INTEGER;
BEGIN
    -- This should return the highest number from existing tickets
    SELECT COALESCE(
        MAX(
            CASE
                WHEN ticket_number ~ ('^TLP-' || TO_CHAR(NOW(), 'YYYY') || '-[0-9]+$')
                THEN CAST(SUBSTRING(ticket_number FROM '[0-9]+$') AS INTEGER)
                ELSE 0
            END
        ), 0
    )
    INTO test_result
    FROM tickets
    WHERE ticket_number LIKE 'TLP-' || TO_CHAR(NOW(), 'YYYY') || '-%';

    RAISE NOTICE 'Next ticket number will be: TLP-%-% (sequence: %)',
        TO_CHAR(NOW(), 'YYYY'),
        LPAD((test_result + 1)::TEXT, 4, '0'),
        (test_result + 1);
END $$;
