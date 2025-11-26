import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Test 1: Simple select
    const { data: simple, error: simpleError } = await supabase
      .from('departments')
      .select('id, name, color')

    // Test 2: With manager join
    const { data: withManager, error: managerError } = await supabase
      .from('departments')
      .select('*')

    return NextResponse.json({
      user_id: user.id,
      simple: {
        data: simple,
        error: simpleError?.message
      },
      withManager: {
        data: withManager,
        error: managerError?.message
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
