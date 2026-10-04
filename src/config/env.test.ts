import { describe, expect, it } from 'vitest'
import { parseEnv } from '@/config/env'

const valid = {
  VITE_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co/',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc123',
  BASE_URL: '/',
}

/** Fabrique un faux jeton au format JWT avec le rôle demandé. */
function fakeJwt(role: string): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '')
  return `${encode({ alg: 'HS256' })}.${encode({ role })}.signature`
}

describe('parseEnv', () => {
  it('accepte une configuration valide et applique les valeurs par défaut', () => {
    const result = parseEnv(valid)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.env.supabaseUrl).toBe('https://abcdefghijklmnopqrst.supabase.co')
    expect(result.env.mapStyleUrl).toBe('https://tiles.openfreemap.org/styles/liberty')
    expect(result.env.geocoderUrl).toBe('https://nominatim.openstreetmap.org')
    expect(result.env.basePath).toBe('/')
  })

  it("ne garde que la base de l'adresse Supabase, sans chemin", () => {
    for (const url of [
      'https://abcdefghijklmnopqrst.supabase.co/rest/v1/',
      'https://abcdefghijklmnopqrst.supabase.co/rest/v1',
      'https://abcdefghijklmnopqrst.supabase.co///',
      '  https://abcdefghijklmnopqrst.supabase.co  ',
    ]) {
      const result = parseEnv({ ...valid, VITE_SUPABASE_URL: url })
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.env.supabaseUrl).toBe('https://abcdefghijklmnopqrst.supabase.co')
    }
  })

  it('conserve le port d\'une adresse locale', () => {
    const result = parseEnv({ ...valid, VITE_SUPABASE_URL: 'http://127.0.0.1:54321/rest/v1/' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.env.supabaseUrl).toBe('http://127.0.0.1:54321')
  })

  it('propose par défaut les photos aériennes de l\'IGN pour la vue satellite', () => {
    const result = parseEnv(valid)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.env.satelliteTilesUrl).toContain('data.geopf.fr/wmts')
    expect(result.env.satelliteTilesUrl).toContain('TILEMATRIX={z}&TILEROW={y}&TILECOL={x}')
  })

  it('refuse une adresse d\'images satellite sans {z}, {x}, {y}', () => {
    const result = parseEnv({ ...valid, VITE_SATELLITE_TILES_URL: 'https://images.example/tuiles.jpg' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.problems[0]).toContain('VITE_SATELLITE_TILES_URL')
  })

  it('accepte une autre source d\'images satellite', () => {
    const result = parseEnv({ ...valid, VITE_SATELLITE_TILES_URL: 'https://images.example/{z}/{x}/{y}.jpg' })
    expect(result.ok).toBe(true)
  })

  it('signale chaque variable obligatoire absente', () => {
    const result = parseEnv({})
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.problems).toHaveLength(2)
    expect(result.problems[0]).toContain('VITE_SUPABASE_URL')
    expect(result.problems[1]).toContain('VITE_SUPABASE_PUBLISHABLE_KEY')
  })

  it("refuse les valeurs d'exemple laissées telles quelles", () => {
    const result = parseEnv({
      VITE_SUPABASE_URL: 'https://xxxxxxxxxxxxxxxxxxxx.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxx',
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.problems).toHaveLength(2)
  })

  it('refuse une adresse Supabase en http', () => {
    const result = parseEnv({ ...valid, VITE_SUPABASE_URL: 'http://exemple.supabase.co' })
    expect(result.ok).toBe(false)
  })

  it('refuse une clé secrète au nouveau format', () => {
    const result = parseEnv({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc123' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.problems[0]).toContain('SECRÈTE')
  })

  it('refuse une ancienne clé service_role', () => {
    const result = parseEnv({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: fakeJwt('service_role') })
    expect(result.ok).toBe(false)
  })

  it('accepte une ancienne clé anon', () => {
    const result = parseEnv({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: fakeJwt('anon') })
    expect(result.ok).toBe(true)
  })

  it('prend en compte un style de carte et un chemin de base personnalisés', () => {
    const result = parseEnv({
      ...valid,
      VITE_MAP_STYLE_URL: 'https://exemple.org/style.json',
      BASE_URL: '/spots-app/',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.env.mapStyleUrl).toBe('https://exemple.org/style.json')
    expect(result.env.basePath).toBe('/spots-app/')
  })
})
