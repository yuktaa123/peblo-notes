'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Search } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Note } from '@/types/database'

type Sort = 'recent' | 'oldest' | 'title'

interface NotesSidebarProps {
  notes: Note[]
  selectedId: string | null
  onSelect: (id: string) => void
  search: string
  setSearch: (v: string) => void
  tagFilter: string | null
  setTagFilter: (v: string | null) => void
  sort: Sort
  setSort: (v: Sort) => void
  showArchived: boolean
  setShowArchived: (v: boolean) => void
  onCreate: () => void
}

export function NotesSidebar({
  notes,
  selectedId,
  onSelect,
  search,
  setSearch,
  tagFilter,
  setTagFilter,
  sort,
  setSort,
  showArchived,
  setShowArchived,
  onCreate,
}: NotesSidebarProps) {
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        onCreate()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCreate])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const n of notes) for (const t of n.tags) set.add(t)
    return Array.from(set).sort()
  }, [notes])

  return (
    <div className="w-80 border-r flex flex-col h-full">
      <div className="sticky top-0 p-3 border-b space-y-2 bg-background">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search (⌘K)"
            className="pl-8"
          />
        </div>
        <Button onClick={onCreate} className="w-full">
          + New note
        </Button>
        <div className="flex gap-2">
          <Select
            value={tagFilter ?? 'all'}
            onValueChange={(v) => setTagFilter(v === 'all' ? null : v)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="All tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {allTags.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recent</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="title">Title A-Z</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? 'Archived' : 'Active'}
          </Button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {notes.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No notes yet. Press ⌘N to create one.
          </div>
        ) : (
          notes.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => onSelect(note.id)}
              className={`w-full text-left p-3 border-b hover:bg-accent ${
                selectedId === note.id ? 'bg-accent' : ''
              }`}
            >
              <div className="font-medium truncate text-sm">
                {note.title || 'Untitled'}
              </div>
              <div className="text-xs text-muted-foreground truncate mt-1">
                {note.content?.slice(0, 80) || 'No content'}
              </div>
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {note.tags.slice(0, 3).map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(note.updated_at), {
                  addSuffix: true,
                })}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
