import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser, handleApiError } from '@/lib/api-helpers'

const DAY_MS = 24 * 60 * 60 * 1000

export async function GET() {
  try {
    const user = await getUser()
    const supabase = await createClient()

    const sevenDaysAgo = new Date(Date.now() - 7 * DAY_MS).toISOString()

    const [totalRes, weekRes, aiRes, tagsRes, activityRes] = await Promise.all([
      supabase
        .from('notes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_archived', false),
      supabase
        .from('notes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .gte('updated_at', sevenDaysAgo),
      supabase
        .from('ai_usage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase.rpc('get_top_tags', { uid: user.id, limit_count: 5 }),
      supabase
        .from('notes')
        .select('updated_at')
        .eq('user_id', user.id)
        .gte('updated_at', sevenDaysAgo),
    ])

    if (totalRes.error) throw totalRes.error
    if (weekRes.error) throw weekRes.error
    if (aiRes.error) throw aiRes.error
    if (tagsRes.error) throw tagsRes.error
    if (activityRes.error) throw activityRes.error

    const counts = new Map<string, number>()
    for (const row of activityRes.data ?? []) {
      const day = row.updated_at.slice(0, 10)
      counts.set(day, (counts.get(day) ?? 0) + 1)
    }
    const weekly_activity: { date: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const key = new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10)
      weekly_activity.push({ date: key, count: counts.get(key) ?? 0 })
    }

    return NextResponse.json({
      total_notes: totalRes.count ?? 0,
      notes_edited_this_week: weekRes.count ?? 0,
      ai_usage_count: aiRes.count ?? 0,
      top_tags: tagsRes.data ?? [],
      weekly_activity,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
