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
  location: string
  method: string
  minLevel: number
  conditions: string[]
}

const encounters = encounterSnapshot.games as Record<'omega-ruby' | 'alpha-sapphire', EncounterRow[]>
const defaults: PlannerPreferences = {
  noTrade: true,
  hmConvenience: true,
  allowLegendary: false,
  allowPostgame: false,
  favoriteWeight: 50,
}
const species = (dex: number) => speciesByDex.get(dex)!

describe('오메가루비·알파사파이어 완전 플래너', () => {
  beforeAll(async () => {
    await Promise.all([loadCatalog(), loadLearnsets()])
  }, 120_000)

  it('모든 hoenn6 완전성 요구사항이 끝난 뒤에만 두 버전을 승격한다', () => {
    for (const gameId of ['omega-ruby', 'alpha-sapphire']) {
      const entry = gameCatalog.find((game) => game.id === gameId)!
      expect(entry.plannerSupport.status).toBe('full')
      expect(entry.plannerFamilyId).toBe('hoenn6')
    }
    expect(Object.values(gen67Completeness.families.hoenn6.gates)
      .every((gate) => gate.requirements.every((requirement) => requirement.status === 'complete'))).toBe(true)
  })

  it('해초·유성폭포 안쪽·환상의 장소·도감내비 칸을 필요한 진행 뒤로 막는다', () => {
    for (const rows of [encounters['omega-ruby'], encounters['alpha-sapphire']]) {
      expect(rows.some((row) => row.method === 'walk' && ['route-107', 'route-124', 'route-126'].includes(row.location))).toBe(false)
      expect(rows.some((row) => row.species === 369 && row.method === 'seaweed')).toBe(true)
      const meteorFalls = rows.filter((row) => row.location === 'meteor-falls')
      expect(meteorFalls.filter((row) => row.species === 371).every((row) => row.conditions.includes('waterfall'))).toBe(true)
      expect(meteorFalls.some((row) => row.species === 41 && row.method === 'walk' && !row.conditions.includes('waterfall'))).toBe(true)
      expect(rows.filter((row) => row.location.startsWith('mirage-')).every((row) =>
        row.conditions.includes('mirage-spot') && row.conditions.includes('story-progress-primal-defeated'))).toBe(true)
    }
    const game = getGame('omega-ruby')
    expect(getAvailability(species(369), game).chapter).toBeGreaterThanOrEqual(8)
    expect(getAvailability(species(371), game)).toMatchObject({ chapter: 9, preChampion: true })
    expect(getAvailability(species(443), game)).toMatchObject({ preChampion: false, postgameOnly: true })
  })

  it('버전별 스토리 전설과 교환·이벤트 경로를 구분한다', () => {
    const omega = getGame('omega-ruby')
    const alpha = getGame('alpha-sapphire')
    expect(getAvailability(species(383), omega)).toMatchObject({ obtainable: true, chapter: 9, versionExclusive: true })
    expect(getAvailability(species(382), omega).obtainable).toBe(false)
    expect(getAvailability(species(382), alpha)).toMatchObject({ obtainable: true, chapter: 9 })
    expect(getAvailability(species(381), omega)).toMatchObject({ obtainable: true, chapter: 6 })
    expect(getAvailability(species(380), omega).obtainable).toBe(false)
    expect(getAvailability(species(380), alpha)).toMatchObject({ obtainable: true, chapter: 6 })
    // 전제 조건을 확인하지 못한 환상의 장소 전설과 해상보라 화강돌은 추천하지 않습니다.
    expect(getAvailability(species(485), omega).obtainable).toBe(false)
    expect(getAvailability(species(442), omega).obtainable).toBe(false)
  })

  it('비전머신과 호연 진화 장소·도구 장을 원작에 맞춘다', () => {
    const game = getGame('alpha-sapphire')
    const fieldMoves = Object.fromEntries(getFamily(game).fieldMoves.map((move) => [move.id, move.unlockChapter]))
    expect(fieldMoves).toEqual({ cut: 1, 'rock-smash': 3, strength: 4, surf: 5, fly: 6, dive: 8, waterfall: 9 })
    expect(evolutionRequirementChapter(species(462), game)).toBe(9)
    // 개무소가 실쿤·카스쿤 중 무엇이 될지는 성격값으로 정해집니다.
    expect(evolutionText(species(267), game)).not.toContain('50%')
    expect(evolutionText(species(266), game)).toContain('실쿤·카스쿤 중 하나')
    expect(evolutionRequirementChapter(species(470), game)).toBe(1)
    expect(evolutionRequirementChapter(species(471), game)).toBe(8)
    expect(evolutionText(species(462), game)).toContain('뉴보라')
    expect(evolutionRequirementChapter(species(350), game)).toBe(2)
    expect(evolutionText(species(350), game)).toContain('아름다움')
    // 불꽃샛길 불꽃의돌(괴력)과 뉴보라 천둥의돌
    expect(evolutionRequirementChapter(species(59), game)).toBe(4)
    expect(evolutionRequirementChapter(species(26), game)).toBe(9)
  })

  it('껍질몬은 토중몬 진화 레벨 이후에 준비된다', () => {
    const shedinja = getAvailability(species(292), getGame('omega-ruby'))
    expect(shedinja.finalChapter).toBeGreaterThan(shedinja.chapter)
  })

  it('야생 입치트의 Lv.1 기술은 기술 떠올리기 장 이후로 둔다', () => {
    const game = getGame('omega-ruby')
    for (const move of generatedMoves(species(303), game).filter((entry) => ['iron-head', 'play-rough'].includes(entry.id))) {
      expect(move.availableChapter).toBeGreaterThanOrEqual(4)
      expect(move.source).toContain('기술 떠올리기')
    }
  })

  it('버전별 최종 악당 보스를 분리하고 모든 호연 스타터로 파티와 로드맵을 만든다', () => {
    expect(getBosses(getGame('omega-ruby')).map((boss) => boss.id)).toContain('maxie-or')
    expect(getBosses(getGame('alpha-sapphire')).map((boss) => boss.id)).toContain('archie-as')
    for (const gameId of ['omega-ruby', 'alpha-sapphire']) {
      const game = getGame(gameId)
      for (const starter of game.starters) {
        const plan = generateParty(game, defaults, { requiredDexes: [starter] })
        expect(plan.members, `${gameId}/${starter}`).toHaveLength(6)
        expect(plan.members.every((member) => member.availability.obtainable && member.availability.preChampion)).toBe(true)
        expect(new Set(plan.members.map((member) => member.species.chainId)).size).toBe(6)
        for (const member of plan.members) {
          for (const move of member.moves) expect(move.source, `${member.species.name}/${move.name}`).not.toContain('기술가르침')
        }
        const roadmap = composeRoadmap(game, plan)
        expect(roadmap).toHaveLength(10)
        expect(roadmapReferencesAreAvailable(game, plan, roadmap)).toBe(true)
      }
    }
  }, 240_000)
})
