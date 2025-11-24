-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('admin', 'department_manager', 'user');
CREATE TYPE ticket_status AS ENUM ('yeni', 'devam_ediyor', 'beklemede', 'cozuldu', 'kapatildi');
CREATE TYPE ticket_priority AS ENUM ('dusuk', 'normal', 'yuksek', 'acil');

-- =====================================================
-- TABLES
-- =====================================================

-- Departments Table
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#6366f1',
    manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles Table (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    role user_role NOT NULL DEFAULT 'user',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tickets Table
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    status ticket_status NOT NULL DEFAULT 'yeni',
    priority ticket_priority NOT NULL DEFAULT 'normal',
    tags TEXT[] DEFAULT '{}',
    ai_confidence_score FLOAT,
    due_date TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ticket Comments Table
CREATE TABLE ticket_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ticket Attachments Table
CREATE TABLE ticket_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ticket History Table
CREATE TABLE ticket_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SLA Rules Table
CREATE TABLE sla_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    priority ticket_priority NOT NULL,
    response_time_hours INTEGER NOT NULL,
    resolution_time_hours INTEGER NOT NULL,
    UNIQUE(department_id, priority)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_tickets_created_by ON tickets(created_by);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_department ON tickets(department_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_tickets_ticket_number ON tickets(ticket_number);

CREATE INDEX idx_comments_ticket ON ticket_comments(ticket_id);
CREATE INDEX idx_comments_user ON ticket_comments(user_id);

CREATE INDEX idx_attachments_ticket ON ticket_attachments(ticket_id);

CREATE INDEX idx_history_ticket ON ticket_history(ticket_id);

CREATE INDEX idx_profiles_department ON profiles(department_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
    year TEXT;
    sequence_num INTEGER;
BEGIN
    -- Only generate if ticket_number is not already set
    IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
        year := TO_CHAR(NOW(), 'YYYY');

        -- Get the next sequence number for this year
        SELECT COUNT(*) + 1 INTO sequence_num
        FROM tickets
        WHERE ticket_number LIKE 'TLP-' || year || '-%';

        NEW.ticket_number := 'TLP-' || year || '-' || LPAD(sequence_num::TEXT, 4, '0');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log ticket changes
CREATE OR REPLACE FUNCTION log_ticket_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO ticket_history (ticket_id, changed_by, field_name, old_value, new_value)
        VALUES (NEW.id, NEW.assigned_to, 'status', OLD.status::TEXT, NEW.status::TEXT);
    END IF;

    -- Log priority changes
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
        INSERT INTO ticket_history (ticket_id, changed_by, field_name, old_value, new_value)
        VALUES (NEW.id, NEW.assigned_to, 'priority', OLD.priority::TEXT, NEW.priority::TEXT);
    END IF;

    -- Log assignment changes
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
        INSERT INTO ticket_history (ticket_id, changed_by, field_name, old_value, new_value)
        VALUES (NEW.id, NEW.assigned_to, 'assigned_to', OLD.assigned_to::TEXT, NEW.assigned_to::TEXT);
    END IF;

    -- Log department changes
    IF OLD.department_id IS DISTINCT FROM NEW.department_id THEN
        INSERT INTO ticket_history (ticket_id, changed_by, field_name, old_value, new_value)
        VALUES (NEW.id, NEW.assigned_to, 'department_id', OLD.department_id::TEXT, NEW.department_id::TEXT);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to set resolved_at when status changes to cozuldu
CREATE OR REPLACE FUNCTION set_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'cozuldu' AND OLD.status != 'cozuldu' THEN
        NEW.resolved_at = NOW();
    ELSIF NEW.status != 'cozuldu' THEN
        NEW.resolved_at = NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to generate ticket number
CREATE TRIGGER set_ticket_number
    BEFORE INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION generate_ticket_number();

-- Trigger to update updated_at on tickets
CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to log ticket changes
CREATE TRIGGER log_ticket_changes_trigger
    AFTER UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION log_ticket_changes();

-- Trigger to set resolved_at
CREATE TRIGGER set_resolved_at_trigger
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION set_resolved_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_rules ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view all profiles"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Departments Policies
CREATE POLICY "Everyone can view departments"
    ON departments FOR SELECT
    USING (true);

CREATE POLICY "Only admins can manage departments"
    ON departments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Tickets Policies
CREATE POLICY "Users can view tickets in their department or assigned to them"
    ON tickets FOR SELECT
    USING (
        created_by = auth.uid() OR
        assigned_to = auth.uid() OR
        department_id IN (
            SELECT department_id FROM profiles WHERE id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'department_manager')
        )
    );

CREATE POLICY "Users can create tickets"
    ON tickets FOR INSERT
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Assigned users and admins can update tickets"
    ON tickets FOR UPDATE
    USING (
        assigned_to = auth.uid() OR
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'department_manager')
        )
    );

-- Comments Policies
CREATE POLICY "Users can view comments on accessible tickets"
    ON ticket_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_id AND (
                t.created_by = auth.uid() OR
                t.assigned_to = auth.uid() OR
                t.department_id IN (SELECT department_id FROM profiles WHERE id = auth.uid())
            )
        )
    );

CREATE POLICY "Users can add comments to accessible tickets"
    ON ticket_comments FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_id AND (
                t.created_by = auth.uid() OR
                t.assigned_to = auth.uid() OR
                t.department_id IN (SELECT department_id FROM profiles WHERE id = auth.uid())
            )
        )
    );

-- Attachments Policies
CREATE POLICY "Users can view attachments on accessible tickets"
    ON ticket_attachments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_id AND (
                t.created_by = auth.uid() OR
                t.assigned_to = auth.uid() OR
                t.department_id IN (SELECT department_id FROM profiles WHERE id = auth.uid())
            )
        )
    );

CREATE POLICY "Users can upload attachments to accessible tickets"
    ON ticket_attachments FOR INSERT
    WITH CHECK (
        uploaded_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_id AND (
                t.created_by = auth.uid() OR
                t.assigned_to = auth.uid() OR
                t.department_id IN (SELECT department_id FROM profiles WHERE id = auth.uid())
            )
        )
    );

-- History Policies
CREATE POLICY "Users can view history of accessible tickets"
    ON ticket_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_id AND (
                t.created_by = auth.uid() OR
                t.assigned_to = auth.uid() OR
                t.department_id IN (SELECT department_id FROM profiles WHERE id = auth.uid())
            )
        )
    );

-- SLA Rules Policies
CREATE POLICY "Everyone can view SLA rules"
    ON sla_rules FOR SELECT
    USING (true);

CREATE POLICY "Only admins can manage SLA rules"
    ON sla_rules FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert default departments
INSERT INTO departments (name, description, color) VALUES
('Satın Alma', 'Tedarikçi yönetimi ve malzeme alımları', '#3b82f6'),
('Satış', 'Müşteri siparişleri ve satış süreçleri', '#10b981'),
('Pazarlama', 'Marka yönetimi ve pazarlama kampanyaları', '#8b5cf6'),
('Kalite', 'Ürün kalite kontrol ve standardizasyon', '#f97316'),
('İnsan Kaynakları', 'Personel yönetimi ve işe alım', '#eab308'),
('Bilgi Teknolojileri', 'IT altyapı ve yazılım desteği', '#6b7280'),
('Üretim', 'Üretim süreçleri ve operasyonlar', '#ef4444');

-- Insert default SLA rules
INSERT INTO sla_rules (department_id, priority, response_time_hours, resolution_time_hours)
SELECT
    d.id,
    'acil'::ticket_priority,
    2,
    8
FROM departments d;

INSERT INTO sla_rules (department_id, priority, response_time_hours, resolution_time_hours)
SELECT
    d.id,
    'yuksek'::ticket_priority,
    4,
    24
FROM departments d;

INSERT INTO sla_rules (department_id, priority, response_time_hours, resolution_time_hours)
SELECT
    d.id,
    'normal'::ticket_priority,
    8,
    48
FROM departments d;

INSERT INTO sla_rules (department_id, priority, response_time_hours, resolution_time_hours)
SELECT
    d.id,
    'dusuk'::ticket_priority,
    24,
    120
FROM departments d;

-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Yeni Kullanıcı'),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
