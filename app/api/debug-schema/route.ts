import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get ticket_comments table info
    const { data: comments, error: commentsError } = await supabase
      .from('ticket_comments')
      .select('*')
      .limit(1)

    // Get tickets table info
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .limit(1)

    return NextResponse.json({
      ticket_comments: {
        error: commentsError?.message,
        code: commentsError?.code,
        columns: comments && comments[0] ? Object.keys(comments[0]) : [],
        sample: comments?.[0]
      },
      tickets: {
        error: ticketsError?.message,
        code: ticketsError?.code,
        columns: tickets && tickets[0] ? Object.keys(tickets[0]) : [],
        sample: tickets?.[0] ? { id: tickets[0].id, title: tickets[0].title } : null
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
