import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Create Supabase admin client with service role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  try {
    // Get current user and verify admin
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get user IDs from request
    const { userIds } = await request.json()

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Fetch all users (this requires service role key)
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Create email map
    const emails: Record<string, string> = {}
    users.forEach(user => {
      if (userIds.includes(user.id)) {
        emails[user.id] = user.email || ''
      }
    })

    return NextResponse.json({ emails })
  } catch (error) {
    console.error('Error in get-user-emails:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
