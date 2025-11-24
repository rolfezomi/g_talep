-- =====================================================
-- FIX 1: Ticket Number Generation (Race Condition Fix)
-- =====================================================

-- Create a sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1;

-- Drop and recreate the ticket number generation function with proper locking
DROP TRIGGER IF EXISTS set_ticket_number ON tickets;
DROP FUNCTION IF EXISTS generate_ticket_number();

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
    year TEXT;
    sequence_num INTEGER;
    new_ticket_number TEXT;
    max_attempts INTEGER := 10;
    attempt INTEGER := 0;
BEGIN
    -- Only generate if ticket_number is not already set
    IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
        year := TO_CHAR(NOW(), 'YYYY');

        -- Use advisory lock to prevent race conditions
        PERFORM pg_advisory_xact_lock(hashtext('ticket_number_generation'));

        -- Get the next sequence number for this year with proper locking
        LOOP
            -- Get the maximum ticket number for current year
            SELECT COALESCE(
                MAX(
                    CAST(
                        SUBSTRING(ticket_number FROM 'TLP-' || year || '-(\d+)$')
                        AS INTEGER
                    )
                ), 0
            ) + 1
            INTO sequence_num
            FROM tickets
            WHERE ticket_number LIKE 'TLP-' || year || '-%';

            -- Generate ticket number
            new_ticket_number := 'TLP-' || year || '-' || LPAD(sequence_num::TEXT, 4, '0');

            -- Check if this ticket number already exists (extra safety)
            IF NOT EXISTS (SELECT 1 FROM tickets WHERE ticket_number = new_ticket_number) THEN
                NEW.ticket_number := new_ticket_number;
                EXIT;
            END IF;

            -- Increment attempt counter
            attempt := attempt + 1;
            IF attempt >= max_attempts THEN
                RAISE EXCEPTION 'Failed to generate unique ticket number after % attempts', max_attempts;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER set_ticket_number
    BEFORE INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION generate_ticket_number();

-- =====================================================
-- FIX 2: Admin Setup
-- =====================================================

-- Make uguronar23@gmail.com an admin
UPDATE profiles
SET role = 'admin'
WHERE id IN (
    SELECT id FROM auth.users
    WHERE email = 'uguronar23@gmail.com'
);

-- =====================================================
-- FIX 3: Department-Based Visibility RLS Policies
-- =====================================================

-- Drop existing ticket view policy and recreate with better logic
DROP POLICY IF EXISTS "Users can view tickets in their department or assigned to them" ON tickets;

-- New comprehensive ticket view policy
CREATE POLICY "Users can view tickets based on role and department"
    ON tickets FOR SELECT
    USING (
        -- Admins can see all tickets
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR
        -- Department managers can see all tickets in their department
        EXISTS (
            SELECT 1 FROM profiles p
            INNER JOIN departments d ON d.manager_id = p.id
            WHERE p.id = auth.uid()
            AND p.role = 'department_manager'
            AND tickets.department_id = d.id
        )
        OR
        -- Users can see tickets they created
        created_by = auth.uid()
        OR
        -- Users can see tickets assigned to them
        assigned_to = auth.uid()
        OR
        -- Users can see tickets in their department
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND department_id = tickets.department_id
            AND department_id IS NOT NULL
        )
    );

-- Update ticket update policy for better department manager support
DROP POLICY IF EXISTS "Assigned users and admins can update tickets" ON tickets;

CREATE POLICY "Users can update tickets based on role"
    ON tickets FOR UPDATE
    USING (
        -- Admins can update all tickets
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR
        -- Department managers can update tickets in their department
        EXISTS (
            SELECT 1 FROM profiles p
            INNER JOIN departments d ON d.manager_id = p.id
            WHERE p.id = auth.uid()
            AND p.role = 'department_manager'
            AND tickets.department_id = d.id
        )
        OR
        -- Users can update tickets assigned to them
        assigned_to = auth.uid()
        OR
        -- Users can update their own tickets
        created_by = auth.uid()
    );

-- =====================================================
-- FIX 4: Update handle_new_user for department support
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    dept_id UUID;
BEGIN
    -- Extract department_id from metadata
    dept_id := NULL;
    IF NEW.raw_user_meta_data ? 'department_id' THEN
        dept_id := (NEW.raw_user_meta_data->>'department_id')::UUID;
    END IF;

    -- Insert profile with department
    INSERT INTO public.profiles (id, full_name, role, department_id)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Yeni Kullanıcı'),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user'::user_role),
        dept_id
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: % - SQLSTATE: %', SQLERRM, SQLSTATE;
    -- Re-raise the exception so signup fails if profile creation fails
    RAISE;
END;
$$;

-- =====================================================
-- FIX 5: Add index for better ticket number generation performance
-- =====================================================

-- Add index on ticket_number pattern for faster lookups
CREATE INDEX IF NOT EXISTS idx_tickets_number_pattern
    ON tickets (ticket_number text_pattern_ops);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify admin user
DO $$
DECLARE
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count
    FROM profiles p
    INNER JOIN auth.users u ON u.id = p.id
    WHERE u.email = 'uguronar23@gmail.com' AND p.role = 'admin';

    IF admin_count > 0 THEN
        RAISE NOTICE 'SUCCESS: Admin user configured';
    ELSE
        RAISE NOTICE 'WARNING: Admin user not found or not configured';
    END IF;
END $$;

-- Test ticket number generation
DO $$
DECLARE
    test_number TEXT;
BEGIN
    test_number := 'TLP-' || TO_CHAR(NOW(), 'YYYY') || '-0001';
    RAISE NOTICE 'Next ticket number format will be: %', test_number;
END $$;
