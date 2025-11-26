import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ticketId = searchParams.get('ticketId')

  const results: any = { steps: [] }

  try {
    const supabase = await createClient()

    // Step 1: Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    results.steps.push({ step: 'auth', status: 'success', userId: user.id })

    // Step 2: Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    results.steps.push({ step: 'profile', status: 'success', role: profile?.role, department_id: profile?.department_id })

    // Step 3: Get a ticket
    let targetTicketId = ticketId
    if (!targetTicketId) {
      const { data: tickets } = await supabase
        .from('tickets')
        .select('id, status, priority')
        .limit(1)
      targetTicketId = tickets?.[0]?.id
      results.steps.push({ step: 'get_ticket', status: 'success', ticket: tickets?.[0] })
    }

    if (!targetTicketId) {
      return NextResponse.json({ error: 'No ticket found', steps: results.steps }, { status: 404 })
    }

    // Step 4: Try to update status
    results.steps.push({ step: 'update_status', status: 'starting', ticketId: targetTicketId })
    const { data: updated, error: updateError } = await supabase
      .from('tickets')
      .update({ status: 'devam_ediyor' })
      .eq('id', targetTicketId)
      .select('id, status')
      .single()

    if (updateError) {
      results.steps[results.steps.length - 1] = {
        step: 'update_status',
        status: 'error',
        error: updateError.message,
        code: updateError.code,
        hint: updateError.hint
      }
      return NextResponse.json(results, { status: 500 })
    }

    results.steps[results.steps.length - 1] = {
      step: 'update_status',
      status: 'success',
      newStatus: updated?.status
    }

    // Step 5: Revert status back
    await supabase
      .from('tickets')
      .update({ status: 'yeni' })
      .eq('id', targetTicketId)
    results.steps.push({ step: 'revert', status: 'success' })

    results.overall = 'success'
    return NextResponse.json(results)

  } catch (error: any) {
    results.error = error?.message
    return NextResponse.json(results, { status: 500 })
  }
}
