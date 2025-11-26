import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Talebe ait dosyaları getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erisim' }, { status: 401 })
    }

    const { data: attachments, error } = await supabase
      .from('ticket_attachments')
      .select(`
        *,
        uploader:profiles!ticket_attachments_uploaded_by_fkey(id, full_name, avatar_url)
      `)
      .eq('ticket_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching attachments:', error)
      return NextResponse.json({ error: 'Dosyalar alinamadi' }, { status: 500 })
    }

    return NextResponse.json(attachments)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Sunucu hatasi' }, { status: 500 })
  }
}

// POST - Dosya bilgilerini kaydet (dosya Supabase Storage'a yüklendikten sonra)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erisim' }, { status: 401 })
    }

    // Gerekli alanları kontrol et
    if (!body.file_name || !body.file_url || !body.file_size) {
      return NextResponse.json({ error: 'Dosya bilgileri eksik' }, { status: 400 })
    }

    // Talep var mı kontrol et
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id')
      .eq('id', id)
      .single()

    if (!ticket) {
      return NextResponse.json({ error: 'Talep bulunamadi' }, { status: 404 })
    }

    // Dosya kaydını ekle
    const { data: attachment, error } = await supabase
      .from('ticket_attachments')
      .insert({
        ticket_id: id,
        file_name: body.file_name,
        file_url: body.file_url,
        file_size: body.file_size,
        uploaded_by: user.id
      })
      .select(`
        *,
        uploader:profiles!ticket_attachments_uploaded_by_fkey(id, full_name, avatar_url)
      `)
      .single()

    if (error) {
      console.error('Error creating attachment:', error)
      return NextResponse.json({ error: 'Dosya kaydedilemedi' }, { status: 500 })
    }

    return NextResponse.json(attachment, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Sunucu hatasi' }, { status: 500 })
  }
}

// DELETE - Dosya sil (sadece admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const attachmentId = searchParams.get('attachmentId')

    if (!attachmentId) {
      return NextResponse.json({ error: 'Dosya ID gerekli' }, { status: 400 })
    }

    const { data: { user } } = await supabase.auth.getUser()
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
      return NextResponse.json({ error: 'Sadece admin dosya silebilir' }, { status: 403 })
    }

    // Önce dosya bilgilerini al (storage'dan silmek için)
    const { data: attachment } = await supabase
      .from('ticket_attachments')
      .select('file_url')
      .eq('id', attachmentId)
      .single()

    if (attachment?.file_url) {
      // Storage'dan dosyayı sil
      const filePath = attachment.file_url.split('/').slice(-2).join('/')
      await supabase.storage.from('ticket-attachments').remove([filePath])
    }

    // Veritabanından kaydı sil
    const { error } = await supabase
      .from('ticket_attachments')
      .delete()
      .eq('id', attachmentId)

    if (error) {
      console.error('Error deleting attachment:', error)
      return NextResponse.json({ error: 'Dosya silinemedi' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Dosya silindi' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Sunucu hatasi' }, { status: 500 })
  }
}
