import type { Database } from './supabase'

export type Note = Database['public']['Tables']['notes']['Row']
export type AiUsage = Database['public']['Tables']['ai_usage']['Row']
