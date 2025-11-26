-- =====================================================
-- Storage Bucket ve RLS Politikalari
-- =====================================================

-- Storage bucket olustur (eger yoksa)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-attachments',
  'ticket-attachments',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- Storage RLS politikalari
-- Herkes dosyalari gorebilir (public bucket)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'ticket-attachments');

-- Giris yapmis kullanicilar dosya yukleyebilir
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'ticket-attachments'
    AND auth.role() = 'authenticated'
  );

-- Sadece admin dosya silebilir
DROP POLICY IF EXISTS "Admin can delete" ON storage.objects;
CREATE POLICY "Admin can delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'ticket-attachments'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- =====================================================
-- Yorum Silme Politikasi - Sadece Admin
-- =====================================================

-- Mevcut delete politikasini kaldir
DROP POLICY IF EXISTS "Users can delete own comments" ON ticket_comments;

-- Sadece admin yorum silebilir
DROP POLICY IF EXISTS "Admin can delete any comment" ON ticket_comments;
CREATE POLICY "Admin can delete any comment" ON ticket_comments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- =====================================================
-- Dosya Eki Silme Politikasi - Sadece Admin
-- =====================================================

-- Mevcut delete politikasini kaldir
DROP POLICY IF EXISTS "Users can delete own attachments" ON ticket_attachments;

-- Sadece admin dosya silebilir
DROP POLICY IF EXISTS "Admin can delete any attachment" ON ticket_attachments;
CREATE POLICY "Admin can delete any attachment" ON ticket_attachments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- =====================================================
-- Talep Silme Politikasi - Sadece Admin
-- =====================================================

-- Mevcut delete politikasini kaldir (eger varsa)
DROP POLICY IF EXISTS "Users can delete own tickets" ON tickets;
DROP POLICY IF EXISTS "Creator can delete ticket" ON tickets;

-- Sadece admin talep silebilir
DROP POLICY IF EXISTS "Admin can delete any ticket" ON tickets;
CREATE POLICY "Admin can delete any ticket" ON tickets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- =====================================================
-- Ticket History Silme - Sadece Admin
-- =====================================================

DROP POLICY IF EXISTS "Admin can delete history" ON ticket_history;
CREATE POLICY "Admin can delete history" ON ticket_history
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
