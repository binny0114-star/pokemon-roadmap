import snapshot from '../generated/gen8-form-profiles.json'

export interface Gen8FormProfile {
  pokemonId: number
  speciesId: number
  identifier: string
  pokemonIdentifier: string
  isDefault: boolean
  formIndex: number
  formName: string | null
  battleOnly: boolean
  types: string[]
  stats: Record<string, number>
}

const profiles = Object.values(snapshot.pokemonForms) as Gen8FormProfile[]
const profilesBySpeciesAndIndex = new Map<string, Gen8FormProfile>()
const profilesByPokemonId = new Map<number, Gen8FormProfile>()
const profilesByIdentifier = new Map<string, Gen8FormProfile>()
const profilesByPokemonIdentifier = new Map<string, Gen8FormProfile>()
const defaultProfiles = new Map<number, Gen8FormProfile>()

for (const profile of profiles) {
  if (profile.formIndex === 0 || !profilesByPokemonId.has(profile.pokemonId)) {
    profilesByPokemonId.set(profile.pokemonId, profile)
  }
  profilesByIdentifier.set(profile.identifier, profile)
  if (profile.formIndex === 0 && !profilesByPokemonIdentifier.has(profile.pokemonIdentifier)) {
    profilesByPokemonIdentifier.set(profile.pokemonIdentifier, profile)
  }
  if (profile.isDefault) defaultProfiles.set(profile.speciesId, profile)
  const key = `${profile.speciesId}:${profile.formIndex}`
  if (!profilesBySpeciesAndIndex.has(key)) profilesBySpeciesAndIndex.set(key, profile)
}

export const swshFormChangeRules = [
  { speciesId: 888, form: 'crowned', gameIds: ['sword'], chapter: 11, item: 'rusted-sword', battleOnly: true, reversible: true },
  { speciesId: 889, form: 'crowned', gameIds: ['shield'], chapter: 11, item: 'rusted-shield', battleOnly: true, reversible: true },
  { speciesId: 892, form: 'gigantamax', gameIds: ['sword', 'shield'], chapter: 15, item: 'max-soup-with-max-honey', battleOnly: true, reversible: true },
  { speciesId: 898, form: 'ice-rider', gameIds: ['sword', 'shield'], chapter: 17, item: 'reins-of-unity', battleOnly: false, reversible: true, choiceGroup: 'calyrex-steed' },
  { speciesId: 898, form: 'shadow-rider', gameIds: ['sword', 'shield'], chapter: 17, item: 'reins-of-unity', battleOnly: false, reversible: true, choiceGroup: 'calyrex-steed' },
] as const

export function getGen8FormProfile(speciesId: number, formIndex = 0): Gen8FormProfile | undefined {
  return profilesBySpeciesAndIndex.get(`${speciesId}:${formIndex}`)
    ?? (formIndex === 0 ? defaultProfiles.get(speciesId) : undefined)
}

export function getGen8DefaultFormProfile(speciesId: number): Gen8FormProfile | undefined {
  return defaultProfiles.get(speciesId)
}

export function getGen8FormProfileByPokemonId(pokemonId: number): Gen8FormProfile | undefined {
  return profilesByPokemonId.get(pokemonId)
}

export function getGen8FormProfileByIdentifier(identifier: string): Gen8FormProfile | undefined {
  return profilesByIdentifier.get(identifier) ?? profilesByPokemonIdentifier.get(identifier)
}
