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
