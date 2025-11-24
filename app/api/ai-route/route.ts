import { NextRequest, NextResponse } from 'next/server'
import { routeTicketToDepartment } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  try {
    const { title, description, departments } = await request.json()

    if (!title || !description || !departments || departments.length === 0) {
      return NextResponse.json(
        { error: 'Eksik parametreler' },
        { status: 400 }
      )
    }

    const result = await routeTicketToDepartment(title, description, departments)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('AI route error:', error)
    return NextResponse.json(
      { error: error.message || 'AI analizi başarısız oldu' },
      { status: 500 }
    )
  }
}
