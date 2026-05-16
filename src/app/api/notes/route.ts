import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser, handleApiError } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    const supabase = await createClient()

    const { searchParams } = request.nextUrl
    const archived = searchParams.get('archived') ?? 'false'
    const tag = searchParams.get('tag')
    const q = searchParams.get('q')
    const sort = searchParams.get('sort') ?? 'recent'

    let query = supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', archived === 'true')

    if (q) {
      query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`)
    }
    if (tag) {
      query = query.contains('tags', [tag])
    }

    if (sort === 'oldest') {
      query = query.order('updated_at', { ascending: true })
    } else if (sort === 'title') {
      query = query.order('title', { ascending: true })
    } else {
      query = query.order('updated_at', { ascending: false })
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ notes: data })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST() {
  try {
    const user = await getUser()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: user.id })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ note: data })
  } catch (error) {
    return handleApiError(error)
  }
}
