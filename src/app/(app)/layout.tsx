import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/logout-button'
import { ThemeToggle } from '@/components/theme-toggle'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-40 h-14 border-b bg-background flex items-center justify-between px-6">
        <Link href="/notes" className="font-semibold">
          Peblo Notes
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/notes"
            className="text-sm px-3 py-1.5 rounded-md hover:bg-accent"
          >
            Notes
          </Link>
          <Link
            href="/dashboard"
            className="text-sm px-3 py-1.5 rounded-md hover:bg-accent"
          >
            Dashboard
          </Link>
          <ThemeToggle />
          <LogoutButton />
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
