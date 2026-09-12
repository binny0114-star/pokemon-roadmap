import { mkdir, writeFile } from 'node:fs/promises'
import {
  catalogVersionGroupIds,
  fetchCsv,
  fetchLegacyPlannerSnapshot,
  provenance,
  registry,
} from './pokeapi-source.mjs'

const files = [
  'moves',
  'move_names',
  'pokemon',
  'pokemon_species',
  'pokemon_moves',
  'machines',
  'items',
  'types',
  'move_changelog',
  'version_groups',
]
const gen8FormFiles = ['pokemon_forms', 'pokemon_form_names', 'pokemon_types', 'pokemon_stats', 'pokemon_egg_groups']

const [
  movesRows,
  namesRows,
  pokemonRows,
  pokemonFormRows,
  pokemonFormNameRows,
  pokemonTypeRows,
  pokemonStatRows,
  pokemonEggGroupRows,
  speciesRows,
  pokemonMoveRows,
  machineRows,
  itemRows,
  typeRows,
  changelogRows,
  versionGroupRows,
  legacyLearnsetSnapshot,
] = await Promise.all([
  ...[...files.slice(0, 3), ...gen8FormFiles, ...files.slice(3)].map(fetchCsv),
  fetchLegacyPlannerSnapshot(registry.legacyPlannerSnapshot.learnsetsPath),
])

const maxNationalDex = 1025
const versionGroups = new Set(catalogVersionGroupIds)
const completeLegalityVersionGroups = new Set([15, 16, 17, 18])
const gen8LegalityVersionGroups = new Set([19, 20, 23, 24])
const legacyPlannerVersionGroupIds = [
  ...new Set(
    registry.games
      .filter((game) => game.generation <= 5 && game.plannerSupport.status === 'full')
      .map((game) => game.versionGroupId),
  ),
].sort((a, b) => a - b)
const auditedLegalityVersionGroups = new Set([
  ...completeLegalityVersionGroups,
  ...gen8LegalityVersionGroups,
])
const completeLegalityMethods = new Map([
  [1, 'level'],
  [2, 'egg'],
  [3, 'tutor'],
  [4, 'machine'],
  [6, 'light-ball-egg'],
  [10, 'form-change'],
  [11, 'zygarde-cube'],
])
const statusMoves = new Set([
  'toxic', 'protect', 'rest', 'sleep-talk', 'substitute', 'double-team', 'reflect',
  'light-screen', 'thunder-wave', 'will-o-wisp', 'swords-dance', 'bulk-up',
  'calm-mind', 'curse', 'leech-seed', 'recover', 'roost', 'agility',
])

const names = new Map(
  namesRows
    .filter((row) => row.local_language_id === '3')
    .map((row) => [Number(row.move_id), row.name]),
)
const items = new Map(itemRows.map((row) => [Number(row.id), row.identifier]))
const types = new Map(typeRows.map((row) => [Number(row.id), row.identifier]))
const speciesGeneration = new Map(
  speciesRows
    .filter((row) => Number(row.id) <= maxNationalDex)
    .map((row) => [Number(row.id), Number(row.generation_id)]),
)
const speciesByDefaultPokemon = new Map(
  pokemonRows
    .filter((row) => row.is_default === '1' && Number(row.species_id) <= maxNationalDex)
    .map((row) => [Number(row.id), Number(row.species_id)]),
)
const pokemonById = new Map(
  pokemonRows
    .filter((row) => Number(row.species_id) <= maxNationalDex)
    .map((row) => [Number(row.id), {
      pokemonId: Number(row.id),
      speciesId: Number(row.species_id),
      identifier: row.identifier,
      isDefault: row.is_default === '1',
    }]),
)
const pokemonByIdentifier = new Map([...pokemonById.values()].map((pokemon) => [pokemon.identifier, pokemon]))
const speciesGenderRate = new Map(speciesRows.map((row) => [Number(row.id), Number(row.gender_rate)]))
const speciesChildren = new Map()
for (const row of speciesRows) {
  const parent = Number(row.evolves_from_species_id)
  if (!parent) continue
  const children = speciesChildren.get(parent) ?? []
  children.push(Number(row.id))
  speciesChildren.set(parent, children)
}
const eggGroupsBySpecies = new Map()
for (const row of pokemonEggGroupRows) {
  const speciesId = Number(row.species_id)
  const groups = eggGroupsBySpecies.get(speciesId) ?? new Set()
  groups.add(Number(row.egg_group_id))
  eggGroupsBySpecies.set(speciesId, groups)
}
function breedingEggGroups(speciesId) {
  const ownGroups = eggGroupsBySpecies.get(speciesId)
  if (ownGroups && [...ownGroups].some((eggGroup) => eggGroup !== 15)) return ownGroups
  let frontier = speciesChildren.get(speciesId) ?? []
  const visited = new Set([speciesId])
  while (frontier.length) {
    const next = []
    const result = new Set()
    for (const descendant of frontier) {
      if (visited.has(descendant)) continue
      visited.add(descendant)
      const groups = eggGroupsBySpecies.get(descendant)
      for (const eggGroup of groups ?? []) if (eggGroup !== 15) result.add(eggGroup)
      next.push(...(speciesChildren.get(descendant) ?? []))
    }
    if (result.size) return result
    frontier = next
  }
  return ownGroups
}
const pokemonFormsByPokemonId = new Map()
for (const row of pokemonFormRows) {
  const pokemonId = Number(row.pokemon_id)
  const forms = pokemonFormsByPokemonId.get(pokemonId) ?? []
  forms.push({
    formId: Number(row.id),
    identifier: row.identifier,
    formIndex: Math.max(0, Number(row.form_order) - 1),
    isDefault: row.is_default === '1',
    battleOnly: row.is_battle_only === '1',
  })
  pokemonFormsByPokemonId.set(pokemonId, forms)
}
const pokemonFormNames = new Map(
  pokemonFormNameRows
    .filter((row) => row.local_language_id === '3')
    .map((row) => [Number(row.pokemon_form_id), row.form_name]),
)
const pokemonTypes = new Map()
for (const row of pokemonTypeRows) {
  const pokemonId = Number(row.pokemon_id)
  const entries = pokemonTypes.get(pokemonId) ?? []
  entries.push({ slot: Number(row.slot), type: types.get(Number(row.type_id)) })
  pokemonTypes.set(pokemonId, entries)
}
const pokemonStats = new Map()
for (const row of pokemonStatRows) {
  const pokemonId = Number(row.pokemon_id)
  const stats = pokemonStats.get(pokemonId) ?? {}
  stats[row.stat_id] = Number(row.base_stat)
  pokemonStats.set(pokemonId, stats)
}
const versionGroupGeneration = new Map(
  versionGroupRows.map((row) => [Number(row.id), Number(row.generation_id)]),
)
const moves = new Map(movesRows.map((row) => {
  const id = Number(row.id)
  return [id, {
    id: row.identifier,
    name: names.get(id) ?? row.identifier,
    type: types.get(Number(row.type_id)),
    category: Number(row.damage_class_id) === 1 ? '변화' : Number(row.damage_class_id) === 2 ? '물리' : '특수',
    power: Number(row.power) || 0,
    accuracy: Number(row.accuracy) || null,
    generation: Number(row.generation_id),
  }]
}))
const machines = new Map(
  machineRows
    .filter((row) => versionGroups.has(Number(row.version_group_id)))
    .map((row) => [
      `${row.version_group_id}:${row.move_id}`,
      (items.get(Number(row.item_id)) ?? '').toUpperCase(),
    ]),
)

const learnsets = {}
const completeLegality = {}
const usedMoveIds = new Set()
const gen8LegalityMoveIds = new Set()
for (const row of pokemonMoveRows) {
  const pokemon = pokemonById.get(Number(row.pokemon_id))
  const speciesId = speciesByDefaultPokemon.get(Number(row.pokemon_id))
  const versionGroup = Number(row.version_group_id)
  const moveId = Number(row.move_id)
  const method = Number(row.pokemon_move_method_id)
  const groupGeneration = versionGroupGeneration.get(versionGroup)
  const move = moves.get(moveId)
  if (
    !pokemon
    || !move
    || !groupGeneration
    || move.generation > groupGeneration
    || (speciesGeneration.get(pokemon.speciesId) ?? 99) > groupGeneration
  ) continue

  if (auditedLegalityVersionGroups.has(versionGroup) && completeLegalityMethods.has(method)) {
    const machine = method === 4 ? machines.get(`${versionGroup}:${moveId}`) : undefined
    const source = completeLegalityMethods.get(method)
    const level = method === 1 ? Number(row.level) : 0
    const group = completeLegality[versionGroup] ??= {}
    const entries = group[pokemon.identifier] ??= []
    const entry = [moveId, source, level, machine ?? null]
    if (!entries.some((current) => current.join(':') === entry.join(':'))) entries.push(entry)
    if (completeLegalityVersionGroups.has(versionGroup)) usedMoveIds.add(moveId)
    else gen8LegalityMoveIds.add(moveId)
  }

  if (!speciesId || !versionGroups.has(versionGroup) || ![1, 3, 4].includes(method)) continue
  const machine = method === 4 ? machines.get(`${versionGroup}:${moveId}`) : undefined
  const usefulMachine = method !== 4 || Boolean(machine) && (move.power >= 50 || statusMoves.has(move.id))
  const usefulTutor = method !== 3 || move.power >= 50 || statusMoves.has(move.id)
  if (!usefulMachine || !usefulTutor) continue

  const group = learnsets[versionGroup] ??= {}
  const entries = group[speciesId] ??= []
  const source = method === 1 ? 'level' : method === 3 ? 'tutor' : 'machine'
  const level = method === 1 ? Number(row.level) : 0
  const existing = entries.find((entry) => entry[0] === moveId)
  if (existing) {
    if (source === 'level' && existing[1] !== 'level') entries.splice(entries.indexOf(existing), 1)
    else if (source !== 'level') continue
  }
  entries.push([moveId, source, level, machine ?? null])
  usedMoveIds.add(moveId)
}

for (const versionGroup of gen8LegalityVersionGroups) {
  const group = completeLegality[versionGroup] ?? {}
  const providersByMove = new Map()
  for (const [identifier, entries] of Object.entries(group)) {
    const pokemon = pokemonByIdentifier.get(identifier)
    if (!pokemon?.isDefault || speciesGenderRate.get(pokemon.speciesId) === -1 || speciesGenderRate.get(pokemon.speciesId) === 8) continue
    for (const [moveId, source] of entries) {
      if (source === 'egg') continue
      const providers = providersByMove.get(moveId) ?? []
      providers.push(identifier)
      providersByMove.set(moveId, providers)
    }
  }
  for (const [identifier, entries] of Object.entries(group)) {
    const target = pokemonByIdentifier.get(identifier)
    const targetGroups = target ? breedingEggGroups(target.speciesId) : undefined
    if (!target || !targetGroups || speciesGenderRate.get(target.speciesId) <= 0 || targetGroups.has(15)) continue
    for (const entry of entries) {
      if (entry[1] !== 'egg') continue
      const directParents = (providersByMove.get(entry[0]) ?? []).filter((parentIdentifier) => {
        const parent = pokemonByIdentifier.get(parentIdentifier)
        const parentGroups = parent ? eggGroupsBySpecies.get(parent.speciesId) : undefined
        return parent
          && parent.speciesId !== 132
          && parentGroups
          && [...targetGroups].some((eggGroup) => eggGroup !== 13 && eggGroup !== 15 && parentGroups.has(eggGroup))
      })
      entry.push([...new Set(directParents)].sort())
    }
  }
}

for (const group of Object.values(completeLegality)) {
  for (const entries of Object.values(group)) {
    entries.sort((a, b) => a[1].localeCompare(b[1]) || a[2] - b[2] || a[0] - b[0])
  }
}

for (const group of Object.values(learnsets)) {
  for (const entries of Object.values(group)) {
    entries.sort((a, b) => a[1].localeCompare(b[1]) || a[2] - b[2] || a[0] - b[0])
  }
}

const moveData = Object.assign(Object.fromEntries(
  [...usedMoveIds].sort((a, b) => a - b).map((id) => [id, moves.get(id)]),
), legacyLearnsetSnapshot.moves)
const versionGroupOrder = new Map(versionGroupRows.map((row) => [Number(row.id), Number(row.order)]))
const changelogsByMove = new Map()
for (const row of changelogRows) {
  const moveId = Number(row.move_id)
  if (!usedMoveIds.has(moveId)) continue
  const entries = changelogsByMove.get(moveId) ?? []
  entries.push(row)
  changelogsByMove.set(moveId, entries)
}
const versions = {}
for (const versionGroup of catalogVersionGroupIds) {
  const targetOrder = versionGroupOrder.get(versionGroup)
  if (!targetOrder) throw new Error(`Missing version group order for ${versionGroup}.`)
  const overrides = {}
  for (const moveId of usedMoveIds) {
    const historical = (changelogsByMove.get(moveId) ?? [])
      .filter((row) => (versionGroupOrder.get(Number(row.changed_in_version_group_id)) ?? 999) > targetOrder)
      .sort((a, b) =>
        (versionGroupOrder.get(Number(a.changed_in_version_group_id)) ?? 999)
        - (versionGroupOrder.get(Number(b.changed_in_version_group_id)) ?? 999),
      )[0]
    if (!historical) continue
    const override = {}
    if (historical.type_id) override.type = types.get(Number(historical.type_id))
    if (historical.power) override.power = Number(historical.power)
    if (historical.accuracy) override.accuracy = Number(historical.accuracy)
    if (Object.keys(override).length) overrides[moveId] = override
  }
  versions[versionGroup] = overrides
}
for (const versionGroup of legacyPlannerVersionGroupIds) {
  learnsets[versionGroup] = legacyLearnsetSnapshot.learnsets[versionGroup] ?? {}
  versions[versionGroup] = legacyLearnsetSnapshot.versions[versionGroup] ?? {}
}

const learnsetSpeciesByVersionGroup = Object.fromEntries(
  catalogVersionGroupIds.map((versionGroup) => [
    versionGroup,
    Object.keys(learnsets[versionGroup] ?? {}).length,
  ]),
)
const completeLegalityPokemonByVersionGroup = Object.fromEntries(
  [...completeLegalityVersionGroups].map((versionGroup) => [
    versionGroup,
    Object.keys(completeLegality[versionGroup] ?? {}).length,
  ]),
)
const gen8LegalityPokemonByVersionGroup = Object.fromEntries(
  [...gen8LegalityVersionGroups].map((versionGroup) => [
    versionGroup,
    Object.keys(completeLegality[versionGroup] ?? {}).length,
  ]),
)
const pokemonForms = Object.fromEntries(
  [...pokemonById.values()]
    .filter((pokemon) => (speciesGeneration.get(pokemon.speciesId) ?? 99) <= 7)
    .sort((a, b) => a.pokemonId - b.pokemonId)
    .map((pokemon) => [pokemon.identifier, pokemon]),
)
const gen8PokemonForms = Object.fromEntries(
  [...pokemonById.values()]
    .filter((pokemon) => (speciesGeneration.get(pokemon.speciesId) ?? 99) <= 8)
    .sort((a, b) => a.pokemonId - b.pokemonId)
    .flatMap((pokemon) => (pokemonFormsByPokemonId.get(pokemon.pokemonId) ?? [{
      formId: 0,
      identifier: pokemon.identifier,
      formIndex: 0,
      isDefault: true,
      battleOnly: false,
    }]).map((form) => [form.identifier, {
        ...pokemon,
        pokemonIdentifier: pokemon.identifier,
        identifier: form.identifier,
        isDefault: pokemon.isDefault && form.isDefault,
        formIndex: form.formIndex,
        formName: pokemonFormNames.get(form.formId) ?? null,
        battleOnly: form.battleOnly,
        types: (pokemonTypes.get(pokemon.pokemonId) ?? [])
          .sort((a, b) => a.slot - b.slot)
          .map((entry) => entry.type),
        stats: pokemonStats.get(pokemon.pokemonId) ?? {},
      }])),
)

await mkdir(new URL('../src/generated/', import.meta.url), { recursive: true })
await writeFile(
  new URL('../src/generated/learnsets.json', import.meta.url),
  `${JSON.stringify({
    source: `PokéAPI CSV @ ${registry.source.revision} (pokemon_moves, moves, machines)`,
    provenance: provenance(files),
    coverage: {
      nationalDexMax: maxNationalDex,
      versionGroupIds: catalogVersionGroupIds,
      versionGroupGeneration: Object.fromEntries(
        catalogVersionGroupIds.map((id) => [id, versionGroupGeneration.get(id)]),
      ),
      learnsetSpeciesByVersionGroup,
      completeLegalityVersionGroupIds: [...completeLegalityVersionGroups],
      completeLegalityPokemonByVersionGroup,
      completeLegalityMethods: [...completeLegalityMethods.values()],
      completeLegalityPolicy: {
        identity: 'pokemon-identifier',
        rows: 'unfiltered-source-rows',
        pkhexFormIndexMapping: 'not-normalized',
        acquisitionTiming: 'not-ingested',
      },
      methods: ['level', 'machine', 'tutor'],
      isolatedVersionGroups: true,
      plannerDataPolicy: {
        speciesForms: 'default-form-only',
        levelUp: 'source-rows',
        machines: 'useful-moves-only',
        tutors: 'useful-moves-only',
        eggMoves: 'not-ingested',
        reminderRules: 'not-normalized',
        acquisitionTiming: 'not-ingested',
      },
      forms: {
        policy: 'default-form-only',
        planning: 'unsupported',
      },
    },
    moves: moveData,
    versions,
    learnsets,
  })}\n`,
)
await writeFile(
  new URL('../src/generated/gen67-legality.json', import.meta.url),
  `${JSON.stringify({
    source: `PokéAPI CSV @ ${registry.source.revision} (pokemon, pokemon_moves)`,
    provenance: provenance(files),
    coverage: {
      versionGroupIds: [...completeLegalityVersionGroups],
      pokemonByVersionGroup: completeLegalityPokemonByVersionGroup,
      methods: [...completeLegalityMethods.values()],
      policy: {
        identity: 'pokemon-identifier',
        rows: 'unfiltered-source-rows',
        pkhexFormIndexMapping: 'not-normalized',
        acquisitionTiming: 'not-ingested',
      },
    },
    pokemonForms,
    learnsets: Object.fromEntries(
      [...completeLegalityVersionGroups].map((versionGroup) => [
        versionGroup,
        completeLegality[versionGroup] ?? {},
      ]),
    ),
  })}\n`,
)
await writeFile(
  new URL('../src/generated/gen8-legality.json', import.meta.url),
  `${JSON.stringify({
    source: `PokéAPI CSV @ ${registry.source.revision} (pokemon, pokemon_moves)`,
    provenance: provenance([...files, ...gen8FormFiles]),
    coverage: {
      versionGroupIds: [...gen8LegalityVersionGroups],
      pokemonByVersionGroup: gen8LegalityPokemonByVersionGroup,
      methods: [...completeLegalityMethods.values()],
      policy: {
        identity: 'pokemon-identifier',
        rows: 'unfiltered-source-rows',
        pkhexFormIndexMapping: 'pokeapi-form-order',
        acquisitionTiming: 'not-ingested',
        resourceConsumption: 'not-ingested',
        masteryAndStyles: 'not-ingested',
      },
    },
    pokemonForms: gen8PokemonForms,
    moves: Object.fromEntries(
      [...gen8LegalityMoveIds].sort((a, b) => a - b).map((id) => [id, moves.get(id)]),
    ),
    learnsets: Object.fromEntries(
      [...gen8LegalityVersionGroups].map((versionGroup) => [
        versionGroup,
        completeLegality[versionGroup] ?? {},
      ]),
    ),
  })}\n`,
)
await writeFile(
  new URL('../src/generated/gen8-form-profiles.json', import.meta.url),
  `${JSON.stringify({
    provenance: provenance([...files, ...gen8FormFiles]),
    pokemonForms: gen8PokemonForms,
  })}\n`,
)
console.log(`Generated ${Object.keys(moveData).length} moves across ${Object.keys(learnsets).length} version groups.`)
