import { beforeAll, describe, expect, it } from 'vitest'
import encounterSnapshot from '../generated/modern-encounters.json'
import { evolutionRequirementChapter, evolutionText, getAvailability, loadCatalog, speciesByDex } from './catalog'
import { generateParty, generatedMoves } from './engine'
import { getBosses, getFamily, getGame } from './games'
import { loadLearnsets } from './learnsets'
import { composeRoadmap, roadmapReferencesAreAvailable } from './roadmap'
import type { PlannerPreferences } from './types'
import { gameCatalog, gen67Completeness } from './versionRegistry'

interface EncounterRow {
  species: number
  form: number
  location: string
  method: string
  minLevel: number
  conditions: string[]
}

const encounters = encounterSnapshot.games as Record<'x' | 'y', EncounterRow[]>
const defaults: PlannerPreferences = {
  noTrade: true,
  hmConvenience: true,
  allowLegendary: false,
  allowPostgame: false,
  favoriteWeight: 50,
}
const species = (dex: number) => speciesByDex.get(dex)!

describe('X·Y 완전 플래너', () => {
  beforeAll(async () => {
    await Promise.all([loadCatalog(), loadLearnsets()])
  }, 120_000)

  it('모든 kalos6 완전성 요구사항이 끝난 뒤에만 두 버전을 승격한다', () => {
    for (const gameId of ['x', 'y']) {
      const entry = gameCatalog.find((game) => game.id === gameId)!
      expect(entry.plannerSupport.status).toBe('full')
      expect(entry.plannerFamilyId).toBe('kalos6')
    }
    expect(Object.values(gen67Completeness.families.kalos6.gates)
      .every((gate) => gate.requirements.every((requirement) => requirement.status === 'complete'))).toBe(true)
  })

  it('Standard 조우를 원작 조우표 순서대로 세부 방식으로 나눈다', () => {
    for (const rows of [encounters.x, encounters.y]) {
      expect(rows.some((row) => row.method === 'wild-unspecified')).toBe(false)
      // 13번도로(미르 황무지)의 거친 지형과 바위깨기, 22번도로 파도타기
      expect(rows.some((row) => row.species === 443 && row.location === 'route-13' && row.method === 'rough-terrain')).toBe(true)
      expect(rows.some((row) => row.species === 75 && row.location === 'route-13' && row.method === 'rock-smash')).toBe(true)
      expect(rows.some((row) => row.species === 184 && row.location === 'route-22' && row.method === 'surf')).toBe(true)
      expect(rows.some((row) => row.species === 130 && row.location === 'route-22' && row.method === 'super-rod')).toBe(true)
    }
  })

  it('필드기와 낚싯대 입수 장을 원작 진행에 맞춘다', () => {
    const fieldMoves = Object.fromEntries(getFamily(getGame('x')).fieldMoves.map((move) => [move.id, move.unlockChapter]))
    expect(fieldMoves).toEqual({ cut: 2, 'rock-smash': 2, strength: 2, surf: 3, fly: 4, waterfall: 9 })
    expect(getAvailability(species(129), getGame('x')).chapter).toBe(2)
    // 22번도로 노란 꽃밭(Lv.25–27)은 파도타기와 폭포오르기가 있어야 들어가므로 파르토는 2번도로 파르빗에서 진화시킵니다.
    const diggersby = getAvailability(species(660), getGame('x'))
    expect(diggersby).toMatchObject({ location: '2번도로', chapter: 1, finalChapter: 3 })
  })

  it('버전 전용 전설과 화석, 관동 스타터 선택을 구분한다', () => {
    expect(getAvailability(species(716), getGame('x'))).toMatchObject({ obtainable: true, chapter: 8, versionExclusive: true })
    expect(getAvailability(species(716), getGame('y')).obtainable).toBe(false)
    expect(getAvailability(species(717), getGame('y'))).toMatchObject({ obtainable: true, chapter: 8, versionExclusive: true })
    expect(getAvailability(species(696), getGame('x')).mutuallyExclusiveGroup)
      .toBe(getAvailability(species(698), getGame('x')).mutuallyExclusiveGroup)
    expect(getAvailability(species(1), getGame('x'))).toMatchObject({
      chapter: 2,
      mutuallyExclusiveGroup: 'choice-group-kanto-starter',
    })
    expect(getAvailability(species(718), getGame('x'))).toMatchObject({ preChampion: false, postgameOnly: true })
  })

  it('칼로스 장소 진화와 6세대 진화 조건을 장과 문구에 반영한다', () => {
    const x = getGame('x')
    expect(evolutionRequirementChapter(species(462), x)).toBe(5)
    expect(evolutionRequirementChapter(species(471), x)).toBe(7)
    expect(evolutionRequirementChapter(species(470), x)).toBe(9)
    expect(evolutionText(species(462), x)).toContain('13번도로')
    expect(evolutionText(species(700), x)).toContain('애정')
    expect(evolutionText(species(706), x)).toContain('비')
    expect(evolutionText(species(687), x)).toContain('거꾸로')
    expect(evolutionText(species(697), x)).toContain('낮')
    expect(evolutionText(species(699), x)).toContain('밤')
    expect(evolutionText(species(675), x)).toContain('악 타입')
  })

  it('입수 장을 확인하지 못한 진화 도구는 마지막 장의 시점 추론으로 둔다', () => {
    const x = getGame('x')
    // 태양의돌 진화(일레도리자드)는 입수처를 확인하지 못했습니다.
    expect(evolutionRequirementChapter(species(695), x)).toBe(9)
    expect(getAvailability(species(695), x).quality).toBe('inferred')
    // 포푸니라는 예리한손톱을 지니고 밤에 레벨업합니다.
    expect(getAvailability(species(461), x).quality).toBe('inferred')
    // 리프의돌은 8번도로에서 확인했습니다.
    expect(evolutionRequirementChapter(species(45), x)).toBe(2)
  })

  it('야생으로 합류한 포켓몬은 Lv.1 기술을 기술 떠올리기 전까지 쓰지 않는다', () => {
    const x = getGame('x')
    const mawile = species(303)
    const moves = generatedMoves(mawile, x)
    const ironHead = moves.find((move) => move.id === 'iron-head')
    if (ironHead) {
      expect(ironHead.availableChapter).toBeGreaterThanOrEqual(7)
      expect(ironHead.source).toContain('기술 떠올리기')
    }
  })

  it('기술가르침과 알 기술은 추천하지 않고 비전머신은 검증한 입수 장을 쓴다', () => {
    const x = getGame('x')
    for (const starter of x.starters) {
      const plan = generateParty(x, defaults, { requiredDexes: [starter] })
      for (const member of plan.members) {
        for (const move of member.moves) {
          expect(move.source, `${member.species.name}/${move.name}`).not.toContain('기술가르침')
          expect(move.source, `${member.species.name}/${move.name}`).not.toContain('유전')
        }
      }
      const waterfall = plan.members.flatMap((member) => member.moves).find((move) => move.id === 'waterfall')
      if (waterfall) {
        expect(waterfall.availableChapter).toBeGreaterThanOrEqual(9)
        expect(waterfall.category).toBe('물리')
      }
    }
  })

  it('모든 칼로스 스타터로 X·Y 파티와 로드맵을 만든다', () => {
    for (const gameId of ['x', 'y']) {
      const game = getGame(gameId)
      expect(getBosses(game).map((boss) => boss.id)).toContain('lysandre')
      for (const starter of game.starters) {
        const plan = generateParty(game, defaults, { requiredDexes: [starter] })
        expect(plan.members, `${gameId}/${starter}`).toHaveLength(6)
        expect(plan.members.every((member) => member.availability.obtainable && member.availability.preChampion)).toBe(true)
        expect(new Set(plan.members.map((member) => member.species.chainId)).size).toBe(6)
        const groups = plan.members.map((member) => member.availability.mutuallyExclusiveGroup).filter(Boolean)
        expect(new Set(groups).size).toBe(groups.length)
        const roadmap = composeRoadmap(game, plan)
        expect(roadmap).toHaveLength(9)
        expect(roadmapReferencesAreAvailable(game, plan, roadmap)).toBe(true)
      }
    }
  }, 240_000)
})
