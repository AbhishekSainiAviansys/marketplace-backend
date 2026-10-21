/** Coaching institute keywords — add/remove searchable tags for /directory.
 *
 *   GET  /coaching/keywords   → list this institute's keywords
 *   POST /coaching/keywords   → add one keyword
 *   DELETE /coaching/keywords/{id} → remove one keyword
 *
 * Keywords are matched by students on the public directory page via ?q=.
 */
import { useEffect, useState, type FormEvent } from 'react'
import { Trash2, Tag } from 'lucide-react'
import { api, errMsg } from '@lib/api'
import { Alert, Button, Field, PageHeader, Panel } from '@ui'

type Keyword = { id: number; coaching_institute_id: number; keyword: string; created_at: string }

export function Keywords() {
  const [items, setItems] = useState<Keyword[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState('')
  const [busy, setBusy] = useState(false)
  const [newKeyword, setNewKeyword] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    api
      .get<Keyword[]>('/coaching/keywords')
      .then((r) => { if (alive) setItems(r.data ?? []) })
      .catch((e) => { if (alive) setErr(errMsg(e, 'Could not load keywords.')) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const add = (e: FormEvent) => {
    e.preventDefault()
    if (!newKeyword.trim()) return
    setBusy(true)
    setErr('')
    setSaved('')
    api
      .post<Keyword>('/coaching/keywords', { keyword: newKeyword.trim() })
      .then((r) => {
        setItems((prev) => [...prev, r.data])
        setNewKeyword('')
        setSaved('Keyword added.')
      })
      .catch((e) => setErr(errMsg(e, 'Could not add keyword.')))
      .finally(() => setBusy(false))
  }

  const remove = (id: number) => {
    if (!window.confirm('Remove this keyword?')) return
    setBusy(true)
    api
      .delete(`/coaching/keywords/${id}`)
      .then(() => {
        setItems((prev) => prev.filter((x) => x.id !== id))
        setSaved('Keyword removed.')
      })
      .catch((e) => setErr(errMsg(e, 'Could not remove keyword.')))
      .finally(() => setBusy(false))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Keywords" subtitle="Searchable tags for your institute on the directory" />
        <div className="card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <span className="h-3 w-24 skeleton" />
                <span className="mt-2 h-9 w-full skeleton" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Keywords"
        subtitle="Students can find your institute on the directory by searching these words."
        actions={
          <Button variant="secondary" icon={<Tag className="h-4 w-4" />}>
            How it works
          </Button>
        }
      />

      {err && <Alert>{err}</Alert>}
      {saved && (
        <Alert kind="ok">
          <span className="inline-flex items-center gap-1.5">{saved}</span>
        </Alert>
      )}

      {/* Add keyword form */}
      <Panel title="Add keyword" subtitle="One keyword per entry — e.g. maths tuition, IIT-JEE, home tutor">
        <form onSubmit={add} className="space-y-4">
          <Field label="Keyword" hint="e.g. maths tuition, NEET coaching, spoken English">
            <input
              className="field"
              value={newKeyword}
              onChange={(ev) => setNewKeyword(ev.target.value)}
              maxLength={100}
              autoFocus
            />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" busy={busy} disabled={!newKeyword.trim()}>
              Add keyword
            </Button>
          </div>
        </form>
      </Panel>

      {/* Current keywords list */}
      <Panel title="Your keywords" subtitle={`Keyword${items.length !== 1 ? 's' : ''} students can search by`}>
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-[var(--text-muted)]">
            No keywords yet. Add one above so students can find your institute on the directory.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                    <span className="text-sm font-semibold text-[var(--text)] truncate">{item.keyword}</span>
                  </span>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    Added {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  disabled={busy}
                  className="text-[var(--text-muted)] hover:text-[var(--color-danger-600)] transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="text-xs text-[var(--text-muted)] max-w-md">
        Keywords are matched against student searches on the public <strong>/directory</strong> page,
        alongside institute name and code. Keep them short and relevant.
      </div>
    </div>
  )
}