'use client'

import { useState } from 'react'
import { RefreshCw, Sparkles } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Note } from '@/types/database'

interface AiInsightsCardProps {
  note: Note
  onRefresh: () => void
  onUseTitle: (title: string) => void
}

export function AiInsightsCard({ note, onRefresh, onUseTitle }: AiInsightsCardProps) {
  const [generating, setGenerating] = useState(false)
  const hasInsights = !!note.ai_summary && !!note.ai_last_generated_at

  const actionItems: string[] = Array.isArray(note.ai_action_items)
    ? (note.ai_action_items as string[])
    : []

  async function generate(force = false) {
    setGenerating(true)
    try {
      const res = await fetch(`/api/notes/${note.id}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      if (!res.ok) throw new Error('AI generation failed')
      onRefresh()
    } catch {
      toast.error('AI generation failed, try again')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {generating ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : !hasInsights ? (
          <div className="flex justify-center py-2">
            <Button onClick={() => generate(false)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate AI insights
            </Button>
          </div>
        ) : (
          <>
            <div>
              <div className="text-sm font-medium">Summary</div>
              <p className="text-sm text-muted-foreground mt-1">
                {note.ai_summary}
              </p>
            </div>
            <div>
              <div className="text-sm font-medium mt-4">Action Items</div>
              {actionItems.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-1">
                  No action items identified.
                </p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {actionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <input type="checkbox" disabled className="mt-1" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {note.ai_suggested_title && (
              <div>
                <div className="text-sm font-medium mt-4">Suggested Title</div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm">{note.ai_suggested_title}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUseTitle(note.ai_suggested_title!)}
                  >
                    Use this title
                  </Button>
                </div>
              </div>
            )}
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <div className="text-xs text-muted-foreground">
                Last generated{' '}
                {formatDistanceToNow(new Date(note.ai_last_generated_at!), {
                  addSuffix: true,
                })}
              </div>
              <Button size="sm" variant="ghost" onClick={() => generate(true)}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Regenerate
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
