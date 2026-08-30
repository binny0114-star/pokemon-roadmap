import { mkdir, writeFile } from 'node:fs/promises'

const base = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv'
const versionGroups = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 14])
const statusMoves = new Set([
  'toxic', 'protect', 'rest', 'sleep-talk', 'substitute', 'double-team', 'reflect',
  'light-screen', 'thunder-wave', 'will-o-wisp', 'swords-dance', 'bulk-up',
  'calm-mind', 'curse', 'leech-seed', 'recover', 'roost', 'agility',
])

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''))
      rows.push(row)
      row = []
      field = ''
    } else field += char
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  const [headers, ...values] = rows
  return values.filter((value) => value.length === headers.length)
    .map((value) => Object.fromEntries(headers.map((header, index) => [header, value[index]])))
}

async function fetchCsv(name) {
  const response = await fetch(`${base}/${name}.csv`)
  if (!response.ok) throw new Error(`${name}.csv: ${response.status}`)
  return parseCsv(await response.text())
}

const [movesRows, namesRows, pokemonMoveRows, machineRows, itemRows, typeRows, changelogRows, versionGroupRows] = await Promise.all([
  fetchCsv('moves'),
  fetchCsv('move_names'),
  fetchCsv('pokemon_moves'),
  fetchCsv('machines'),
  fetchCsv('items'),
  fetchCsv('types'),
  fetchCsv('move_changelog'),
  fetchCsv('version_groups'),
])

const names = new Map(
  namesRows
    .filter((row) => row.local_language_id === '3')
    .map((row) => [Number(row.move_id), row.name]),
)
const items = new Map(itemRows.map((row) => [Number(row.id), row.identifier]))
const types = new Map(typeRows.map((row) => [Number(row.id), row.identifier]))
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
  const pokemon = Number(row.pokemon_id)
  const versionGroup = Number(row.version_group_id)
  const moveId = Number(row.move_id)
  const method = Number(row.pokemon_move_method_id)
  if (pokemon > 649 || !versionGroups.has(versionGroup) || ![1, 3, 4].includes(method)) continue
  const move = moves.get(moveId)
  if (!move) continue
  const machine = method === 4 ? machines.get(`${versionGroup}:${moveId}`) : undefined
  const usefulMachine = method !== 4 || Boolean(machine) && (move.power >= 50 || statusMoves.has(move.id))
  const usefulTutor = method !== 3 || move.power >= 50 || statusMoves.has(move.id)
  if (!usefulMachine || !usefulTutor) continue

  const group = learnsets[versionGroup] ??= {}
  const entries = group[pokemon] ??= []
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

const moveData = Object.fromEntries(
  [...usedMoveIds].sort((a, b) => a - b).map((id) => [id, moves.get(id)]),
)
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
for (const versionGroup of versionGroups) {
  const targetOrder = versionGroupOrder.get(versionGroup)
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

await mkdir(new URL('../src/generated/', import.meta.url), { recursive: true })
await writeFile(
  new URL('../src/generated/learnsets.json', import.meta.url),
  `${JSON.stringify({
    source: 'PokéAPI CSV snapshot 2026-08-29 (pokemon_moves, moves, machines)',
    moves: moveData,
    versions,
    learnsets,
  })}\n`,
)
console.log(`Generated ${Object.keys(moveData).length} moves across ${Object.keys(learnsets).length} version groups.`)
