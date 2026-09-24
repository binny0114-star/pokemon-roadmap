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
  'brilliant-diamond': [
    'legality/wild/Gen8/encounter_bd.pkl',
    'legality/wild/Gen8/encounter_bd_underground.pkl',
  ],
  'shining-pearl': [
    'legality/wild/Gen8/encounter_sp.pkl',
    'legality/wild/Gen8/encounter_sp_underground.pkl',
  ],
  paldea: ['legality/wild/Gen9/encounter_wild_paldea.pkl'],
}
const inputFiles = [
  ...Object.values(sources).flat(),
  'legality/wild/Gen8/encounter_swsh_underground.pkl',
  'text/locations/gen6/text_xy_00000_en.txt',
  'text/locations/gen7/text_sm_00000_en.txt',
  'text/locations/gen7/text_sm_30000_en.txt',
  'text/locations/gen8/text_swsh_00000_en.txt',
  'text/locations/gen8b/text_bdsp_00000_en.txt',
  'text/locations/gen9/text_sv_00000_en.txt',
  'Legality/Encounters/Data/Gen6/Encounters6XY.cs',
  'Legality/Encounters/Data/Gen6/Encounters6AO.cs',
  'Legality/Encounters/Templates/Gen6/EncounterArea6XY.cs',
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
    ['brilliant-diamond', 387], ['brilliant-diamond', 390], ['brilliant-diamond', 393],
    ['shining-pearl', 387], ['shining-pearl', 390], ['shining-pearl', 393],
  ].map(([game, species]) => ({ game, species, location: 'lake-verity', area: 'starter-gift', method: 'gift', minLevel: 5, maxLevel: 5, conditions: ['mutually-exclusive-starter'] })),
  { game: 'brilliant-diamond', species: 483, location: 'spear-pillar', area: 'story-static', method: 'static', minLevel: 47, maxLevel: 47, conditions: ['story-climax'] },
  { game: 'shining-pearl', species: 484, location: 'spear-pillar', area: 'story-static', method: 'static', minLevel: 47, maxLevel: 47, conditions: ['story-climax'] },
  ...[
    [133, 'hearthome-city', 5, ['postgame', 'national-dex']],
    [440, 'hearthome-city', 1, ['gift-egg']],
    [447, 'iron-island', 1, ['gift-egg']],
    [425, 'valley-windworks', 22, ['friday-only']],
    [442, 'route-209', 25, ['odd-keystone', 'underground-npc-count-32']],
    [479, 'old-chateau', 15, ['postgame', 'national-dex', 'night-only']],
    [481, 'lake-verity', 50, ['story-climax-complete', 'roaming']],
    [488, 'fullmoon-island', 50, ['postgame', 'roaming']],
    [480, 'lake-acuity', 50, ['story-climax-complete']],
    [482, 'lake-valor', 50, ['story-climax-complete']],
    [485, 'stark-mountain', 70, ['postgame', 'stark-mountain-quest']],
    [486, 'snowpoint-temple', 70, ['postgame', 'regi-party-required']],
    [487, 'turnback-cave', 70, ['postgame']],
    [377, 'ramanas-park', 70, ['postgame', 'national-dex', 'discovery-slate']],
    [378, 'ramanas-park', 70, ['postgame', 'national-dex', 'discovery-slate']],
    [379, 'ramanas-park', 70, ['postgame', 'national-dex', 'discovery-slate']],
    [380, 'ramanas-park', 70, ['postgame', 'national-dex', 'soul-slate']],
    [381, 'ramanas-park', 70, ['postgame', 'national-dex', 'soul-slate']],
    [150, 'ramanas-park', 70, ['postgame', 'national-dex', 'genome-slate']],
    [382, 'ramanas-park', 70, ['postgame', 'national-dex', 'oceanic-slate']],
    [383, 'ramanas-park', 70, ['postgame', 'national-dex', 'tectonic-slate']],
    [384, 'ramanas-park', 70, ['postgame', 'national-dex', 'stratospheric-slate']],
  ].flatMap(([species, location, level, conditions]) =>
    ['brilliant-diamond', 'shining-pearl'].map((game) => ({
      game, species, location, area: 'static-or-gift', method: 'static',
      minLevel: level, maxLevel: level, conditions,
    }))),
  ...[
    [151, 1, ['lets-go-save-data']],
    [385, 5, ['sword-shield-save-data']],
  ].flatMap(([species, level, conditions]) =>
    ['brilliant-diamond', 'shining-pearl'].map((game) => ({
      game, species, location: 'floaroma-town', area: 'save-data-gift', method: 'gift',
      minLevel: level, maxLevel: level, conditions,
    }))),
  ...[
    [138, ['postgame', 'national-dex', 'fossil-mining']],
    [140, ['postgame', 'national-dex', 'fossil-mining']],
    [142, ['postgame', 'national-dex', 'fossil-mining']],
    [345, ['postgame', 'national-dex', 'fossil-mining']],
    [347, ['postgame', 'national-dex', 'fossil-mining']],
  ].flatMap(([species, conditions]) =>
    ['brilliant-diamond', 'shining-pearl'].map((game) => ({
      game, species, location: 'oreburgh-mining-museum', area: 'fossil-restoration', method: 'fossil',
      minLevel: 1, maxLevel: 1, conditions,
    }))),
  { game: 'brilliant-diamond', species: 408, location: 'oreburgh-mining-museum', area: 'fossil-restoration', method: 'fossil', minLevel: 1, maxLevel: 1, conditions: ['skull-fossil', 'grand-underground', 'explorer-kit'] },
  { game: 'shining-pearl', species: 410, location: 'oreburgh-mining-museum', area: 'fossil-restoration', method: 'fossil', minLevel: 1, maxLevel: 1, conditions: ['armor-fossil', 'grand-underground', 'explorer-kit'] },
  ...[
    [63, 'oreburgh-city', 9, 'machop-required'],
    [441, 'eterna-city', 15, 'buizel-required'],
    [93, 'snowpoint-city', 33, 'medicham-required-everstone'],
    [129, 'route-226', 45, 'finneon-required'],
  ].flatMap(([species, location, level, condition]) =>
    ['brilliant-diamond', 'shining-pearl'].map((game) => ({
      game, species, location, area: 'in-game-trade', method: 'trade',
      minLevel: level, maxLevel: level, conditions: [condition],
    }))),
  { game: 'brilliant-diamond', species: 243, location: 'ramanas-park', area: 'version-static', method: 'static', minLevel: 70, maxLevel: 70, conditions: ['postgame', 'national-dex', 'johto-slate'] },
  { game: 'brilliant-diamond', species: 244, location: 'ramanas-park', area: 'version-static', method: 'static', minLevel: 70, maxLevel: 70, conditions: ['postgame', 'national-dex', 'johto-slate'] },
  { game: 'brilliant-diamond', species: 245, location: 'ramanas-park', area: 'version-static', method: 'static', minLevel: 70, maxLevel: 70, conditions: ['postgame', 'national-dex', 'johto-slate'] },
  { game: 'brilliant-diamond', species: 250, location: 'ramanas-park', area: 'version-static', method: 'static', minLevel: 70, maxLevel: 70, conditions: ['postgame', 'national-dex', 'rainbow-slate'] },
  { game: 'shining-pearl', species: 144, location: 'ramanas-park', area: 'version-static', method: 'static', minLevel: 70, maxLevel: 70, conditions: ['postgame', 'national-dex', 'kanto-slate'] },
  { game: 'shining-pearl', species: 145, location: 'ramanas-park', area: 'version-static', method: 'static', minLevel: 70, maxLevel: 70, conditions: ['postgame', 'national-dex', 'kanto-slate'] },
  { game: 'shining-pearl', species: 146, location: 'ramanas-park', area: 'version-static', method: 'static', minLevel: 70, maxLevel: 70, conditions: ['postgame', 'national-dex', 'kanto-slate'] },
  { game: 'shining-pearl', species: 249, location: 'ramanas-park', area: 'version-static', method: 'static', minLevel: 70, maxLevel: 70, conditions: ['postgame', 'national-dex', 'squall-slate'] },
  ...['brilliant-diamond', 'shining-pearl'].map((game) => ({
    game, species: 493, location: 'hall-of-origin', area: 'save-data-static', method: 'static',
    minLevel: 80, maxLevel: 80, conditions: ['postgame', 'national-dex', 'legends-arceus-all-main-missions'],
  })),
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

function encounter(species, form, location, area, minLevel, maxLevel, method, conditions = [], slot = null) {
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
    slot,
    conditions: [...new Set(conditions)].sort(),
  }
}

function normalizeForm(form, generation = 8) {
  if (generation === 9 && form === 30) return { form: 18, condition: null }
  if (form === 30) return { form: 0, condition: 'form-region-dependent' }
  if (form === 31) return { form: 0, condition: 'form-random' }
  return { form, condition: null }
}

function sourceArray(source, name) {
  const body = new RegExp(`${name}\\s*=\\s*\\[([\\s\\S]*?)\\n\\s*\\];`).exec(source)?.[1]
  if (!body) throw new Error(`Missing PKHeX source array: ${name}`)
  return body
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
}

function parseStaticSourceArray(source, name, game) {
  return [...sourceArray(source, name).matchAll(/new\([^)]*\)\s*\{([^}]*)\}/g)].map((match) => {
    const properties = match[1]
    const number = (property, fallback = 0) => {
      const value = new RegExp(`${property}\\s*=\\s*0*(\\d+)`).exec(properties)?.[1]
      return value ? Number.parseInt(value, 10) : fallback
    }
    const species = number('Species')
    const level = number('Level')
    const locationId = number('Location')
    if (!species || !level) throw new Error(`Incomplete PKHeX Gen 6 static row: ${name}/${match[0]}`)
    return {
      game,
      species,
      form: number('Form'),
      level,
      locationId,
      properties,
    }
  })
}

function gen6StaticEncounter(row, locationNames, method, conditions = []) {
  const location = locationNames[row.locationId] || `gen6-location-${row.locationId}`
  return encounter(
    row.species,
    row.form,
    location,
    `${slug(location)}-pkhex-static-${row.species}-${row.form}`,
    row.level,
    row.level,
    method,
    conditions,
  )
}

function parseFriendSafari(source) {
  const speciesBody = /AllFriendSafariSpecies\s*=>\s*\[([\s\S]*?)\];/.exec(source)?.[1]
  if (!speciesBody) throw new Error('Missing PKHeX Friend Safari species table.')
  const species = [...speciesBody.matchAll(/\b0*(\d{1,3})\b/g)].map((match) => Number.parseInt(match[1], 10))
  const rows = species.map((dex, slot) =>
    encounter(dex, 0, 'Friend Safari', 'friend-safari', 30, 30, 'friend-safari', ['postgame', 'friend-code-dependent'], slot))
  rows.push(
    encounter(670, 0, 'Friend Safari', 'friend-safari', 30, 30, 'friend-safari', ['postgame', 'friend-code-dependent'], species.length),
    encounter(670, 1, 'Friend Safari', 'friend-safari', 30, 30, 'friend-safari', ['postgame', 'friend-code-dependent'], species.length + 1),
    encounter(670, 3, 'Friend Safari', 'friend-safari', 30, 30, 'friend-safari', ['postgame', 'friend-code-dependent'], species.length + 2),
    encounter(666, 0, 'Friend Safari', 'friend-safari', 30, 30, 'friend-safari', ['postgame', 'friend-code-dependent', 'form-region-dependent'], species.length + 3),
  )
  return rows
}

const xyFossils = new Set([138, 140, 142, 345, 347, 408, 410, 564, 566, 696, 698])
const xyGifts = new Set([1, 4, 7, 131, 448, 650, 653, 656])

function xyStaticConditions(species) {
  if ([650, 653, 656].includes(species)) return ['choice-group-kalos-starter']
  if ([1, 4, 7].includes(species)) return ['choice-group-kanto-starter']
  if ([696, 698].includes(species)) return ['choice-group-kalos-fossil']
  if (xyFossils.has(species)) {
    if (species === 142) return ['rock-smash']
    return [138, 140, 345, 347].includes(species)
      ? ['postgame', 'version-exclusive-fossil']
      : ['postgame']
  }
  if (species === 144) return ['postgame', 'starter-chespin', 'roaming-found-11-times']
  if (species === 145) return ['postgame', 'starter-fennekin', 'roaming-found-11-times']
  if (species === 146) return ['postgame', 'starter-froakie', 'roaming-found-11-times']
  if ([150, 718].includes(species)) return ['postgame']
  if ([354, 479, 568, 569].includes(species)) return ['calendar-trash-can']
  return []
}

function parseXySpecialEncounters(source, areaSource, locationNames) {
  const common = parseStaticSourceArray(source, 'Encounter_XY', 'xy')
  const xOnly = parseStaticSourceArray(source, 'StaticX', 'x')
  const yOnly = parseStaticSourceArray(source, 'StaticY', 'y')
  const normalizedCommon = common.map((row) => {
    const method = xyFossils.has(row.species) ? 'fossil' : xyGifts.has(row.species) ? 'gift' : 'static'
    return gen6StaticEncounter(row, locationNames, method, xyStaticConditions(row.species))
  })
  const trades = [
    { species: 129, location: 'Random Kalos Hotel', level: 5, conditions: ['trade-for-gyarados', 'daily-roaming-trader'] },
    { species: 133, location: 'Random Kalos Hotel', level: 5, conditions: ['trade-any', 'daily-roaming-trader'] },
    { species: 83, location: 'Santalune City', level: 10, conditions: ['trade-for-bunnelby'] },
    { species: 208, location: 'Cyllage City', level: 20, conditions: ['trade-for-luvdisc'] },
    { species: 625, location: 'Snowbelle City', level: 50, conditions: ['trade-for-jigglypuff'] },
    { species: 656, location: 'Vaniville Town', level: 5, conditions: ['postgame', 'trade-any', 'starter-chespin'] },
    { species: 650, location: 'Vaniville Town', level: 5, conditions: ['postgame', 'trade-any', 'starter-fennekin'] },
    { species: 653, location: 'Vaniville Town', level: 5, conditions: ['postgame', 'trade-any', 'starter-froakie'] },
    { species: 280, location: 'Lumiose City', level: 5, conditions: ['postgame', 'trade-any'] },
  ].map((row) => encounter(
    row.species,
    0,
    row.location,
    `${slug(row.location)}-pkhex-trade`,
    row.level,
    row.level,
    'npc-trade',
    row.conditions,
  ))
  return {
    shared: [
      ...normalizedCommon.filter((row) => ![138, 140, 345, 347].includes(row.species)),
      ...trades,
      ...parseFriendSafari(areaSource),
    ],
    x: [
      ...normalizedCommon.filter((row) => [345, 347].includes(row.species)),
      ...xOnly.map((row) => gen6StaticEncounter(row, locationNames, 'static')),
    ],
    y: [
      ...normalizedCommon.filter((row) => [138, 140].includes(row.species)),
      ...yOnly.map((row) => gen6StaticEncounter(row, locationNames, 'static')),
    ],
  }
}

const orasFossils = xyFossils
const orasGifts = new Set([152, 155, 158, 175, 252, 255, 258, 296, 300, 319, 323, 351, 360, 374, 387, 390, 393, 495, 498, 501])

function orasStaticConditions(row) {
  if ([252, 255, 258].includes(row.species)) return ['choice-group-hoenn-starter']
  if (row.species === 175) return ['story-progress-primal-defeated']
  if (row.species === 374) return ['postgame', 'delta-episode-complete']
  if ([152, 155, 158].includes(row.species)) return ['postgame', 'choice-group-johto-starter']
  if ([387, 390, 393].includes(row.species)) return ['postgame', 'choice-group-sinnoh-starter']
  if ([495, 498, 501].includes(row.species)) return ['postgame', 'choice-group-unova-starter']
  if ([345, 347].includes(row.species)) return ['choice-group-hoenn-fossil', 'story-progress-go-goggles']
  if (orasFossils.has(row.species)) {
    return [
      'mirage-cave',
      'rock-smash',
      'soaring',
      'story-progress-primal-defeated',
      ...([138, 140, 408, 410, 564, 566].includes(row.species) ? ['version-exclusive-fossil'] : []),
    ]
  }
  if ([384, 386].includes(row.species)) return ['postgame', 'delta-episode']
  // 데봉스코프 켈리몬: 레슨마을은 원시 그란돈·가이오가 이후, 이끼시티는 델타 에피소드 중에만 나옵니다.
  if (row.species === 352 && row.locationId === 176) return ['devon-scope', 'story-progress-primal-defeated']
  if (row.species === 352) return ['devon-scope', 'postgame', 'delta-episode']
  // 해상보라 화강돌은 입수 조건을 확인하지 못했습니다.
  if (row.species === 442) return ['special-prerequisite-unresolved']
  if ([382, 383].includes(row.species)) return []
  // 하늘을 나는 중 만나는 고정 심볼은 원시회귀 뒤 무한의 피리를 받아야 합니다.
  if (row.locationId === 348 && ![249, 250, 380, 381, 483, 484, 487, 641, 642, 645].includes(row.species)) {
    return ['soaring', 'story-progress-primal-defeated']
  }
  if ([243, 244, 245, 249, 250, 377, 378, 379, 380, 381, 480, 481, 482, 483, 484, 485, 486, 487, 488, 638, 639, 640, 641, 642, 643, 644, 645, 646].includes(row.species)) {
    return ['special-prerequisite-unresolved']
  }
  return []
}

function parseOrasSpecialEncounters(source, locationNames) {
  const common = parseStaticSourceArray(source, 'Encounter_AO_Regular', 'oras')
  const alpha = parseStaticSourceArray(source, 'StaticA', 'alpha-sapphire')
  const omega = parseStaticSourceArray(source, 'StaticO', 'omega-ruby')
  const normalize = (row) => {
    const method = orasFossils.has(row.species)
      ? 'fossil'
      : row.species === 175 || row.species === 360
        ? 'egg'
        : orasGifts.has(row.species)
          ? 'gift'
          : 'static'
    if (method === 'egg') {
      return encounter(
        row.species,
        row.form,
        'Lavaridge Town',
        `lavaridge-town-pkhex-egg-${row.species}`,
        row.level,
        row.level,
        method,
        orasStaticConditions(row),
      )
    }
    return gen6StaticEncounter(row, locationNames, method, orasStaticConditions(row))
  }
  const normalizedCommon = common.map(normalize)
  const normalizeVersionStatic = (row) => {
    const isEonPokemon = row.species === 380 || row.species === 381
    const isGift = isEonPokemon && /\bFixedBall\s*=/.test(row.properties)
    const conditions = isGift
      ? ['story-progress-eon-gift']
      : isEonPokemon
        ? ['event-item-eon-ticket']
        : orasStaticConditions(row)
    return gen6StaticEncounter(row, locationNames, isGift ? 'gift' : 'static', conditions)
  }
  const cosplay = Array.from({ length: 6 }, (_, form) =>
    encounter(25, form + 1, 'Slateport City', `slateport-city-cosplay-pikachu-${form + 1}`, 20, 20, 'gift', ['choice-group-cosplay-pikachu']))
  const trades = [
    { species: 296, location: 'Rustboro City', level: 9, conditions: ['trade-for-slakoth'] },
    { species: 300, location: 'Fortree City', level: 30, conditions: ['trade-for-spinda'] },
    { species: 222, location: 'Pacifidlog Town', level: 50, conditions: ['trade-for-bellossom'] },
  ].map((row) => encounter(
    row.species,
    0,
    row.location,
    `${slug(row.location)}-pkhex-trade`,
    row.level,
    row.level,
    'npc-trade',
    row.conditions,
  ))
  return {
    shared: [
      ...normalizedCommon.filter((row) => ![138, 140, 408, 410, 564, 566, 696, 698].includes(row.species)),
      ...cosplay,
      ...trades,
    ],
    omega: [
      ...normalizedCommon.filter((row) => [140, 410, 566].includes(row.species)),
      ...omega.map(normalizeVersionStatic),
    ],
    alpha: [
      ...normalizedCommon.filter((row) => [138, 408, 564].includes(row.species)),
      ...alpha.map(normalizeVersionStatic),
    ],
  }
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
      const conditions = [
        ...swshContentConditions(area[0]),
        ...weather8.filter(([flag]) => (flags & flag) !== 0).map(([, label]) => label),
      ]
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
  const body = /GetNestLocations\(byte nestIndex\) => nestIndex switch\s*\{([\s\S]*?)\n\s*_ =>/.exec(source)?.[1] ?? ''
  const pattern = /^\s*(\d+)\s*=>\s*\[([^\]]*)\]/gm
  for (const match of body.matchAll(pattern)) {
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
    const minRank = buffer[offset + 7]
    const maxRank = buffer[offset + 8]
    const locations = nestLocations.get(nest) ?? []
    for (const locationId of locations) {
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
        [
          ...swshContentConditions(locationId),
          'max-raid',
          `badge-count-${requiredBadges[minRank]}`,
          `raid-stars-${minRank + 1}-${maxRank + 1}`,
          ...(buffer[offset + 5] !== 0 ? ['gigantamax-capable'] : []),
          ...accessConditions,
          ...(decoded.condition ? [decoded.condition] : []),
        ],
      ))
    }
  }
  return result
}

const swshGiftKeys = new Set([
  '6:810:0', '6:813:0', '6:816:0', '158:772:0', '40:848:0', '6:4:0',
  '156:25:0', '156:133:0',
  '196:1:0', '196:7:0', '196:137:0', '196:891:0',
  '164:79:0', '164:722:0', '164:725:0', '164:728:0', '164:26:1',
  '164:27:1', '164:37:1', '164:52:1', '164:103:1', '164:105:1', '164:50:1',
  '206:789:0', '244:803:0',
])

const swshWeatherProperties = [
  ['Heavy_Fog', 'weather-heavy-fog'],
  ['Thunderstorm', 'weather-thunderstorm'],
  ['Stormy', 'weather-rain'],
  ['Raining', 'weather-rain'],
  ['Intense_Sun', 'weather-intense-sun'],
  ['Snowstorm', 'weather-snowstorm'],
  ['Snowing', 'weather-snow'],
  ['Sandstorm', 'weather-sandstorm'],
  ['Overcast', 'weather-overcast'],
  ['Icy', 'weather-snow'],
  ['Normal', 'weather-normal'],
]
const isleDiglettGiftCounts = new Map([
  ['52:1', 5], ['79:0', 10], ['37:1', 20], ['27:1', 30], ['26:1', 40],
  ['105:1', 50], ['103:1', 75], ['722:0', 100], ['725:0', 100], ['728:0', 100],
  ['50:1', 150],
])

function swshContentConditions(locationId) {
  if (locationId >= 164 && locationId <= 202) return ['isle-of-armor', 'content-update-1.2.0', 'dlc-milestone-isle-access']
  if (locationId >= 204 && locationId <= 246) return ['crown-tundra', 'content-update-1.3.0', 'dlc-milestone-crown-access']
  return ['base-game', 'launch-version-1.0.0']
}

function swshStaticConditions(species, form, locationId, location, properties, method) {
  const galarianLegendaryBird = [144, 145, 146].includes(species) && form === 1
  const result = galarianLegendaryBird
    ? ['crown-tundra', 'content-update-1.3.0', 'dlc-milestone-crown-legendary-clues']
    : species === 79 && form === 1 && location === 'wedgehurst-station'
    ? ['wedgehurst-station-preview', 'content-update-1.1.0', 'no-paid-dlc-required']
    : swshContentConditions(locationId)
  if ([810, 813, 816].includes(species)) result.push('choice-group-galar-starter')
  const fossilParts = {
    880: 'bird-and-drake',
    881: 'bird-and-dino',
    882: 'fish-and-drake',
    883: 'fish-and-dino',
  }
  if (fossilParts[species]) {
    result.push('fossil-restoration', `fossil-pair-${fossilParts[species]}`, 'resource-consumption-two-fossils')
  }
  if ([25, 133].includes(species) && locationId === 156) result.push('compatible-save-data-gift')
  if ([1, 7].includes(species) && locationId === 196) {
    result.push('choice-group-dojo-starter', 'dojo-first-trial-complete', 'dlc-milestone-isle-first-trial')
  }
  const diglettGiftCount = location === 'fields-of-honor' && method === 'gift'
    ? isleDiglettGiftCounts.get(`${species}:${form}`)
    : undefined
  if (diglettGiftCount) {
    result.push(`isle-diglett-found-${diglettGiftCount}`)
    if (diglettGiftCount === 100) {
      result.push('reward-matches-galar-starter', 'choice-group-galar-starter-reward')
      if (species === 722) result.push('requires-galar-starter-810')
      if (species === 725) result.push('requires-galar-starter-813')
      if (species === 728) result.push('requires-galar-starter-816')
    }
  }
  if ([896, 897].includes(species) && locationId === 220) {
    result.push('choice-group-calyrex-steed', 'dlc-milestone-crown-calyrex-complete')
  }
  if (species === 891 && method === 'gift' && locationId >= 164 && locationId <= 202) {
    result.push('dojo-trials-complete', 'dlc-milestone-isle-trials-complete')
  }
  if (species === 137 && method === 'gift' && locationId >= 164 && locationId <= 202) {
    result.push('dojo-story-complete', 'dlc-milestone-isle-story-complete')
  }
  if ([894, 895].includes(species)) result.push('choice-group-regi-ruins', 'dlc-milestone-crown-legendary-clues')
  if ([638, 639, 640].includes(species)) result.push('crown-tundra-footprints-100-percent', 'dlc-milestone-crown-legendary-clues')
  if (galarianLegendaryBird) result.push('dyna-tree-roaming-quest', 'dlc-milestone-crown-legendary-clues')
  if (species === 442 && locationId >= 204) result.push('talk-to-32-unique-online-players')
  if (species === 486 && locationId >= 204) result.push('all-five-regis-in-party', 'opposite-regi-trade-required', 'dlc-milestone-crown-legendary-clues')
  if (species === 647 && locationId >= 204) result.push('swords-of-justice-complete', 'cook-curry-with-trio', 'dlc-milestone-crown-legendary-clues')
  if (species === 789 && locationId >= 204) result.push('calyrex-quest-complete', 'dlc-milestone-crown-calyrex-complete', 'postgame')
  if (species === 803 && method === 'gift') result.push('catch-five-ultra-beasts', 'dlc-milestone-crown-ultra-beasts', 'postgame')
  if ([772, 4].includes(species) && method === 'gift') result.push('postgame')
  if ([888, 889].includes(species)) result.push('postgame')
  if (/\bCanGigantamax\s*=\s*true\b/.test(properties)) result.push('gigantamax-capable')
  if (species === 888) result.push('battle-form-rusted-sword')
  if (species === 889) result.push('battle-form-rusted-shield')
  if (species === 892) result.push('gigantamax-form-max-soup')
  if (species === 898) result.push('fusion-form-reins-of-unity', 'steed-choice', 'dlc-milestone-crown-calyrex-complete', 'postgame')
  for (const [property, condition] of swshWeatherProperties) {
    if (new RegExp(`\\b${property}\\b`).test(properties)) result.push(condition)
  }
  return [...new Set(result)]
}

function parseSwshStaticSourceArray(source, name, games, locationNames) {
  const rows = [...sourceArray(source, name).matchAll(/new\([^)]*\)\s*\{([^}]*)\}/g)].map((match) => {
    const properties = match[1]
    const number = (property, fallback = 0) => {
      const value = new RegExp(`${property}\\s*=\\s*0*(\\d+)`).exec(properties)?.[1]
      return value ? Number.parseInt(value, 10) : fallback
    }
    return {
      species: number('Species'),
      form: number('Form'),
      level: number('Level'),
      locationId: number('Location'),
      crossoverLocationIds: /Crossover\s*=\s*new\(([^)]*)\)/.exec(properties)?.[1]
        .split(',')
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter(Number.isFinite) ?? [],
      properties,
    }
  }).filter((row) => row.species && row.level && row.locationId)

  return games.flatMap((game) => rows.flatMap((row) => [row.locationId, ...row.crossoverLocationIds].map((locationId) => {
    const location = locationNames[locationId] || `galar-location-${locationId}`
    const key = `${row.locationId}:${row.species}:${row.form}`
    const method = [880, 881, 882, 883].includes(row.species)
      ? 'fossil'
      : swshGiftKeys.has(key)
        ? 'gift'
        : 'static'
    return {
      game,
      row: encounter(
        row.species,
        row.form,
        location,
        `${slug(location)}-pkhex-${method}-${row.species}-${row.form}`,
        row.level,
        row.level,
        method,
        swshStaticConditions(row.species, row.form, locationId, slug(location), row.properties, method),
      ),
    }
  })))
}

const swshTradeLocations = {
  52: 'Turffield',
  819: 'Motostoke',
  546: 'Hulbury',
  175: 'Hammerlocke',
  856: 'Stow-on-Side',
  859: 'Stow-on-Side',
  562: 'Ballonlea',
  538: 'Circhester',
  539: 'Circhester',
  122: 'Spikemuth',
  884: 'Wyndon',
}

const swshRequestedTrades = {
  52: 'meowth-galar',
  819: 'bunnelby',
  546: 'minccino',
  175: 'toxel',
  562: 'yamask-galar',
  122: 'obstagoon',
  884: 'frosmoth',
  856: 'maractus',
  859: 'maractus',
  538: 'vanillish',
  539: 'vanillish',
}

function parseSwshTradeSourceArray(source, name, games) {
  return games.flatMap((game) =>
    [...sourceArray(source, name).matchAll(/new\(([^)]*)\)\s*\{([^}]*)\}/g)].flatMap((match) => {
      const args = match[1].split(',').map((value) => value.trim())
      const sharedConstructor = args[1] === 'SWSH' || args[1] === 'SW' || args[1] === 'SH'
      const speciesIndex = sharedConstructor ? 2 : 3
      const species = Number.parseInt(args[speciesIndex], 10)
      const level = Number.parseInt(args[speciesIndex + 1], 10)
      if (!species || !level) return []
      const form = Number.parseInt(/\bForm\s*=\s*(\d+)/.exec(match[2])?.[1] ?? '0', 10)
      const isDlcTrade = match[1].includes('TradeOT_R1')
      const location = isDlcTrade ? 'Fields of Honor' : swshTradeLocations[species] ?? 'Galar in-game trade'
      const conditions = isDlcTrade
        ? ['isle-of-armor', 'content-update-1.2.0', 'dlc-milestone-isle-access', 'regina-random-location', `requested-species-${species}`]
        : ['base-game', 'launch-version-1.0.0', `requested-species-${swshRequestedTrades[species] ?? 'unresolved'}`]
      return [{
        game,
        row: encounter(
          species,
          form,
          location,
          `${slug(location)}-pkhex-trade-${species}-${form}`,
          level,
          level,
          'npc-trade',
          conditions,
        ),
      }]
    }))
}

const swordDynamaxAdventureExclusives = new Set([250, 381, 383, 483, 641, 643, 716, 791])
const shieldDynamaxAdventureExclusives = new Set([249, 380, 382, 484, 642, 644, 717, 792])
const dynamaxAdventureUltraBeasts = new Set([793, 794, 795, 796, 797, 798, 799, 803, 805, 806])

function parseSwshDynamaxAdventures(buffer, game) {
  const result = []
  for (let offset = 0; offset + 13 < buffer.length; offset += 14) {
    const species = buffer.readUInt16LE(offset)
    const form = buffer[offset + 2]
    const level = buffer[offset + 3]
    const oppositeExclusive = game === 'sword'
      ? shieldDynamaxAdventureExclusives.has(species)
      : swordDynamaxAdventureExclusives.has(species)
    result.push(encounter(
      species,
      form,
      'Max Lair',
      `max-lair-${species}-${form}`,
      level,
      level,
      'dynamax-adventure',
      [
        'crown-tundra',
        'content-update-1.3.0',
        'dlc-milestone-crown-access',
        'rental-team',
        ...(level === 70 ? ['one-catch-per-legendary'] : []),
        ...(dynamaxAdventureUltraBeasts.has(species) ? ['ultra-beast-clue-complete'] : []),
        ...(oppositeExclusive ? ['multiplayer-opposite-version-host'] : ['native-version-path']),
        ...(buffer[offset + 13] !== 0 ? ['gigantamax-capable'] : []),
      ],
    ))
  }
  return result
}

const bdspSwarmSpecies = new Set([
  16, 81, 83, 84, 96, 98, 100, 104, 108, 177, 206, 209, 220, 222,
  225, 231, 238, 263, 283, 287, 296, 299, 300, 309, 325, 327, 359, 374,
])
const bdspRadarSpecies = new Set([
  29, 30, 32, 33, 48, 49, 56, 57, 79, 88, 128, 132, 161, 175, 179,
  180, 187, 188, 191, 202, 228, 234, 235, 236, 246, 262, 276,
  277, 280, 281, 290, 294, 304, 305, 324, 328, 329, 333, 343, 352,
  355, 356, 360, 361, 371,
])
const trophyGardenDailySpecies = new Set([35, 39, 52, 113, 133, 137, 173, 174, 183, 298, 311, 312, 351, 438, 439, 440])
const greatMarshDailySpecies = new Set([46, 54, 102, 115, 193, 285, 316, 451, 453, 455])
const sinnohDexSpecies = new Set([
  25, 26, 35, 36, 41, 42, 54, 55, 63, 64, 65, 66, 67, 68, 72, 73,
  74, 75, 76, 77, 78, 92, 93, 94, 95, 113, 118, 119, 122, 129, 130,
  143, 163, 164, 169, 172, 173, 183, 184, 185, 190, 194, 195, 198,
  200, 201, 203, 208, 214, 215, 223, 224, 226, 242, 265, 266, 267,
  268, 269, 278, 279, 298, 307, 308, 315, 339, 340, 349, 350, 358,
  ...Array.from({ length: 75 }, (_, index) => index + 387),
  480, 481, 482, 483, 484, 490,
])

// Serebii's per-hideaway milestone tables are reference-only chronology evidence.
// PKHeX remains the redistributed species/form/version source.
const bdspUndergroundBeginningSpecies = new Set([
  41, 54, 66, 74, 81, 92, 95, 108, 111, 123, 127, 175, 198, 200, 207, 216,
  220, 229, 238, 239, 240, 265, 266, 268, 280, 315, 333, 355, 359, 361, 362,
  399, 401, 403, 406, 415, 417, 418, 420, 422, 423, 427, 451, 453,
])
const bdspUndergroundStrengthSpecies = new Set([
  42, 77, 163, 307, 339, 400, 433, 434, 435, 436,
])
const bdspUndergroundDefogSpecies = new Set([
  64, 67, 75, 190, 194, 195, 203, 278, 432, 446, 449,
])
const bdspUndergroundIcicleSpecies = new Set([
  72, 73, 122, 215, 279, 404, 431, 443, 459,
])
const bdspUndergroundWaterfallSpecies = new Set([224, 340, 444, 458])
const bdspUndergroundPreNationalSpecies = new Set([
  ...bdspUndergroundBeginningSpecies,
  ...bdspUndergroundStrengthSpecies,
  ...bdspUndergroundDefogSpecies,
  ...bdspUndergroundIcicleSpecies,
  ...bdspUndergroundWaterfallSpecies,
])

function bdspUndergroundMilestoneConditions(species) {
  if (bdspUndergroundBeginningSpecies.has(species)) return []
  if (bdspUndergroundStrengthSpecies.has(species)) return ['strength-obtained']
  if (bdspUndergroundDefogSpecies.has(species)) return ['defog']
  if (bdspUndergroundIcicleSpecies.has(species)) return ['icicle-badge']
  if (bdspUndergroundWaterfallSpecies.has(species)) return ['waterfall']
  return ['national-dex', 'elite-four-defeated']
}

function bdspConditions(species, location, underground, minLevel) {
  if (underground) {
    const progression = minLevel >= 58
      ? ['elite-four-defeated']
      : minLevel >= 50
        ? ['badge-count-8']
        : minLevel >= 42
          ? ['badge-count-7']
          : minLevel >= 39
            ? ['badge-count-6']
            : minLevel >= 36
              ? ['badge-count-5']
              : minLevel >= 33
                ? ['badge-count-4']
                : minLevel >= 29
                  ? ['badge-count-3']
                  : minLevel >= 25
                    ? ['badge-count-2']
                    : ['badge-count-1']
    return [
      'grand-underground',
      'explorer-kit',
      ...progression,
      ...bdspUndergroundMilestoneConditions(species),
    ]
  }
  if (location === 'trophy-garden' && trophyGardenDailySpecies.has(species)) {
    return ['postgame', 'national-dex', 'daily-trophy-garden']
  }
  if (location === 'great-marsh' && greatMarshDailySpecies.has(species)) {
    return [...(!sinnohDexSpecies.has(species) ? ['postgame', 'national-dex'] : []), 'daily-great-marsh-binoculars']
  }
  if (bdspSwarmSpecies.has(species)) return ['postgame', 'national-dex', 'daily-swarm']
  if (bdspRadarSpecies.has(species)) return ['postgame', 'national-dex', 'poke-radar']
  if (!sinnohDexSpecies.has(species)) return ['postgame', 'national-dex']
  return []
}

function parseBdsp(buffer, locationNames, underground) {
  const typeNames = ['unknown', 'grass', 'surf', 'old-rod', 'good-rod', 'super-rod', 'rock-smash', 'unknown', 'honey-tree']
  return unpack(buffer).flatMap((area) => {
    const locationId = area.readUInt16LE(0)
    const sourceLocation = locationNames[locationId] || `sinnoh-location-${locationId}`
    const location = sourceLocation.replace(/^Grand Underground \((.+)\)$/, 'Grand Underground $1')
    const locationIdText = slug(sourceLocation)
    const method = typeNames[area[2]] ?? 'unknown'
    if (method === 'unknown') return []
    const result = []
    for (let offset = 4; offset + 3 < area.length; offset += 4) {
      const encoded = area.readUInt16LE(offset)
      const decoded = normalizeForm(encoded >> 11)
      const species = encoded & 0x3ff
      const minLevel = area[offset + 2]
      if (underground && !bdspUndergroundPreNationalSpecies.has(species) && minLevel < 58) continue
      const feebasTile = !underground && species === 349 && locationIdText === 'mount-coronet'
      const nightExclusive = !underground && (species === 198 || species === 200)
      const encounterMethod = underground
        ? 'grand-underground'
        : feebasTile
          ? 'feebas-tile-fishing'
          : method
      result.push(encounter(
        species,
        decoded.form,
        location,
        underground ? location : `${location}-${locationId}`,
        minLevel,
        area[offset + 3],
        encounterMethod,
        [
          ...bdspConditions(species, locationIdText, underground, minLevel),
          ...(feebasTile ? ['daily-feebas-tiles', 'defog', 'surf', 'strength'] : []),
          ...(nightExclusive ? ['night-only'] : []),
          ...(decoded.condition ? [decoded.condition] : []),
        ],
      ))
    }
    return result
  })
}

// PKHeX keeps the ROM table order (including empty slots) for Standard areas. The table order
// follows pk3DS XYWE/RSWE; the X/Y decode reproduces every PokéAPI X/Y method row exactly.
const gen6StandardLayouts = {
  xy: [
    ['walk', 12], ['yellow-flowers', 12], ['purple-flowers', 12], ['red-flowers', 12],
    ['rough-terrain', 12], ['surf', 5], ['rock-smash', 5], ['old-rod', 3], ['good-rod', 3], ['super-rod', 3],
  ],
  // ORAS areas list Rock Smash separately, so the Standard table omits its five slots.
  oras: [
    ['walk', 12], ['tall-grass', 12], ['dexnav', 3], ['surf', 5],
    ['old-rod', 3], ['good-rod', 3], ['super-rod', 3],
  ],
}

function gen6StandardMethod(layout, slot) {
  let remaining = slot
  for (const [method, count] of layout) {
    if (remaining < count) return method
    remaining -= count
  }
  // X/Y Route 4 and Route 7 append Flabébé flower-color variants after the fixed table.
  return 'flowers'
}

// ORAS 물길 도로의 Standard 풀숲 칸은 다이빙으로 들어가는 해저 해초 조우입니다(초라기·진주몽·시라칸 등).
const orasUnderwaterRoutes = new Set(['Route 107', 'Route 124', 'Route 126', 'Route 128', 'Route 129', 'Route 130'])

function orasAreaConditions(location, areaType, occurrence) {
  // 유성폭포는 첫 Standard·무리 구역만 입구 쪽이고, 나머지는 폭포 위 안쪽 동굴과 아공이 방입니다.
  if (location === 'Meteor Falls' && ['standard', 'horde'].includes(areaType) && occurrence > 0) return ['waterfall']
  if (location.startsWith('Mirage ')) return ['mirage-spot', 'soaring', 'story-progress-primal-defeated']
  return []
}

function parseGen6(buffer, locationNames, layoutId) {
  const layout = gen6StandardLayouts[layoutId]
  const typeNames = ['standard', 'ambush', 'surf', 'old-rod', 'good-rod', 'super-rod', 'rock-smash', 'horde', 'friend-safari']
  const occurrences = new Map()
  return unpack(buffer).flatMap((area, areaIndex) => {
    const locationId = area.readUInt16LE(0)
    const location = locationNames[locationId] || `gen6-location-${locationId}`
    const areaType = typeNames[area[2]] ?? 'unknown'
    const occurrenceKey = `${location}:${areaType}`
    const occurrence = occurrences.get(occurrenceKey) ?? 0
    occurrences.set(occurrenceKey, occurrence + 1)
    const areaConditions = layoutId === 'oras' ? orasAreaConditions(location, areaType, occurrence) : []
    const result = []
    for (let offset = 4; offset + 3 < area.length; offset += 4) {
      const encoded = area.readUInt16LE(offset)
      const species = encoded & 0x3ff
      if (!species) continue
      const decoded = normalizeForm(encoded >> 11)
      const slot = (offset - 4) / 4
      const standardMethod = areaType === 'standard' ? gen6StandardMethod(layout, slot) : areaType
      const method = layoutId === 'oras' && standardMethod === 'walk' && orasUnderwaterRoutes.has(location)
        ? 'seaweed'
        : standardMethod
      // ORAS DexNav-only slots hold non-Hoenn species that appear after the National Pokédex.
      const conditions = [...areaConditions, ...(method === 'dexnav' ? ['postgame', 'national-dex'] : [])]
      if (decoded.condition) conditions.push(decoded.condition)
      result.push(encounter(
        species,
        decoded.form,
        location,
        `${location}-${locationId}-${method}-${areaIndex}`,
        area[offset + 2],
        area[offset + 3],
        method,
        conditions,
        slot,
      ))
    }
    return result
  })
}

function parseGen7(buffer, locationNames, transferLocationNames) {
  const typeNames = ['wild-unspecified', 'sos']
  return unpack(buffer).flatMap((area, areaIndex) => {
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
      const slot = (offset - 4) / 4
      result.push(encounter(
        encoded & 0x3ff,
        decoded.form,
        location,
        `${location}-${locationId}-${method}-${areaIndex}`,
        area[offset + 2],
        area[offset + 3],
        method,
        decoded.condition ? [decoded.condition] : [],
        slot,
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
    const key = [
      row.species,
      row.form,
      row.location,
      row.area,
      row.method,
      row.slot,
      row.minLevel,
      row.maxLevel,
      row.conditions.join('|'),
    ].join(':')
    if (!byKey.has(key)) byKey.set(key, { ...row })
  }
  return [...byKey.values()].sort((a, b) =>
    a.species - b.species
    || a.location.localeCompare(b.location)
    || a.method.localeCompare(b.method)
    || a.minLevel - b.minLevel,
  )
}

const [
  gen6Names,
  gen7Names,
  gen7TransferNames,
  galarNames,
  sinnohNames,
  paldeaNames,
  nestSource,
  xyStaticSource,
  orasStaticSource,
  xyAreaSource,
  swshStaticSource,
] = await Promise.all([
  fetchText('text/locations/gen6/text_xy_00000_en.txt').then(names),
  fetchText('text/locations/gen7/text_sm_00000_en.txt').then(names),
  fetchText('text/locations/gen7/text_sm_30000_en.txt').then(names),
  fetchText('text/locations/gen8/text_swsh_00000_en.txt').then(names),
  fetchText('text/locations/gen8b/text_bdsp_00000_en.txt').then(names),
  fetchText('text/locations/gen9/text_sv_00000_en.txt').then(names),
  fetchCode('Legality/Encounters/Data/Gen8/Encounters8Nest.cs'),
  fetchCode('Legality/Encounters/Data/Gen6/Encounters6XY.cs'),
  fetchCode('Legality/Encounters/Data/Gen6/Encounters6AO.cs'),
  fetchCode('Legality/Encounters/Templates/Gen6/EncounterArea6XY.cs'),
  fetchCode('Legality/Encounters/Data/Gen8/Encounters8.cs'),
])
const nestLocations = parseNestLocations(nestSource)
const inaccessibleNests = parseInaccessibleNests(nestSource)

const rowsByGame = {}
const xySpecial = parseXySpecialEncounters(xyStaticSource, xyAreaSource, gen6Names)
const orasSpecial = parseOrasSpecialEncounters(orasStaticSource, gen6Names)
const swshSpecial = [
  ...parseSwshStaticSourceArray(swshStaticSource, 'StaticSWSH', ['sword', 'shield'], galarNames),
  ...parseSwshStaticSourceArray(swshStaticSource, 'StaticSW', ['sword'], galarNames),
  ...parseSwshStaticSourceArray(swshStaticSource, 'StaticSH', ['shield'], galarNames),
  ...parseSwshTradeSourceArray(swshStaticSource, 'TradeSWSH', ['sword', 'shield']),
  ...parseSwshTradeSourceArray(swshStaticSource, 'TradeSW', ['sword']),
  ...parseSwshTradeSourceArray(swshStaticSource, 'TradeSH', ['shield']),
]
const swshDynamaxAdventures = await fetchBytes('legality/wild/Gen8/encounter_swsh_underground.pkl')
for (const game of ['x', 'y', 'omega-ruby', 'alpha-sapphire']) {
  const [wild] = await Promise.all(sources[game].map(fetchBytes))
  const special = game === 'x'
    ? [...xySpecial.shared, ...xySpecial.x]
    : game === 'y'
      ? [...xySpecial.shared, ...xySpecial.y]
      : game === 'omega-ruby'
        ? [...orasSpecial.shared, ...orasSpecial.omega]
        : [...orasSpecial.shared, ...orasSpecial.alpha]
  rowsByGame[game] = deduplicate([...parseGen6(wild, gen6Names, game === 'x' || game === 'y' ? 'xy' : 'oras'), ...special])
}
for (const game of ['sun', 'moon', 'ultra-sun', 'ultra-moon']) {
  const [wild] = await Promise.all(sources[game].map(fetchBytes))
  rowsByGame[game] = deduplicate(parseGen7(wild, gen7Names, gen7TransferNames))
}
for (const game of ['sword', 'shield']) {
  const [hidden, symbol, raids] = await Promise.all(sources[game].map(fetchBytes))
  const swshRows = [
    ...parseSwsh(hidden, galarNames, false),
    ...parseSwsh(symbol, galarNames, true),
    ...parseSwshRaids(raids, galarNames, nestLocations, inaccessibleNests),
    ...parseSwshDynamaxAdventures(swshDynamaxAdventures, game),
    ...swshSpecial.filter((entry) => entry.game === game).map((entry) => entry.row),
  ]
  rowsByGame[game] = deduplicate(swshRows.flatMap((row) =>
    [592, 593].includes(row.species) && row.form === 0
      ? [row, { ...row, form: 1, area: `${row.area}-female-form` }]
      : [row]))
}
for (const game of ['brilliant-diamond', 'shining-pearl']) {
  const buffers = await Promise.all(sources[game].map(fetchBytes))
  rowsByGame[game] = deduplicate(buffers.flatMap((buffer, index) => parseBdsp(buffer, sinnohNames, index === 1)))
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
      license: 'GPL-3.0-or-later',
      files: [...new Set(inputFiles)].sort(),
      authoredReachability: {
        reviewedAt: '2026-09-12',
        references: [
          {
            url: 'https://bulbapedia.bulbagarden.net/w/index.php?title=Walkthrough:Pok%C3%A9mon_Sword_and_Shield&oldid=4489916',
            revision: '4489916',
            use: 'reference-only story, DLC access and task cross-check',
          },
          {
            url: 'https://bulbapedia.bulbagarden.net/wiki/Dynamax_Adventure',
            reviewedAt: '2026-09-12',
            use: 'reference-only Max Lair catch, rental, version-host and Ultra Beast rules',
          },
          {
            url: 'https://www.serebii.net/swordshield/isleofarmordiglett.shtml',
            reviewedAt: '2026-09-12',
            use: 'reference-only Isle of Armor Diglett reward thresholds',
          },
          {
            url: 'https://bulbapedia.bulbagarden.net/w/index.php?title=Feebas_(Pok%C3%A9mon)&oldid=4628707',
            revision: '4628707',
            use: 'reference-only BDSP Feebas location and Beauty evolution cross-check',
          },
          {
            url: 'https://game8.co/games/Pokemon-Brilliant-Diamond-Shining-Pearl/archives/348122',
            reviewedAt: '2026-09-12',
            use: 'reference-only BDSP any-rod Feebas tiles and traversal cross-check',
          },
          {
            url: 'https://www.serebii.net/pokearth/sinnoh/grandunderground.shtml',
            sha256: '1160d6e16f3067e190a41db5d6270f38c341b87844ca2955933d9026e5643278',
            reviewedAt: '2026-09-12',
            use: 'reference-only per-hideaway Beginning, Strength, Defog, Icicle Badge, Waterfall and National Pokédex species unlock cross-check',
          },
        ],
      },
      notes: [
        'X/Y and Omega Ruby/Alpha Sapphire slots preserve form, source-area, slot and disjoint level ranges from separate version resources; PKHeX Standard slots are retained as wild-unspecified because the resource does not distinguish grass, cave, surf and fishing methods.',
        'X/Y code-defined static, gift, fossil, in-game trade and Friend Safari tables are normalized from the pinned PKHeX source; unresolved fossil origin and calendar or postgame prerequisites remain explicit conditions.',
        'ORAS code-defined static, gift, egg, fossil, in-game trade, Cosplay Pikachu and version-exclusive tables are normalized from the pinned PKHeX source; unresolved Mirage, party, time and event prerequisites remain explicit conditions.',
        'Sun/Moon and Ultra Sun/Ultra Moon preserve separate version resources, forms, level ranges and SOS identity; ordinary Gen 7 slots are labeled wild-unspecified because the resource does not encode grass, cave, surf or fishing as distinct methods.',
        'Gen 7 code-defined static, gift, fossil, in-game trade, Island Scan/QR and Ultra Space tables are not included until their story prerequisites can be normalized without inference.',
        'Sword/Shield weather, method and level ranges are decoded from separate version resources.',
        'Sword/Shield base-game, Isle of Armor and Crown Tundra raid dens preserve den subarea, star rank, badge gate and level range.',
        'Sword/Shield code-defined static, gift, fossil and in-game trade tables are normalized from the pinned PKHeX source with explicit base-game, Isle of Armor 1.2.0 and Crown Tundra 1.3.0 scope.',
        'Sword/Shield Max Lair rows preserve rental-team access, one-catch legendary rules, opposite-version host paths and the post-clue Ultra Beast unlock; temporal distribution dens are intentionally excluded from permanent availability.',
        'Independently authored reachability conditions cover Wedgehurst Slowpoke, Isle of Armor Diglett rewards, Crown Tundra footprints, roaming birds, Spiritomb, Regigigas, Keldeo, Cosmog and Poipole and are cross-checked against the reference-only URLs above.',
        'BDSP overworld and Grand Underground level ranges are decoded from separate version resources; independently authored reachability conditions preserve the exact per-species Explorer Kit, Strength-obtained, Defog, Icicle Badge, Waterfall and National Pokédex milestones cross-checked against the content-hashed Serebii tables, and discard unreachable pre-Elite-Four level bands only for National Pokédex species.',
        'BDSP Feebas retains the pinned PKHeX species, form, location and level range while the special any-rod daily-tile method and Defog, Surf and Strength gates are independently cross-checked against the reference-only URLs above.',
        'Scarlet/Violet base-Paldea wild slots are decoded from the shared resource and filtered by reviewed version exclusives.',
        'Concrete species forms are preserved exactly; PKHeX dynamic form sentinels are normalized to base form with explicit form-region-dependent or form-random conditions.',
        'Snapshot keys are stable planner game IDs, not PokéAPI or PKHeX numeric version identifiers.',
        'DLC rows retain explicit content-update conditions so optional Isle of Armor and Crown Tundra timing is not conflated with the base-game credits path.',
      ],
    },
    games: rowsByGame,
  })}\n`,
)

console.log(Object.entries(rowsByGame).map(([game, rows]) => `${game}:${rows.length}`).join(' '))
