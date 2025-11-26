import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Talep detaylarını getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Auth hatasi', details: authError.message }, { status: 401 })
    }
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erisim' }, { status: 401 })
    }

    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        *,
        department:departments(id, name, color),
        creator:profiles!tickets_created_by_fkey(id, full_name, avatar_url),
        assignee:profiles!tickets_assigned_to_fkey(id, full_name, avatar_url)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Ticket fetch error:', error)
      return NextResponse.json({ error: 'Talep bulunamadi', details: error.message }, { status: 404 })
    }

    return NextResponse.json(ticket)
  } catch (error: any) {
    console.error('Error fetching ticket:', error)
    return NextResponse.json({ error: 'Sunucu hatasi', details: error?.message }, { status: 500 })
  }
}

// PATCH - Talep güncelle (durum, öncelik vb.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    let body
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json({ error: 'Gecersiz JSON body' }, { status: 400 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Auth hatasi', details: authError.message }, { status: 401 })
    }
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erisim' }, { status: 401 })
    }

    // Kullanıcı profilini al
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json({ error: 'Profil alinamadi', details: profileError.message }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profil bulunamadi' }, { status: 404 })
    }

    // Mevcut talep bilgilerini al
    const { data: existingTicket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single()

    if (ticketError) {
      console.error('Existing ticket fetch error:', ticketError)
      return NextResponse.json({ error: 'Talep alinamadi', details: ticketError.message }, { status: 500 })
    }

    if (!existingTicket) {
      return NextResponse.json({ error: 'Talep bulunamadi' }, { status: 404 })
    }

    // Yetki kontrolü: Admin, departman üyesi veya talep oluşturan
    const isAdmin = profile.role === 'admin'
    const isCreator = existingTicket.created_by === user.id
    const isDepartmentMember = profile.department_id === existingTicket.department_id

    if (!isAdmin && !isCreator && !isDepartmentMember) {
      return NextResponse.json({ error: 'Bu islemi yapmaya yetkiniz yok' }, { status: 403 })
    }

    // Güncellenebilir alanlar
    const allowedFields = ['status', 'priority', 'assigned_to', 'department_id', 'title', 'description', 'tags', 'due_date']
    const updateData: Record<string, any> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Guncellenecek alan bulunamadi' }, { status: 400 })
    }

    // Güncelleme yap
    const { data: updatedTicket, error } = await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        department:departments(id, name, color),
        creator:profiles!tickets_created_by_fkey(id, full_name, avatar_url),
        assignee:profiles!tickets_assigned_to_fkey(id, full_name, avatar_url)
      `)
      .single()

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json({
        error: 'Guncelleme basarisiz',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 })
    }

    return NextResponse.json(updatedTicket)
  } catch (error: any) {
    console.error('Error updating ticket:', error)
    return NextResponse.json({ error: 'Sunucu hatasi', details: error?.message }, { status: 500 })
  }
}

// DELETE - Talep sil (sadece admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Auth hatasi', details: authError.message }, { status: 401 })
    }
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erisim' }, { status: 401 })
    }

    // Admin kontrolü
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Sadece admin talep silebilir' }, { status: 403 })
    }

    // Önce ilişkili verileri sil
    await supabase.from('ticket_comments').delete().eq('ticket_id', id)
    await supabase.from('ticket_attachments').delete().eq('ticket_id', id)
    await supabase.from('ticket_history').delete().eq('ticket_id', id)

    // Talebi sil
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete error:', error)
      return NextResponse.json({ error: 'Silme basarisiz', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Talep basariyla silindi' })
  } catch (error: any) {
    console.error('Error deleting ticket:', error)
    return NextResponse.json({ error: 'Sunucu hatasi', details: error?.message }, { status: 500 })
  }
}
