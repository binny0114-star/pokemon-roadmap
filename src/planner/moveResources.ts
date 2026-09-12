import type { GameConfig } from './types'
import type { LegalMove } from './learnsets'

export interface MoveAcquisition {
  chapter: number
  source: string
  resourceId?: string
  reusable: boolean
  repeatable: boolean
  guaranteedCopies?: number
  repeatableChapter?: number
  unitCost?: number
  currency?: string
  availability?: 'guaranteed' | 'daily-rotation' | 'compatible-parent-required'
  alternativeSource?: string
  storyFlag?: string
  dlcMilestone?: string
  dlcChapter?: number
}

const tmLocations = [
  '너클시티', '너클시티', '엔진시티', '슛시티', '슛시티', '슛시티', '래터럴마을', '4번도로', '슛시티', '슛시티',
  '터프마을', '터프마을', '슛시티', '너클시티', '터검니호 동쪽 로토무랠리', '6번도로', '키르쿠스마을', '엔진시티', '엔진시티', '엔진시티',
  '배틀타워', '아라베스크마을', '9번도로', '너클시티', '루미너스메이즈숲', '엔진시티', '가라르광산', '키르쿠스마을', '배틀타워', '너클시티',
  '6번도로', '5번도로', '너클시티', '너클시티', '너클시티', '너클시티', '바우마을', '3번도로', '엔진시티', '엔진시티 변두리',
  '브래시마을', '엔진시티', '래터럴마을', '8번도로', '배틀타워', '9번도로', '너클시티', '키르쿠스마을', '키르쿠스마을', '제2광산',
  '너클시티', '키르쿠스마을', '배틀타워', '제2광산', '3번도로', '너클시티', '루미너스메이즈숲', '2번도로', '7번도로', '배틀타워',
  '슛시티', '슛시티', '슛시티', '슛시티', '9번도로', '역린호수', '너클시티', '너클시티', '너클시티', '2번도로 수상 구간',
  '배틀타워', '배틀타워', '배틀타워', '모래먼지구덩이', '래터럴마을', '다리아래벌판', '엔진시티', '아라베스크마을', '아라베스크마을', '바우마을',
  '터검니호 동쪽 로토무랠리', '거인의 의자', '바우마을', '배틀타워', '화창한 초원', '스파이크마을', '꾸벅졸음숲', '아라베스크마을', '너클시티', '너클시티',
  '너클시티', '너클시티', '배틀타워', '슛시티', '엔진시티', '터검니의 눈동자 수상 구간', '8번도로', '터프마을', '10번도로', '너클시티',
] as const

const tmChapters = [
  5, 5, 1, 10, 10, 10, 5, 2, 10, 10,
  2, 2, 10, 5, 1, 5, 7, 1, 1, 1,
  11, 6, 7, 5, 5, 1, 2, 7, 11, 5,
  5, 3, 5, 5, 5, 5, 3, 2, 1, 5,
  1, 1, 5, 7, 11, 7, 5, 7, 7, 3,
  5, 7, 11, 3, 2, 5, 5, 1, 7, 11,
  10, 10, 10, 10, 7, 7, 5, 5, 5, 7,
  11, 11, 11, 5, 5, 5, 1, 6, 6, 3,
  1, 1, 3, 11, 1, 8, 11, 6, 5, 5,
  5, 5, 11, 10, 1, 7, 7, 2, 9, 5,
] as const

const trWattCosts = [
  2000, 3000, 5000, 8000, 5000, 5000, 8000, 3000, 5000, 8000,
  8000, 5000, 2000, 1000, 1000, 8000, 3000, 2000, 3000, 2000,
  3000, 2000, 5000, 2000, 8000, 3000, 1000, 2000, 8000, 2000,
  2000, 5000, 3000, 3000, 3000, 3000, 5000, 2000, 2000, 8000,
  1000, 3000, 5000, 8000, 2000, 5000, 2000, 3000, 2000, 2000,
  5000, 2000, 3000, 8000, 2000, 8000, 3000, 3000, 3000, 3000,
  3000, 5000, 3000, 3000, 8000, 5000, 8000, 5000, 2000, 3000,
  5000, 8000, 8000, 8000, 5000, 8000, 3000, 3000, 5000, 3000,
  3000, 3000, 2000, 2000, 3000, 1000, 5000, 3000, 3000, 8000,
  5000, 2000, 3000, 5000, 5000, 3000, 5000, 5000, 3000, 3000,
] as const

const armoriteTutors = new Set([
  'burning-jealousy', 'coaching', 'corrosive-gas', 'dual-wingbeat', 'expanding-force',
  'flip-turn', 'grassy-glide', 'lash-out', 'meteor-beam', 'misty-explosion', 'poltergeist',
  'rising-voltage', 'scale-shot', 'scorching-sands', 'skitter-smack', 'steel-roller',
  'terrain-pulse', 'triple-axel',
])

const baseTutors: Record<string, MoveAcquisition> = {
  'grass-pledge': { chapter: 5, source: '너클시티 기술가르침 · 무료', reusable: true, repeatable: true },
  'fire-pledge': { chapter: 5, source: '너클시티 기술가르침 · 무료', reusable: true, repeatable: true },
  'water-pledge': { chapter: 5, source: '너클시티 기술가르침 · 무료', reusable: true, repeatable: true },
  'frenzy-plant': { chapter: 10, source: '슛시티 기술가르침 · 무료', reusable: true, repeatable: true },
  'blast-burn': { chapter: 10, source: '슛시티 기술가르침 · 무료', reusable: true, repeatable: true },
  'hydro-cannon': { chapter: 10, source: '슛시티 기술가르침 · 무료', reusable: true, repeatable: true },
  'draco-meteor': { chapter: 7, source: '키르쿠스마을 기술가르침 · 친밀도 조건 · 무료', reusable: true, repeatable: true },
  'steel-beam': { chapter: 11, source: '엔진시티 부두 · 챔피언 이후 기술가르침 · 무료', reusable: true, repeatable: true },
}

export const swshMoveResourceProvenance = {
  locations: 'https://pokemondb.net/sword-shield/tms',
  crossCheck: 'https://bulbapedia.bulbagarden.net/wiki/List_of_TMs_and_TRs_in_Pok%C3%A9mon_Sword_and_Shield',
  reviewedAt: '2026-09-12',
  scope: 'reference-only independently authored acquisition timing; no page prose or assets redistributed',
}

const bdspTmMoves = [
  'focus-punch', 'dragon-claw', 'water-pulse', 'calm-mind', 'roar', 'toxic', 'hail', 'bulk-up', 'bullet-seed', 'work-up',
  'sunny-day', 'taunt', 'ice-beam', 'blizzard', 'hyper-beam', 'light-screen', 'protect', 'rain-dance', 'giga-drain', 'safeguard',
  'dazzling-gleam', 'solar-beam', 'iron-tail', 'thunderbolt', 'thunder', 'earthquake', 'low-sweep', 'dig', 'psychic', 'shadow-ball',
  'brick-break', 'double-team', 'reflect', 'shock-wave', 'flamethrower', 'sludge-bomb', 'sandstorm', 'fire-blast', 'rock-tomb', 'aerial-ace',
  'torment', 'facade', 'volt-switch', 'rest', 'attract', 'thief', 'steel-wing', 'skill-swap', 'scald', 'overheat',
  'roost', 'focus-blast', 'energy-ball', 'false-swipe', 'brine', 'fling', 'charge-beam', 'endure', 'dragon-pulse', 'drain-punch',
  'will-o-wisp', 'bug-buzz', 'nasty-plot', 'explosion', 'shadow-claw', 'payback', 'recycle', 'giga-impact', 'rock-polish', 'flash',
  'stone-edge', 'avalanche', 'thunder-wave', 'gyro-ball', 'swords-dance', 'stealth-rock', 'psych-up', 'snarl', 'dark-pulse', 'rock-slide',
  'x-scissor', 'sleep-talk', 'bulldoze', 'poison-jab', 'dream-eater', 'grass-knot', 'swagger', 'pluck', 'u-turn', 'substitute',
  'flash-cannon', 'trick-room', 'cut', 'fly', 'surf', 'strength', 'defog', 'rock-smash', 'waterfall', 'rock-climb',
] as const

const bdspTmChapters = [
  1, 8, 5, 5, 7, 5, 7, 11, 2, 1,
  5, 2, 3, 3, 3, 3, 3, 9, 5, 3,
  3, 3, 6, 3, 3, 6, 3, 4, 3, 3,
  5, 2, 3, 3, 3, 8, 11, 3, 1, 4,
  9, 11, 3, 3, 3, 2, 3, 6, 3, 12,
  3, 3, 11, 3, 4, 9, 9, 3, 9, 3,
  11, 4, 3, 3, 5, 3, 2, 3, 2, 1,
  9, 7, 2, 3, 3, 1, 5, 2, 9, 8,
  5, 2, 3, 5, 7, 2, 5, 2, 3, 2,
  6, 4, 2, 3, 5, 3, 4, 1, 9, 7,
] as const

const bdspTmLocations = [
  '무쇠게이트 B1F', '천관산 정상 동굴 · 락클라임 필요', '험한샛길 북동쪽 · 파도타기·바위깨기 필요', '천관산 지하대동굴 바위 동굴', '213번도로 · 락클라임 필요',
  '212번도로 남동쪽', '217번도로', '배틀파크', '204번도로 북서쪽', '축복시티 트레이너스쿨',
  '212번도로 서쪽 · 풀베기 또는 파도타기', '211번도로 남쪽 · 바위깨기', '장막백화점', '장막백화점', '장막백화점',
  '장막백화점', '장막백화점', '223번수로', '209번도로 · 파도타기', '장막백화점',
  '장막백화점', '장막백화점', '강철섬 B2F 동쪽', '장막백화점', '장막백화점',
  '미혹의동굴 비밀 입구 · 자전거·풀베기·괴력', '로스트타워 4F', '유적마니아굴', '장막백화점', '210번도로 남서쪽',
  '무쇠게이트 B1F · 바위깨기·파도타기', '미혹의동굴 1F · 풀베기·바위깨기', '장막백화점', '215번도로', '장막백화점',
  '갤럭시단 창고 B1F', '228번도로', '장막백화점', '험한샛길 1F', '213번도로 · 바위깨기',
  '챔피언로드 1F · 락클라임', '서바이벌에리어', '산책광장 남쪽', '장막백화점', '산책광장 북쪽',
  '영원시티 북동쪽 · 풀베기', '209번도로 동쪽 · 풀베기', '운하시티 남동쪽 집', '갤럭시단 창고 1F', '하드마운틴 내부',
  '210번도로 남쪽 트레이너', '장막백화점', '226번수로', '장막백화점', '들판체육관 맥실러',
  '222번도로 트레이너', '물가체육관 전진', '장막백화점', '챔피언로드 B1F', '장막체육관 자두',
  '배틀파크', '212번도로 남쪽 자전거 발판', '장막시티 남서쪽 트레이너', '장막시티', '연고체육관 멜리사',
  '215번도로 트레이너', '영원시티 콘도', '장막백화점', '천관산 211번도로 입구', '무쇠게이트 B1F',
  '챔피언로드 2F', '선단체육관 무청', '지하대동굴 소형 구슬 상인', '장막백화점', '장막백화점',
  '무쇠체육관 강석', '211번도로 동쪽 트레이너', '204번도로 북동쪽 · 풀베기', '챔피언로드 2F · 괴력·락클라임', '천관산 2F · 파도타기·락클라임',
  '221번도로', '영원의숲 동쪽 우회로 · 풀베기', '장막백화점', '212번도로 남서쪽 · 파도타기', '입지호수 근처 · 락클라임',
  '영원체육관 유채', '포켓몬저택 백작의 방', '꽃향기마을 중앙 집', '장막백화점', '숲의양옥집 2F',
  '운하체육관 동관', '213번도로 광대', '영원시티 북쪽 난천', '장막시티 갤럭시단 창고', '봉신마을',
  '로스트타워', '대습초원', '무쇠게이트 서쪽 등산가', '물가시티', '217번도로',
] as const

const bdspShopTms = new Set([10, 13, 14, 15, 16, 17, 20, 21, 22, 24, 25, 29, 32, 33, 35, 38, 44, 52, 54, 58, 68, 70, 74, 75, 83, 89, 90])
const bdspBattleParkTms = new Set([4, 6, 8, 26, 30, 31, 36, 40, 45, 53, 59, 61, 71, 73, 81])
export const bdspUndergroundVendorTmChapters: Readonly<Partial<Record<number, number>>> = {
  5: 2, 31: 2, 56: 2, 67: 2, 73: 2, 82: 2, 87: 2, 88: 2,
  3: 2, 4: 2, 9: 2, 34: 2, 40: 2, 59: 2, 69: 2, 98: 2,
  8: 3, 12: 3, 23: 3, 36: 3, 41: 3, 46: 3, 47: 3, 51: 3, 76: 3, 80: 3, 86: 3, 92: 3, 93: 3,
  1: 4, 2: 4, 6: 4, 30: 4, 42: 4, 45: 4, 55: 4, 60: 4, 62: 4, 66: 4, 81: 4,
  43: 5, 53: 5, 61: 5, 64: 5, 78: 5, 85: 5, 94: 5,
  19: 6, 26: 6, 39: 6, 48: 6, 49: 6, 50: 6, 63: 6, 71: 6, 77: 6, 91: 6, 95: 6, 97: 6,
  65: 7, 72: 7, 84: 7, 96: 7,
  57: 9, 79: 9, 100: 9,
  99: 11,
}
const bdspGymTms = new Set([55, 57, 60, 65, 72, 76, 86, 91])
const bdspRoute212ShardTms = new Set([7, 11, 18, 37])

const bdspTutors: Record<string, MoveAcquisition> = Object.fromEntries([
  ...['grass-pledge', 'fire-pledge', 'water-pledge', 'frenzy-plant', 'blast-burn', 'hydro-cannon']
    .map((id) => [id, { chapter: 11, source: '228번도로 기술가르침 · 친밀도 조건 · 무료', reusable: true, repeatable: true }]),
  ['draco-meteor', { chapter: 8, source: '210번도로 북쪽 기술가르침 · 락클라임·친밀도 조건 · 무료', reusable: true, repeatable: true }],
])

export const bdspMoveResourceProvenance = {
  locations: 'https://pokemondb.net/brilliant-diamond-shining-pearl/tms',
  crossCheck: 'https://bulbapedia.bulbagarden.net/wiki/List_of_TMs_in_Pok%C3%A9mon_Brilliant_Diamond_and_Shining_Pearl?oldid=4555033',
  underground: 'https://www.serebii.net/brilliantdiamondshiningpearl/grandundergroundgoodstrader.shtml',
  reminder: 'https://bulbapedia.bulbagarden.net/wiki/Move_Reminder',
  reviewedAt: '2026-09-12',
  scope: 'reference-only independently authored locations, timing, quantities and repeatable sources; no page prose or assets redistributed',
}

export function getMoveAcquisition(game: GameConfig, move: LegalMove): MoveAcquisition | undefined {
  const isBdsp = game.id === 'brilliant-diamond' || game.id === 'shining-pearl'
  if (game.id !== 'sword' && game.id !== 'shield' && !isBdsp) return undefined
  if (isBdsp) {
    if (move.method === 'egg') {
      return {
        chapter: 3,
        source: '신수마을 맡기미집 · 호환 부모 또는 같은 종의 알기술 전수 필요',
        reusable: true,
        repeatable: true,
        availability: 'compatible-parent-required',
        storyFlag: 'solaceon-nursery-access',
      }
    }
    if (move.method === 'machine') {
      const index = bdspTmMoves.indexOf(move.id as (typeof bdspTmMoves)[number])
      if (index < 0) return undefined
      const number = index + 1
      const machine = `TM${String(number).padStart(2, '0')}`
      const shop = bdspShopTms.has(number)
      const battlePark = bdspBattleParkTms.has(number)
      const guaranteedChapter = bdspTmChapters[index]
      const undergroundVendorChapter = bdspUndergroundVendorTmChapters[number]
      const primaryUndergroundVendor = bdspTmLocations[index].includes('구슬 상인')
      const repeatableOnlySource = primaryUndergroundVendor
        || bdspTmLocations[index] === '배틀파크'
        || bdspTmLocations[index].startsWith('장막백화점')
      const guaranteedCopies = number === 10
        ? 3
        : bdspGymTms.has(number)
          ? 5
          : repeatableOnlySource
            ? 0
            : 1
      const shardExchangeChapter = bdspRoute212ShardTms.has(number) ? 5 : Number.POSITIVE_INFINITY
      const repeatableChapterValue = Math.min(
        shop ? 3 : Number.POSITIVE_INFINITY,
        undergroundVendorChapter ?? Number.POSITIVE_INFINITY,
        shardExchangeChapter,
        battlePark ? 11 : Number.POSITIVE_INFINITY,
      )
      const repeatableChapter = Number.isFinite(repeatableChapterValue) ? repeatableChapterValue : undefined
      const repeatableSource = shop && repeatableChapter === 3
        ? '장막백화점 구매'
        : undergroundVendorChapter === repeatableChapter
          ? '지하대동굴 구슬 상인 일일 순환'
          : shardExchangeChapter === repeatableChapter
            ? '212번도로 날씨 기술 가르침 집 조각 교환'
            : '배틀파크 BP 교환'
      const repeatableFirst = repeatableChapter !== undefined && (
        repeatableChapter < guaranteedChapter
        || (repeatableChapter === guaranteedChapter && guaranteedCopies === 0)
      )
      const initialSource = repeatableFirst ? `${repeatableSource} ${machine}` : `${bdspTmLocations[index]} ${machine}`
      return {
        chapter: Math.min(guaranteedChapter, repeatableChapter ?? guaranteedChapter),
        source: `${initialSource} · 1회용${repeatableChapter ? ` · ${repeatableSource}으로 반복 획득` : ''}${repeatableFirst ? ` · 고정 1개: ${bdspTmLocations[index]}` : ''}`,
        resourceId: machine,
        reusable: false,
        repeatable: repeatableChapter !== undefined,
        guaranteedCopies,
        repeatableChapter,
        availability: repeatableFirst && repeatableSource.includes('일일 순환') ? 'daily-rotation' : 'guaranteed',
        storyFlag: number >= 93 ? 'poketch-hidden-move-app-does-not-consume-tm' : undefined,
      }
    }
    if (move.method === 'tutor') return bdspTutors[move.id]
    return undefined
  }
  if (move.method === 'egg') {
    return {
      chapter: 3,
      source: '5번도로 포켓몬 맡기미집 · 호환 부모 또는 같은 종의 알기술 전수 필요',
      reusable: true,
      repeatable: true,
      availability: 'compatible-parent-required',
      storyFlag: 'route-5-nursery-access',
    }
  }
  if (move.method === 'machine' && move.machine?.startsWith('TM')) {
    const number = Number(move.machine.slice(2))
    if (!Number.isInteger(number) || number < 0 || number >= tmLocations.length) return undefined
    return {
      chapter: tmChapters[number],
      source: `${tmLocations[number]} ${move.machine} · 재사용 가능`,
      resourceId: move.machine,
      reusable: true,
      repeatable: true,
    }
  }
  if (move.method === 'machine' && move.machine?.startsWith('TR')) {
    const number = Number(move.machine.slice(2))
    if (!Number.isInteger(number) || number < 0 || number >= trWattCosts.length) return undefined
    const cost = trWattCosts[number]
    return {
      chapter: 1,
      source: `와일드에리어 와트숍 일일 순환 ${move.machine} · 레이드 보상 가능 · 1회용 ${cost.toLocaleString('ko-KR')}W`,
      resourceId: move.machine,
      reusable: false,
      repeatable: true,
      unitCost: cost,
      currency: 'W',
      availability: 'daily-rotation',
      alternativeSource: '타입별 맥스 레이드 보상은 확률 경로이며 최초 합법 시점 계산에는 사용하지 않음',
      storyFlag: 'wild-area-watt-trader-access',
    }
  }
  if (move.method !== 'tutor') return undefined
  if (armoriteTutors.has(move.id)) {
    return {
      chapter: 1,
      source: '갑옷섬 첫 번째 수행 이후 마스터 도장 기술가르침 · 갑옷광석 5개',
      resourceId: `tutor:${move.id}`,
      reusable: false,
      repeatable: true,
      unitCost: 5,
      currency: '갑옷광석',
      dlcMilestone: 'dlc-milestone-isle-first-trial',
      dlcChapter: 12,
    }
  }
  return baseTutors[move.id]
}
