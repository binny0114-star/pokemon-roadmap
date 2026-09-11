import { mkdir, writeFile } from 'node:fs/promises'

const pkhexRevision = '77dcd3a7895bceaafbbff12d25bdf77c1acd8ca5'
const pkhexCodeRoot = `https://raw.githubusercontent.com/kwsch/PKHeX/${pkhexRevision}/PKHeX.Core`
const pkhexRoot = `https://raw.githubusercontent.com/kwsch/PKHeX/${pkhexRevision}/PKHeX.Core/Resources`

const sources = {
  x: ['legality/wild/Gen6/encounter_x.pkl'],
  y: ['legality/wild/Gen6/encounter_y.pkl'],
  'omega-ruby': ['legality/wild/Gen6/encounter_or.pkl'],
  'alpha-sapphire': ['legality/wild/Gen6/encounter_as.pkl'],
  sun: ['legality/wild/Gen7/encounter_sn.pkl'],
  moon: ['legality/wild/Gen7/encounter_mn.pkl'],
  'ultra-sun': ['legality/wild/Gen7/encounter_us.pkl'],
  'ultra-moon': ['legality/wild/Gen7/encounter_um.pkl'],
  sword: [
    'legality/wild/Gen8/encounter_sw_hidden.pkl',
    'legality/wild/Gen8/encounter_sw_symbol.pkl',
    'legality/wild/Gen8/encounter_sw_nest.pkl',
  ],
  shield: [
    'legality/wild/Gen8/encounter_sh_hidden.pkl',
    'legality/wild/Gen8/encounter_sh_symbol.pkl',
    'legality/wild/Gen8/encounter_sh_nest.pkl',
  ],
  'brilliant-diamond': ['legality/wild/Gen8/encounter_bd.pkl'],
  'shining-pearl': ['legality/wild/Gen8/encounter_sp.pkl'],
  paldea: ['legality/wild/Gen9/encounter_wild_paldea.pkl'],
}
const inputFiles = [
  ...Object.values(sources).flat(),
  'text/locations/gen6/text_xy_00000_en.txt',
  'text/locations/gen7/text_sm_00000_en.txt',
  'text/locations/gen7/text_sm_30000_en.txt',
  'text/locations/gen8/text_swsh_00000_en.txt',
  'text/locations/gen8b/text_bdsp_00000_en.txt',
  'text/locations/gen9/text_sv_00000_en.txt',
  'Legality/Encounters/Data/Gen8/Encounters8.cs',
  'Legality/Encounters/Data/Gen8/Encounters8Nest.cs',
  'Legality/Encounters/Data/Gen8/Encounters8b.cs',
  'Legality/Encounters/Data/Gen9/Encounters9.cs',
]

const paldeaVersionExclusive = {
  200: ['violet'], 246: ['scarlet'], 247: ['scarlet'], 316: ['violet'], 317: ['violet'],
  371: ['violet'], 372: ['violet'], 425: ['scarlet'], 426: ['scarlet'], 429: ['violet'],
  434: ['scarlet'], 435: ['scarlet'], 633: ['scarlet'], 634: ['scarlet'], 690: ['scarlet'],
  691: ['scarlet'], 692: ['violet'], 693: ['violet'], 765: ['scarlet'], 766: ['violet'],
  874: ['scarlet'], 875: ['violet'], 885: ['violet'], 886: ['violet'], 984: ['scarlet'],
  985: ['scarlet'], 986: ['scarlet'], 987: ['scarlet'], 988: ['scarlet'], 989: ['scarlet'],
  990: ['violet'], 991: ['violet'], 992: ['violet'], 993: ['violet'], 994: ['violet'],
  995: ['violet'], 1005: ['scarlet'], 1006: ['violet'], 1007: ['scarlet'], 1008: ['violet'],
}

const paldeaFormExclusive = {
  '128:2': ['scarlet'],
  '128:3': ['violet'],
}

const staticAcquisitions = [
  ...[
    ['sword', 810], ['sword', 813], ['sword', 816],
    ['shield', 810], ['shield', 813], ['shield', 816],
  ].map(([game, species]) => ({ game, species, location: 'postwick', area: 'starter-gift', method: 'gift', minLevel: 5, maxLevel: 5, conditions: ['mutually-exclusive-starter'] })),
  ...['sword', 'shield'].flatMap((game) => [
    { game, species: 848, location: 'route-5', area: 'nursery-gift', method: 'gift', minLevel: 1, maxLevel: 1, conditions: [] },
    ...[880, 881, 882, 883].map((species) => ({
      game,
      species,
      location: 'route-6',
      area: 'fossil-restoration',
      method: 'fossil',
      minLevel: 10,
      maxLevel: 10,
      conditions: ['fossil-restoration'],
    })),
    { game, species: 772, location: 'battle-tower', area: 'lobby-gift', method: 'gift', minLevel: 50, maxLevel: 50, conditions: ['postgame'] },
    { game, species: 4, location: 'postwick', area: 'leon-bedroom-gift', method: 'gift', minLevel: 5, maxLevel: 5, conditions: ['postgame'] },
  ]),
  { game: 'sword', species: 890, location: 'energy-plant', area: 'tower-summit', method: 'static', minLevel: 60, maxLevel: 60, conditions: ['story-climax'] },
  { game: 'shield', species: 890, location: 'energy-plant', area: 'tower-summit', method: 'static', minLevel: 60, maxLevel: 60, conditions: ['story-climax'] },
  { game: 'sword', species: 888, location: 'slumbering-weald', area: 'tower-summit', method: 'static', minLevel: 70, maxLevel: 70, conditions: ['postgame'] },
  { game: 'shield', species: 889, location: 'slumbering-weald', area: 'tower-summit', method: 'static', minLevel: 70, maxLevel: 70, conditions: ['postgame'] },
  ...[
    ['brilliant-diamond', 387], ['brilliant-diamond', 390], ['brilliant-diamond', 393],
    ['shining-pearl', 387], ['shining-pearl', 390], ['shining-pearl', 393],
  ].map(([game, species]) => ({ game, species, location: 'lake-verity', area: 'starter-gift', method: 'gift', minLevel: 5, maxLevel: 5, conditions: ['mutually-exclusive-starter'] })),
  { game: 'brilliant-diamond', species: 483, location: 'spear-pillar', area: 'story-static', method: 'static', minLevel: 47, maxLevel: 47, conditions: ['story-climax'] },
  { game: 'shining-pearl', species: 484, location: 'spear-pillar', area: 'story-static', method: 'static', minLevel: 47, maxLevel: 47, conditions: ['story-climax'] },
  ...[
    ['scarlet', 906], ['scarlet', 909], ['scarlet', 912],
    ['violet', 906], ['violet', 909], ['violet', 912],
  ].map(([game, species]) => ({ game, species, location: 'cabo-poco', area: 'starter-gift', method: 'gift', minLevel: 5, maxLevel: 5, conditions: ['mutually-exclusive-starter'] })),
  { game: 'scarlet', species: 1007, location: 'area-zero', area: 'postgame-static', method: 'static', minLevel: 72, maxLevel: 72, conditions: ['postgame'] },
  { game: 'violet', species: 1008, location: 'area-zero', area: 'postgame-static', method: 'static', minLevel: 72, maxLevel: 72, conditions: ['postgame'] },
]

async function fetchBytes(path) {
  const response = await fetch(`${pkhexRoot}/${path}`)
  if (!response.ok) throw new Error(`PKHeX ${response.status}: ${path}`)
  return Buffer.from(await response.arrayBuffer())
}

async function fetchText(path) {
  const response = await fetch(`${pkhexRoot}/${path}`)
  if (!response.ok) throw new Error(`PKHeX ${response.status}: ${path}`)
  return response.text()
}

async function fetchCode(path) {
  const response = await fetch(`${pkhexCodeRoot}/${path}`)
  if (!response.ok) throw new Error(`PKHeX ${response.status}: ${path}`)
  return response.text()
}

function unpack(buffer) {
  const count = buffer.readUInt16LE(2)
  return Array.from({ length: count }, (_, index) => {
    const start = buffer.readUInt32LE(4 + index * 4)
    const end = buffer.readUInt32LE(8 + index * 4)
    return buffer.subarray(start, end)
  })
}

function slug(value) {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[’']/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function names(text) {
  return text.replace(/\r/g, '').split('\n')
}

function encounter(species, form, location, area, minLevel, maxLevel, method, conditions = []) {
  return {
    species,
    form,
    location: slug(location),
    area: slug(area || location),
    regionId: null,
    minLevel,
    maxLevel,
    method,
    chance: null,
    slot: null,
    conditions: [...new Set(conditions)].sort(),
  }
}

function normalizeForm(form, generation = 8) {
  if (generation === 9 && form === 30) return { form: 18, condition: null }
  if (form === 30) return { form: 0, condition: 'form-region-dependent' }
  if (form === 31) return { form: 0, condition: 'form-random' }
  return { form, condition: null }
}

const weather8 = [
  [1, 'weather-normal'], [2, 'weather-overcast'], [4, 'weather-rain'],
  [8, 'weather-thunderstorm'], [16, 'weather-intense-sun'], [32, 'weather-snow'],
  [64, 'weather-snowstorm'], [128, 'weather-sandstorm'], [256, 'weather-heavy-fog'],
]

const weather9 = [
  [1, 'weather-normal'], [2, 'weather-overcast'], [4, 'weather-rain'],
  [8, 'weather-thunderstorm'], [16, 'weather-mist'], [32, 'weather-snow'],
  [64, 'weather-snowstorm'], [128, 'weather-sandstorm'],
]

function parseSwsh(buffer, locationNames, symbol) {
  return unpack(buffer).flatMap((area) => {
    if (area[0] >= 164) return []
    const location = locationNames[area[0]] || `galar-location-${area[0]}`
    const result = []
    let offset = 2
    let read = 0
    while (read < area[1]) {
      const flags = area.readUInt16LE(offset)
      const min = area[offset + 2]
      const max = area[offset + 3]
      const count = area[offset + 4]
      const slotType = area[offset + 5]
      offset += 6
      const conditions = weather8.filter(([flag]) => (flags & flag) !== 0).map(([, label]) => label)
      const method = (flags & 1024) !== 0 || slotType === 12
        ? 'fishing'
        : (flags & 512) !== 0
          ? 'shaking-tree'
          : slotType === 5 || slotType === 6 || slotType === 11
            ? 'surf'
            : symbol
              ? 'overworld'
              : 'grass'
      for (let index = 0; index < count; index += 1) {
        const encoded = area.readUInt16LE(offset)
        offset += 2
        const decoded = normalizeForm(encoded >> 11)
        result.push(encounter(
          encoded & 0x3ff,
          decoded.form,
          location,
          `${location}-${area[0]}-${symbol ? 'visible-symbol' : 'hidden-random'}`,
          min,
          max,
          method,
          decoded.condition ? [...conditions, decoded.condition] : conditions,
        ))
      }
      read += count
    }
    return result
  })
}

function parseNestLocations(source) {
  const result = new Map()
  const pattern = /^\s*(\d+)\s*=>\s*\[([^\]]*)\]/gm
  for (const match of source.matchAll(pattern)) {
    const locations = match[2].split(',').map((value) => Number.parseInt(value.trim(), 10)).filter(Number.isFinite)
    result.set(Number.parseInt(match[1], 10), locations)
  }
  return result
}

function parseInaccessibleNests(source) {
  const body = /GetInaccessibleRank12Nests\(byte location\) => location switch\s*\{([\s\S]*?)\n\s*_ =>/.exec(source)?.[1] ?? ''
  const result = new Set()
  for (const match of body.matchAll(/^\s*(\d+)\s*=>\s*\[([^\]]*)\]/gm)) {
    const location = Number.parseInt(match[1], 10)
    for (const nest of match[2].split(',').map((value) => Number.parseInt(value.trim(), 10)).filter(Number.isFinite)) {
      result.add(`${location}:${nest}`)
    }
  }
  return result
}

function parseSwshRaids(buffer, locationNames, nestLocations, inaccessibleNests) {
  const levelCaps = [[15, 20], [25, 30], [35, 40], [45, 50], [55, 60]]
  const requiredBadges = [0, 1, 3, 6, 8]
  const result = []
  for (let offset = 0; offset + 9 < buffer.length; offset += 10) {
    const species = buffer.readUInt16LE(offset)
    const decoded = normalizeForm(buffer[offset + 2])
    const nest = buffer[offset + 6]
    if (nest >= 98) continue
    const minRank = buffer[offset + 7]
    const maxRank = buffer[offset + 8]
    const locations = nestLocations.get(nest) ?? []
    for (const locationId of locations.filter((id) => id < 164)) {
      const location = locationNames[locationId] || `galar-location-${locationId}`
      const accessConditions = inaccessibleNests.has(`${locationId}:${nest}`) ? ['water-bike'] : []
      result.push(encounter(
        species,
        decoded.form,
        location,
        `max-den-${nest}`,
        levelCaps[minRank][0],
        levelCaps[maxRank][1],
        'raid',
        ['max-raid', `badge-count-${requiredBadges[minRank]}`, `raid-stars-${minRank + 1}-${maxRank + 1}`, ...accessConditions, ...(decoded.condition ? [decoded.condition] : [])],
      ))
    }
  }
  return result
}

function parseBdsp(buffer, locationNames) {
  const typeNames = ['unknown', 'grass', 'surf', 'old-rod', 'good-rod', 'super-rod', 'rock-smash', 'unknown', 'honey-tree']
  return unpack(buffer).flatMap((area) => {
    const locationId = area.readUInt16LE(0)
    const location = locationNames[locationId] || `sinnoh-location-${locationId}`
    if (['trophy-garden', 'great-marsh'].includes(slug(location))) return []
    const method = typeNames[area[2]] ?? 'unknown'
    if (method === 'grass' || method === 'unknown') return []
    const result = []
    for (let offset = 4; offset + 3 < area.length; offset += 4) {
      const encoded = area.readUInt16LE(offset)
      const decoded = normalizeForm(encoded >> 11)
      result.push(encounter(encoded & 0x3ff, decoded.form, location, `${location}-${locationId}`, area[offset + 2], area[offset + 3], method, decoded.condition ? [decoded.condition] : []))
    }
    return result
  })
}

function parseGen6(buffer, locationNames) {
  const typeNames = ['unsupported-standard', 'grass', 'surf', 'old-rod', 'good-rod', 'super-rod', 'rock-smash', 'horde', 'friend-safari']
  return unpack(buffer).flatMap((area) => {
    if (area[2] === 0) return []
    const locationId = area.readUInt16LE(0)
    const location = locationNames[locationId] || `gen6-location-${locationId}`
    const method = typeNames[area[2]] ?? 'unknown'
    const result = []
    for (let offset = 4; offset + 3 < area.length; offset += 4) {
      const encoded = area.readUInt16LE(offset)
      const decoded = normalizeForm(encoded >> 11)
      result.push(encounter(encoded & 0x3ff, decoded.form, location, `${location}-${locationId}`, area[offset + 2], area[offset + 3], method, decoded.condition ? [decoded.condition] : []))
    }
    return result
  })
}

function parseGen7(buffer, locationNames, transferLocationNames) {
  const typeNames = ['wild-unspecified', 'sos']
  return unpack(buffer).flatMap((area) => {
    const locationId = area.readUInt16LE(0)
    const locationName = locationId >= 30000 && locationId < 40000
      ? transferLocationNames[locationId - 30000]
      : locationNames[locationId]
    const location = locationName || `alola-location-${locationId}`
    const method = typeNames[area[2]] ?? 'unknown'
    const result = []
    for (let offset = 4; offset + 3 < area.length; offset += 4) {
      const encoded = area.readUInt16LE(offset)
      const decoded = normalizeForm(encoded >> 11)
      result.push(encounter(
        encoded & 0x3ff,
        decoded.form,
        location,
        `${location}-${locationId}-${method}`,
        area[offset + 2],
        area[offset + 3],
        method,
        decoded.condition ? [decoded.condition] : [],
      ))
    }
    return result
  })
}

function parsePaldea(buffer, locationNames) {
  return unpack(buffer).flatMap((area) => {
    const locationId = area[2] || area[0]
    if (locationId >= 132) return []
    const location = locationNames[locationId] || `paldea-location-${locationId}`
    const result = []
    for (let offset = 4; offset + 7 < area.length; offset += 8) {
      const species = area.readUInt16LE(offset)
      const decoded = normalizeForm(area[offset + 2], 9)
      const min = area[offset + 4]
      const max = area[offset + 5]
      const blockedTimes = area[offset + 6]
      const weather = area[offset + 7]
      const conditions = weather9.filter(([flag]) => (weather & flag) !== 0).map(([, label]) => label)
      const times = ['time-day', 'time-night', 'time-evening', 'time-morning']
        .filter((_, index) => (blockedTimes & (1 << index)) === 0)
      if (times.length < 4) conditions.push(...times)
      if (decoded.condition) conditions.push(decoded.condition)
      result.push(encounter(species, decoded.form, location, `${location}-${locationId}`, min, max, 'overworld', conditions))
    }
    return result
  })
}

function deduplicate(rows) {
  const byKey = new Map()
  for (const row of rows) {
    if (row.species === 0) continue
    const key = [row.species, row.form, row.location, row.area, row.method, row.conditions.join('|')].join(':')
    const prior = byKey.get(key)
    if (prior) {
      prior.minLevel = Math.min(prior.minLevel, row.minLevel)
      prior.maxLevel = Math.max(prior.maxLevel, row.maxLevel)
    } else {
      byKey.set(key, { ...row })
    }
  }
  return [...byKey.values()].sort((a, b) =>
    a.species - b.species
    || a.location.localeCompare(b.location)
    || a.method.localeCompare(b.method)
    || a.minLevel - b.minLevel,
  )
}

const [gen6Names, gen7Names, gen7TransferNames, galarNames, sinnohNames, paldeaNames, nestSource] = await Promise.all([
  fetchText('text/locations/gen6/text_xy_00000_en.txt').then(names),
  fetchText('text/locations/gen7/text_sm_00000_en.txt').then(names),
  fetchText('text/locations/gen7/text_sm_30000_en.txt').then(names),
  fetchText('text/locations/gen8/text_swsh_00000_en.txt').then(names),
  fetchText('text/locations/gen8b/text_bdsp_00000_en.txt').then(names),
  fetchText('text/locations/gen9/text_sv_00000_en.txt').then(names),
  fetchCode('Legality/Encounters/Data/Gen8/Encounters8Nest.cs'),
])
const nestLocations = parseNestLocations(nestSource)
const inaccessibleNests = parseInaccessibleNests(nestSource)

const rowsByGame = {}
for (const game of ['x', 'y', 'omega-ruby', 'alpha-sapphire']) {
  const [wild] = await Promise.all(sources[game].map(fetchBytes))
  rowsByGame[game] = deduplicate(parseGen6(wild, gen6Names))
}
for (const game of ['sun', 'moon', 'ultra-sun', 'ultra-moon']) {
  const [wild] = await Promise.all(sources[game].map(fetchBytes))
  rowsByGame[game] = deduplicate(parseGen7(wild, gen7Names, gen7TransferNames))
}
for (const game of ['sword', 'shield']) {
  const [hidden, symbol, raids] = await Promise.all(sources[game].map(fetchBytes))
  rowsByGame[game] = deduplicate([
    ...parseSwsh(hidden, galarNames, false),
    ...parseSwsh(symbol, galarNames, true),
    ...parseSwshRaids(raids, galarNames, nestLocations, inaccessibleNests),
  ])
}
for (const game of ['brilliant-diamond', 'shining-pearl']) {
  const buffers = await Promise.all(sources[game].map(fetchBytes))
  rowsByGame[game] = deduplicate(buffers.flatMap((buffer) => parseBdsp(buffer, sinnohNames)))
}

const paldeaRows = parsePaldea(await fetchBytes(sources.paldea[0]), paldeaNames)
for (const game of ['scarlet', 'violet']) {
  rowsByGame[game] = deduplicate(paldeaRows.filter((row) => {
    const versions = paldeaFormExclusive[`${row.species}:${row.form}`] ?? paldeaVersionExclusive[row.species]
    return !versions || versions.includes(game)
  }))
}

for (const entry of staticAcquisitions) {
  rowsByGame[entry.game].push(encounter(
    entry.species,
    entry.form ?? 0,
    entry.location,
    entry.area,
    entry.minLevel,
    entry.maxLevel,
    entry.method,
    entry.conditions,
  ))
}
for (const gameId of Object.keys(rowsByGame)) rowsByGame[gameId] = deduplicate(rowsByGame[gameId])

await mkdir(new URL('../src/generated/', import.meta.url), { recursive: true })
await writeFile(
  new URL('../src/generated/modern-encounters.json', import.meta.url),
  `${JSON.stringify({
    provenance: {
      source: 'PKHeX encounter resources',
      repository: 'https://github.com/kwsch/PKHeX',
      revision: pkhexRevision,
      license: 'GPL-3.0',
      files: [...new Set(inputFiles)].sort(),
      notes: [
        'X/Y and Omega Ruby/Alpha Sapphire slots preserve form and level ranges from separate version resources; PKHeX Standard slots are excluded because they do not distinguish grass, cave, surf and fishing methods.',
        'Sun/Moon and Ultra Sun/Ultra Moon preserve separate version resources, forms, level ranges and SOS identity; ordinary Gen 7 slots are labeled wild-unspecified because the resource does not encode grass, cave, surf or fishing as distinct methods.',
        'Gen 7 code-defined static, gift, fossil, in-game trade, Island Scan/QR and Ultra Space tables are not included until their story prerequisites can be normalized without inference.',
        'Sword/Shield weather, method and level ranges are decoded from separate version resources.',
        'Sword/Shield base-game raid dens preserve den subarea, star rank, badge gate and level range.',
        'Sword/Shield base-game starters, fossils, Toxel, Type: Null and story legendaries are transcribed from the pinned PKHeX static table.',
        'BDSP overworld level ranges are decoded from separate version resources.',
        'BDSP grass pools, Grand Underground, Trophy Garden and Great Marsh rows are excluded because the pinned encounter resource does not distinguish story, swarm, Poké Radar and National Pokédex gates.',
        'Scarlet/Violet base-Paldea wild slots are decoded from the shared resource and filtered by reviewed version exclusives.',
        'Concrete species forms are preserved exactly; PKHeX dynamic form sentinels are normalized to base form with explicit form-region-dependent or form-random conditions.',
        'Snapshot keys are stable planner game IDs, not PokéAPI or PKHeX numeric version identifiers.',
        'DLC areas are excluded from base-game credits timing.',
      ],
    },
    games: rowsByGame,
  })}\n`,
)

console.log(Object.entries(rowsByGame).map(([game, rows]) => `${game}:${rows.length}`).join(' '))
