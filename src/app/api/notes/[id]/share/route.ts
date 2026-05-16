import { NextResponse, type NextRequest } from 'next/server'
import { nanoid } from 'nanoid'
import { createClient } from '@/lib/supabase/server'
import {
  getUser,
  handleApiError,
  NotFoundError,
} from '@/lib/api-helpers'

function buildShareUrl(shareId: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return `${base.replace(/\/$/, '')}/shared/${shareId}`
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getUser()
    const { id } = await params
    const supabase = await createClient()

    const { data: note, error: fetchError } = await supabase
      .from('notes')
      .select('share_id, is_public')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!note) throw new NotFoundError('Note not found')

    if (note.share_id && note.is_public) {
      return NextResponse.json({
        share_id: note.share_id,
        share_url: buildShareUrl(note.share_id),
      })
    }

    const shareId = note.share_id ?? nanoid(12)
    const { error: updateError } = await supabase
      .from('notes')
      .update({ share_id: shareId, is_public: true })
      .eq('id', id)

    if (updateError) throw updateError

    return NextResponse.json({
      share_id: shareId,
      share_url: buildShareUrl(shareId),
    })
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

    const { error } = await supabase
      .from('notes')
      .update({ is_public: false, share_id: null })
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
