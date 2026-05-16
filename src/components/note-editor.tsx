'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Archive, ArchiveRestore, Trash2, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AiInsightsCard } from '@/components/ai-insights-card'
import { ShareDialog } from '@/components/share-dialog'
import type { Note } from '@/types/database'

const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
)

type Status = 'idle' | 'saving' | 'saved'

interface NoteEditorProps {
  note: Note | null
  onUpdate: () => void
  onDelete: () => void
}

export function NoteEditor({ note, onUpdate, onDelete }: NoteEditorProps) {
  const { resolvedTheme } = useTheme()

  const [title, setTitle] = useState(note?.title ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  const [tags, setTags] = useState<string[]>(note?.tags ?? [])
  const [category, setCategory] = useState<string>(note?.category ?? '')
  const [isArchived, setIsArchived] = useState(note?.is_archived ?? false)
  const [tagInput, setTagInput] = useState('')

  const [status, setStatus] = useState<Status>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  const dirtyRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noteIdRef = useRef<string | null>(note?.id ?? null)

  useEffect(() => {
    if (!note) return
    noteIdRef.current = note.id
    dirtyRef.current = false
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setTitle(note.title)
    setContent(note.content)
    setTags(note.tags)
    setCategory(note.category ?? '')
    setIsArchived(note.is_archived)
    setStatus('idle')
    setLastSavedAt(null)
    setTagInput('')
  }, [note?.id])

  useEffect(() => {
    if (!note) return
    if (!dirtyRef.current) {
      dirtyRef.current = true
      return
    }

    setStatus('saving')
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    const id = note.id
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/notes/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            content,
            tags,
            category: category.trim() === '' ? null : category,
            is_archived: isArchived,
          }),
        })
        if (!res.ok) throw new Error('Save failed')
        if (noteIdRef.current !== id) return
        setStatus('saved')
        setLastSavedAt(new Date())
        onUpdate()
      } catch {
        if (noteIdRef.current !== id) return
        setStatus('idle')
        toast.error('Failed to save note')
      }
    }, 1500)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, tags, category, isArchived])

  const statusText = useMemo(() => {
    if (status === 'saving') return 'Saving...'
    if (status === 'saved' && lastSavedAt) {
      return `Saved ${formatDistanceToNow(lastSavedAt, { addSuffix: true })}`
    }
    return ''
  }, [status, lastSavedAt])

  if (!note) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Select a note or create a new one
      </div>
    )
  }

  function addTag() {
    const v = tagInput.trim()
    if (!v) return
    if (tags.includes(v)) {
      setTagInput('')
      return
    }
    setTags([...tags, v])
    setTagInput('')
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t))
  }

  async function handleDelete() {
    if (!note) return
    try {
      const res = await fetch(`/api/notes/${note.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      onDelete()
      toast.success('Note deleted')
    } catch {
      toast.error('Failed to delete note')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-3 flex items-center gap-2 border-b">
        <Input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className="text-2xl font-bold border-0 shadow-none focus-visible:ring-0 px-0 flex-1"
        />
        {statusText && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {statusText}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsArchived((v) => !v)}
          aria-label={isArchived ? 'Unarchive note' : 'Archive note'}
        >
          {isArchived ? (
            <ArchiveRestore className="h-4 w-4" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button variant="ghost" size="icon" aria-label="Delete note" />}
          >
            <Trash2 className="h-4 w-4" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this note?</AlertDialogTitle>
              <AlertDialogDescription>
                This action can&apos;t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <ShareDialog note={note} onChange={onUpdate} />
      </div>

      <div className="p-6 pt-3 overflow-y-auto flex-1 space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          {tags.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1">
              {t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                aria-label={`Remove tag ${t}`}
                className="hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                addTag()
              }
            }}
            placeholder="Add tag..."
            className="w-32 inline"
          />
        </div>

        <div className="flex items-center gap-2 max-w-xs">
          <Label htmlFor="category" className="text-sm whitespace-nowrap">
            Category
          </Label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Optional"
          />
        </div>

        <div data-color-mode={resolvedTheme === 'dark' ? 'dark' : 'light'}>
          <MDEditor
            value={content}
            onChange={(v) => setContent(v ?? '')}
            height={500}
          />
        </div>

        <AiInsightsCard
          note={note}
          onRefresh={onUpdate}
          onUseTitle={(t) => setTitle(t)}
        />
      </div>
    </div>
  )
}
