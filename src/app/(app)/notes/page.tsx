'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { NotesSidebar } from '@/components/notes-sidebar'
import { NoteEditor } from '@/components/note-editor'
import type { Note } from '@/types/database'

type Sort = 'recent' | 'oldest' | 'title'

function NotesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [notes, setNotes] = useState<Note[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get('note')
  )
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [tagFilter, setTagFilter] = useState<string | null>(
    searchParams.get('tag')
  )
  const [sort, setSort] = useState<Sort>(
    (searchParams.get('sort') as Sort) ?? 'recent'
  )
  const [showArchived, setShowArchived] = useState(
    searchParams.get('archived') === 'true'
  )
  const [loading, setLoading] = useState(false)
  const [debouncedSearch, setDebouncedSearch] = useState(search)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const fetchNotes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('archived', showArchived ? 'true' : 'false')
      params.set('sort', sort)
      if (debouncedSearch) params.set('q', debouncedSearch)
      if (tagFilter) params.set('tag', tagFilter)
      const res = await fetch(`/api/notes?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load notes')
      const data = await res.json()
      setNotes(data.notes ?? [])
    } catch {
      toast.error('Failed to load notes')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, tagFilter, sort, showArchived])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  // Keep URL in sync with filter + selection state.
  const lastUrlRef = useRef<string>('')
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (tagFilter) params.set('tag', tagFilter)
    if (sort !== 'recent') params.set('sort', sort)
    if (showArchived) params.set('archived', 'true')
    if (selectedId) params.set('note', selectedId)
    const qs = params.toString()
    const url = qs ? `/notes?${qs}` : '/notes'
    if (url === lastUrlRef.current) return
    lastUrlRef.current = url
    router.replace(url, { scroll: false })
  }, [debouncedSearch, tagFilter, sort, showArchived, selectedId, router])

  const createNote = useCallback(async () => {
    try {
      const res = await fetch('/api/notes', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to create note')
      const { note } = await res.json()
      setSelectedId(note.id)
      await fetchNotes()
    } catch {
      toast.error('Failed to create note')
    }
  }, [fetchNotes])

  const handleDelete = useCallback(async () => {
    setSelectedId(null)
    await fetchNotes()
  }, [fetchNotes])

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <NotesSidebar
        notes={notes}
        selectedId={selectedId}
        onSelect={setSelectedId}
        search={search}
        setSearch={setSearch}
        tagFilter={tagFilter}
        setTagFilter={setTagFilter}
        sort={sort}
        setSort={setSort}
        showArchived={showArchived}
        setShowArchived={setShowArchived}
        onCreate={createNote}
      />
      <div className="flex-1 overflow-hidden">
        {loading && notes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Loading...
          </div>
        ) : (
          <NoteEditor
            note={selectedNote}
            onUpdate={fetchNotes}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  )
}

export default function NotesPage() {
  return (
    <Suspense
      fallback={<div className="p-6">Loading...</div>}
    >
      <NotesPageContent />
    </Suspense>
  )
}
