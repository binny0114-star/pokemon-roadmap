import { mkdir, writeFile } from 'node:fs/promises'
import {
  catalogVersionIds,
  fetchCsv,
  fetchLegacyPlannerSnapshot,
  plannerVersionIds,
  provenance,
  registry,
} from './pokeapi-source.mjs'

const legacyPlannerVersionIds = plannerVersionIds.filter((versionId) =>
  registry.games.some((game) => game.versionId === versionId && game.generation <= 5))

const files = [
  'pokemon_species',
  'pokemon_species_names',
  'pokemon',
  'pokemon_types',
  'pokemon_stats',
  'pokemon_evolution',
  'evolution_triggers',
  'items',
  'types',
  'type_names',
  'encounters',
  'location_areas',
  'locations',
  'encounter_slots',
  'encounter_methods',
  'encounter_condition_value_map',
  'encounter_condition_values',
  'version_group_regions',
  'version_groups',
  'pokemon_forms',
]
const plannerEncounterMethods = new Set([
  'walk', 'surf', 'old-rod', 'good-rod', 'super-rod', 'rock-smash',
  'headbutt-low', 'headbutt-normal', 'headbutt-high', 'headbutt',
  'seaweed', 'surf-spots', 'super-rod-spots', 'dark-grass', 'grass-spots',
  'cave-spots', 'bridge-spots', 'gift', 'gift-egg', 'only-one', 'pokeflute',
  'roaming-grass', 'roaming-water', 'squirt-bottle', 'wailmer-pail',
  'devon-scope', 'feebas-tile-fishing', 'static', 'honey-tree',
  'bubbling-spots', 'hidden-grotto', 'npc-trade',
])

const [
  speciesRows,
  speciesNameRows,
  pokemonRows,
  pokemonTypeRows,
  pokemonStatRows,
  evolutionRows,
  evolutionTriggerRows,
  itemRows,
  typeRows,
  typeNameRows,
  encounterRows,
  locationAreaRows,
  locationRows,
  encounterSlotRows,
  encounterMethodRows,
  conditionMapRows,
  conditionValueRows,
  versionGroupRegionRows,
  versionGroupRows,
  pokemonFormRows,
  legacySpeciesSnapshot,
] = await Promise.all([
  ...files.map(fetchCsv),
  fetchLegacyPlannerSnapshot(registry.legacyPlannerSnapshot.speciesPath),
])

const maxNationalDex = 1025
const selectedSpecies = speciesRows
  .filter((row) => Number(row.id) <= maxNationalDex)
  .sort((a, b) => Number(a.id) - Number(b.id))

if (
  selectedSpecies.length !== maxNationalDex
  || selectedSpecies.some((row, index) => Number(row.id) !== index + 1)
) {
  throw new Error(`National Dex #1-${maxNationalDex} is not contiguous at pinned revision.`)
}
const legacySpeciesByDex = new Map(
  legacySpeciesSnapshot.species.map((species) => [species.dex, species]),
)

const koreanSpeciesNames = new Map(
  speciesNameRows
    .filter((row) => row.local_language_id === '3')
    .map((row) => [Number(row.pokemon_species_id), row.name]),
)
const koreanTypeNames = new Map(
  typeNameRows
    .filter((row) => row.local_language_id === '3')
    .map((row) => [Number(row.type_id), row.name]),
)
const typeById = new Map(typeRows.map((row) => [
  Number(row.id),
  { id: row.identifier, name: koreanTypeNames.get(Number(row.id)) ?? row.identifier },
]))
const itemById = new Map(itemRows.map((row) => [Number(row.id), row.identifier]))
const triggerById = new Map(evolutionTriggerRows.map((row) => [Number(row.id), row.identifier]))
// PokéAPI 진화표의 required/evolved_pokemon_form_id는 pokemon_forms ID이므로
// 앱이 쓰는 pokemon ID(알로라 레트라 10091 등)로 바꿉니다.
const pokemonIdByFormId = new Map(pokemonFormRows.map((row) => [Number(row.id), Number(row.pokemon_id)]))
function evolutionPokemonId(formId) {
  if (!formId) return null
  const pokemonId = pokemonIdByFormId.get(Number(formId))
  if (!pokemonId) throw new Error(`Unknown evolution form #${formId}.`)
  return pokemonId
}
const generationByVersionGroup = new Map(
  versionGroupRows.map((row) => [Number(row.id), Number(row.generation_id)]),
)

const defaultPokemonBySpecies = new Map(
  pokemonRows
    .filter((row) => row.is_default === '1' && Number(row.species_id) <= maxNationalDex)
    .map((row) => [Number(row.species_id), row]),
)
const excludedNonDefaultPokemonCount = pokemonRows.filter((row) =>
  row.is_default !== '1' && Number(row.species_id) <= maxNationalDex,
).length
const speciesByDefaultPokemon = new Map(
  [...defaultPokemonBySpecies.entries()].map(([speciesId, row]) => [Number(row.id), speciesId]),
)

const typesByPokemon = new Map()
for (const row of pokemonTypeRows) {
  const pokemonId = Number(row.pokemon_id)
  if (!speciesByDefaultPokemon.has(pokemonId)) continue
  const entries = typesByPokemon.get(pokemonId) ?? []
  entries.push({ slot: Number(row.slot), typeId: Number(row.type_id) })
  typesByPokemon.set(pokemonId, entries)
}
const statsByPokemon = new Map()
for (const row of pokemonStatRows) {
  const pokemonId = Number(row.pokemon_id)
  if (!speciesByDefaultPokemon.has(pokemonId)) continue
  const stats = statsByPokemon.get(pokemonId) ?? {}
  stats[row.stat_id] = Number(row.base_stat)
  statsByPokemon.set(pokemonId, stats)
}

const evolutionBySpecies = new Map()
const evolutionMethodsBySpecies = new Map()
const correctedEvolutionRows = []
const knownInvalidEvolutionBoundaries = new Set(['683:11'])
for (const sourceRow of evolutionRows.sort((a, b) => Number(a.id) - Number(b.id))) {
  let row = sourceRow
  const speciesId = Number(row.evolved_species_id)
  if (speciesId > maxNationalDex) continue
  const versionGroupId = row.version_group_id ? Number(row.version_group_id) : null
  const methodGeneration = versionGroupId ? generationByVersionGroup.get(versionGroupId) : null
  const speciesGeneration = Number(selectedSpecies[speciesId - 1].generation_id)
  if (methodGeneration && methodGeneration < speciesGeneration) {
    const boundary = `${speciesId}:${versionGroupId}`
    if (!knownInvalidEvolutionBoundaries.has(boundary)) {
      throw new Error(`Unexpected future-species evolution row in version group: ${boundary}`)
    }
    correctedEvolutionRows.push({
      speciesId,
      sourceVersionGroupId: versionGroupId,
      normalizedGeneration: speciesGeneration,
      reason: 'future-species-version-group',
    })
    row = { ...row, version_group_id: '', normalized_generation: String(speciesGeneration) }
  }
  const methods = evolutionMethodsBySpecies.get(speciesId) ?? []
  methods.push(row)
  evolutionMethodsBySpecies.set(speciesId, methods)
  if (!evolutionBySpecies.has(speciesId)) evolutionBySpecies.set(speciesId, row)
}

function normalizeEvolution(evolution) {
  return {
    trigger: triggerById.get(Number(evolution.evolution_trigger_id)) ?? 'unknown',
    minLevel: evolution.minimum_level ? Number(evolution.minimum_level) : null,
    minHappiness: evolution.minimum_happiness ? Number(evolution.minimum_happiness) : null,
    item: evolution.trigger_item_id ? itemById.get(Number(evolution.trigger_item_id)) ?? null : null,
    heldItemId: evolution.held_item_id ? Number(evolution.held_item_id) : null,
    time: evolution.time_of_day || null,
    tradeSpeciesId: evolution.trade_species_id ? Number(evolution.trade_species_id) : null,
  }
}

const locationAreaById = new Map(locationAreaRows.map((row) => [Number(row.id), row]))
const locationById = new Map(locationRows.map((row) => [Number(row.id), row]))
const encounterSlotById = new Map(encounterSlotRows.map((row) => [Number(row.id), row]))
const encounterMethodById = new Map(encounterMethodRows.map((row) => [Number(row.id), row.identifier]))
const conditionValueById = new Map(conditionValueRows.map((row) => [Number(row.id), row.identifier]))
const conditionsByEncounter = new Map()
for (const row of conditionMapRows) {
  const encounterId = Number(row.encounter_id)
  const values = conditionsByEncounter.get(encounterId) ?? []
  const condition = conditionValueById.get(Number(row.encounter_condition_value_id))
  if (condition) values.push(condition)
  conditionsByEncounter.set(encounterId, values)
}

const allowedRegionsByVersionGroup = new Map()
for (const row of versionGroupRegionRows) {
  const groupId = Number(row.version_group_id)
  const regions = allowedRegionsByVersionGroup.get(groupId) ?? new Set()
  regions.add(Number(row.region_id))
  allowedRegionsByVersionGroup.set(groupId, regions)
}
const versionGroupByVersion = new Map(
  registry.games.flatMap((game) =>
    (game.sourceVersionIds ?? [game.versionId]).map((versionId, index) => [
      versionId,
      game.dataVersionGroupIds[index] ?? game.versionGroupId,
    ]),
  ),
)
const selectedVersionIds = new Set(catalogVersionIds)
const encountersBySpecies = new Map()
const encounterRowsByVersion = Object.fromEntries(catalogVersionIds.map((versionId) => [versionId, 0]))

for (const row of encounterRows) {
  const versionId = Number(row.version_id)
  const speciesId = speciesByDefaultPokemon.get(Number(row.pokemon_id))
  if (!selectedVersionIds.has(versionId) || !speciesId) continue

  const area = locationAreaById.get(Number(row.location_area_id))
  const location = area ? locationById.get(Number(area.location_id)) : undefined
  const regionId = location?.region_id ? Number(location.region_id) : null
  const versionGroupId = versionGroupByVersion.get(versionId)
  const allowedRegions = versionGroupId ? allowedRegionsByVersionGroup.get(versionGroupId) : undefined
  if (regionId && allowedRegions?.size && !allowedRegions.has(regionId)) continue

  const slot = encounterSlotById.get(Number(row.encounter_slot_id))
  const method = slot
    ? encounterMethodById.get(Number(slot.encounter_method_id)) ?? 'unknown'
    : 'unknown'
  if (legacyPlannerVersionIds.includes(versionId) && !plannerEncounterMethods.has(method)) continue
  const locationName = location?.identifier || area?.identifier || 'unknown'
  const areaName = area?.identifier || locationName
  const conditions = [...(conditionsByEncounter.get(Number(row.id)) ?? [])].sort()
  const key = `${versionId}:${speciesId}`
  const list = encountersBySpecies.get(key) ?? []
  const existing = list.find((item) =>
    item.location === locationName
    && item.area === areaName
    && item.regionId === regionId
    && item.method === method
    && item.slot === (slot?.slot ? Number(slot.slot) : null)
    && item.conditions.join('|') === conditions.join('|'),
  )
  if (existing) {
    existing.minLevel = Math.min(existing.minLevel, Number(row.min_level))
    existing.maxLevel = Math.max(existing.maxLevel, Number(row.max_level))
  } else {
    list.push({
      location: locationName,
      area: areaName,
      regionId,
      minLevel: Number(row.min_level),
      maxLevel: Number(row.max_level),
      method,
      chance: slot?.rarity ? Number(slot.rarity) : null,
      slot: slot?.slot ? Number(slot.slot) : null,
      conditions,
    })
  }
  encountersBySpecies.set(key, list)
  encounterRowsByVersion[versionId] += 1
}

const species = selectedSpecies.map((entry) => {
  const speciesId = Number(entry.id)
  const pokemon = defaultPokemonBySpecies.get(speciesId)
  if (!pokemon) throw new Error(`Missing default Pokémon row for species #${speciesId}.`)
  const pokemonId = Number(pokemon.id)
  const pokemonTypes = [...(typesByPokemon.get(pokemonId) ?? [])].sort((a, b) => a.slot - b.slot)
  if (!pokemonTypes.length) throw new Error(`Missing type rows for species #${speciesId}.`)
  const evolution = evolutionBySpecies.get(speciesId)
  const generated = {
    dex: speciesId,
    id: entry.identifier,
    name: koreanSpeciesNames.get(speciesId) ?? entry.identifier,
    generation: Number(entry.generation_id),
    types: pokemonTypes.map(({ typeId }) => typeById.get(typeId)?.id ?? 'unknown'),
    typeNames: pokemonTypes.map(({ typeId }) => typeById.get(typeId)?.name ?? 'unknown'),
    stats: statsByPokemon.get(pokemonId) ?? {},
    evolvesFrom: entry.evolves_from_species_id ? Number(entry.evolves_from_species_id) : null,
    chainId: Number(entry.evolution_chain_id),
    legendary: entry.is_legendary === '1',
    mythical: entry.is_mythical === '1',
    evolution: evolution ? normalizeEvolution(evolution) : null,
    evolutionMethods: (evolutionMethodsBySpecies.get(speciesId) ?? []).map((method) => ({
      ...normalizeEvolution(method),
      versionGroupId: method.version_group_id ? Number(method.version_group_id) : null,
      generation: method.version_group_id
        ? generationByVersionGroup.get(Number(method.version_group_id)) ?? null
        : method.normalized_generation ? Number(method.normalized_generation) : null,
      default: method.is_default === '1',
      locationId: method.location_id ? Number(method.location_id) : null,
      regionId: method.region_id ? Number(method.region_id) : null,
      genderId: method.gender_id ? Number(method.gender_id) : null,
      minBeauty: method.minimum_beauty ? Number(method.minimum_beauty) : null,
      minAffection: method.minimum_affection ? Number(method.minimum_affection) : null,
      relativePhysicalStats: method.relative_physical_stats ? Number(method.relative_physical_stats) : null,
      knownMoveId: method.known_move_id ? Number(method.known_move_id) : null,
      knownMoveTypeId: method.known_move_type_id ? Number(method.known_move_type_id) : null,
      partySpeciesId: method.party_species_id ? Number(method.party_species_id) : null,
      partyTypeId: method.party_type_id ? Number(method.party_type_id) : null,
      needsOverworldRain: method.needs_overworld_rain === '1',
      turnUpsideDown: method.turn_upside_down === '1',
      needsMultiplayer: method.needs_multiplayer === '1',
      nearSpecialRock: method.near_special_rock === '1',
      baseFormId: evolutionPokemonId(method.required_pokemon_form_id),
      evolvedFormId: evolutionPokemonId(method.evolved_pokemon_form_id),
      usedMoveId: method.used_move_id ? Number(method.used_move_id) : null,
      minMoveCount: method.minimum_move_count ? Number(method.minimum_move_count) : null,
      minSteps: method.minimum_steps ? Number(method.minimum_steps) : null,
      minDamageTaken: method.minimum_damage_taken ? Number(method.minimum_damage_taken) : null,
      natureBitmask: method.nature_bitmask ? Number(method.nature_bitmask) : null,
      percentageChance: method.percentage_chance ? Number(method.percentage_chance) : null,
    })),
    evolutionDataStatus: entry.evolves_from_species_id
      ? evolutionMethodsBySpecies.has(speciesId) ? 'available' : 'missing-source'
      : 'not-applicable',
    formDataStatus: 'default-form-only',
    encounters: Object.fromEntries(catalogVersionIds.flatMap((versionId) => {
      const values = encountersBySpecies.get(`${versionId}:${speciesId}`)
      return values ? [[String(versionId), values]] : []
    })),
  }
  if (speciesId > 649) return generated
  const legacy = legacySpeciesByDex.get(speciesId)
  return {
    ...generated,
    ...legacy,
    encounters: {
      ...Object.fromEntries(
        Object.entries(generated.encounters)
          .filter(([versionId]) => !legacyPlannerVersionIds.includes(Number(versionId))),
      ),
      ...legacy.encounters,
    },
    evolutionMethods: generated.evolutionMethods,
    evolutionDataStatus: generated.evolutionDataStatus,
    formDataStatus: generated.formDataStatus,
  }
})

const generationBoundaries = Object.fromEntries(
  [...new Set(species.map((entry) => entry.generation))]
    .sort((a, b) => a - b)
    .map((generation) => [
      generation,
      Math.max(...species.filter((entry) => entry.generation === generation).map((entry) => entry.dex)),
    ]),
)
const catalogOnlyVersionIds = catalogVersionIds.filter((versionId) => !legacyPlannerVersionIds.includes(versionId))
const serializedEncounterEntriesByVersion = Object.fromEntries(catalogVersionIds.map((versionId) => [
  versionId,
  species.reduce((total, entry) => total + (entry.encounters[String(versionId)]?.length ?? 0), 0),
]))

await mkdir(new URL('../src/generated/', import.meta.url), { recursive: true })
await writeFile(
  new URL('../src/generated/species.json', import.meta.url),
  `${JSON.stringify({
    source: `PokéAPI CSV @ ${registry.source.revision}`,
    provenance: provenance(files),
    coverage: {
      nationalDex: { min: 1, max: maxNationalDex, count: species.length },
      generationBoundaries,
      encounterVersionIds: catalogVersionIds,
      encounterRowsByVersion,
      serializedEncounterEntriesByVersion,
      plannerVersionIds: legacyPlannerVersionIds,
      plannerEncounterMethods: [...plannerEncounterMethods],
      catalogOnlyVersionIds,
      storyTiming: 'planner-version-ids-only',
      evolutionPolicy: 'earliest-version-group-method',
      evolutionVersionGroupIds: [
        ...new Set(evolutionRows.map((row) => Number(row.version_group_id)).filter(Boolean)),
      ].sort((a, b) => a - b),
      correctedEvolutionRows,
      missingEvolutionSpeciesIds: species
        .filter((entry) => entry.evolutionDataStatus === 'missing-source')
        .map((entry) => entry.dex),
      forms: {
        policy: 'default-form-only',
        planning: 'unsupported',
        excludedNonDefaultPokemonCount,
      },
    },
    species,
  })}\n`,
)
console.log(`Generated ${species.length} species with encounters for ${catalogVersionIds.length} catalog version IDs.`)
