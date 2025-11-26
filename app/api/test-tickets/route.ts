import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const results: any = {
    steps: []
  }

  try {
    // Step 1: Create client
    results.steps.push({ step: 'create_client', status: 'starting' })
    const supabase = await createClient()
    results.steps[0].status = 'success'

    // Step 2: Get user
    results.steps.push({ step: 'get_user', status: 'starting' })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      results.steps[1] = { step: 'get_user', status: 'error', error: authError.message }
      return NextResponse.json(results, { status: 401 })
    }
    if (!user) {
      results.steps[1] = { step: 'get_user', status: 'no_user' }
      return NextResponse.json(results, { status: 401 })
    }
    results.steps[1] = { step: 'get_user', status: 'success', userId: user.id }

    // Step 3: Get profile
    results.steps.push({ step: 'get_profile', status: 'starting' })
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      results.steps[2] = { step: 'get_profile', status: 'error', error: profileError.message, code: profileError.code }
      return NextResponse.json(results, { status: 500 })
    }
    results.steps[2] = { step: 'get_profile', status: 'success', role: profile?.role, department_id: profile?.department_id }

    // Step 4: Get tickets
    results.steps.push({ step: 'get_tickets', status: 'starting' })
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('id, title, department_id')
      .limit(3)

    if (ticketsError) {
      results.steps[3] = { step: 'get_tickets', status: 'error', error: ticketsError.message, code: ticketsError.code }
      return NextResponse.json(results, { status: 500 })
    }
    results.steps[3] = { step: 'get_tickets', status: 'success', count: tickets?.length }

    // Step 5: Test comment insert (if there's a ticket)
    if (tickets && tickets.length > 0) {
      const testTicketId = tickets[0].id
      results.steps.push({ step: 'test_comment_insert', status: 'starting', ticketId: testTicketId })

      const { data: comment, error: commentError } = await supabase
        .from('ticket_comments')
        .insert({
          ticket_id: testTicketId,
          user_id: user.id,
          comment: 'Test yorum - silinecek',
          is_internal: false
        })
        .select('id')
        .single()

      if (commentError) {
        results.steps[4] = {
          step: 'test_comment_insert',
          status: 'error',
          error: commentError.message,
          code: commentError.code,
          hint: commentError.hint,
          details: commentError.details
        }
        return NextResponse.json(results, { status: 500 })
      }

      results.steps[4] = { step: 'test_comment_insert', status: 'success', commentId: comment?.id }

      // Delete test comment
      if (comment?.id) {
        await supabase.from('ticket_comments').delete().eq('id', comment.id)
        results.steps.push({ step: 'cleanup', status: 'success' })
      }
    }

    results.overall = 'success'
    return NextResponse.json(results)

  } catch (error: any) {
    results.error = {
      message: error?.message,
      stack: error?.stack?.split('\n').slice(0, 5)
    }
    return NextResponse.json(results, { status: 500 })
  }
}
