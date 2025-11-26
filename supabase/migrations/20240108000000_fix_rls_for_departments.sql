-- =====================================================
-- Admin icin RLS Politikalarini Guncelle
-- =====================================================

-- Yorumlar icin admin erisimi
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

-- Dosya ekleri icin admin erisimi
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
        uploaded_by = auth.uid() AND
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

-- Talep goruntuleme politikasini guncelle - assigned_to kaldirildi
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

-- Talep guncelleme politikasini guncelle
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

-- History goruntuleme
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
