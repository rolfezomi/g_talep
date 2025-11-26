import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Tek departman getir
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

    const { data: department, error } = await supabase
      .from('departments')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Departman bulunamadi' }, { status: 404 })
    }

    return NextResponse.json(department)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}

// PATCH - Departman güncelle
export async function PATCH(
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

    // Admin kontrolü
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Sadece admin departman guncelleyebilir' }, { status: 403 })
    }

    const updateData: Record<string, any> = {}
    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.description !== undefined) updateData.description = body.description?.trim() || null
    if (body.color !== undefined) updateData.color = body.color
    if (body.manager_id !== undefined) updateData.manager_id = body.manager_id || null

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Guncellenecek alan bulunamadi' }, { status: 400 })
    }

    const { data: department, error } = await supabase
      .from('departments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Bu isimde bir departman zaten var' }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(department)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}

// DELETE - Departman sil
export async function DELETE(
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

    // Admin kontrolü
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Sadece admin departman silebilir' }, { status: 403 })
    }

    // Departmana bağlı ticket var mı kontrol et
    const { data: tickets } = await supabase
      .from('tickets')
      .select('id')
      .eq('department_id', id)
      .limit(1)

    if (tickets && tickets.length > 0) {
      return NextResponse.json({
        error: 'Bu departmana bagli talepler var. Once talepleri baska departmana tasiyın.'
      }, { status: 400 })
    }

    // Departmana bağlı kullanıcıları güncelle
    await supabase
      .from('profiles')
      .update({ department_id: null })
      .eq('department_id', id)

    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Departman silindi' })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
