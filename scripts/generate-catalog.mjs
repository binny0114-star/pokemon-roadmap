import { mkdir, writeFile } from 'node:fs/promises'

const endpoint = 'https://beta.pokeapi.co/graphql/v1beta'
const versionIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21, 22]

async function query(source) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: source }),
  })
  if (!response.ok) throw new Error(`PokeAPI GraphQL ${response.status}`)
  const payload = await response.json()
  if (payload.errors) throw new Error(JSON.stringify(payload.errors))
  return payload.data
}

const [speciesData, encounterData, typeData] = await Promise.all([
  query(`query {
    pokemon_v2_pokemonspecies(where: {id: {_lte: 649}}, order_by: {id: asc}) {
      id name generation_id evolves_from_species_id evolution_chain_id is_legendary is_mythical
      pokemon_v2_pokemonspeciesnames(where: {language_id: {_eq: 3}}) { name }
      pokemon_v2_pokemonevolutions {
        min_level min_happiness min_beauty min_affection needs_overworld_rain
        evolution_item_id held_item_id gender_id time_of_day trade_species_id
        pokemon_v2_evolutiontrigger { name }
        pokemon_v2_item { name }
      }
      pokemon_v2_pokemons(where: {is_default: {_eq: true}}) {
        id
        pokemon_v2_pokemontypes(order_by: {slot: asc}) { type_id }
        pokemon_v2_pokemonstats { base_stat stat_id }
      }
    }
  }`),
  query(`query {
    pokemon_v2_encounter(
      where: {pokemon_id: {_lte: 649}, version_id: {_in: [${versionIds.join(',')}]}}
      order_by: [{version_id: asc}, {pokemon_id: asc}, {min_level: asc}]
    ) {
      pokemon_id version_id min_level max_level
      pokemon_v2_locationarea {
        name
        pokemon_v2_location { name region_id }
      }
    }
  }`),
  query(`query {
    pokemon_v2_type(where: {id: {_lte: 18}}, order_by: {id: asc}) {
      id name
      pokemon_v2_typenames(where: {language_id: {_eq: 3}}) { name }
    }
  }`),
])

const typeById = Object.fromEntries(typeData.pokemon_v2_type.map((type) => [
  type.id,
  { id: type.name, name: type.pokemon_v2_typenames[0]?.name ?? type.name },
]))

const encountersBySpecies = new Map()
for (const encounter of encounterData.pokemon_v2_encounter) {
  const key = `${encounter.version_id}:${encounter.pokemon_id}`
  const list = encountersBySpecies.get(key) ?? []
  const location = encounter.pokemon_v2_locationarea?.pokemon_v2_location?.name
    ?? encounter.pokemon_v2_locationarea?.name
    ?? 'unknown'
  if (!list.some((item) => item.location === location)) {
    list.push({ location, minLevel: encounter.min_level, maxLevel: encounter.max_level })
  }
  encountersBySpecies.set(key, list)
}

const species = speciesData.pokemon_v2_pokemonspecies.map((entry) => {
  const pokemon = entry.pokemon_v2_pokemons[0]
  const evolution = entry.pokemon_v2_pokemonevolutions[0]
  return {
    dex: entry.id,
    id: entry.name,
    name: entry.pokemon_v2_pokemonspeciesnames[0]?.name ?? entry.name,
    generation: entry.generation_id,
    types: pokemon.pokemon_v2_pokemontypes.map((type) => typeById[type.type_id].id),
    typeNames: pokemon.pokemon_v2_pokemontypes.map((type) => typeById[type.type_id].name),
    stats: Object.fromEntries(pokemon.pokemon_v2_pokemonstats.map((stat) => [stat.stat_id, stat.base_stat])),
    evolvesFrom: entry.evolves_from_species_id,
    chainId: entry.evolution_chain_id,
    legendary: entry.is_legendary,
    mythical: entry.is_mythical,
    evolution: evolution ? {
      trigger: evolution.pokemon_v2_evolutiontrigger.name,
      minLevel: evolution.min_level,
      minHappiness: evolution.min_happiness,
      item: evolution.pokemon_v2_item?.name ?? null,
      heldItemId: evolution.held_item_id,
      time: evolution.time_of_day || null,
      tradeSpeciesId: evolution.trade_species_id,
    } : null,
    encounters: Object.fromEntries(versionIds.flatMap((versionId) => {
      const values = encountersBySpecies.get(`${versionId}:${entry.id}`)
      return values ? [[String(versionId), values.slice(0, 5)]] : []
    })),
  }
})

await mkdir(new URL('../src/generated/', import.meta.url), { recursive: true })
await writeFile(
  new URL('../src/generated/species.json', import.meta.url),
  `${JSON.stringify({ source: 'PokéAPI GraphQL snapshot 2026-08-29', species })}\n`,
)
console.log(`Generated ${species.length} species and ${encounterData.pokemon_v2_encounter.length} encounter rows.`)
