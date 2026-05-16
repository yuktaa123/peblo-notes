import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-2xl font-bold">Note not found</h1>
      <p className="text-muted-foreground">
        This note may have been deleted or made private.
      </p>
      <Link href="/" className="text-primary underline">
        Go to Peblo Notes
      </Link>
    </div>
  )
}
