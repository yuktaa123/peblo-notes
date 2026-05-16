import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { handleApiError, NotFoundError } from '@/lib/api-helpers'
import type { Database } from '@/types/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const { data, error } = await supabase
      .from('notes')
      .select('title, content, tags, updated_at')
      .eq('share_id', shareId)
      .eq('is_public', true)
      .maybeSingle()

    if (error) throw error
    if (!data) throw new NotFoundError('Shared note not found')

    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error)
  }
}
