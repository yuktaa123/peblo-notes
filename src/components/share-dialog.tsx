'use client'

import { useEffect, useState } from 'react'
import { Copy, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { Note } from '@/types/database'

function buildLocalShareUrl(shareId: string) {
  const base =
    (typeof window !== 'undefined' && window.location.origin) ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    ''
  return `${base.replace(/\/$/, '')}/shared/${shareId}`
}

interface ShareDialogProps {
  note: Note
  onChange: () => void
}

export function ShareDialog({ note, onChange }: ShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(
    note.is_public && note.share_id ? buildLocalShareUrl(note.share_id) : null
  )

  useEffect(() => {
    setShareUrl(
      note.is_public && note.share_id ? buildLocalShareUrl(note.share_id) : null
    )
  }, [note.id, note.is_public, note.share_id])

  async function share() {
    setLoading(true)
    try {
      const res = await fetch(`/api/notes/${note.id}/share`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to create share link')
      const data = await res.json()
      setShareUrl(data.share_url)
      onChange()
      toast.success('Public link created')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create share link')
    } finally {
      setLoading(false)
    }
  }

  async function revoke() {
    setLoading(true)
    try {
      const res = await fetch(`/api/notes/${note.id}/share`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to revoke link')
      setShareUrl(null)
      onChange()
      toast.success('Link revoked')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to revoke link')
    } finally {
      setLoading(false)
    }
  }

  async function copyLink() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy link')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="icon" aria-label="Share note" />}
      >
        <Share2 className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share note</DialogTitle>
          <DialogDescription>
            Anyone with the link can view this note.
          </DialogDescription>
        </DialogHeader>
        {shareUrl ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input readOnly value={shareUrl} />
              <Button
                variant="outline"
                size="icon"
                onClick={copyLink}
                aria-label="Copy link"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="destructive" onClick={revoke} disabled={loading}>
              {loading ? 'Revoking...' : 'Revoke link'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This note is private. Generate a public link to share it.
            </p>
            <Button onClick={share} disabled={loading}>
              {loading ? 'Creating...' : 'Create public link'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
