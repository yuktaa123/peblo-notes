import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { formatDistanceToNow } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import { Badge } from '@/components/ui/badge'
import type { Database } from '@/types/supabase'

function anonClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareId: string }>
}) {
  const { shareId } = await params
  const supabase = anonClient()
  const { data } = await supabase
    .from('notes')
    .select('title')
    .eq('share_id', shareId)
    .eq('is_public', true)
    .maybeSingle()
  return { title: data?.title || 'Shared Note' }
}

export default async function SharedNotePage({
  params,
}: {
  params: Promise<{ shareId: string }>
}) {
  const { shareId } = await params
  const supabase = anonClient()
  const { data, error } = await supabase
    .from('notes')
    .select('title, content, tags, updated_at')
    .eq('share_id', shareId)
    .eq('is_public', true)
    .maybeSingle()

  if (error || !data) notFound()

  return (
    <div className="min-h-screen bg-background">
      <article className="max-w-3xl mx-auto py-12 px-4 space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">
          {data.title || 'Untitled'}
        </h1>
        {data.tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {data.tags.map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Last updated{' '}
          {formatDistanceToNow(new Date(data.updated_at), { addSuffix: true })}
        </p>
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <ReactMarkdown>{data.content || ''}</ReactMarkdown>
        </div>
        <footer className="border-t pt-6 mt-12 text-sm text-muted-foreground text-center">
          Shared via{' '}
          <Link href="/" className="hover:underline">
            Peblo Notes
          </Link>
        </footer>
      </article>
    </div>
  )
}
