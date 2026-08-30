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
  'viridian-forest': '상록숲',
  'mt-moon': '달맞이산',
  'new-bark-town': '연두마을',
  'violet-city': '도라지시티',
  'goldenrod-city': '금빛시티',
  'burned-tower': '불탄탑',
  'littleroot-town': '미로마을',
  'rustboro-city': '금탄시티',
  'granite-cave': '바위동굴',
  'fiery-path': '불꽃샛길',
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
  kanto3: ['sevii', 'kindle-road', 'water-labyrinth', 'pattern-bush', 'tanoby', 'cerulean-cave'],
  sinnoh4: ['fight-area', 'survival-area', 'resort-area', 'stark-mountain', 'route-224', 'route-225', 'route-226', 'route-227', 'route-228', 'route-229', 'route-230'],
  johto4: ['kanto', 'mt-silver'],
  unova5: ['route-11', 'route-12', 'route-13', 'route-14', 'route-15', 'undella', 'giant-chasm', 'abundant-shrine'],
  'unova5-2': ['nature-preserve'],
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
}

function isPostgameEncounter(game: GameConfig, encounter: CatalogEncounter): boolean {
  const markers = (postgameMarkers[game.familyId] ?? []).filter(
    (marker) => !(game.id === 'emerald' && marker === 'sky-pillar'),
  )
  return markers.some((marker) => locationMatchesToken(encounter.location.toLowerCase(), marker))
}

function encounterChapter(game: GameConfig, encounter: CatalogEncounter): Pick<RankedEncounter, 'chapter' | 'storyOrder' | 'quality'> {
  const family = getFamily(game)
  const location = encounter.location.toLowerCase()
  for (const [chapterIndex, chapter] of family.chapters.entries()) {
    const tokenIndex = chapter.locationTokens.findIndex((token) => locationMatchesToken(location, token))
    if (tokenIndex >= 0) {
      const chapterNumber = chapterIndex + 1
      return {
        chapter: chapterNumber,
        storyOrder: chapterNumber * 1_000 + tokenIndex * 10 + encounter.minLevel / 100,
        quality: 'verified',
      }
    }
  }

  const level = encounter.minLevel
  const inferred = Math.min(
    family.chapters.length,
    Math.max(1, Math.ceil(level / (60 / family.chapters.length))),
  )
  return {
    chapter: inferred,
    storyOrder: inferred * 1_000 + 900 + level / 100,
    quality: 'inferred',
  }
}

function hasEncounter(species: CatalogSpecies, versionId: number): boolean {
  return (species.encounters[String(versionId)]?.length ?? 0) > 0
}

function isVersionExclusive(species: CatalogSpecies, game: GameConfig): boolean {
  const siblings = games.filter((candidate) => candidate.familyId === game.familyId && candidate.id !== game.id)
  if (siblings.length === 0) return false
  const line = generationLineage(species, game.generation)
  return line.some((entry) => hasEncounter(entry, game.versionId))
    && siblings.every((sibling) => line.every((entry) => !hasEncounter(entry, sibling.versionId)))
}

export function getAvailability(species: CatalogSpecies, game: GameConfig): Availability {
  if (species.generation > game.generation) {
    return {
      obtainable: false, preChampion: false, chapter: 99, location: '-', level: '-',
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
    const tradeRequired = evolutionLine.some((entry) => entry.evolution?.trigger === 'trade')
    return (source.encounters[String(game.versionId)] ?? []).map((encounter) => ({
      encounter,
      source,
      postgame: isPostgameEncounter(game, encounter),
      tradeRequired,
      ...encounterChapter(game, encounter),
    }))
  })

  if (!ranked.length) {
    return {
      obtainable: false, preChampion: false, chapter: 99, location: '-', level: '-',
      storyOrder: 99_000,
      tradeRequired: false, postgameOnly: false, versionExclusive: false, sourceKind: 'unknown',
      reason: '이 버전의 정적 조우 데이터에 입수 경로가 없습니다. 타 버전 교환 또는 이벤트가 필요할 수 있습니다.', quality: 'verified',
    }
  }

  const preChampion = ranked.filter((entry) => !entry.postgame && entry.chapter <= family.chapters.length)
  const direct = ranked.filter((entry) => entry.source.dex === species.dex)
  const directPreChampion = direct.filter((entry) => !entry.postgame && entry.chapter <= family.chapters.length)
  const pool = directPreChampion.length
    ? directPreChampion
    : preChampion.length
      ? preChampion
      : direct.length
        ? direct
        : ranked
  pool.sort((a, b) =>
    Number(a.tradeRequired) - Number(b.tradeRequired)
    || a.storyOrder - b.storyOrder
    || a.encounter.minLevel - b.encounter.minLevel
    || b.source.dex - a.source.dex,
  )
  const first = pool[0]
  const source = first.source
  const postgameOnly = preChampion.length === 0
  const evolutionLine = line.slice(line.indexOf(source) + 1)
  const tradeRequired = source.dex !== species.dex && evolutionLine.some((entry) => entry.evolution?.trigger === 'trade')
  const starter = game.starters.includes(root.dex)
  const fossil = game.fossils.some((group) => group.includes(root.dex))
  const staticLike = first.encounter.minLevel === first.encounter.maxLevel

  return {
    obtainable: true,
    preChampion: !postgameOnly,
    chapter: postgameOnly ? family.chapters.length + 1 : first.chapter,
    storyOrder: postgameOnly ? (family.chapters.length + 1) * 1_000 : first.storyOrder,
    location: humanizeLocation(first.encounter.location),
    level: `Lv.${first.encounter.minLevel}${first.encounter.maxLevel !== first.encounter.minLevel ? `–${first.encounter.maxLevel}` : ''}`,
    tradeRequired,
    postgameOnly,
    versionExclusive: isVersionExclusive(source, game),
    sourceKind: starter ? 'starter' : fossil ? 'fossil' : source.dex !== species.dex ? 'evolution' : staticLike ? 'static' : 'wild',
    mutuallyExclusiveGroup: starter ? 'starter' : fossil ? `fossil-${game.fossils.findIndex((group) => group.includes(root.dex))}` : undefined,
    reason: tradeRequired ? '최종 진화에 통신교환이 필요합니다.' : undefined,
    quality: first.quality,
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
