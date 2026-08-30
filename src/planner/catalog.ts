import { games, getFamily } from './games'
import { loadLearnsets } from './learnsets'
import type { Availability, CatalogEncounter, CatalogSpecies, GameConfig } from './types'

interface Snapshot {
  source: string
  species: CatalogSpecies[]
}

export let catalogSource = '정적 데이터 로딩 중'
export const speciesCatalog: CatalogSpecies[] = []
export const speciesByDex = new Map<number, CatalogSpecies>()
let catalogPromise: Promise<void> | null = null

export function loadCatalog(): Promise<void> {
  if (speciesCatalog.length) return Promise.resolve()
  if (!catalogPromise) {
    catalogPromise = Promise.all([import('../generated/species.json'), loadLearnsets()]).then(([module]) => {
      const data = module.default as Snapshot
      catalogSource = data.source
      speciesCatalog.push(...data.species)
      for (const species of data.species) speciesByDex.set(species.dex, species)
    })
  }
  return catalogPromise
}

const locationKo: Record<string, string> = {
  'pallet-town': '태초마을',
  'cerulean-city': '블루시티',
  'cerulean-cave': '블루시티동굴',
  'pewter-city': '회색시티',
  'viridian-city': '상록시티',
  'viridian-forest': '상록숲',
  'vermilion-city': '갈색시티',
  'lavender-town': '보라타운',
  'celadon-city': '무지개시티',
  'saffron-city': '노랑시티',
  'fuchsia-city': '연분홍시티',
  'cinnabar-island': '홍련섬',
  'mt-moon': '달맞이산',
  'new-bark-town': '연두마을',
  'violet-city': '도라지시티',
  'goldenrod-city': '금빛시티',
  'burned-tower': '불탄탑',
  'littleroot-town': '미로마을',
  'rustboro-city': '금탄시티',
  'granite-cave': '바위동굴',
  'fiery-path': '불꽃샛길',
  'new-mauville': '뉴보라',
  'safari-zone': '사파리존',
  'twinleaf-town': '떡잎마을',
  'oreburgh-city': '무쇠시티',
  'great-marsh': '대습초원',
  'nuvema-town': '마름꽃마을',
  'castelia-city': '구름시티',
  'victory-road': '챔피언로드',
}

const postgameMarkers: Record<string, string[]> = {
  kanto1: ['cerulean-cave'],
  johto2: ['kanto', 'mt-silver', 'route-5', 'route-6', 'route-7', 'route-8', 'route-9', 'route-10', 'route-11', 'route-12', 'route-13', 'route-14', 'route-15', 'route-16', 'route-17', 'route-18', 'route-19', 'route-20', 'route-21', 'route-22', 'route-24', 'route-25'],
  hoenn3: ['sky-pillar', 'battle', 'mirage', 'marine-cave', 'terra-cave'],
  kanto3: [
    'four-island', 'five-island', 'six-island', 'seven-island', 'icefall-cave', 'rocket-warehouse',
    'water-labyrinth', 'resort-gorgeous', 'lost-cave', 'memorial-pillar', 'green-path', 'outcast-island',
    'altering-cave', 'dotted-hole', 'ruin-valley', 'pattern-bush', 'tanoby', 'canyon-entrance',
    'sevault-canyon', 'trainer-tower', 'cerulean-cave',
  ],
  sinnoh4: ['fight-area', 'survival-area', 'resort-area', 'stark-mountain', 'route-224', 'route-225', 'route-226', 'route-227', 'route-228', 'route-229', 'route-230'],
  johto4: ['kanto', 'mt-silver'],
  unova5: ['route-11', 'route-12', 'route-13', 'route-14', 'route-15', 'undella', 'giant-chasm', 'abundant-shrine'],
  'unova5-2': ['nature-preserve'],
}

const gamePostgameMarkers: Partial<Record<GameConfig['id'], string[]>> = {
  'black-2': [
    'nuvema', 'accumula', 'striaton', 'nacrene', 'pinwheel', 'dreamyard', 'route-1', 'route-2',
    'route-3', 'route-17', 'route-18', 'p2-laboratory',
  ],
  'white-2': [
    'nuvema', 'accumula', 'striaton', 'nacrene', 'pinwheel', 'dreamyard', 'route-1', 'route-2',
    'route-3', 'route-17', 'route-18', 'p2-laboratory',
  ],
}

const methodKo: Record<string, string> = {
  walk: '풀숲·동굴',
  surf: '파도타기',
  'old-rod': '낡은낚싯대',
  'good-rod': '좋은낚싯대',
  'super-rod': '대단한낚싯대',
  'rock-smash': '바위깨기',
  'headbutt-low': '박치기',
  'headbutt-normal': '박치기',
  'headbutt-high': '박치기',
  headbutt: '박치기',
  seaweed: '다이빙·해초',
  'surf-spots': '파도타기·물결',
  'super-rod-spots': '대단한낚싯대·물결',
  'dark-grass': '진한 풀숲',
  'grass-spots': '흔들리는 풀숲',
  'cave-spots': '먼지구름',
  'bridge-spots': '다리 그림자',
  gift: '선물',
  'gift-egg': '알 선물',
  'only-one': '고정 심볼',
  pokeflute: '포켓몬피리',
  'roaming-grass': '배회',
  'roaming-water': '배회',
  'squirt-bottle': '꼬부기물뿌리개',
  'wailmer-pail': '고래왕자물뿌리개',
  'devon-scope': '데봉스코프',
  'feebas-tile-fishing': '낚시·특정 타일',
  static: '고정 심볼',
  'honey-tree': '꿀나무',
  'bubbling-spots': '물결',
  'hidden-grotto': '숨겨진특성굴',
  'npc-trade': '게임 내 교환',
}

export const supportedEncounterMethods = new Set(Object.keys(methodKo))

const methodUnlocks: Record<string, Partial<Record<string, number>>> = {
  kanto1: { 'old-rod': 3, 'good-rod': 5, 'super-rod': 5, surf: 5 },
  johto2: {
    'old-rod': 2, 'good-rod': 5, 'super-rod': 9, surf: 4, 'rock-smash': 3,
    headbutt: 2, 'headbutt-low': 2, 'headbutt-normal': 2, 'headbutt-high': 2,
  },
  hoenn3: {
    'old-rod': 2, 'good-rod': 5, 'super-rod': 8, surf: 5, 'rock-smash': 3,
    'feebas-tile-fishing': 6, seaweed: 8,
  },
  kanto3: { 'old-rod': 3, 'good-rod': 5, 'super-rod': 5, surf: 5, 'rock-smash': 7 },
  sinnoh4: { 'old-rod': 1, 'good-rod': 3, 'super-rod': 9, surf: 5, 'rock-smash': 1 },
  johto4: {
    'old-rod': 2, 'good-rod': 5, 'super-rod': 9, surf: 4, 'rock-smash': 1,
    headbutt: 2, 'headbutt-low': 2, 'headbutt-normal': 2, 'headbutt-high': 2,
  },
  unova5: { 'super-rod': 9, 'super-rod-spots': 9, surf: 5, 'surf-spots': 5, 'bubbling-spots': 5 },
  'unova5-2': { 'super-rod': 9, 'super-rod-spots': 9, surf: 4, 'surf-spots': 4, 'bubbling-spots': 4 },
}

export function encounterMethodUnlockChapter(game: GameConfig, method: string): number {
  return methodUnlocks[game.familyId]?.[method] ?? 1
}

const postgameConditions = [
  'story-progress-national-dex',
  'story-progress-beat-red',
  'story-progress-beat-elite-four-round-two',
  'story-progress-hall-of-fame',
  'story-progress-returned-machine-part',
  'story-progress-vermilion-copycat',
  'story-progress-oak-eterna-city',
  'story-progress-cure-eldritch-nightmares',
  'story-progress-juniper-cave-of-being',
  'other-received-kanto-starter',
  'item-ice-key',
  'item-iron-key',
  'item-lunar-wing',
  'other-captured-reshiram-or-zekrom',
  'special-encounter-couldnt-capture-before',
]

const unavailableConditions = [
  'other-event-arceus-in-party',
  'other-virtual-console',
  'other-regirock-regice-registeel-in-party',
]

const eventOnlyLocations = [
  'birth-island',
  'navel-rock',
  'faraway-island',
  'southern-island',
  'newmoon-island',
  'flower-paradise',
  'hall-of-origin',
  'sinjoh-ruins',
  'liberty-garden',
]

const conditionKo: Record<string, string> = {
  'time-morning': '아침',
  'time-day': '낮',
  'time-night': '밤',
  'swarm-yes': '대량발생',
  'radar-on': '포켓트레',
  'radio-hoenn': '호연 사운드',
  'radio-sinnoh': '신오 사운드',
  'season-spring': '봄',
  'season-summer': '여름',
  'season-autumn': '가을',
  'season-winter': '겨울',
  'weekday-friday': '금요일',
  'story-progress-national-dex': '전국도감 이후',
  'story-progress-hall-of-fame': '엔딩 이후',
}

const conditionUnlockChapters: Record<string, number> = {
  'story-progress-defeat-jupiter': 2,
  'story-progress-beat-team-galactic-iron-island': 5,
  'story-progress-zephyr-badge': 1,
  'story-progress-awakened-beasts': 4,
  'other-correct-password': 6,
  'story-progress-beat-galactic-coronet': 7,
  'story-progress-receive-tm-from-claire': 7,
  'story-progress-defeat-mars': 2,
}

const conditionalMethods = new Set([
  'headbutt', 'headbutt-low', 'headbutt-normal', 'headbutt-high', 'honey-tree',
  'grass-spots', 'cave-spots', 'bridge-spots', 'surf-spots', 'super-rod-spots',
  'bubbling-spots', 'hidden-grotto', 'feebas-tile-fishing',
])

function conditionUnlockChapter(game: GameConfig, condition: string): number {
  if (condition === 'story-progress-quake-badge') return game.familyId === 'unova5-2' ? 4 : 5
  if (condition === 'story-progress-defeated-ghetsis') return game.familyId === 'unova5-2' ? 7 : 8
  return conditionUnlockChapters[condition] ?? 1
}

function areaUnlockChapter(game: GameConfig, area: string): number {
  if (game.familyId === 'johto2' || game.familyId === 'johto4') {
    if (area.startsWith('union-cave-b2f')) return 4
  }
  if (game.familyId === 'sinnoh4') {
    if (/^mt-coronet-(?:2f|3f|4f|5f|6f|exterior)/.test(area)) return 7
    if (area === 'mt-coronet-b1f') return 5
    if (area === 'mt-coronet-1f-route-216') return 6
  }
  return 1
}

function activeConditions(encounter: CatalogEncounter): string[] {
  return encounter.conditions.filter((condition) =>
    !condition.endsWith('-no')
    && !condition.endsWith('-off')
    && !condition.endsWith('-none'),
  )
}

function conditionLabel(condition: string): string {
  if (conditionKo[condition]) return conditionKo[condition]
  if (condition.startsWith('story-progress-')) return '스토리 진행 조건'
  if (condition.startsWith('starter-')) return '스타터 선택 조건'
  if (condition.startsWith('item-')) return '특정 아이템 필요'
  if (condition.startsWith('tv-option-')) return 'TV 선택 조건'
  if (condition.startsWith('first-party-pokemon-')) return '선두 포켓몬 조건'
  if (condition.startsWith('special-encounter-')) return '재등장 조건'
  return '특수 조건'
}

function humanizeLocation(location: string): string {
  const translated = Object.entries(locationKo).find(([key]) => location.includes(key))
  if (translated) return translated[1]
  const route = location.match(/(?:^|-)(?:sea-)?route-(\d+)(?:-|$)/)
  if (route) return `${route[1]}번도로`
  return location
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function ancestors(species: CatalogSpecies): CatalogSpecies[] {
  const result: CatalogSpecies[] = []
  let current = species
  while (current.evolvesFrom) {
    const parent = speciesByDex.get(current.evolvesFrom)
    if (!parent) break
    result.unshift(parent)
    current = parent
  }
  return result
}

export function generationLineage(species: CatalogSpecies, generation: number): CatalogSpecies[] {
  return [...ancestors(species), species].filter((entry) => entry.generation <= generation)
}

function chainRoot(species: CatalogSpecies): CatalogSpecies {
  return ancestors(species)[0] ?? species
}

function locationMatchesToken(location: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|-)${escaped}(-|$)`).test(location)
}

interface RankedEncounter {
  encounter: CatalogEncounter
  source: CatalogSpecies
  chapter: number
  storyOrder: number
  postgame: boolean
  quality: 'verified' | 'inferred'
  tradeRequired: boolean
  readyChapter: number
  evolutionSteps: number
  conditional: boolean
  methodLabel: string
  unavailableReason?: string
}

function isPostgameEncounter(game: GameConfig, encounter: CatalogEncounter): boolean {
  const markers = [...(postgameMarkers[game.familyId] ?? []), ...(gamePostgameMarkers[game.id] ?? [])].filter(
    (marker) => !(game.id === 'emerald' && marker === 'sky-pillar'),
  )
  return markers.some((marker) => locationMatchesToken(encounter.location.toLowerCase(), marker))
    || encounter.conditions.some((condition) => postgameConditions.includes(condition))
    || (encounter.conditions.includes('swarm-yes') && game.generation >= 3)
    || encounter.conditions.includes('radar-on')
    || encounter.conditions.some((condition) => condition.startsWith('radio-') && condition !== 'radio-off')
}

function encounterChapter(game: GameConfig, encounter: CatalogEncounter): Pick<RankedEncounter, 'chapter' | 'storyOrder' | 'quality'> {
  const family = getFamily(game)
  const location = encounter.location.toLowerCase()
  const methodChapter = encounterMethodUnlockChapter(game, encounter.method)
  const conditionChapter = Math.max(
    1,
    ...activeConditions(encounter).map((condition) =>
      postgameConditions.includes(condition)
        ? family.chapters.length + 1
        : conditionUnlockChapter(game, condition),
    ),
  )
  const prerequisiteChapter = Math.max(methodChapter, conditionChapter, areaUnlockChapter(game, encounter.area))
  if (encounter.location.startsWith('roaming-') && prerequisiteChapter > 1) {
    return {
      chapter: prerequisiteChapter,
      storyOrder: prerequisiteChapter * 1_000 + 900 + encounter.minLevel / 100,
      quality: 'verified',
    }
  }
  for (const [chapterIndex, chapter] of family.chapters.entries()) {
    const tokenIndex = chapter.locationTokens.findIndex((token) => locationMatchesToken(location, token))
    if (tokenIndex >= 0) {
      const locationChapter = chapterIndex + 1
      const chapterNumber = Math.max(locationChapter, prerequisiteChapter)
      return {
        chapter: chapterNumber,
        storyOrder: chapterNumber * 1_000
          + (chapterNumber === locationChapter ? tokenIndex * 10 : 800)
          + encounter.minLevel / 100,
        quality: 'verified',
      }
    }
  }

  const level = encounter.minLevel
  const inferredFromLevel = Math.min(
    family.chapters.length,
    Math.max(1, Math.ceil(level / (60 / family.chapters.length))),
  )
  const inferred = Math.max(inferredFromLevel, prerequisiteChapter)
  return {
    chapter: inferred,
    storyOrder: inferred * 1_000 + 900 + level / 100,
    quality: 'inferred',
  }
}

function hasEncounter(species: CatalogSpecies, versionId: number): boolean {
  return (species.encounters[String(versionId)] ?? []).some((encounter) =>
    !encounter.conditions.some((condition) =>
      unavailableConditions.includes(condition)
      || (condition.startsWith('slot2-') && condition !== 'slot2-none'),
    ),
  )
}

function isVersionExclusive(species: CatalogSpecies, game: GameConfig): boolean {
  const siblings = games.filter((candidate) => candidate.familyId === game.familyId && candidate.id !== game.id)
  if (siblings.length === 0) return false
  const line = generationLineage(species, game.generation)
  return line.some((entry) => hasEncounter(entry, game.versionId))
    && siblings.every((sibling) => line.every((entry) => !hasEncounter(entry, sibling.versionId)))
}

const availabilityCache = new Map<string, Availability>()

export function getAvailability(species: CatalogSpecies, game: GameConfig): Availability {
  const key = `${game.id}:${species.dex}`
  const cached = availabilityCache.get(key)
  if (cached) return cached
  const availability = computeAvailability(species, game)
  availabilityCache.set(key, availability)
  return availability
}

function computeAvailability(species: CatalogSpecies, game: GameConfig): Availability {
  if (species.generation > game.generation) {
    return {
      obtainable: false, preChampion: false, chapter: 99, location: '-', level: '-',
      finalChapter: 99,
      storyOrder: 99_000,
      tradeRequired: false, postgameOnly: false, versionExclusive: false, sourceKind: 'unknown',
      reason: `${game.generation}세대 당시에는 존재하지 않는 포켓몬입니다.`, quality: 'verified',
    }
  }

  const family = getFamily(game)
  const line = generationLineage(species, game.generation)
  const root = line[0] ?? chainRoot(species)
  const ranked: RankedEncounter[] = line.flatMap((source) => {
    const evolutionLine = line.slice(line.indexOf(source) + 1)
    const tradeRequired = evolutionLine.some((entry) =>
      entry.evolution?.trigger === 'trade' || Boolean(crossVersionEvolutionReason(entry, game)),
    )
    return (source.encounters[String(game.versionId)] ?? []).map((encounter) => {
      const conditions = activeConditions(encounter)
      const timing = encounterChapter(game, encounter)
      const readyChapter = Math.max(
        timing.chapter,
        ...evolutionLine.map((entry) => {
          const level = entry.evolution?.minLevel ?? 0
          const levelChapter = level ? Math.ceil(level / (60 / family.chapters.length)) : 1
          const requirementChapter = crossVersionEvolutionReason(entry, game)
            ? 1
            : evolutionRequirementChapter(entry, game)
          return Math.max(levelChapter, requirementChapter)
        }),
      )
      const ordinaryMethod = [
        'walk', 'surf', 'old-rod', 'good-rod', 'super-rod', 'rock-smash',
        'headbutt', 'headbutt-low', 'headbutt-normal', 'headbutt-high', 'seaweed',
        'surf-spots', 'super-rod-spots', 'dark-grass', 'grass-spots', 'cave-spots',
        'bridge-spots', 'feebas-tile-fishing', 'bubbling-spots',
      ].includes(encounter.method)
      const conditional = conditions.length > 0 || conditionalMethods.has(encounter.method)
      return {
        encounter,
        source,
        postgame: isPostgameEncounter(game, encounter),
        tradeRequired,
        readyChapter,
        evolutionSteps: evolutionLine.length,
        conditional,
        methodLabel: [
          methodKo[encounter.method] ?? encounter.method,
          ...conditions.map(conditionLabel),
        ].join(' · '),
        unavailableReason: encounter.conditions.some((condition) => unavailableConditions.includes(condition))
          ? '이벤트 또는 별도 배포 조건이 필요한 입수 경로입니다.'
          : eventOnlyLocations.some((location) => locationMatchesToken(encounter.location, location))
            ? '배포 아이템 또는 이벤트가 필요한 입수 경로입니다.'
          : (game.id === 'black-2' && encounter.conditions.includes('item-ice-key'))
            || (game.id === 'white-2' && encounter.conditions.includes('item-iron-key'))
            ? '다른 버전에서 하나링크 키를 받아야 하는 입수 경로입니다.'
          : encounter.conditions.some((condition) => condition.startsWith('slot2-') && condition !== 'slot2-none')
            ? '다른 GBA 버전 카트리지를 꽂아야 하는 더블슬롯 전용 입수 경로입니다.'
            : undefined,
        ...timing,
        quality: ordinaryMethod && !conditionalMethods.has(encounter.method) && conditions.every((condition) =>
          conditionKo[condition]
          || conditionUnlockChapters[condition]
          || postgameConditions.includes(condition),
        ) ? timing.quality : 'inferred' as const,
      }
    })
  })

  const eligible = ranked.filter((entry) => !entry.unavailableReason)
  if (!eligible.length) {
    return {
      obtainable: false, preChampion: false, chapter: 99, location: '-', level: '-',
      finalChapter: 99,
      storyOrder: 99_000,
      tradeRequired: false, postgameOnly: false, versionExclusive: false, sourceKind: 'unknown',
      reason: ranked[0]?.unavailableReason
        ?? '이 버전의 정적 조우 데이터에 입수 경로가 없습니다. 타 버전 교환 또는 이벤트가 필요할 수 있습니다.',
      quality: 'verified',
    }
  }

  const preChampion = eligible.filter((entry) => !entry.postgame && entry.readyChapter <= family.chapters.length)
  const pool = preChampion.length ? preChampion : eligible
  pool.sort((a, b) =>
    Number(a.tradeRequired) - Number(b.tradeRequired)
    || Number(a.conditional) - Number(b.conditional)
    || a.readyChapter - b.readyChapter
    || a.storyOrder - b.storyOrder
    || a.evolutionSteps - b.evolutionSteps
    || a.encounter.minLevel - b.encounter.minLevel
    || (b.encounter.chance ?? 0) - (a.encounter.chance ?? 0)
    || b.source.dex - a.source.dex,
  )
  const first = pool[0]
  const source = first.source
  const evolutionLine = line.slice(line.indexOf(source) + 1)
  const externalEvolution = evolutionLine.find((entry) => crossVersionEvolutionReason(entry, game))
  const tradeRequired = source.dex !== species.dex && (
    evolutionLine.some((entry) => entry.evolution?.trigger === 'trade')
    || Boolean(externalEvolution)
  )
  const capturePostgame = first.postgame || first.chapter > family.chapters.length
  const captureChapter = capturePostgame ? family.chapters.length + 1 : first.chapter
  const evolutionChapter = Math.max(captureChapter, first.readyChapter)
  const postgameOnly = capturePostgame || evolutionChapter > family.chapters.length
  const starter = game.starters.includes(root.dex)
  const fossil = game.fossils.some((group) => group.includes(root.dex))
  const gift = ['gift', 'gift-egg', 'npc-trade'].includes(first.encounter.method)
  const staticLike = ['only-one', 'static', 'pokeflute', 'roaming-grass', 'roaming-water', 'squirt-bottle', 'wailmer-pail', 'devon-scope']
    .includes(first.encounter.method)

  return {
    obtainable: true,
    preChampion: !postgameOnly,
    chapter: captureChapter,
    finalChapter: evolutionChapter,
    storyOrder: capturePostgame ? (family.chapters.length + 1) * 1_000 : first.storyOrder,
    location: humanizeLocation(first.encounter.location),
    level: `Lv.${first.encounter.minLevel}${first.encounter.maxLevel !== first.encounter.minLevel ? `–${first.encounter.maxLevel}` : ''}`,
    method: first.methodLabel,
    methodId: first.encounter.method,
    sourceSpeciesName: source.dex !== species.dex ? source.name : undefined,
    conditions: activeConditions(first.encounter).map(conditionLabel),
    tradeRequired,
    postgameOnly,
    versionExclusive: isVersionExclusive(source, game),
    sourceKind: starter ? 'starter' : fossil ? 'fossil' : source.dex !== species.dex ? 'evolution' : gift ? 'gift' : staticLike ? 'static' : 'wild',
    mutuallyExclusiveGroup: starter
      ? 'starter'
      : fossil
        ? `fossil-${game.fossils.findIndex((group) => group.includes(root.dex))}`
        : first.encounter.conditions.some((condition) => condition.startsWith('starter-'))
          ? 'starter-dependent-roamer'
          : first.encounter.conditions.some((condition) => condition.startsWith('tv-option-'))
            ? 'roaming-choice'
            : undefined,
    reason: externalEvolution
      ? crossVersionEvolutionReason(externalEvolution, game) ?? undefined
      : tradeRequired
        ? '최종 진화에 통신교환이 필요합니다.'
        : postgameOnly && evolutionChapter > captureChapter
          ? '최종 진화 장소 또는 도구가 엔딩 후에 열립니다.'
          : undefined,
    quality: starter || fossil ? 'verified' : first.quality,
  }
}

export function searchSpecies(query: string): CatalogSpecies[] {
  const normalized = query.trim().toLocaleLowerCase('ko')
  if (!normalized) return speciesCatalog.slice(0, 151)
  return speciesCatalog.filter((species) =>
    species.name.toLocaleLowerCase('ko').includes(normalized)
    || species.id.includes(normalized)
    || String(species.dex) === normalized,
  )
}

const evolutionItemKo: Record<string, string> = {
  'dawn-stone': '각성의돌',
  'dusk-stone': '어둠의돌',
  'fire-stone': '불꽃의돌',
  'leaf-stone': '리프의돌',
  'moon-stone': '달의돌',
  'shiny-stone': '빛의돌',
  'sun-stone': '태양의돌',
  'thunder-stone': '천둥의돌',
  'water-stone': '물의돌',
}

const evolutionItemUnlocks: Record<string, Partial<Record<string, number>>> = {
  kanto1: {
    'moon-stone': 2, 'fire-stone': 4, 'leaf-stone': 4, 'thunder-stone': 4, 'water-stone': 4,
  },
  johto2: {
    'sun-stone': 3, 'moon-stone': 8, 'fire-stone': 9, 'leaf-stone': 9, 'thunder-stone': 9, 'water-stone': 9,
  },
  hoenn3: {
    'fire-stone': 4, 'moon-stone': 4, 'thunder-stone': 5, 'water-stone': 5, 'leaf-stone': 6, 'sun-stone': 8,
  },
  kanto3: {
    'moon-stone': 2, 'fire-stone': 4, 'leaf-stone': 4, 'thunder-stone': 4, 'water-stone': 4, 'sun-stone': 9,
  },
  sinnoh4: {
    'leaf-stone': 2, 'water-stone': 4, 'fire-stone': 5, 'shiny-stone': 5,
    'moon-stone': 5, 'dawn-stone': 6, 'dusk-stone': 7, 'thunder-stone': 8, 'sun-stone': 9,
  },
  johto4: {
    'fire-stone': 3, 'leaf-stone': 3, 'moon-stone': 3, 'sun-stone': 3,
    'thunder-stone': 3, 'water-stone': 3, 'dawn-stone': 9, 'dusk-stone': 9, 'shiny-stone': 9,
  },
  unova5: {
    'fire-stone': 2, 'leaf-stone': 2, 'moon-stone': 2, 'sun-stone': 2, 'thunder-stone': 2,
    'water-stone': 2, 'dawn-stone': 2, 'dusk-stone': 2, 'shiny-stone': 2,
  },
  'unova5-2': {
    'fire-stone': 2, 'leaf-stone': 2, 'moon-stone': 2, 'sun-stone': 2, 'thunder-stone': 2,
    'water-stone': 2, 'dawn-stone': 2, 'dusk-stone': 2, 'shiny-stone': 2,
  },
}

const crystalEvolutionItemUnlocks: Partial<Record<string, number>> = {
  'leaf-stone': 3,
  'fire-stone': 3,
  'thunder-stone': 5,
  'water-stone': 6,
}

export function evolutionRequirementChapter(species: CatalogSpecies, game: GameConfig): number {
  const family = getFamily(game)
  const evolution = species.evolution
  if (!evolution) return 1
  if (evolution.item) {
    const crystalOverride = game.id === 'crystal' ? crystalEvolutionItemUnlocks[evolution.item] : undefined
    return crystalOverride ?? evolutionItemUnlocks[game.familyId]?.[evolution.item] ?? family.chapters.length
  }
  if (species.dex === 462 || species.dex === 476) {
    if (game.familyId === 'sinnoh4') return 3
    if (game.familyId.startsWith('unova5')) return 5
    return family.chapters.length + 1
  }
  if (species.dex === 470) {
    if (game.familyId === 'sinnoh4') return 2
    if (game.familyId === 'unova5') return 3
    if (game.familyId === 'unova5-2') return family.chapters.length + 1
    return family.chapters.length + 1
  }
  if (species.dex === 471) {
    if (game.familyId === 'sinnoh4') return 6
    if (game.familyId === 'unova5') return 6
    if (game.familyId === 'unova5-2') return family.chapters.length + 1
    return family.chapters.length + 1
  }
  return 1
}

function crossVersionEvolutionReason(species: CatalogSpecies, game: GameConfig): string | null {
  if (game.id === 'yellow' && species.dex === 26) {
    return '피카츄 버전의 스타팅 피카츄는 진화를 거부하므로 라이츄는 다른 버전에서 진화 후 교환해야 합니다.'
  }
  if (game.familyId === 'kanto3' && (species.dex === 196 || species.dex === 197)) {
    return '파이어레드·리프그린에는 시간대가 없어 다른 버전에서 진화 후 교환해야 합니다.'
  }
  if (game.familyId === 'johto4' && [462, 470, 471, 476].includes(species.dex)) {
    return '하트골드·소울실버에는 필요한 진화 장소가 없어 신오 버전에서 진화 후 교환해야 합니다.'
  }
  return null
}

const heldItemKo: Record<number, string> = {
  110: '동글동글돌',
  198: '왕의징표석',
  203: '심해의이빨',
  204: '심해의비늘',
  210: '금속코트',
  212: '용의비늘',
  229: '업그레이드',
  298: '프로텍터',
  299: '에레키부스터',
  300: '마그마부스터',
  301: '괴상한패치',
  302: '영계의천',
  303: '예리한손톱',
  304: '예리한이빨',
}

const moveEvolutionKo: Record<number, string> = {
  122: '흉내내기',
  185: '흉내내기',
  424: '더블어택',
  463: '구르기',
  465: '원시의힘',
  469: '원시의힘',
  473: '원시의힘',
}

const genderEvolutionKo: Record<number, string> = {
  413: '암컷',
  414: '수컷',
  416: '암컷',
  475: '수컷',
  478: '암컷',
}

function areaEvolutionText(species: CatalogSpecies, game?: GameConfig): string | null {
  if (![462, 470, 471, 476].includes(species.dex)) return null
  if (!game) return '특정 장소에서 레벨업'
  if ([462, 476].includes(species.dex)) {
    if (game.familyId === 'sinnoh4') return '천관산 자기장 구역에서 레벨업'
    if (game.familyId.startsWith('unova5')) return '전기돌동굴에서 레벨업'
    return '이 버전에는 필요한 자기장 장소가 없어 다른 버전에서 진화 후 교환'
  }
  if (species.dex === 470) {
    if (game.familyId === 'sinnoh4') return '영원의숲 이끼 낀 바위 근처에서 레벨업'
    if (game.familyId.startsWith('unova5')) return '바람개비숲 이끼 낀 바위 근처에서 레벨업'
    return '이 버전에는 이끼 낀 바위가 없어 다른 버전에서 진화 후 교환'
  }
  if (game.familyId === 'sinnoh4') return '217번도로 얼음 바위 근처에서 레벨업'
  if (game.familyId.startsWith('unova5')) return '태엽산 얼음 바위 근처에서 레벨업'
  return '이 버전에는 얼음 바위가 없어 다른 버전에서 진화 후 교환'
}

export function evolutionText(species: CatalogSpecies, game?: GameConfig): string {
  if (!species.evolution) return '진화 없음 또는 기본 형태'
  const evolution = species.evolution
  if (evolution.trigger === 'trade') {
    const condition = evolution.tradeSpeciesId
      ? `도감 #${evolution.tradeSpeciesId}와 서로 교환`
      : evolution.heldItemId
        ? `${heldItemKo[evolution.heldItemId] ?? `도구 #${evolution.heldItemId}`}을 지니고 통신교환`
        : '통신교환'
    return `${condition}으로 ${species.name} 진화`
  }
  if (evolution.item) {
    const gender = genderEvolutionKo[species.dex]
    return `${gender ? `${gender}에게 ` : ''}${evolutionItemKo[evolution.item] ?? evolution.item} 사용으로 ${species.name} 진화`
  }
  if (species.dex === 292) return '토중몬이 Lv.20에 진화할 때 파티 빈칸과 몬스터볼이 있으면 함께 출현'
  if (species.dex === 350) {
    return game?.generation === 5
      ? '빈티나의 아름다움 수치 170 이상에서 레벨업 또는 고운비늘을 지니고 통신교환'
      : '빈티나의 아름다움 수치 170 이상에서 레벨업'
  }
  if (species.dex === 226) return '파티에 총어를 둔 채 타만타 레벨업'
  const areaText = areaEvolutionText(species, game)
  if (areaText) return areaText
  if (moveEvolutionKo[species.dex]) return `${moveEvolutionKo[species.dex]}를 배운 상태로 레벨업`
  if (evolution.heldItemId) {
    const time = evolution.time === 'day' ? '낮에' : evolution.time === 'night' ? '밤에' : ''
    return `${heldItemKo[evolution.heldItemId] ?? `도구 #${evolution.heldItemId}`}을 지니고 ${time} 레벨업`.replace('  ', ' ')
  }
  if (evolution.minHappiness) {
    const time = evolution.time === 'day' ? '낮에' : evolution.time === 'night' ? '밤에' : ''
    return `친밀도 ${evolution.minHappiness} 이상에서 ${time} 레벨업`.replace('  ', ' ')
  }
  if (evolution.minLevel) {
    const gender = genderEvolutionKo[species.dex]
    const special = species.dex === 106 ? '공격 > 방어'
      : species.dex === 107 ? '공격 < 방어'
        : species.dex === 237 ? '공격 = 방어'
          : null
    return `Lv.${evolution.minLevel}에 ${gender ? `${gender} 조건으로 ` : ''}${special ? `${special}이면 ` : ''}${species.name} 진화`
  }
  return `${species.name}: 레벨업 진화`
}
