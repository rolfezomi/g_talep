import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Talebe ait yorumları getir
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

    const { data: comments, error } = await supabase
      .from('ticket_comments')
      .select(`
        *,
        user:profiles(id, full_name, avatar_url, role)
      `)
      .eq('ticket_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json({ error: 'Yorumlar alinamadi', details: error.message }, { status: 500 })
    }

    return NextResponse.json(comments)
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Sunucu hatasi', details: error?.message }, { status: 500 })
  }
}

// POST - Yeni yorum ekle
export async function POST(
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
      return NextResponse.json({ error: 'Yetkisiz erisim - kullanici bulunamadi' }, { status: 401 })
    }

    // Yorum metni kontrolü
    if (!body.comment || body.comment.trim().length === 0) {
      return NextResponse.json({ error: 'Yorum metni gerekli' }, { status: 400 })
    }

    // Talep var mı kontrol et
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id')
      .eq('id', id)
      .single()

    if (ticketError) {
      console.error('Ticket fetch error:', ticketError)
      return NextResponse.json({ error: 'Talep kontrol hatasi', details: ticketError.message }, { status: 500 })
    }

    if (!ticket) {
      return NextResponse.json({ error: 'Talep bulunamadi' }, { status: 404 })
    }

    // Yorum ekle
    const { data: comment, error } = await supabase
      .from('ticket_comments')
      .insert({
        ticket_id: id,
        user_id: user.id,
        comment: body.comment.trim(),
        is_internal: body.is_internal || false
      })
      .select(`
        *,
        user:profiles(id, full_name, avatar_url, role)
      `)
      .single()

    if (error) {
      console.error('Error creating comment:', error)
      return NextResponse.json({
        error: 'Yorum eklenemedi',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 })
    }

    return NextResponse.json(comment, { status: 201 })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Sunucu hatasi', details: error?.message }, { status: 500 })
  }
}

// DELETE - Yorum sil (sadece admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('commentId')

    if (!commentId) {
      return NextResponse.json({ error: 'Yorum ID gerekli' }, { status: 400 })
    }

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
      return NextResponse.json({ error: 'Sadece admin yorum silebilir' }, { status: 403 })
    }

    const { error } = await supabase
      .from('ticket_comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      console.error('Error deleting comment:', error)
      return NextResponse.json({ error: 'Yorum silinemedi', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Yorum silindi' })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Sunucu hatasi', details: error?.message }, { status: 500 })
  }
}
