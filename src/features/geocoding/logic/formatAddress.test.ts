import { describe, expect, it } from 'vitest'
import { formatAddress } from '@/features/geocoding/logic/formatAddress'

describe('formatAddress', () => {
  it('lieu en pleine nature : route, commune, département', () => {
    expect(
      formatAddress({
        display_name: 'Cascade du Ray-Pic, D 215, Péreyres, Largentière, Ardèche, Auvergne-Rhône-Alpes, 07450, France',
        address: {
          tourism: 'Cascade du Ray-Pic',
          road: 'D 215',
          village: 'Péreyres',
          municipality: 'Largentière',
          county: 'Ardèche',
          state: 'Auvergne-Rhône-Alpes',
          postcode: '07450',
          country: 'France',
          country_code: 'fr',
        },
      }),
    ).toBe('D 215, Péreyres, Ardèche')
  })

  it('adresse en ville : numéro avant la rue', () => {
    expect(
      formatAddress({
        address: {
          house_number: '12',
          road: 'Rue de la République',
          suburb: 'Bellecour',
          city: 'Lyon',
          county: 'Métropole de Lyon',
          country_code: 'fr',
        },
      }),
    ).toBe('12 Rue de la République, Lyon, Métropole de Lyon')
  })

  it('sans route : utilise le lieu-dit', () => {
    expect(
      formatAddress({ address: { hamlet: 'Les Granges', village: 'Burzet', county: 'Ardèche', country_code: 'fr' } }),
    ).toBe('Les Granges, Burzet, Ardèche')
  })

  it('ne répète pas une valeur identique', () => {
    expect(formatAddress({ address: { city: 'Paris', county: 'Paris', state: 'Île-de-France', country_code: 'fr' } })).toBe(
      'Paris',
    )
  })

  it('ajoute le pays hors de France', () => {
    expect(
      formatAddress({ address: { road: 'Carrer Major', town: 'Cadaqués', county: 'Alt Empordà', country: 'España', country_code: 'es' } }),
    ).toBe('Carrer Major, Cadaqués, Alt Empordà, España')
  })

  it('se rabat sur le libellé complet quand le détail est vide', () => {
    expect(formatAddress({ display_name: 'Mer Méditerranée', address: {} })).toBe('Mer Méditerranée')
  })

  it('renvoie null quand le service ne trouve rien', () => {
    expect(formatAddress({ error: 'Unable to geocode' })).toBeNull()
    expect(formatAddress(null)).toBeNull()
    expect(formatAddress({})).toBeNull()
  })

  it('ne dépasse jamais la longueur acceptée par la base', () => {
    const result = formatAddress({ display_name: 'x'.repeat(500) })
    expect(result).toHaveLength(300)
  })
})
