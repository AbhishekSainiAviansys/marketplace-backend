import { useEffect, useState } from 'react'
import { api } from '@lib/api'

export type SubCategory = { id: number; name: string }
export type Category = { id: number; name: string; subCategories?: SubCategory[] }

let cache: Category[] | null = null
let promise: Promise<Category[]> | null = null

export function fetchCategories(): Promise<Category[]> {
  if (cache) return Promise.resolve(cache)
  if (promise) return promise
  promise = api.get('/categories').then((r) => {
    const rows = Array.isArray(r.data) ? r.data : r.data?.data ?? []
    cache = rows as Category[]
    return cache
  }).catch(() => {
    promise = null
    return []
  })
  return promise
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(cache ?? [])
  const [loading, setLoading] = useState(!cache)
  useEffect(() => {
    let alive = true
    fetchCategories().then((rows) => {
      if (alive) { setCategories(rows); setLoading(false) }
    })
    return () => { alive = false }
  }, [])
  return { categories, loading }
}