// Enums
export enum UserRole {
  ADMIN = 'admin',
  DEPARTMENT_MANAGER = 'department_manager',
  USER = 'user'
}

export enum TicketStatus {
  YENI = 'yeni',
  DEVAM_EDIYOR = 'devam_ediyor',
  BEKLEMEDE = 'beklemede',
  COZULDU = 'cozuldu',
  KAPATILDI = 'kapatildi'
}

export enum TicketPriority {
  DUSUK = 'dusuk',
  NORMAL = 'normal',
  YUKSEK = 'yuksek',
  ACIL = 'acil'
}

// Database Types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id'>>
      }
      departments: {
        Row: Department
        Insert: Omit<Department, 'id' | 'created_at'>
        Update: Partial<Omit<Department, 'id'>>
      }
      tickets: {
        Row: Ticket
        Insert: Omit<Ticket, 'id' | 'created_at' | 'updated_at' | 'ticket_number'>
        Update: Partial<Omit<Ticket, 'id' | 'ticket_number'>>
      }
      ticket_comments: {
        Row: TicketComment
        Insert: Omit<TicketComment, 'id' | 'created_at'>
        Update: Partial<Omit<TicketComment, 'id'>>
      }
      ticket_attachments: {
        Row: TicketAttachment
        Insert: Omit<TicketAttachment, 'id' | 'created_at'>
        Update: Partial<Omit<TicketAttachment, 'id'>>
      }
      ticket_history: {
        Row: TicketHistory
        Insert: Omit<TicketHistory, 'id' | 'created_at'>
        Update: Partial<Omit<TicketHistory, 'id'>>
      }
      sla_rules: {
        Row: SLARule
        Insert: Omit<SLARule, 'id'>
        Update: Partial<Omit<SLARule, 'id'>>
      }
    }
  }
}

// Main Types
export interface Profile {
  id: string
  full_name: string
  department_id: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Department {
  id: string
  name: string
  description: string | null
  color: string
  manager_id: string | null
  created_at: string
}

export interface Ticket {
  id: string
  ticket_number: string
  title: string
  description: string
  created_by: string
  assigned_to: string | null
  department_id: string
  status: TicketStatus
  priority: TicketPriority
  tags: string[]
  ai_confidence_score: number | null
  due_date: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface TicketComment {
  id: string
  ticket_id: string
  user_id: string
  comment: string
  is_internal: boolean
  created_at: string
}

export interface TicketAttachment {
  id: string
  ticket_id: string
  file_name: string
  file_url: string
  file_size: number
  uploaded_by: string
  created_at: string
}

export interface TicketHistory {
  id: string
  ticket_id: string
  changed_by: string
  field_name: string
  old_value: string | null
  new_value: string | null
  created_at: string
}

export interface SLARule {
  id: string
  department_id: string
  priority: TicketPriority
  response_time_hours: number
  resolution_time_hours: number
}

// Extended Types with Relations
export interface TicketWithRelations extends Ticket {
  creator?: Profile
  assignee?: Profile
  department?: Department
  comments?: TicketComment[]
  attachments?: TicketAttachment[]
  history?: TicketHistory[]
}

export interface ProfileWithDepartment extends Profile {
  department?: Department
}

export interface DepartmentWithManager extends Department {
  manager?: Profile
}

// Utility Types
export interface DashboardStats {
  total_tickets: number
  open_tickets: number
  in_progress: number
  resolved: number
  closed: number
  average_resolution_time: number
  sla_compliance_rate: number
}

export interface DepartmentStats {
  department_id: string
  department_name: string
  total_tickets: number
  open_tickets: number
  average_resolution_time: number
  color: string
}

export interface TimeTracking {
  created_at: string
  assigned_at: string | null
  first_response_at: string | null
  resolved_at: string | null
  time_since_created: string
  time_with_assignee: string | null
  sla_status: 'on_track' | 'at_risk' | 'breached'
}

// AI Response Type
export interface AIRoutingResponse {
  department_id: string
  department_name: string
  confidence_score: number
  reasoning: string
  suggested_priority: TicketPriority
  suggested_tags: string[]
}

// Filter & Sort Types
export interface TicketFilters {
  status?: TicketStatus[]
  priority?: TicketPriority[]
  department_id?: string[]
  assigned_to?: string[]
  created_by?: string
  date_from?: string
  date_to?: string
  search?: string
}

export interface TicketSortOptions {
  field: 'created_at' | 'updated_at' | 'priority' | 'status' | 'ticket_number'
  direction: 'asc' | 'desc'
}

// Form Types
export interface CreateTicketForm {
  title: string
  description: string
  department_id?: string
  priority: TicketPriority
  tags?: string[]
  attachments?: File[]
}

export interface UpdateTicketForm {
  title?: string
  description?: string
  assigned_to?: string | null
  department_id?: string
  status?: TicketStatus
  priority?: TicketPriority
  tags?: string[]
  due_date?: string | null
}

// Notification Types
export interface Notification {
  id: string
  user_id: string
  ticket_id: string
  type: 'new_ticket' | 'assigned' | 'status_change' | 'new_comment' | 'due_soon'
  title: string
  message: string
  read: boolean
  created_at: string
}
