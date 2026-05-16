import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import {
  getUser,
  handleApiError,
  NotFoundError,
  parseBody,
} from '@/lib/api-helpers'
import { generateNoteInsights } from '@/lib/ai'

const bodySchema = z.object({ force: z.boolean().optional() })

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser()
    const { id } = await params

    let rawBody: unknown = {}
    try {
      rawBody = await request.json()
    } catch {
      // Empty body is acceptable — force defaults to false.
    }
    const { force = false } = parseBody(bodySchema, rawBody)

    const supabase = await createClient()
    const { data: note, error: fetchError } = await supabase
      .from('notes')
      .select(
        'content, updated_at, ai_summary, ai_action_items, ai_suggested_title, ai_last_generated_at'
      )
      .eq('id', id)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!note) throw new NotFoundError('Note not found')

    const cacheValid =
      !force &&
      note.ai_last_generated_at &&
      new Date(note.ai_last_generated_at) >= new Date(note.updated_at) &&
      note.ai_summary

    if (cacheValid) {
      return NextResponse.json({
        summary: note.ai_summary,
        action_items: note.ai_action_items,
        suggested_title: note.ai_suggested_title,
        cached: true,
      })
    }

    let insights
    try {
      insights = await generateNoteInsights(note.content)
    } catch (e) {
      const err = e as Error & {
        status?: number
        statusText?: string
        errorDetails?: unknown
      }
      console.error('[AIGeneration]', {
        message: err.message,
        name: err.name,
        status: err.status,
        statusText: err.statusText,
        errorDetails: err.errorDetails,
        stack: err.stack,
      })
      return NextResponse.json(
        { error: 'AI generation failed, please try again' },
        { status: 502 }
      )
    }

    const generatedAt = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('notes')
      .update({
        ai_summary: insights.summary,
        ai_action_items: insights.action_items,
        ai_suggested_title: insights.suggested_title,
        ai_last_generated_at: generatedAt,
      })
      .eq('id', id)
    if (updateError) throw updateError

    // Non-fatal: insights already succeeded, so a failed usage log shouldn't 502 the caller.
    const { error: usageError } = await supabase
      .from('ai_usage')
      .insert({ user_id: user.id, note_id: id, operation: 'all' })
    if (usageError) console.error('[AIUsageInsert]', usageError)

    return NextResponse.json({ ...insights, cached: false })
  } catch (error) {
    return handleApiError(error)
  }
}
