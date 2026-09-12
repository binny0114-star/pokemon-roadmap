import type { GameConfig } from './types'
import type { LegalMove } from './learnsets'

export interface MoveAcquisition {
  chapter: number
  source: string
  resourceId?: string
  reusable: boolean
  repeatable: boolean
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

export function getMoveAcquisition(game: GameConfig, move: LegalMove): MoveAcquisition | undefined {
  if (game.id !== 'sword' && game.id !== 'shield') return undefined
  if (move.method === 'egg') {
    return {
      chapter: 1,
      source: '첫 와일드에리어 포켓몬 맡기미집 · 호환 부모 또는 같은 종의 알기술 전수 필요',
      reusable: true,
      repeatable: true,
      availability: 'compatible-parent-required',
      storyFlag: 'wild-area-nursery-access',
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
