import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Tüm departmanları getir
export async function GET() {
  try {
    const supabase = await createClient()

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
      return NextResponse.json({ error: 'Sadece admin erisebilir' }, { status: 403 })
    }

    const { data: departments, error } = await supabase
      .from('departments')
      .select('*')
      .order('name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(departments)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}

// POST - Yeni departman ekle
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

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
      return NextResponse.json({ error: 'Sadece admin departman ekleyebilir' }, { status: 403 })
    }

    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'Departman adi gerekli' }, { status: 400 })
    }

    const { data: department, error } = await supabase
      .from('departments')
      .insert({
        name: body.name.trim(),
        description: body.description?.trim() || null,
        color: body.color || '#6366f1',
        manager_id: body.manager_id || null
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Bu isimde bir departman zaten var' }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(department, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
