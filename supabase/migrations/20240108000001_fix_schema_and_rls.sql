-- =====================================================
-- Schema Kontrol ve Duzeltme
-- =====================================================

-- Eger ticket_attachments tablosu uploaded_by sutununa sahip degilse ekle
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ticket_attachments'
        AND column_name = 'uploaded_by'
    ) THEN
        ALTER TABLE ticket_attachments
        ADD COLUMN uploaded_by UUID REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- Storage Bucket Olustur (eger yoksa)
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'ticket-attachments',
    'ticket-attachments',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Storage RLS Politikalari
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'ticket-attachments'
    AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Users can view files" ON storage.objects;
CREATE POLICY "Users can view files"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'ticket-attachments'
    AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Admin can delete files" ON storage.objects;
CREATE POLICY "Admin can delete files"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'ticket-attachments'
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- =====================================================
-- Tickets icin Admin ve Departman Bazli RLS
-- =====================================================

DROP POLICY IF EXISTS "Users can view tickets in their department or assigned to them" ON tickets;
DROP POLICY IF EXISTS "Users can view tickets based on role and department" ON tickets;
CREATE POLICY "Users can view tickets based on role and department"
    ON tickets FOR SELECT
    USING (
        -- Admin her seyi gorebilir
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR
        -- Talebi olusturan gorebilir
        created_by = auth.uid()
        OR
        -- Ayni departmandaki kullanicilar gorebilir
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND department_id = tickets.department_id
            AND department_id IS NOT NULL
        )
    );

DROP POLICY IF EXISTS "Users can update tickets based on role" ON tickets;
DROP POLICY IF EXISTS "Assigned users and admins can update tickets" ON tickets;
CREATE POLICY "Users can update tickets based on role"
    ON tickets FOR UPDATE
    USING (
        -- Admin guncelleyebilir
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR
        -- Talebi olusturan guncelleyebilir
        created_by = auth.uid()
        OR
        -- Ayni departmandaki kullanicilar guncelleyebilir
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND department_id = tickets.department_id
            AND department_id IS NOT NULL
        )
    );

-- Sadece admin silme yapabilir
DROP POLICY IF EXISTS "Only admin can delete tickets" ON tickets;
CREATE POLICY "Only admin can delete tickets"
    ON tickets FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =====================================================
-- Comments icin Admin ve Departman Bazli RLS
-- =====================================================

DROP POLICY IF EXISTS "Users can view comments on accessible tickets" ON ticket_comments;
CREATE POLICY "Users can view comments on accessible tickets"
    ON ticket_comments FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_id AND (
                t.created_by = auth.uid() OR
                t.department_id IN (SELECT department_id FROM profiles WHERE id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "Users can add comments to accessible tickets" ON ticket_comments;
CREATE POLICY "Users can add comments to accessible tickets"
    ON ticket_comments FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        (
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
            OR
            EXISTS (
                SELECT 1 FROM tickets t
                WHERE t.id = ticket_id AND (
                    t.created_by = auth.uid() OR
                    t.department_id IN (SELECT department_id FROM profiles WHERE id = auth.uid())
                )
            )
        )
    );

-- Sadece admin yorum silebilir
DROP POLICY IF EXISTS "Only admin can delete comments" ON ticket_comments;
CREATE POLICY "Only admin can delete comments"
    ON ticket_comments FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =====================================================
-- Attachments icin Admin ve Departman Bazli RLS
-- =====================================================

DROP POLICY IF EXISTS "Users can view attachments on accessible tickets" ON ticket_attachments;
CREATE POLICY "Users can view attachments on accessible tickets"
    ON ticket_attachments FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_id AND (
                t.created_by = auth.uid() OR
                t.department_id IN (SELECT department_id FROM profiles WHERE id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "Users can upload attachments to accessible tickets" ON ticket_attachments;
CREATE POLICY "Users can upload attachments to accessible tickets"
    ON ticket_attachments FOR INSERT
    WITH CHECK (
        (uploaded_by = auth.uid() OR uploaded_by IS NULL) AND
        (
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
            OR
            EXISTS (
                SELECT 1 FROM tickets t
                WHERE t.id = ticket_id AND (
                    t.created_by = auth.uid() OR
                    t.department_id IN (SELECT department_id FROM profiles WHERE id = auth.uid())
                )
            )
        )
    );

-- Sadece admin dosya silebilir
DROP POLICY IF EXISTS "Only admin can delete attachments" ON ticket_attachments;
CREATE POLICY "Only admin can delete attachments"
    ON ticket_attachments FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =====================================================
-- History icin Admin ve Departman Bazli RLS
-- =====================================================

DROP POLICY IF EXISTS "Users can view history of accessible tickets" ON ticket_history;
CREATE POLICY "Users can view history of accessible tickets"
    ON ticket_history FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_id AND (
                t.created_by = auth.uid() OR
                t.department_id IN (SELECT department_id FROM profiles WHERE id = auth.uid())
            )
        )
    );
