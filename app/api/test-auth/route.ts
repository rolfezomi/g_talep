import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      return NextResponse.json({
        status: 'auth_error',
        error: error.message,
        code: error.code
      }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({
        status: 'no_user',
        message: 'Kullanici bulunamadi - giris yapin'
      }, { status: 401 })
    }

    return NextResponse.json({
      status: 'authenticated',
      userId: user.id,
      email: user.email
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error?.message || 'Bilinmeyen hata',
      stack: error?.stack
    }, { status: 500 })
  }
}
