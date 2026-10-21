/**
 * Coaching panel — full admin-messages screen ("View all" from the dashboard).
 *
 * GET  /notifications              → paginated 20/page (same endpoint the bell uses)
 * POST /notifications/{id}/read    → mark one read
 *
 * The dashboard only shows the latest 2 messages; everything lives here.
 */
import { useEffect, useState } from 'react'
import { CheckCheck } from 'lucide-react'
import { api, errMsg, rowsOf } from '@lib/api'
import { Alert, Button, EmptyState, PageHeader, Panel, Skeleton } from '@ui'

type Note = {
  id: number
  title: string
  body?: string | null
  type?: string | null
  is_read?: boolean | number
  created_at?: string
}

/** Paginator link for the next page, or null on the last page. */
const nextPageOf = (r: { data: unknown }): string | null => {
  const d = r.data as { next_page_url?: string | null }
  return d && typeof d === 'object' ? (d.next_page_url ?? null) : null
}

export function Messages() {
  const [items, setItems] = useState<Note[]>([])
  const [next, setNext] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    api
      .get('/notifications')
      .then((r) => {
        if (!alive) return
        setItems(rowsOf<Note>(r.data))
        setNext(nextPageOf(r))
      })
      .catch((e) => {
        if (alive) setErr(errMsg(e, 'Could not load messages.'))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const loadMore = () => {
    if (!next) return
    setLoadingMore(true)
    api
      .get(next)
      .then((r) => {
        setItems((prev) => [...prev, ...rowsOf<Note>(r.data)])
        setNext(nextPageOf(r))
      })
      .catch((e) => setErr(errMsg(e, 'Could not load more messages.')))
      .finally(() => setLoadingMore(false))
  }

  const markAllRead = () => {
    const unread = items.filter((n) => !n.is_read)
    if (unread.length === 0) return
    setBusy(true)
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
    Promise.allSettled(unread.map((n) => api.post(`/notifications/${n.id}/read`))).finally(() =>
      setBusy(false),
    )
  }

  const unread = items.filter((n) => !n.is_read).length

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Messages" subtitle="Notifications from your admin" />
        <div className="card divide-y divide-[var(--border)]">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="p-5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        subtitle={`${items.length} message${items.length === 1 ? '' : 's'}${unread ? ` · ${unread} unread` : ''}`}
        actions={
          unread > 0 ? (
            <Button variant="secondary" busy={busy} icon={<CheckCheck className="h-4 w-4" />} onClick={markAllRead}>
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {err && <Alert>{err}</Alert>}

      <Panel title="Admin messages" tone="info" bodyClass="p-0">
        {items.length === 0 ? (
          <EmptyState title="No messages yet" hint="Announcements from your admin will appear here." />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {items.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-5 py-4 ${n.is_read ? '' : 'accent-soft'}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--text)]">
                    {n.title}
                    {!n.is_read && (
                      <span className="accent-bg ml-2 inline-block h-1.5 w-1.5 rounded-full align-middle" />
                    )}
                  </p>
                  {n.body && <p className="mt-1 text-sm text-[var(--text-muted)]">{n.body}</p>}
                </div>
                <span className="text-xs text-[var(--text-subtle)] whitespace-nowrap">
                  {n.created_at
                    ? new Date(n.created_at).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {next && (
        <div className="flex justify-center">
          <Button variant="secondary" busy={loadingMore} onClick={loadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  )
}
