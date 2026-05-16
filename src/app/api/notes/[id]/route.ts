import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import {
  getUser,
  handleApiError,
  NotFoundError,
  parseBody,
} from '@/lib/api-helpers'

const updateSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().nullable().optional(),
  is_archived: z.boolean().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getUser()
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (!data) throw new NotFoundError('Note not found')

    return NextResponse.json({ note: data })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getUser()
    const { id } = await params
    const body = await request.json()
    const update = parseBody(updateSchema, body)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('notes')
      .update(update)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) throw error
    if (!data) throw new NotFoundError('Note not found')

    return NextResponse.json({ note: data })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getUser()
    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
