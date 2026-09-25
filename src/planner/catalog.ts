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
import { modernClassicFamilies } from './modernPolicy'
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
  locationNames: Record<string, Record<string, string>>
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
let modernLocationNames: ModernEncounterSnapshot['locationNames'] = {}
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
      modernLocationNames = modern.locationNames ?? {}
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
  'petalburg-woods': '등화숲',
  'meteor-falls': '유성폭포',
  'shoal-cave': '여울의 동굴',
  'mt-pyre': '송화산',
  'sea-mauville': '해상보라',
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
  kalos6: ['kiloude-city', 'friend-safari', 'unknown-dungeon', 'sea-spirits-den'],
  hoenn6: ['battle-resort', 'sky-pillar'],
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
  'yellow-flowers': '노란 꽃밭',
  'purple-flowers': '보라 꽃밭',
  'red-flowers': '빨간 꽃밭',
  flowers: '꽃밭',
  'rough-terrain': '거친 지형',
  'tall-grass': '긴 풀숲',
  horde: '무리 배틀',
  ambush: '매복 조우',
  'friend-safari': '프렌드사파리',
  dexnav: '도감내비 전용',
  'fishing-bubbling': '낚시(물거품 포인트)',
  sos: 'SOS 호출',
  'berry-pile': '나무열매 더미',
  'island-scan': '아일랜드 스캔',
  'wild-unspecified': '야생(방식 미확인)',
  'sea-skim': '물결타기 수면',
  sky: '하늘 비행',
  landmark: '흔들리는 나무·광석',
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
    'old-rod': 2, 'good-rod': 5, 'super-rod': 9, surf: 4, 'rock-smash': 3,
    headbutt: 2, 'headbutt-low': 2, 'headbutt-normal': 2, 'headbutt-high': 2,
  },
  unova5: { 'super-rod': 9, 'super-rod-spots': 9, surf: 6, 'surf-spots': 6, 'bubbling-spots': 6 },
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
  // ORAS 전설 고정 심볼 중 파티·환상의 장소 전제를 검증하지 못한 경로와 배포 무한의티켓 경로
  'special-prerequisite-unresolved',
  'event-item-eon-ticket',
  // 알로라 아일랜드 스캔은 실제 QR 코드를 스캔해 모은 포인트가 필요합니다.
  'island-scan-qr',
  'other-event-arceus-in-party',
  'other-virtual-console',
  'other-regirock-regice-registeel-in-party',
]

// 비용만 드는 입수 경로는 조건부 경로로 낮추지 않습니다.
const informationalConditions = new Set(['magikarp-salesman'])

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
  'rock-smash': '바위깨기 필요',
  'calendar-trash-can': '날짜별 쓰레기통 조사',
  'daily-roaming-trader': '날마다 위치가 바뀌는 교환 NPC',
  'trade-any': '아무 포켓몬과 교환',
  'friend-code-dependent': '친구 코드에 따라 달라짐',
  'form-region-dependent': '본체 지역 설정에 따른 폼',
  'roaming-found-11-times': '배회 포켓몬을 11번 조우한 뒤',
  'version-exclusive-fossil': '버전 전용 화석',
  'devon-scope': '데봉스코프 필요',
  'mirage-spot': '날짜마다 바뀌는 환상의 장소',
  soaring: '무한의 피리로 하늘 날기',
  'story-progress-primal-defeated': '원시 그란돈·가이오가 사건 이후',
  'story-progress-go-goggles': 'Go고글 입수 후',
  'story-progress-eon-gift': '남쪽 외딴섬 이벤트',
  'delta-episode': '델타 에피소드',
  'delta-episode-complete': '델타 에피소드 완료 후',
  'method-unresolved': '원본에서 조우 방식 미확인',
  'machamp-shove': '괴력몬 푸시 필요',
  fishing: '낚싯대 필요',
  'story-climax': '스토리 결전',
  'ultra-beast-quest': '울트라비스트 포획 임무',
  'time-morning': '아침',
  'time-day': '낮',
  'time-night': '밤',
  'time-evening': '저녁',
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
  'rare-spawn': '희귀 출현 · 포획 콤보·향로로 확률 상승',
  'catch-count-30': '누적 포획 30마리 이상',
  'catch-count-50': '누적 포획 50마리 이상',
  'catch-count-60': '누적 포획 60마리 이상',
  'catch-five-growlithe': '가디 5마리 포획 후',
  'catch-five-meowth': '나옹 5마리 포획 후',
  'magikarp-salesman': '잉어킹 판매원에게 500원에 구입',
  'other-caught-articuno': '프리저 포획 후',
  'other-caught-zapdos': '썬더 포획 후',
  'other-caught-moltres': '파이어 포획 후',
  'gimmighoul-chest': '보물상자 속 모으령',
  alpha: '우두머리 개체',
  'basculegion-ride': '대쓰여너 라이드 필요',
  'ruinous-stakes': '재앙의 말뚝을 모두 뽑은 뒤',
  'mutually-exclusive-starter': '스타터 중 하나만 선택',
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
  'sos', 'berry-pile',
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
  if (condition.startsWith('trade-for-')) {
    const requested = condition.slice('trade-for-'.length)
    return `게임 내 교환 요구: ${speciesCatalog.find((species) => species.id === requested)?.name ?? requested}`
  }
  if (condition.startsWith('choice-group-')) return '여러 후보 중 하나만 선택'
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

function humanizeLocation(location: string, game?: GameConfig): string {
  // 6세대 이후 버전은 PKHeX 공식 한국어 장소명을 먼저 씁니다.
  const official = game ? modernLocationNames[game.id]?.[location] : undefined
  if (official) return official
  const translated = Object.entries(locationKo).find(([key]) => location.includes(key))
  if (translated) return translated[1]
  const route = location.match(/(?:^|-)(?:sea-)?route-(\d+)(?:-|$)/)
  if (route) return `${route[1]}번도로`
  return location
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function shedEvolutionLevel(species: CatalogSpecies): number {
  return speciesCatalog.find((candidate) =>
    candidate.evolvesFrom === species.evolvesFrom
    && candidate.dex !== species.dex
    && candidate.evolution?.trigger === 'level-up')?.evolution?.minLevel ?? 0
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

export function generationLineage(species: CatalogSpecies, generation: number, familyId?: string): CatalogSpecies[] {
  return [...ancestors(species), species].filter((entry) => entry.generation <= generation
    // 레츠고에는 관동 151종만 나오므로 피츄 같은 이후 세대 진화 전 형태를 계열에서 뺍니다.
    && (familyId !== 'letsgo7' || entry.dex <= 151))
}

function chainRoot(species: CatalogSpecies): CatalogSpecies {
  return ancestors(species)[0] ?? species
}

const regionalEvolutionFamilies: Record<string, string[]> = {
  alola: ['alola7', 'alola7-ultra'],
  galar: ['galar8'],
  hisui: ['hisui8'],
  paldea: ['paldea9'],
}

function regionalFormRegion(pokemonId: number | null | undefined): string | null {
  const identifier = pokemonId ? getGen8FormProfileByPokemonId(pokemonId)?.identifier : undefined
  return identifier ? /-(alola|galar|hisui|paldea)(?:-|$)/.exec(identifier)?.[1] ?? null : null
}

function isAlolanForm(pokemonId: number | null | undefined): boolean {
  return Boolean(pokemonId && getGen8FormProfileByPokemonId(pokemonId)?.identifier.endsWith('-alola'))
}

// PKHeX evos_gg 기준으로 레츠고에는 시간대 조건이 없고, 알로라 나옹은 친밀도가 아닌 Lv.28에 진화합니다.
function letsGoEvolution(method: CatalogEvolutionMethod): CatalogEvolutionMethod {
  if (method.minHappiness && method.baseFormId === 10107) return { ...method, minHappiness: null, minLevel: 28, time: null }
  return method.time ? { ...method, time: null } : method
}

const heldItemIdentifiers: Record<number, string> = {
  110: 'oval-stone', 198: 'kings-rock', 203: 'deep-sea-tooth', 204: 'deep-sea-scale', 210: 'metal-coat',
  212: 'dragon-scale', 229: 'up-grade', 298: 'protector', 299: 'electirizer', 300: 'magmarizer',
  301: 'dubious-disc', 302: 'reaper-cloth', 303: 'razor-claw', 304: 'razor-fang',
}
// PKHeX evos_la 기준으로 LEGENDS 아르세우스는 통신교환 진화를 연결의끈으로, 도구를 지니고 하던 진화를 도구 사용으로 바꾸고,
// 자기장·이끼 낀 바위·얼음 바위 진화도 천둥·리프·얼음의돌로 할 수 있습니다.
const hisuiStoneEvolutions: Record<number, string> = { 462: 'thunder-stone', 476: 'thunder-stone', 470: 'leaf-stone', 471: 'ice-stone' }

function hisuiEvolution(
  species: CatalogSpecies,
  method: CatalogEvolution | CatalogEvolutionMethod,
): CatalogEvolution | CatalogEvolutionMethod {
  const stone = hisuiStoneEvolutions[species.dex]
  if (stone) return { ...method, trigger: 'use-item', item: stone, minLevel: null, heldItemId: null }
  if (method.trigger === 'trade' && !method.tradeSpeciesId) {
    const item = method.heldItemId ? heldItemIdentifiers[method.heldItemId] : 'linking-cord'
    return item ? { ...method, trigger: 'use-item', item, heldItemId: null } : method
  }
  if (method.heldItemId && heldItemIdentifiers[method.heldItemId]) {
    return { ...method, trigger: 'use-item', item: heldItemIdentifiers[method.heldItemId], heldItemId: null, minLevel: null }
  }
  return method
}

export function evolutionForGame(
  species: CatalogSpecies,
  game: GameConfig,
  basePokemonId?: number,
  baseFormIndex?: number,
): CatalogEvolution | CatalogEvolutionMethod | null {
  // 레츠고에는 #152 이후 진화 전 포켓몬(피츄·흉내내 등)이 없어 피카츄·마임맨 등은 진화로 얻지 않습니다.
  if (game.familyId === 'letsgo7' && species.evolvesFrom && species.evolvesFrom > 151) return null
  const result = evolutionMethodForGame(species, game, basePokemonId, baseFormIndex)
  if (game.familyId === 'hisui8' && result) return hisuiEvolution(species, result)
  return game.familyId === 'letsgo7' && result && 'versionGroupId' in result ? letsGoEvolution(result) : result
}

function evolutionMethodForGame(
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
    // 레츠고에는 알로라 지역 진화가 없어 관동 모습은 관동 모습으로만 진화하고,
    // 교환으로 받은 알로라 모습만 같은 알로라 모습으로 진화합니다.
    // 스칼렛·바이올렛 본편에는 LEGENDS 아르세우스 전용 진화(흑요석·이탄블록·스타일 기술 등)가 없습니다.
    .filter((method) => game.familyId !== 'paldea9' || method.versionGroupId !== 24)
    // 알로라·가라르·히스이 땅에서만 일어나는 지역 폼 진화(피카츄 → 알로라 라이츄, 갈모매 → 히스이 워글 등)는
    // 그 지역 게임에서만 쓰고, 지역 폼끼리의 진화(히스이 가디 → 히스이 윈디)는 어느 게임에서나 씁니다.
    .filter((method) => {
      const region = regionalFormRegion(method.evolvedFormId)
      if (!region || regionalFormRegion(method.baseFormId) === region) return true
      return regionalEvolutionFamilies[region].includes(game.familyId)
    })
    .filter((method) => {
      if (game.familyId !== 'letsgo7') return true
      const alolanBase = isAlolanForm(method.baseFormId)
      if (method.versionGroupId && [17, 18].includes(method.versionGroupId) && !alolanBase) return false
      return !alolanBase || method.baseFormId === basePokemonId
    })
    .sort((a, b) =>
      Number(b.versionGroupId === game.versionGroupId) - Number(a.versionGroupId === game.versionGroupId)
      || Number(b.default) - Number(a.default)
      || (b.versionGroupId ?? 0) - (a.versionGroupId ?? 0))
  if (candidates[0]) return candidates[0]
  if (basePokemonId) {
    // 알로라 모래두지·식스테일처럼 PokéAPI가 지역 폼 진화를 이후 버전 그룹에만 기록한 경우,
    // 같은 기본 폼의 가장 이른 행을 씁니다(지역 폼이 처음 나온 세대부터 같은 조건입니다).
    const regional = species.evolutionMethods
      .filter((method) => method.baseFormId === basePokemonId)
      .filter((method) => game.familyId !== 'paldea9' || method.versionGroupId !== 24)
      .sort((a, b) => (a.versionGroupId ?? 0) - (b.versionGroupId ?? 0))[0]
    return regional ?? null
  }
  return game.familyId === 'paldea9' ? null : species.evolution
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
  rareSpawn: boolean
  parallelDlc: boolean
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
  if (['kalos6', 'hoenn6', 'alola7', 'alola7-ultra', 'galar8', 'sinnoh8', 'letsgo7', 'hisui8', 'paldea9'].includes(game.familyId)) {
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
  const line = generationLineage(species, game.generation, game.familyId)
  return line.some((entry) => hasEncounter(entry, game.versionId, form))
    && siblings.every((sibling) => line.every((entry) => !hasEncounter(entry, sibling.versionId, form)))
}

const availabilityCache = new Map<string, Availability>()
const availabilityInProgress = new Set<string>()

// 레츠고 파트너 피카츄·이브이는 전용 폼 선물이며 진화·교환할 수 없습니다.
function isLetsGoPartner(encounter: CatalogEncounter, source: CatalogSpecies): boolean {
  return encounter.method === 'gift'
    && Boolean(getGen8FormProfile(source.dex, encounter.form ?? 0)?.identifier.endsWith('-starter'))
}

function requestedTradeAvailability(encounter: CatalogEncounter, game: GameConfig): Availability | null {
  if (!modernClassicFamilies.has(game.familyId)) return null
  const requestedId = encounter.conditions.find((condition) => condition.startsWith('trade-for-'))?.slice('trade-for-'.length)
  const requested = requestedId ? speciesCatalog.find((species) => species.id === requestedId) : undefined
  if (!requested || availabilityInProgress.has(`${game.id}:${requested.dex}:*`)) return null
  return getAvailability(requested, game)
}

export function getAvailability(species: CatalogSpecies, game: GameConfig, desiredSourceFormIndex?: number): Availability {
  const key = `${game.id}:${species.dex}:${desiredSourceFormIndex ?? '*'}`
  const cached = availabilityCache.get(key)
  if (cached) return cached
  availabilityInProgress.add(key)
  try {
    const availability = computeAvailability(species, game, desiredSourceFormIndex)
    availabilityCache.set(key, availability)
    return availability
  } finally {
    availabilityInProgress.delete(key)
  }
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
  if (game.familyId === 'letsgo7' && species.dex > 151) {
    return {
      obtainable: false, preChampion: false, chapter: 99, location: '-', level: '-',
      finalChapter: 99,
      storyOrder: 99_000,
      tradeRequired: false, postgameOnly: false, versionExclusive: false, sourceKind: 'unknown',
      reason: species.dex === 808 || species.dex === 809
        ? '멜탄·멜메탈은 포켓몬 GO 연동(GO파크·수수께끼의 박스)이 필요합니다.'
        : '레츠고 피카츄·이브이에는 #001–151과 멜탄·멜메탈만 등장합니다.',
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
  const line = generationLineage(species, game.generation, game.familyId)
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
      const parallelDlc = encounter.conditions.some((condition) => condition.startsWith('dlc-milestone-'))
        || pathMethods.some((method) => Boolean(method?.item && galarEvolutionItemDlc[method.item]))
      const tradeRequired = evolutionLine.some((entry, index) =>
        pathMethods[index]?.trigger === 'trade' || Boolean(crossVersionEvolutionReason(entry, game)),
      )
      const conditions = activeConditions(encounter)
      const encounterTiming = encounterChapter(game, encounter)
      const requestedTrade = requestedTradeAvailability(encounter, game)
      // 게임 내 교환은 요구 포켓몬(진화형이면 진화까지)을 처음 준비할 수 있는 장보다 앞설 수 없습니다.
      const requestedChapter = requestedTrade?.obtainable ? Math.max(requestedTrade.chapter, requestedTrade.finalChapter) : 0
      const timing = requestedChapter > encounterTiming.chapter
        ? { ...encounterTiming, chapter: requestedChapter, storyOrder: requestedChapter * 1_000 + 800 + encounter.minLevel / 100 }
        : encounterTiming
      const readyChapter = Math.max(
        timing.chapter,
        ...evolutionLine.map((entry, index) => {
          const evolution = pathMethods[index]
          // 껍질몬은 토중몬이 아이스크(Lv.20)로 진화할 때 함께 생깁니다.
          const level = evolution?.minLevel ?? (evolution?.trigger === 'shed' ? shedEvolutionLevel(entry) : 0)
          const levelChapter = level ? Math.ceil(level / (60 / mainStoryChapterCount)) : 1
          const requirementChapter = crossVersionEvolutionReason(entry, game)
            ? 1
            : evolutionRequirementChapter(entry, game, pathMethods[index])
          return Math.max(levelChapter, requirementChapter)
        }),
      )
      const ordinaryMethod = [
        'walk', 'surf', 'old-rod', 'good-rod', 'super-rod', 'rock-smash',
        'headbutt', 'headbutt-low', 'headbutt-normal', 'headbutt-high', 'seaweed',
        'surf-spots', 'super-rod-spots', 'dark-grass', 'grass-spots', 'cave-spots',
        'bridge-spots', 'feebas-tile-fishing', 'bubbling-spots',
        'yellow-flowers', 'purple-flowers', 'red-flowers', 'flowers', 'rough-terrain', 'tall-grass',
        'horde', 'ambush', 'fishing', 'fishing-bubbling', 'sos', 'berry-pile',
      ].includes(encounter.method)
        || (['letsgo7', 'paldea9', 'hisui8'].includes(game.familyId) && ['overworld', 'sea-skim', 'landmark'].includes(encounter.method))
      const conditional = conditions.some((condition) => !informationalConditions.has(condition))
        || conditionalMethods.has(encounter.method)
      return {
        encounter,
        source,
        postgame: isPostgameEncounter(game, encounter),
        tradeRequired,
        readyChapter,
        evolutionSteps: evolutionLine.length,
        conditional,
        rareSpawn: conditions.includes('rare-spawn'),
        parallelDlc,
        methodLabel: [
          methodKo[encounter.method] ?? encounter.method,
          ...conditions.map(conditionLabel),
        ].join(' · '),
        unavailableReason: invalidFormEvolution
          ? '이 폼은 목표 진화형으로 진화할 수 없습니다.'
          : evolutionLine.length > 0 && isLetsGoPartner(encounter, source)
            ? '파트너 피카츄·이브이는 진화할 수 없습니다.'
          : requestedTrade && !requestedTrade.obtainable
            ? '교환에 필요한 포켓몬을 이 버전에서 잡을 수 없습니다.'
          : encounter.conditions.some((condition) => unavailableConditions.includes(condition))
          ? '이벤트 또는 별도 배포 조건이 필요한 입수 경로입니다.'
          : encounter.conditions.some((condition) => condition.startsWith('johto-safari-blocks-'))
            ? '사파리존 블록 배치와 대기 일수의 정확한 해금 시점이 모델링되지 않았습니다.'
          : eventOnlyLocations.some((location) => locationMatchesToken(encounter.location, location))
            // ORAS 남쪽 외딴섬의 라티오스/라티아스 선물은 본편 스토리 이벤트입니다.
            && !encounter.conditions.includes('story-progress-eon-gift')
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

  const preChampion = eligible.filter((entry) =>
    !entry.postgame && (entry.readyChapter <= mainStoryChapterCount || entry.parallelDlc))
  const pool = preChampion.length ? preChampion : eligible
  const effectiveReadyChapter = (entry: RankedEncounter) => Math.max(
    entry.readyChapter,
    ...entry.encounter.conditions
      .filter((condition) => condition.startsWith('dlc-milestone-'))
      .map((condition) => galarDlcMilestoneChapters[condition] ?? 0),
  )
  pool.sort((a, b) =>
    Number(a.tradeRequired) - Number(b.tradeRequired)
    || Number(a.encounter.conditions.some((condition) => condition.startsWith('dlc-milestone-')))
      - Number(b.encounter.conditions.some((condition) => condition.startsWith('dlc-milestone-')))
    || Number(a.conditional) - Number(b.conditional)
    // 확률이 낮은 희귀 출현보다 조건만 채우면 확실한 선물을 먼저 씁니다.
    || Number(a.rareSpawn) - Number(b.rareSpawn)
    || Number(isLetsGoPartner(b.encounter, b.source)) - Number(isLetsGoPartner(a.encounter, a.source))
    || effectiveReadyChapter(a) - effectiveReadyChapter(b)
    || a.storyOrder - b.storyOrder
    || a.evolutionSteps - b.evolutionSteps
    || a.encounter.minLevel - b.encounter.minLevel
    || (b.encounter.chance ?? 0) - (a.encounter.chance ?? 0)
    || b.source.dex - a.source.dex,
  )
  const first = pool[0]
  const source = first.source
  const sourceFormIndex = first.encounter.form ?? 0
  const sourceForm = game.generation >= 6
    ? getGen8FormProfile(source.dex, sourceFormIndex)
    : undefined
  const evolutionLine = line.slice(line.indexOf(source) + 1)
  let evolvedForm = sourceForm
  const selectedEvolutionMethods: (CatalogEvolution | CatalogEvolutionMethod | null)[] = []
  for (const evolvedSpecies of evolutionLine) {
    const method = evolutionForGame(evolvedSpecies, game, evolvedForm?.pokemonId, evolvedForm?.formIndex)
    selectedEvolutionMethods.push(method)
    if (game.generation >= 6) {
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
    : evolvedForm ?? (game.generation >= 6 ? getGen8DefaultFormProfile(species.dex) : undefined)
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
  const evolutionTimingInferred = evolutionLine.some((entry, index) =>
    !evolutionTimingVerified(entry, game, selectedEvolutionMethods[index]))
  const tradeRequired = source.dex !== species.dex && (
    selectedEvolutionMethods.some((method) => method?.trigger === 'trade')
    || Boolean(externalEvolution)
  )
  const capturePostgame = first.postgame || first.chapter > mainStoryChapterCount
  const captureChapter = capturePostgame ? mainStoryChapterCount + 1 : first.chapter
  const evolutionChapter = Math.max(captureChapter, first.readyChapter)
  const evolutionDlc = game.familyId === 'galar8'
    ? selectedEvolutionMethods
        .map((method) => method?.item ? galarEvolutionItemDlc[method.item] : undefined)
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .sort((a, b) => b.dlcChapter - a.dlcChapter)[0]
    : undefined
  const postgameOnly = capturePostgame || (!evolutionDlc && evolutionChapter > mainStoryChapterCount)
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
  const encounterDlcMilestone = first.encounter.conditions
    .filter((condition) => condition.startsWith('dlc-milestone-'))
    .sort((a, b) => (galarDlcMilestoneChapters[b] ?? 0) - (galarDlcMilestoneChapters[a] ?? 0))[0]
  const dlcMilestone = encounterDlcMilestone
  const dlcChapter = dlcMilestone ? galarDlcMilestoneChapters[dlcMilestone] : undefined
  const dlcFinalChapter = dlcChapter
    ? Math.max(
        dlcChapter,
        evolutionDlc?.dlcFinalChapter ?? dlcChapter,
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
    location: humanizeLocation(first.encounter.location, game),
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
    evolutionDlcMilestone: evolutionDlc?.dlcMilestone,
    evolutionDlcChapter: evolutionDlc?.dlcChapter,
    evolutionDlcFinalChapter: evolutionDlc?.dlcFinalChapter,
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
    quality: evolutionTimingInferred ? 'inferred' : starter || fossil ? 'verified' : first.quality,
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
  'auspicious-armor': '축복받은갑옷',
  'malicious-armor': '저주받은갑옷',
  'linking-cord': '연결의끈',
  'black-augurite': '검은휘석',
  'peat-block': '피트블록',
  'metal-coat': '금속코트',
  electirizer: '에레키부스터',
  magmarizer: '마그마부스터',
  protector: '프로텍터',
  'reaper-cloth': '영계의천',
  'up-grade': '업그레이드',
  'dubious-disc': '괴상한패치',
  'razor-claw': '예리한손톱',
  'razor-fang': '예리한이빨',
  'oval-stone': '동글동글돌',
  'kings-rock': '왕의징표석',
  'dragon-scale': '용의비늘',
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
  // 8번도로 리프의돌, 10·11번도로 천둥의돌, Reflection Cave 달의돌, 파도타기로 가는 3번도로 각성의돌,
  // 12번도로 물의돌·빛의돌, 미르시티 Stone Emporium 불꽃의돌, 끝의 동굴 어둠의돌
  kalos6: {
    'leaf-stone': 2, 'thunder-stone': 3, 'moon-stone': 3, 'dawn-stone': 3,
    'water-stone': 4, 'shiny-stone': 4, 'fire-stone': 5, 'dusk-stone': 9,
  },
  // 불꽃샛길(괴력) 불꽃의돌, 유성폭포 달의돌, 해상보라 각성의돌, 119번도로 리프의돌, 121번도로 빛의돌,
  // 송화산 어둠의돌, 이끼시티 우주센터 태양의돌, 124번도로 보물사냥꾼 물의돌, 뉴보라 천둥의돌
  hoenn6: {
    'fire-stone': 4, 'moon-stone': 4, 'dawn-stone': 5, 'leaf-stone': 6, 'shiny-stone': 7,
    'dusk-stone': 7, 'sun-stone': 8, 'water-stone': 8, 'thunder-stone': 9,
  },
  // 코니코니시티 보석 가게(불꽃·천둥·물·리프·얼음), 말리시티 태양의돌, 13번도로 달의돌, 포니 황야 어둠의돌.
  // 각성의돌은 엔딩 후 구즈마 재대결 보상으로 확인되어 본편에서는 쓰지 않습니다.
  alola7: {
    'fire-stone': 3, 'thunder-stone': 3, 'water-stone': 3, 'leaf-stone': 3, 'ice-stone': 3,
    'sun-stone': 4, 'moon-stone': 4, 'dusk-stone': 6, 'dawn-stone': 9,
  },
  'alola7-ultra': {
    'fire-stone': 3, 'thunder-stone': 3, 'water-stone': 3, 'leaf-stone': 3, 'ice-stone': 3,
    'sun-stone': 4, 'moon-stone': 4, 'dusk-stone': 6, 'dawn-stone': 9,
  },
  // 달맞이산 B2F 달의돌, 무지개시티 백화점 4층(불꽃·천둥·물·리프·얼음의돌 각 5000원)과 포켓몬타워 5층 얼음의돌
  letsgo7: {
    'moon-stone': 2, 'fire-stone': 4, 'thunder-stone': 4, 'water-stone': 4, 'leaf-stone': 4, 'ice-stone': 4,
  },
  // 남쪽 3구역 달의돌, 보울체육관 테스트 보상 태양의돌, 배지 3개 이후 프렌들리숍의 불꽃·천둥·물·리프의돌,
  // 동쪽 3구역 각성의돌, 나페산 얼음의돌과 프리지체육관 뒤 어둠의돌. 빛의돌은 고정 입수처를 확인하지 못했습니다.
  paldea9: {
    'moon-stone': 2, 'sun-stone': 3, 'fire-stone': 4, 'thunder-stone': 4, 'water-stone': 4, 'leaf-stone': 4,
    'dawn-stone': 5, 'ice-stone': 7, 'dusk-stone': 7,
  },
}


// 스칼렛·바이올렛에서 기술을 배운 뒤 진화하는 포켓몬: 키링키 트윈빔 Lv.32, 노고치 하이퍼드릴 Lv.32, 성원숭 분노의주먹 Lv.35
const paldeaMoveEvolutionLevels: Record<number, number> = { 887: 32, 888: 32, 889: 35 }
const paldeaEvolutionMoveKo: Record<number, string> = { 887: '하이퍼드릴', 888: '트윈빔', 889: '분노의주먹' }
// 동전 999개 모으기와 대장의징표 절각참 3마리 쓰러뜨리기는 시점을 확인하지 못해 마지막 장 추론으로 둡니다.
const unresolvedPaldeaTriggers = new Set([
  'gimmighoul-coins', 'three-defeated-bisharp',
  // LEGENDS 아르세우스: 속공·강공 스타일 기술 20회, 반동 피해 294, 보름달 피트블록
  'agile-style-move', 'strong-style-move', 'recoil-damage',
])

function chapterForStoryLevel(level: number, game: GameConfig): number {
  const index = getFamily(game).chapters.findIndex((chapter) =>
    Math.max(...(chapter.level.match(/\d+/g) ?? ['0']).map(Number)) >= level)
  return index >= 0 ? Math.min(index + 1, getMainStoryChapterCount(game)) : getMainStoryChapterCount(game)
}

export function evolutionTimingVerified(
  species: CatalogSpecies,
  game: GameConfig,
  evolution: CatalogEvolution | CatalogEvolutionMethod | null = evolutionForGame(species, game),
): boolean {
  if (!modernClassicFamilies.has(game.familyId)) return true
  if (evolution && unresolvedPaldeaTriggers.has(evolution.trigger)) return false
  if (!evolution || evolution.trigger === 'trade') return true
  if (evolution.item) return evolutionItemUnlocks[game.familyId]?.[evolution.item] !== undefined
  return !evolution.heldItemId
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
  'galarica-cuff': 12,
  'galarica-wreath': 16,
}

const galarEvolutionItemDlc: Record<string, {
  dlcMilestone: string
  dlcChapter: number
  dlcFinalChapter: number
}> = {
  'galarica-cuff': {
    dlcMilestone: 'dlc-milestone-isle-access',
    dlcChapter: 12,
    dlcFinalChapter: 12,
  },
  'galarica-wreath': {
    dlcMilestone: 'dlc-milestone-crown-access',
    dlcChapter: 16,
    dlcFinalChapter: 16,
  },
}

export function evolutionRequirementChapter(
  species: CatalogSpecies,
  game: GameConfig,
  evolution: CatalogEvolution | CatalogEvolutionMethod | null = evolutionForGame(species, game),
): number {
  const mainStoryChapterCount = getMainStoryChapterCount(game)
  if (!evolution) return 1
  if (game.familyId === 'galar8') {
    if (evolution.item) return galarEvolutionItemUnlocks[evolution.item] ?? 1
    if (evolution.trigger === 'take-damage') return 5
    if (evolution.trigger === 'tower-of-darkness' || evolution.trigger === 'tower-of-waters') return 1
    return 1
  }
  if (game.familyId === 'sinnoh8' && species.dex === 350) return 3
  if (game.familyId === 'hisui8' && unresolvedPaldeaTriggers.has(evolution.trigger)) return mainStoryChapterCount
  if (game.familyId === 'paldea9') {
    const method: Partial<CatalogEvolutionMethod> = evolution
    if (unresolvedPaldeaTriggers.has(evolution.trigger)) return mainStoryChapterCount
    const moveLevel = paldeaMoveEvolutionLevels[method.knownMoveId ?? method.usedMoveId ?? 0]
    if (moveLevel) return chapterForStoryLevel(moveLevel, game)
  }
  if (modernClassicFamilies.has(game.familyId) && evolution.trigger !== 'trade' && evolution.heldItemId) {
    return mainStoryChapterCount
  }
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
  if (game.familyId === 'kalos6') {
    // 13번도로 자기장, 프로스트케이브 얼음 바위, 20번도로 이끼 낀 바위, 비가 잦은 14번도로
    if (species.dex === 462 || species.dex === 476) return 5
    if (species.dex === 471) return 7
    if (species.dex === 470) return 9
    if (species.dex === 706) return 6
  }
  if (game.familyId === 'alola7' || game.familyId === 'alola7-ultra') {
    // 담청산 자기장(투구뿌논 포함), 밀림 이끼 낀 바위, 라나키라마운틴 얼음 바위(모단단게 포함)
    if ([462, 476, 738].includes(species.dex)) return 4
    if (species.dex === 470) return 2
    if (species.dex === 471 || species.dex === 740) return 7
  }
  if (game.familyId === 'hoenn6') {
    // 뉴보라 자기장, 등화숲 이끼 낀 바위, 여울의 동굴 얼음 바위, 잿빛시티에서 받는 포켓몬스넥 키트
    if (species.dex === 462 || species.dex === 476) return 9
    if (species.dex === 470) return 1
    if (species.dex === 471) return 8
    if (species.dex === 350) return 2
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
  if (game.id === 'violet' && species.dex === 936) {
    return '축복받은갑옷은 스칼렛 전용 보상이므로 스칼렛에서 진화 후 교환해야 합니다.'
  }
  if (game.id === 'scarlet' && species.dex === 937) {
    return '저주받은갑옷은 바이올렛 전용 보상이므로 바이올렛에서 진화 후 교환해야 합니다.'
  }
  if (game.familyId === 'paldea9' && species.dex === 964) {
    return '돌핀맨은 유니온서클에서 다른 플레이어와 함께 있을 때만 진화하므로 무교환 단독 진행에서는 쓸 수 없습니다.'
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
  763: '짓밟기',
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
  if (game && (game.familyId === 'alola7' || game.familyId === 'alola7-ultra')) {
    if ([462, 476, 738].includes(species.dex)) return '담청산 또는 포니대협곡에서 레벨업'
    if (species.dex === 470) return '밀림 이끼 낀 바위 근처에서 레벨업'
    if (species.dex === 471 || species.dex === 740) return '라나키라마운틴에서 레벨업'
  }
  if (![462, 470, 471, 476].includes(species.dex)) return null
  if (!game) return '특정 장소에서 레벨업'
  if (game.familyId === 'hoenn6') {
    if (species.dex === 470) return '등화숲 이끼 낀 바위 근처에서 레벨업'
    if (species.dex === 471) return '여울의 동굴 얼음 바위 근처에서 레벨업'
    return '뉴보라에서 레벨업'
  }
  if (game.familyId === 'kalos6') {
    if (species.dex === 470) return '20번도로 이끼 낀 바위 근처에서 레벨업'
    if (species.dex === 471) return '프로스트케이브 얼음 바위 근처에서 레벨업'
    return '13번도로 자기장 구역에서 레벨업'
  }
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

export function evolutionText(species: CatalogSpecies, game?: GameConfig, formIdentifier?: string): string {
  if (species.dex === 892 && game) {
    const choice = getAvailability(species, game).formChoices
      ?.find((entry) => entry.formIdentifier === formIdentifier)
    if (choice?.evolutionTrigger === 'tower-of-darkness') return `악의 탑 정상에서 ${species.name} 진화`
    if (choice?.evolutionTrigger === 'tower-of-waters') return `물의 탑 정상에서 ${species.name} 진화`
  }
  // 알로라 모습처럼 진화 결과 폼이 정해져 있으면 그 폼으로 끝나는 진화 행을 씁니다.
  const evolvedPokemonId = formIdentifier ? getGen8FormProfileByIdentifier(formIdentifier)?.pokemonId : undefined
  const formEvolution = game && evolvedPokemonId && game.generation >= 6
    ? species.evolutionMethods.find((method) => method.evolvedFormId === evolvedPokemonId)
    : undefined
  const evolution = formEvolution
    ? game?.familyId === 'letsgo7' ? letsGoEvolution(formEvolution) : formEvolution
    : game ? evolutionForGame(species, game) : species.evolution
  if (!evolution) return '진화 없음 또는 기본 형태'
  if (evolution.trigger === 'three-critical-hits') return `한 전투에서 급소를 3번 맞힌 뒤 ${species.name} 진화`
  if (evolution.trigger === 'take-damage') return `한 번에 49 이상 피해를 받은 뒤 모래먼지구덩이 돌 아치 아래를 지나 ${species.name} 진화`
  if (evolution.trigger === 'spin') return `마빌크에게 사탕공예를 지니게 하고 회전해 ${species.name} 진화`
  if (evolution.trigger === 'tower-of-darkness') return `갑옷섬 악의 탑 정상에서 ${species.name} 진화`
  if (evolution.trigger === 'tower-of-waters') return `갑옷섬 물의 탑 정상에서 ${species.name} 진화`
  const paldeaMethod: Partial<CatalogEvolutionMethod> = evolution
  if (evolution.trigger === 'agile-style-move') return `배리어러시를 속공으로 20번 쓴 뒤 레벨업으로 ${species.name} 진화`
  if (evolution.trigger === 'strong-style-move') return `독침천발을 강공으로 20번 쓴 뒤 레벨업으로 ${species.name} 진화`
  if (evolution.trigger === 'recoil-damage') return `기절하지 않고 반동 피해를 294 이상 받은 뒤 레벨업으로 ${species.name} 진화`
  if (evolution.trigger === 'gimmighoul-coins') return `모으령의코인 999개를 모은 뒤 레벨업으로 ${species.name} 진화`
  if (evolution.trigger === 'three-defeated-bisharp') return `대장의징표를 지닌 절각참 3마리를 쓰러뜨린 뒤 레벨업으로 ${species.name} 진화`
  if (evolution.trigger === 'use-move' && paldeaMethod.usedMoveId) {
    return `${paldeaEvolutionMoveKo[paldeaMethod.usedMoveId] ?? '특정 기술'}을 ${paldeaMethod.minMoveCount ?? 1}번 사용한 뒤 레벨업으로 ${species.name} 진화`
  }
  if (paldeaMethod.needsMultiplayer) return `유니온서클에서 다른 플레이어와 함께 Lv.${evolution.minLevel ?? 1} 이상 레벨업으로 ${species.name} 진화`
  if (paldeaMethod.minSteps) return `레츠고로 ${paldeaMethod.minSteps}걸음 걸은 뒤 레벨업으로 ${species.name} 진화`
  if (paldeaMethod.knownMoveId && paldeaEvolutionMoveKo[paldeaMethod.knownMoveId]) {
    return `${paldeaEvolutionMoveKo[paldeaMethod.knownMoveId]}을 배운 상태로 레벨업해 ${species.name} 진화`
  }
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
    const itemTimeKo: Record<string, string> = { day: '낮에 ', night: '밤에 ', 'full-moon': '보름달 밤에 ' }
    const itemTime = evolution.time ? itemTimeKo[evolution.time] ?? '' : ''
    return `${gender ? `${gender}에게 ` : ''}${itemTime}${evolutionItemKo[evolution.item] ?? evolution.item} 사용으로 ${species.name} 진화${stochastic}`
  }
  if (species.dex === 292) return '토중몬이 Lv.20에 진화할 때 파티 빈칸과 몬스터볼이 있으면 함께 출현'
  if (species.dex === 350) {
    return game?.generation === 5
      ? '빈티나의 아름다움 수치 170 이상에서 레벨업 또는 고운비늘을 지니고 통신교환'
      : '빈티나의 아름다움 수치 170 이상에서 레벨업'
  }
  if (species.dex === 226) return '파티에 총어를 둔 채 타만타 레벨업'
  const method: Partial<CatalogEvolutionMethod> = evolution
  if (!evolution.item && !evolution.heldItemId) {
    const timeKo: Record<string, string> = { day: '낮', night: '밤', dusk: '황혼' }
    if (method.minAffection && method.knownMoveTypeId === 18) {
      return `페어리 타입 기술을 배운 상태에서 포켓파를레 애정 ${method.minAffection}단계 이상으로 레벨업`
    }
    if (evolution.minLevel && method.turnUpsideDown) return `게임기를 거꾸로 든 채 Lv.${evolution.minLevel} 이상에서 레벨업`
    if (evolution.minLevel && method.needsOverworldRain) return `필드에 비가 내릴 때 Lv.${evolution.minLevel} 이상에서 레벨업`
    if (evolution.minLevel && method.partyTypeId === 17) return `파티에 악 타입 포켓몬이 있을 때 Lv.${evolution.minLevel} 이상에서 레벨업`
    if (evolution.minLevel && evolution.time) {
      return `${timeKo[evolution.time] ?? evolution.time}에 Lv.${evolution.minLevel} 이상에서 ${species.name} 진화`
    }
  }
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
