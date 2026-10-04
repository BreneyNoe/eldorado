import { describe, expect, it, vi } from 'vitest'
import { fetchAllPages } from '@/lib/pagination'

/** Simule une table de `total` lignes numérotées. */
function fakeTable(total: number) {
  return vi.fn(async (from: number, to: number) => {
    const rows: number[] = []
    for (let index = from; index <= to && index < total; index += 1) rows.push(index)
    return rows
  })
}

describe('fetchAllPages', () => {
  it('lit une table plus petite qu\'une page en un seul appel', async () => {
    const fetchPage = fakeTable(3)
    expect(await fetchAllPages(fetchPage, 10)).toEqual([0, 1, 2])
    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage).toHaveBeenCalledWith(0, 9)
  })

  it('enchaîne les pages sans perdre ni dupliquer de ligne', async () => {
    const fetchPage = fakeTable(25)
    const rows = await fetchAllPages(fetchPage, 10)
    expect(rows).toHaveLength(25)
    expect(new Set(rows).size).toBe(25)
    expect(fetchPage).toHaveBeenNthCalledWith(2, 10, 19)
    expect(fetchPage).toHaveBeenNthCalledWith(3, 20, 29)
  })

  it('fait un appel de plus quand le total tombe pile sur une page', async () => {
    const fetchPage = fakeTable(20)
    expect(await fetchAllPages(fetchPage, 10)).toHaveLength(20)
    expect(fetchPage).toHaveBeenCalledTimes(3)
  })

  it('gère une table vide', async () => {
    expect(await fetchAllPages(fakeTable(0), 10)).toEqual([])
  })

  it("s'arrête au nombre maximal de pages", async () => {
    const fetchPage = fakeTable(1000)
    expect(await fetchAllPages(fetchPage, 10, 3)).toHaveLength(30)
  })

  it("laisse remonter l'erreur d'une page", async () => {
    await expect(fetchAllPages(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
  })
})
