import { mkdir, writeFile } from 'node:fs/promises'
import {
  catalogVersionGroupIds,
  fetchCsv,
  fetchLegacyPlannerSnapshot,
  plannerVersionGroupIds,
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

const [
  movesRows,
  namesRows,
  pokemonRows,
  speciesRows,
  pokemonMoveRows,
  machineRows,
  itemRows,
  typeRows,
  changelogRows,
  versionGroupRows,
  legacyLearnsetSnapshot,
] = await Promise.all([
  ...files.map(fetchCsv),
  fetchLegacyPlannerSnapshot(registry.legacyPlannerSnapshot.learnsetsPath),
])

const maxNationalDex = 1025
const versionGroups = new Set(catalogVersionGroupIds)
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
const usedMoveIds = new Set()
for (const row of pokemonMoveRows) {
  const speciesId = speciesByDefaultPokemon.get(Number(row.pokemon_id))
  const versionGroup = Number(row.version_group_id)
  const moveId = Number(row.move_id)
  const method = Number(row.pokemon_move_method_id)
  if (!speciesId || !versionGroups.has(versionGroup) || ![1, 3, 4].includes(method)) continue
  const groupGeneration = versionGroupGeneration.get(versionGroup)
  const move = moves.get(moveId)
  if (
    !move
    || !groupGeneration
    || move.generation > groupGeneration
    || (speciesGeneration.get(speciesId) ?? 99) > groupGeneration
  ) continue
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
for (const versionGroup of plannerVersionGroupIds) {
  learnsets[versionGroup] = legacyLearnsetSnapshot.learnsets[versionGroup] ?? {}
  versions[versionGroup] = legacyLearnsetSnapshot.versions[versionGroup] ?? {}
}

const learnsetSpeciesByVersionGroup = Object.fromEntries(
  catalogVersionGroupIds.map((versionGroup) => [
    versionGroup,
    Object.keys(learnsets[versionGroup] ?? {}).length,
  ]),
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
      methods: ['level', 'machine', 'tutor'],
      isolatedVersionGroups: true,
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
console.log(`Generated ${Object.keys(moveData).length} moves across ${Object.keys(learnsets).length} version groups.`)
