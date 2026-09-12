import { games, getFamily, getMainStoryChapterCount } from './games'
import {
  getGen8DefaultFormProfile,
  getGen8FormProfile,
  getGen8FormProfileByIdentifier,
  getGen8FormProfileByPokemonId,
  swshFormChangeRules,
} from './gen8Forms'
import { loadLearnsets } from './learnsets'
import { modernEncounterChapter, type ModernFamilyId } from './modernGames'
import type { Availability, CatalogEncounter, CatalogEvolution, CatalogEvolutionMethod, CatalogSpecies, GameConfig } from './types'
import { getCatalogGame } from './versionRegistry'

interface Snapshot {
  source: string
  provenance: {
    source: string
    repository: string
    revision: string
    files: string[]
    compatibilitySnapshot: {
      repository: string
      revision: string
      speciesPath: string
      learnsetsPath: string
      generations: number[]
      reason: string
    }

  }
  coverage: {
    nationalDex: { min: number; max: number; count: number }
    generationBoundaries: Record<string, number>
    encounterVersionIds: number[]
    encounterRowsByVersion: Record<string, number>
    serializedEncounterEntriesByVersion: Record<string, number>
    plannerVersionIds: number[]
    plannerEncounterMethods: string[]
    catalogOnlyVersionIds: number[]
    storyTiming: string
    evolutionPolicy: string
    evolutionVersionGroupIds: number[]
    correctedEvolutionRows: {
      speciesId: number
      sourceVersionGroupId: number
      normalizedGeneration: number
      reason: string
    }[]
    missingEvolutionSpeciesIds: number[]
    forms: {
      policy: string
      planning: string
      excludedNonDefaultPokemonCount: number
    }
  }
  species: CatalogSpecies[]
}

interface ModernEncounterSnapshot {
  provenance: {
    source: string
    repository: string
    revision: string
    license: string
    files: string[]
    notes: string[]
  }
  games: Record<string, ({
    species: number
    form: number
  } & CatalogEncounter)[]>
}

export let catalogSource = '정적 데이터 로딩 중'
export let catalogProvenance: Snapshot['provenance'] | null = null
export let catalogCoverage: Snapshot['coverage'] | null = null
export let modernEncounterProvenance: ModernEncounterSnapshot['provenance'] | null = null
export const speciesCatalog: CatalogSpecies[] = []
export const speciesByDex = new Map<number, CatalogSpecies>()
let catalogPromise: Promise<void> | null = null

function readSnapshot(value: unknown): Snapshot {
  if (!value || typeof value !== 'object') throw new Error('전국도감 스냅샷이 객체가 아닙니다.')
  const data = value as Partial<Snapshot>
  if (
    typeof data.source !== 'string'
    || !data.provenance
    || !/^[a-f0-9]{40}$/.test(data.provenance.revision)
    || !data.coverage
    || !Array.isArray(data.species)
    || data.coverage.nationalDex.min !== 1
    || data.coverage.nationalDex.max !== 1025
    || data.coverage.nationalDex.count !== data.species.length
  ) {
    throw new Error('전국도감 스냅샷 메타데이터가 올바르지 않습니다.')
  }
  for (const [index, species] of data.species.entries()) {
    if (species.dex !== index + 1 || species.generation < 1 || species.generation > 9) {
      throw new Error(`전국도감 경계가 올바르지 않습니다: #${species.dex}`)
    }
  }
  return data as Snapshot
}

export function loadCatalog(): Promise<void> {
  if (speciesCatalog.length) return Promise.resolve()
  if (!catalogPromise) {
    catalogPromise = Promise.all([
      import('../generated/species.json'),
      import('../generated/modern-encounters.json'),
      loadLearnsets(),
    ]).then(([module, modernModule]) => {
      const data = readSnapshot(module.default)
      const modern = modernModule.default as ModernEncounterSnapshot
      if (
        !/^[a-f0-9]{40}$/.test(modern.provenance.revision)
        || modern.provenance.license !== 'GPL-3.0-or-later'
        || !Array.isArray(modern.provenance.files)
        || modern.provenance.files.length === 0
      ) {
        throw new Error('현대 버전 조우 스냅샷 메타데이터가 올바르지 않습니다.')
      }
      catalogSource = data.source
      catalogProvenance = data.provenance
      catalogCoverage = data.coverage
      speciesCatalog.push(...data.species)
      for (const species of data.species) speciesByDex.set(species.dex, species)
      modernEncounterProvenance = modern.provenance
      for (const [gameId, rows] of Object.entries(modern.games)) {
        const game = getCatalogGame(gameId)
        if (!game) throw new Error(`레지스트리에 없는 현대 조우 게임입니다: ${gameId}`)
        if (game.plannerSupport.status === 'full') {
          for (const species of data.species) delete species.encounters[String(game.versionId)]
        }
        for (const row of rows) {
          const species = speciesByDex.get(row.species)
          if (!species) throw new Error(`현대 조우 종 번호가 올바르지 않습니다: #${row.species}`)
          const encounters = species.encounters[String(game.versionId)] ?? []
          encounters.push({ ...row, source: 'pkhex' })
          species.encounters[String(game.versionId)] = encounters
        }
      }
    })
  }
  return catalogPromise
}

const locationKo: Record<string, string> = {
  'tower-summit': '타워 정상',
  'wedgehurst-station': '브래시마을역',
  'fields-of-honor': '인사의 들판',
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
  'grand-underground': '지하대동굴',
  'trophy-garden': '자랑의 뒤뜰',
  'mount-coronet': '천관산',
  'valley-windworks': '골짜기발전소',
  'iron-island': '강철섬',
  'old-chateau': '숲의양옥집',
  'ramanas-park': '라마나스파크',
  'stark-mountain': '하드마운틴',
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
  grass: '숨은 야생 조우',
  overworld: '오버월드 심볼',
  raid: '맥스 레이드',
  fishing: '낚시',
  'shaking-tree': '흔들리는 나무',
  'dynamax-adventure': '다이맥스 어드벤처',
  fossil: '화석 복원',
  egg: '알',
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
  'postgame',
  'national-dex',
  'elite-four-defeated',
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
  'postgame': '엔딩 이후',
  'national-dex': '전국도감 이후',
  'elite-four-defeated': '사천왕 격파 이후',
  'grand-underground': '지하대동굴',
  'explorer-kit': '탐험세트 획득',
  'strength-obtained': '괴력 입수',
  'defog': '안개제거 해금',
  'strength': '괴력 해금',
  'surf': '파도타기 해금',
  'icicle-badge': '글레이셔배지',
  'waterfall': '폭포오르기 해금',
  'daily-feebas-tiles': '매일 바뀌는 빈티나 출현 타일',
  'story-climax-complete': '창기둥 사건 해결 이후',
  'daily-swarm': '오늘의 대량발생',
  'poke-radar': '포켓트레 필요',
  'daily-trophy-garden': '자랑의 뒤뜰 일일 포켓몬',
  'daily-great-marsh-binoculars': '대습초원 망원경 일일 포켓몬',
  'friday-only': '금요일 한정',
  'night-only': '밤 한정',
  'roaming': '배회 포켓몬',
  'gift-egg': '선물받은 알',
  'dlc-milestone-isle-access': '갑옷섬 도착',
  'dlc-milestone-isle-first-trial': '도장 첫 번째 수행 완료',
  'dlc-milestone-isle-trials-complete': '도장 수행 완료',
  'dlc-milestone-isle-story-complete': '갑옷섬 이야기 완료',
  'dlc-milestone-crown-access': '왕관설원 도착',
  'dlc-milestone-crown-calyrex-complete': '풍요의 왕 단서 완료',
  'dlc-milestone-crown-legendary-clues': '왕관설원 전설 단서 진행',
  'dlc-milestone-crown-ultra-beasts': '울트라비스트 단서 해금',
}

const galarDlcMilestoneChapters: Record<string, number> = {
  'dlc-milestone-isle-access': 12,
  'dlc-milestone-isle-first-trial': 12,
  'dlc-milestone-isle-trials-complete': 13,
  'dlc-milestone-isle-story-complete': 15,
  'dlc-milestone-crown-access': 16,
  'dlc-milestone-crown-calyrex-complete': 17,
  'dlc-milestone-crown-legendary-clues': 18,
  'dlc-milestone-crown-ultra-beasts': 18,
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
  if (condition.startsWith('weather-')) return `날씨: ${condition.replace('weather-', '')}`
  if (condition.startsWith('badge-count-')) return `배지 ${condition.replace('badge-count-', '')}개`
  if (condition.startsWith('raid-stars-')) return `레이드 ${condition.replace('raid-stars-', '').replace('-', '–')}성`
  if (condition === 'water-bike') return '수상 로토무자전거 필요'
  if (condition === 'isle-of-armor') return '갑옷섬 DLC'
  if (condition === 'crown-tundra') return '왕관설원 DLC'
  if (condition.startsWith('content-update-')) return `콘텐츠 업데이트 ${condition.replace('content-update-', '')}`
  if (condition.startsWith('requested-species-')) return `게임 내 교환 요구: ${condition.replace('requested-species-', '')}`
  if (condition === 'gigantamax-capable') return '거다이맥스 가능 개체'
  if (condition === 'multiplayer-opposite-version-host') return '반대 버전 호스트의 멀티플레이 경로 필요'
  if (condition === 'one-catch-per-legendary') return '전설별 저장 데이터당 1회 포획'
  if (condition === 'rental-team') return '렌탈 포켓몬으로 진행'
  if (condition === 'battle-form-rusted-sword') return '녹슨검을 지니면 검왕 폼으로 전투 중 변환'
  if (condition === 'battle-form-rusted-shield') return '녹슨방패를 지니면 방패왕 폼으로 전투 중 변환'
  if (condition === 'gigantamax-form-max-soup') return '다이꿀을 넣은 다이스프로 거다이맥스 인자 변경'
  if (condition === 'fusion-form-reins-of-unity') return '유대의고삐로 선택한 애마와 합체·분리'
  if (condition === 'steed-choice') return '블리자포스/레이스포스 중 한 경로만 선택'
  if (condition === 'ultra-beast-clue-complete') return '왕관설원 전설의 단서 완료 후 울트라비스트 해금'
  if (condition === 'crown-tundra-footprints-100-percent') return '왕관설원 발자국 단서 100% 조사'
  if (condition === 'dyna-tree-roaming-quest') return '다이목 이벤트 후 가라르 전역 배회'
  if (condition === 'talk-to-32-unique-online-players') return '묘비 조사 후 온라인에서 서로 다른 플레이어 32명과 대화'
  if (condition === 'all-five-regis-in-party') return '레지 5종을 파티에 둔 채 특정 레이드 굴 조사'
  if (condition === 'opposite-regi-trade-required') return '한 저장 데이터에서 선택 불가능한 반대 레지는 교환 필요'
  if (condition === 'swords-of-justice-complete') return '성검사 3종의 발자국 조사와 포획 완료'
  if (condition === 'cook-curry-with-trio') return '성검사 3종을 파티에 두고 카레 요리'
  if (condition === 'calyrex-quest-complete') return '버드렉스 메인 단서 완료'
  if (condition === 'catch-five-ultra-beasts') return '맥스다이맥스 어드벤처에서 울트라비스트 5종 포획'
  if (condition.startsWith('isle-diglett-found-')) return `갑옷섬 디그다 ${condition.slice('isle-diglett-found-'.length)}마리 발견 보상`
  if (condition === 'reward-matches-galar-starter') return '처음 고른 가라르 스타터에 대응하는 알로라 스타터'
  if (condition === 'launch-version-1.0.0') return '출시 버전 1.0.0 기본 콘텐츠'
  if (condition === 'dojo-trials-complete') return '갑옷섬 도장 세 가지 수행 완료'
  if (condition === 'dojo-first-trial-complete') return '갑옷섬 도장 첫 번째 수행 완료'
  if (condition === 'dojo-story-complete') return '쌍권의 탑과 도장 후일담 완료'
  if (condition.startsWith('fossil-pair-')) return `화석 조합: ${condition.slice('fossil-pair-'.length).replaceAll('-', ' + ')}`
  if (condition === 'resource-consumption-two-fossils') return '복원 1회마다 서로 다른 화석 2개 소모'
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

export function evolutionForGame(
  species: CatalogSpecies,
  game: GameConfig,
  basePokemonId?: number,
  baseFormIndex?: number,
): CatalogEvolution | CatalogEvolutionMethod | null {
  if (game.generation < 6 || species.evolutionMethods.length === 0) return species.evolution
  if (game.familyId === 'sinnoh8' && species.dex === 350) {
    return species.evolutionMethods.find((method) =>
      method.trigger === 'level-up' && method.minBeauty === 170) ?? species.evolution
  }
  const versionGroups = getCatalogGame(game.id)?.dataVersionGroupIds ?? [game.versionGroupId]
  const candidates = species.evolutionMethods
    .filter((method) => method.generation === null || method.generation <= game.generation)
    .filter((method) => method.versionGroupId === null || method.versionGroupId <= Math.max(...versionGroups))
    .filter((method) => method.versionGroupId === null
      || versionGroups.includes(method.versionGroupId)
      || baseFormIndex === undefined
      || baseFormIndex === 0
      || method.baseFormId === basePokemonId)
    .filter((method) => !method.baseFormId || !basePokemonId || method.baseFormId === basePokemonId)
    .filter((method) => species.dex !== 855 || game.familyId !== 'galar8' || baseFormIndex === undefined
      || method.item === (baseFormIndex === 1 ? 'chipped-pot' : 'cracked-pot'))
    .sort((a, b) =>
      Number(b.versionGroupId === game.versionGroupId) - Number(a.versionGroupId === game.versionGroupId)
      || Number(b.default) - Number(a.default)
      || (b.versionGroupId ?? 0) - (a.versionGroupId ?? 0))
  return candidates[0] ?? (basePokemonId ? null : species.evolution)
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
  const mainStoryChapterCount = getMainStoryChapterCount(game)
  if (['galar8', 'sinnoh8', 'letsgo7', 'hisui8'].includes(game.familyId)) {
    const chapter = modernEncounterChapter(
      game.familyId as ModernFamilyId,
      encounter.location,
      encounter.conditions,
      encounter.method,
      encounter.minLevel,
    )
    if (chapter !== null) {
      return {
        chapter,
        storyOrder: chapter * 1_000 + encounter.minLevel / 100,
        quality: 'verified',
      }
    }
  }
  const location = encounter.location.toLowerCase()
  const methodChapter = encounterMethodUnlockChapter(game, encounter.method)
  const conditionChapter = Math.max(
    1,
    ...activeConditions(encounter).map((condition) =>
      postgameConditions.includes(condition)
        ? mainStoryChapterCount + 1
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
    mainStoryChapterCount,
    Math.max(1, Math.ceil(level / (60 / mainStoryChapterCount))),
  )
  const inferred = Math.max(inferredFromLevel, prerequisiteChapter)
  return {
    chapter: inferred,
    storyOrder: inferred * 1_000 + 900 + level / 100,
    quality: 'inferred',
  }
}

function hasEncounter(species: CatalogSpecies, versionId: number, form?: number): boolean {
  return (species.encounters[String(versionId)] ?? []).some((encounter) =>
    (form === undefined || (encounter.form ?? 0) === form)
    && !encounter.conditions.some((condition) =>
      unavailableConditions.includes(condition)
      || (condition.startsWith('slot2-') && condition !== 'slot2-none'),
    ),
  )
}

function isVersionExclusive(species: CatalogSpecies, game: GameConfig, form?: number): boolean {
  const siblings = games.filter((candidate) => candidate.familyId === game.familyId && candidate.id !== game.id)
  if (siblings.length === 0) return false
  const line = generationLineage(species, game.generation)
  return line.some((entry) => hasEncounter(entry, game.versionId, form))
    && siblings.every((sibling) => line.every((entry) => !hasEncounter(entry, sibling.versionId, form)))
}

const availabilityCache = new Map<string, Availability>()

export function getAvailability(species: CatalogSpecies, game: GameConfig, desiredSourceFormIndex?: number): Availability {
  const key = `${game.id}:${species.dex}:${desiredSourceFormIndex ?? '*'}`
  const cached = availabilityCache.get(key)
  if (cached) return cached
  const availability = computeAvailability(species, game, desiredSourceFormIndex)
  availabilityCache.set(key, availability)
  return availability
}

function computeAvailability(species: CatalogSpecies, game: GameConfig, desiredSourceFormIndex?: number): Availability {
  if (game.familyId === 'sinnoh8' && species.dex > 493) {
    return {
      obtainable: false, preChampion: false, chapter: 99, location: '-', level: '-',
      finalChapter: 99,
      storyOrder: 99_000,
      tradeRequired: false, postgameOnly: false, versionExclusive: false, sourceKind: 'unknown',
      reason: '브릴리언트 다이아몬드·샤이닝 펄의 게임 내 도감은 #001–493만 지원합니다.',
      quality: 'verified',
    }
  }
  if (species.generation > game.generation) {
    return {
      obtainable: false, preChampion: false, chapter: 99, location: '-', level: '-',
      finalChapter: 99,
      storyOrder: 99_000,
      tradeRequired: false, postgameOnly: false, versionExclusive: false, sourceKind: 'unknown',
      reason: `${game.generation}세대 당시에는 존재하지 않는 포켓몬입니다.`, quality: 'verified',
    }
  }

  const mainStoryChapterCount = getMainStoryChapterCount(game)
  const line = generationLineage(species, game.generation)
  const root = line[0] ?? chainRoot(species)
  const ranked: RankedEncounter[] = line.flatMap((source) => {
    const evolutionLine = line.slice(line.indexOf(source) + 1)
    return (source.encounters[String(game.versionId)] ?? [])
      .filter((encounter) => desiredSourceFormIndex === undefined || (encounter.form ?? 0) === desiredSourceFormIndex)
      .map((encounter) => {
      let pathForm = getGen8FormProfile(source.dex, encounter.form ?? 0)
      const pathMethods = evolutionLine.map((entry) => {
        const method = evolutionForGame(entry, game, pathForm?.pokemonId, pathForm?.formIndex)
        const evolvedFormId = method && 'evolvedFormId' in method ? method.evolvedFormId : null
        pathForm = evolvedFormId ? getGen8FormProfileByPokemonId(evolvedFormId) : getGen8DefaultFormProfile(entry.dex)
        return method
      })
      const invalidFormEvolution = evolutionLine.length > 0 && pathMethods.some((method) => !method)
      const tradeRequired = evolutionLine.some((entry, index) =>
        pathMethods[index]?.trigger === 'trade' || Boolean(crossVersionEvolutionReason(entry, game)),
      )
      const conditions = activeConditions(encounter)
      const timing = encounterChapter(game, encounter)
      const readyChapter = Math.max(
        timing.chapter,
        ...evolutionLine.map((entry, index) => {
          const evolution = pathMethods[index]
          const level = evolution?.minLevel ?? 0
          const levelChapter = level ? Math.ceil(level / (60 / mainStoryChapterCount)) : 1
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
        unavailableReason: invalidFormEvolution
          ? '이 폼은 목표 진화형으로 진화할 수 없습니다.'
          : encounter.conditions.some((condition) => unavailableConditions.includes(condition))
          ? '이벤트 또는 별도 배포 조건이 필요한 입수 경로입니다.'
          : encounter.conditions.some((condition) => condition.startsWith('johto-safari-blocks-'))
            ? '사파리존 블록 배치와 대기 일수의 정확한 해금 시점이 모델링되지 않았습니다.'
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

  const preChampion = eligible.filter((entry) => !entry.postgame && entry.readyChapter <= mainStoryChapterCount)
  const pool = preChampion.length ? preChampion : eligible
  pool.sort((a, b) =>
    Number(a.tradeRequired) - Number(b.tradeRequired)
    || Number(a.encounter.conditions.some((condition) => condition.startsWith('dlc-milestone-')))
      - Number(b.encounter.conditions.some((condition) => condition.startsWith('dlc-milestone-')))
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
  const sourceFormIndex = first.encounter.form ?? 0
  const sourceForm = game.generation >= 7
    ? getGen8FormProfile(source.dex, sourceFormIndex)
    : undefined
  const evolutionLine = line.slice(line.indexOf(source) + 1)
  let evolvedForm = sourceForm
  const selectedEvolutionMethods: (CatalogEvolution | CatalogEvolutionMethod | null)[] = []
  for (const evolvedSpecies of evolutionLine) {
    const method = evolutionForGame(evolvedSpecies, game, evolvedForm?.pokemonId, evolvedForm?.formIndex)
    selectedEvolutionMethods.push(method)
    if (game.generation >= 7) {
      const evolvedFormId = method && 'evolvedFormId' in method ? method.evolvedFormId : null
      evolvedForm = evolvedFormId
        ? getGen8FormProfileByPokemonId(evolvedFormId)
        : getGen8DefaultFormProfile(evolvedSpecies.dex)
    }
  }
  const deterministicFormChange = swshFormChangeRules.find((rule) =>
    rule.speciesId === species.dex
    && (rule.gameIds as readonly string[]).includes(game.id)
    && !('choiceGroup' in rule))
  const finalForm = deterministicFormChange
    ? getGen8FormProfileByIdentifier(
        deterministicFormChange.form === 'crowned'
          ? `${species.id}-crowned`
          : evolvedForm?.identifier ?? species.id,
      ) ?? evolvedForm
    : evolvedForm ?? (game.generation >= 7 ? getGen8DefaultFormProfile(species.dex) : undefined)
  const formChoices = game.familyId === 'galar8' && species.dex === 892
    ? [
        { profile: getGen8FormProfile(892, 0), trigger: 'tower-of-darkness' },
        { profile: getGen8FormProfile(892, 1), trigger: 'tower-of-waters' },
      ].flatMap(({ profile, trigger }) => profile ? [{
        formIndex: profile.formIndex,
        formIdentifier: profile.identifier,
        formName: profile.formName ?? undefined,
        types: profile.types,
        evolutionTrigger: trigger,
      }] : [])
    : game.familyId === 'galar8' && [592, 593].includes(species.dex)
      ? [0, 1].flatMap((formIndex) => {
          const profile = getGen8FormProfile(species.dex, formIndex)
          return profile ? [{
            formIndex,
            formIdentifier: profile.identifier,
            formName: profile.formName ?? undefined,
            types: profile.types,
            evolutionTrigger: 'gender-random',
          }] : []
        })
    : game.familyId === 'sinnoh8' && [201, 422, 423].includes(species.dex)
      ? [...new Set(eligible
          .filter((entry) => entry.source.chainId === species.chainId)
          .map((entry) => entry.encounter.form ?? 0))]
          .flatMap((formIndex) => {
            const profile = getGen8FormProfile(species.dex, formIndex)
            return profile ? [{
              formIndex,
              formIdentifier: profile.identifier,
              formName: profile.formName ?? undefined,
              types: profile.types,
              evolutionTrigger: 'capture-form',
            }] : []
          })
      : undefined
  const externalEvolution = evolutionLine.find((entry) => crossVersionEvolutionReason(entry, game))
  const tradeRequired = source.dex !== species.dex && (
    selectedEvolutionMethods.some((method) => method?.trigger === 'trade')
    || Boolean(externalEvolution)
  )
  const capturePostgame = first.postgame || first.chapter > mainStoryChapterCount
  const captureChapter = capturePostgame ? mainStoryChapterCount + 1 : first.chapter
  const evolutionChapter = Math.max(captureChapter, first.readyChapter)
  const postgameOnly = capturePostgame || evolutionChapter > mainStoryChapterCount
  const starter = game.starters.includes(root.dex)
  const fossil = game.fossils.some((group) => group.includes(root.dex))
  const gift = ['gift', 'gift-egg', 'npc-trade', 'trade'].includes(first.encounter.method)
  const staticLike = ['only-one', 'static', 'pokeflute', 'roaming-grass', 'roaming-water', 'squirt-bottle', 'wailmer-pail', 'devon-scope']
    .includes(first.encounter.method)
  const authoredChoiceGroup = first.encounter.conditions
    .find((condition) => condition.startsWith('choice-group-'))
  const requiredStarterDex = first.encounter.conditions
    .map((condition) => /^requires-galar-starter-(\d+)$/.exec(condition)?.[1])
    .find((value) => value !== undefined)
  const dlcMilestone = first.encounter.conditions
    .filter((condition) => condition.startsWith('dlc-milestone-'))
    .sort((a, b) => (galarDlcMilestoneChapters[b] ?? 0) - (galarDlcMilestoneChapters[a] ?? 0))[0]
  const dlcChapter = dlcMilestone ? galarDlcMilestoneChapters[dlcMilestone] : undefined
  const dlcFinalChapter = dlcChapter
    ? Math.max(
        dlcChapter,
        ...selectedEvolutionMethods.map((method) =>
          method?.trigger === 'tower-of-darkness' || method?.trigger === 'tower-of-waters' ? 14 : dlcChapter),
      )
    : undefined
  const mutuallyExclusiveGroup = starter || authoredChoiceGroup === 'choice-group-galar-starter'
    ? 'starter'
    : fossil
      ? `fossil-${game.fossils.findIndex((group) => group.includes(root.dex))}`
      : authoredChoiceGroup
        ?? (first.encounter.conditions.some((condition) => condition.startsWith('starter-'))
          ? 'starter-dependent-roamer'
          : first.encounter.conditions.some((condition) => condition.startsWith('tv-option-'))
            ? 'roaming-choice'
            : undefined)

  return {
    obtainable: true,
    preChampion: !postgameOnly,
    chapter: captureChapter,
    finalChapter: evolutionChapter,
    storyOrder: capturePostgame ? (mainStoryChapterCount + 1) * 1_000 : first.storyOrder,
    location: humanizeLocation(first.encounter.location),
    level: `Lv.${first.encounter.minLevel}${first.encounter.maxLevel !== first.encounter.minLevel ? `–${first.encounter.maxLevel}` : ''}`,
    method: first.methodLabel,
    methodId: first.encounter.method,
    sourceSpeciesName: source.dex !== species.dex ? source.name : undefined,
    conditions: activeConditions(first.encounter).map(conditionLabel),
    tradeRequired,
    postgameOnly,
    versionExclusive: isVersionExclusive(source, game, sourceFormIndex),
    sourceKind: starter ? 'starter' : fossil ? 'fossil' : source.dex !== species.dex ? 'evolution' : gift ? 'gift' : staticLike ? 'static' : 'wild',
    mutuallyExclusiveGroup,
    requiredStarterDex: requiredStarterDex ? Number(requiredStarterDex) : undefined,
    dlcMilestone,
    dlcChapter,
    dlcFinalChapter,
    formIndex: finalForm?.formIndex ?? 0,
    formIdentifier: finalForm?.identifier,
    formName: finalForm?.formName ?? undefined,
    formTypes: finalForm?.types,
    formStats: finalForm?.stats,
    formChoices,
    sourceSpeciesDex: source.dex,
    sourceFormIndex,
    sourceFormIdentifier: sourceForm?.identifier,
    sourceFormName: sourceForm?.formName ?? undefined,
    gigantamaxCapable: first.encounter.conditions.includes('gigantamax-capable'),
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
  'ice-stone': '얼음의돌',
  'tart-apple': '새콤한사과',
  'sweet-apple': '달콤한사과',
  'cracked-pot': '깨진포트',
  'chipped-pot': '이빠진포트',
  'galarica-cuff': '가라두구팔찌',
  'galarica-wreath': '가라두구머리장식',
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
  sinnoh8: {
    'fire-stone': 2, 'leaf-stone': 2, 'moon-stone': 2, 'sun-stone': 2,
    'thunder-stone': 2, 'water-stone': 2, 'oval-stone': 3, 'shiny-stone': 6,
    'dawn-stone': 5, 'dusk-stone': 8, 'ice-stone': 7,
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

const galarEvolutionItemUnlocks: Record<string, number> = {
  'thunder-stone': 1,
  'leaf-stone': 2,
  'fire-stone': 5,
  'water-stone': 5,
  'sun-stone': 5,
  'moon-stone': 5,
  'dawn-stone': 5,
  'dusk-stone': 5,
  'tart-apple': 5,
  'sweet-apple': 5,
  'cracked-pot': 5,
  'chipped-pot': 5,
  'ice-stone': 7,
  'shiny-stone': 7,
  'galarica-cuff': 1,
  'galarica-wreath': 1,
}

export function evolutionRequirementChapter(species: CatalogSpecies, game: GameConfig): number {
  const mainStoryChapterCount = getMainStoryChapterCount(game)
  const evolution = evolutionForGame(species, game)
  if (!evolution) return 1
  if (game.familyId === 'galar8') {
    if (evolution.item) return galarEvolutionItemUnlocks[evolution.item] ?? 1
    if (evolution.trigger === 'take-damage') return 5
    if (evolution.trigger === 'tower-of-darkness' || evolution.trigger === 'tower-of-waters') return 1
    return 1
  }
  if (game.familyId === 'sinnoh8' && species.dex === 350) return 3
  if (game.familyId === 'sinnoh8' && evolution.heldItemId) {
    const heldItemChapter: Record<number, number> = {
      110: 3,
      198: 11,
      203: 11,
      204: 11,
      210: 6,
      212: 11,
      229: 11,
      298: 11,
      299: game.id === 'brilliant-diamond' ? 2 : 11,
      300: game.id === 'shining-pearl' ? 2 : 11,
      301: 11,
      302: 11,
      303: 9,
      304: 11,
    }
    return heldItemChapter[evolution.heldItemId] ?? mainStoryChapterCount
  }
  if (evolution.item) {
    const crystalOverride = game.id === 'crystal' ? crystalEvolutionItemUnlocks[evolution.item] : undefined
    return crystalOverride ?? evolutionItemUnlocks[game.familyId]?.[evolution.item] ?? mainStoryChapterCount
  }
  if (species.dex === 462 || species.dex === 476) {
    if (game.familyId === 'sinnoh4' || game.familyId === 'sinnoh8') return 3
    if (game.familyId.startsWith('unova5')) return 5
    return mainStoryChapterCount + 1
  }
  if (species.dex === 470) {
    if (game.familyId === 'sinnoh4' || game.familyId === 'sinnoh8') return 2
    if (game.familyId === 'unova5') return 3
    if (game.familyId === 'unova5-2') return mainStoryChapterCount + 1
    return mainStoryChapterCount + 1
  }
  if (species.dex === 471) {
    if (game.familyId === 'sinnoh4') return 6
    if (game.familyId === 'sinnoh8') return 7
    if (game.familyId === 'unova5') return 6
    if (game.familyId === 'unova5-2') return mainStoryChapterCount + 1
    return mainStoryChapterCount + 1
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
  if (game.familyId === 'galar8' && species.dex === 841 && game.id === 'shield') {
    return '새콤한사과는 소드 버전 전용이므로 소드에서 진화 후 교환해야 합니다.'
  }
  if (game.familyId === 'galar8' && species.dex === 842 && game.id === 'sword') {
    return '달콤한사과는 실드 버전 전용이므로 실드에서 진화 후 교환해야 합니다.'
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
    if (game.familyId === 'sinnoh4' || game.familyId === 'sinnoh8') return '천관산 자기장 구역에서 레벨업'
    if (game.familyId.startsWith('unova5')) return '전기돌동굴에서 레벨업'
    return '이 버전에는 필요한 자기장 장소가 없어 다른 버전에서 진화 후 교환'
  }
  if (species.dex === 470) {
    if (game.familyId === 'sinnoh4' || game.familyId === 'sinnoh8') return '영원의숲 이끼 낀 바위 근처에서 레벨업'
    if (game.familyId.startsWith('unova5')) return '바람개비숲 이끼 낀 바위 근처에서 레벨업'
    return '이 버전에는 이끼 낀 바위가 없어 다른 버전에서 진화 후 교환'
  }
  if (game.familyId === 'sinnoh4' || game.familyId === 'sinnoh8') return '217번도로 얼음 바위 근처에서 레벨업'
  if (game.familyId.startsWith('unova5')) return '태엽산 얼음 바위 근처에서 레벨업'
  return '이 버전에는 얼음 바위가 없어 다른 버전에서 진화 후 교환'
}

export function evolutionText(species: CatalogSpecies, game?: GameConfig): string {
  const evolution = game ? evolutionForGame(species, game) : species.evolution
  if (!evolution) return '진화 없음 또는 기본 형태'
  if (evolution.trigger === 'three-critical-hits') return `한 전투에서 급소를 3번 맞힌 뒤 ${species.name} 진화`
  if (evolution.trigger === 'take-damage') return `한 번에 49 이상 피해를 받은 뒤 모래먼지구덩이 돌 아치 아래를 지나 ${species.name} 진화`
  if (evolution.trigger === 'spin') return `마빌크에게 사탕공예를 지니게 하고 회전해 ${species.name} 진화`
  if (evolution.trigger === 'tower-of-darkness') return `갑옷섬 악의 탑 정상에서 ${species.name} 진화`
  if (evolution.trigger === 'tower-of-waters') return `갑옷섬 물의 탑 정상에서 ${species.name} 진화`
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
    const stochastic = game?.familyId === 'galar8' && evolution.item === 'chipped-pot'
      ? ' (래터럴마을 오늘의 특가에서 날짜별 확률 판매)'
      : ''
    return `${gender ? `${gender}에게 ` : ''}${evolutionItemKo[evolution.item] ?? evolution.item} 사용으로 ${species.name} 진화${stochastic}`
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
