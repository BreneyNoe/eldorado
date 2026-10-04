import { describe, expect, it, vi } from 'vitest'

// Le module importe le client Supabase, inutile ici : seule la fabrication du message est testée.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

const { mapLinkFailureMessage } = await import('@/features/spots/api/resolveMapLink')

describe('mapLinkFailureMessage', () => {
  it('fonction absente du serveur : le dit, et renvoie vers la documentation', () => {
    const failure = mapLinkFailureMessage(404, { code: 'NOT_FOUND', message: 'Requested function was not found' })
    expect(failure.code).toBe('APP_MAP_LINK_NOT_INSTALLED')
    expect(failure.message).toContain("n'est pas installée")
    expect(failure.message).toContain('docs/google-maps.md')
  })

  it('aucune réponse lisible : oriente vers l\'installation de la fonction, pas vers le réseau', () => {
    const failure = mapLinkFailureMessage(undefined, { error: 'unreachable' })
    expect(failure.code).toBe('APP_MAP_LINK_UNREACHABLE')
    expect(failure.message).toContain("n'est pas installée dans Supabase")
    expect(failure.message).toContain('Verify JWT')
    expect(failure.message).not.toContain('Vérifie ton réseau')
  })

  it('session refusée : indique le réglage à changer', () => {
    const failure = mapLinkFailureMessage(401, { message: 'Invalid JWT' })
    expect(failure.code).toBe('APP_MAP_LINK_UNAUTHORIZED')
    expect(failure.message).toContain('Verify JWT')
  })

  it('lien sans position : distinct de la fonction absente, malgré le même code 404', () => {
    const failure = mapLinkFailureMessage(404, { error: 'position_not_found', detail: 'www.google.com' })
    expect(failure.code).toBe('APP_MAP_LINK_NO_POSITION')
    expect(failure.message).toContain('pas de position exploitable')
  })

  it('autre échec : message général', () => {
    expect(mapLinkFailureMessage(502, { error: 'fetch_failed' }).code).toBe('APP_MAP_LINK_FAILED')
    expect(mapLinkFailureMessage(undefined, {}).code).toBe('APP_MAP_LINK_FAILED')
  })

  it('donne toujours la méthode de secours et le détail technique', () => {
    for (const [status, body] of [[404, {}], [401, {}], [404, { error: 'position_not_found' }], [500, { error: 'boom' }]] as const) {
      const { message } = mapLinkFailureMessage(status, body)
      expect(message).toContain('appuie longuement sur le lieu')
      expect(message).toContain(`détail : ${status}`)
    }
  })
})
