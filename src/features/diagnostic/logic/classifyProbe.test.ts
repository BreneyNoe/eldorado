import { describe, expect, it } from 'vitest'
import { classifyProbe, type BackendProbe } from '@/features/diagnostic/logic/classifyProbe'

const base: BackendProbe = {
  networkFailed: false,
  status: 200,
  code: null,
  message: null,
  rowCount: null,
  hasSession: false,
}

describe('classifyProbe', () => {
  it('aucune réponse : injoignable', () => {
    const result = classifyProbe({ ...base, networkFailed: true, status: 0 })
    expect(result.state).toBe('unreachable')
    expect(result.ok).toBe(false)
  })

  it('clé refusée', () => {
    const result = classifyProbe({ ...base, status: 401, message: 'Invalid API key' })
    expect(result.state).toBe('invalid_key')
    expect(result.ok).toBe(false)
  })

  it('chemin en trop dans l\'adresse : adresse incorrecte', () => {
    const result = classifyProbe({ ...base, status: 404, code: 'PGRST125', message: 'Invalid path specified in request URL' })
    expect(result.state).toBe('invalid_url')
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('VITE_SUPABASE_URL')
  })

  it('tables absentes : base non installée', () => {
    const result = classifyProbe({ ...base, status: 404, code: 'PGRST205', message: "Could not find the table 'public.spot_types'" })
    expect(result.state).toBe('schema_missing')
    expect(result.ok).toBe(false)
  })

  it('accès refusé sans connexion : état attendu', () => {
    const result = classifyProbe({ ...base, status: 401, code: '42501', message: 'permission denied for table spot_types' })
    expect(result.state).toBe('locked')
    expect(result.ok).toBe(true)
  })

  it('lecture possible sans connexion : alerte de sécurité', () => {
    const result = classifyProbe({ ...base, rowCount: 1 })
    expect(result.state).toBe('open_to_anonymous')
    expect(result.ok).toBe(false)
  })

  it('lecture vide sans connexion : alerte aussi (la table est exposée)', () => {
    expect(classifyProbe({ ...base, rowCount: 0 }).state).toBe('open_to_anonymous')
  })

  it('lecture possible avec une session : prêt', () => {
    const result = classifyProbe({ ...base, rowCount: 1, hasSession: true })
    expect(result.state).toBe('ready')
    expect(result.ok).toBe(true)
  })

  it('autre réponse : inattendu, avec le détail technique', () => {
    const result = classifyProbe({ ...base, status: 500, code: 'XX000', message: 'boom' })
    expect(result.state).toBe('unexpected')
    expect(result.detail).toContain('500')
    expect(result.detail).toContain('XX000')
  })
})
