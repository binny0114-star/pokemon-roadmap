import { beforeAll, describe, expect, it } from 'vitest'
import encounterSnapshot from '../generated/modern-encounters.json'
import { evolutionRequirementChapter, evolutionText, getAvailability, loadCatalog, speciesByDex } from './catalog'
import { generateParty } from './engine'
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

const encounters = encounterSnapshot.games as Record<'sun' | 'moon' | 'ultra-sun' | 'ultra-moon', EncounterRow[]>
const defaults: PlannerPreferences = {
  noTrade: true,
  hmConvenience: true,
  allowLegendary: false,
  allowPostgame: false,
  favoriteWeight: 50,
}
const species = (dex: number) => speciesByDex.get(dex)!
const alolaGames = ['sun', 'moon', 'ultra-sun', 'ultra-moon'] as const

describe('썬·문·울트라썬·울트라문 완전 플래너', () => {
  beforeAll(async () => {
    await Promise.all([loadCatalog(), loadLearnsets()])
  }, 120_000)

  it('모든 알로라 완전성 요구사항이 끝난 뒤에만 네 버전을 승격한다', () => {
    for (const gameId of alolaGames) {
      const entry = gameCatalog.find((game) => game.id === gameId)!
      expect(entry.plannerSupport.status).toBe('full')
      expect(entry.plannerFamilyId).toBe(gameId.startsWith('ultra-') ? 'alola7-ultra' : 'alola7')
    }
    for (const familyId of ['alola7', 'alola7-ultra'] as const) {
      expect(Object.values(gen67Completeness.families[familyId].gates)
        .every((gate) => gate.requirements.every((requirement) => requirement.status === 'complete'))).toBe(true)
    }
  })

  it('PokéAPI 방식 행과 알로라 폼을 쓰고 PKHeX 보충 행은 방식 미확인으로 둔다', () => {
    for (const gameId of alolaGames) {
      const rows = encounters[gameId]
      expect(rows.some((row) => row.species === 19 && row.form === 1 && row.method === 'walk')).toBe(true)
      expect(rows.some((row) => row.method === 'sos')).toBe(true)
      expect(rows.filter((row) => row.method === 'wild-unspecified').every((row) =>
        row.conditions.includes('method-unresolved'))).toBe(true)
      // 아일랜드 스캔과 조건 미확인 특수 입수는 추천에서 제외합니다.
      expect(rows.filter((row) => row.method === 'island-scan').every((row) =>
        row.conditions.includes('island-scan-qr'))).toBe(true)
      expect(rows.filter((row) => row.method === 'npc-trade').every((row) =>
        row.conditions.includes('special-prerequisite-unresolved'))).toBe(true)
    }
    // 방식 미확인 PKHeX 행은 라프라스·낚싯대를 얻는 2장 이전으로 당기지 않습니다.
    const tentacool = getAvailability(species(72), getGame('sun'))
    expect(tentacool.chapter).toBeGreaterThanOrEqual(2)
  })

  it('버전 전용 알로라 폼과 지역 폼 진화를 잇는다', () => {
    const sun = getGame('sun')
    const moon = getGame('moon')
    expect(getAvailability(species(38), sun)).toMatchObject({ obtainable: true, formIdentifier: 'ninetales-alola', versionExclusive: true })
    expect(getAvailability(species(38), moon).obtainable).toBe(false)
    expect(getAvailability(species(28), moon)).toMatchObject({ obtainable: true, formIdentifier: 'sandslash-alola' })
    expect(getAvailability(species(28), sun).obtainable).toBe(false)
    expect(getAvailability(species(26), sun).formIdentifier).toBe('raichu-alola')
    expect(getAvailability(species(105), sun).formIdentifier).toBe('marowak-alola')
    expect(evolutionText(species(105), sun)).toContain('밤')
    // 알로라 산드·식스테일의 얼음의돌 진화는 썬·문(그룹 17)부터 있습니다.
    expect(species(28).evolutionMethods.find((method) => method.item === 'ice-stone')?.versionGroupId).toBe(17)
    expect(evolutionText(species(38), sun, 'ninetales-alola')).toContain('얼음의돌')
  })

  it('알로라 장소 진화와 진화의 돌 장을 원작 진행에 맞춘다', () => {
    const moon = getGame('moon')
    expect(evolutionRequirementChapter(species(738), moon)).toBe(4)
    expect(evolutionRequirementChapter(species(470), moon)).toBe(2)
    expect(evolutionRequirementChapter(species(740), moon)).toBe(7)
    expect(evolutionText(species(763), moon)).toContain('짓밟기')
    // 코니코니시티 보석 가게의 얼음의돌로 알로라 모래두지가 진화합니다.
    const alolanSandslash = species(28).evolutionMethods.find((method) => method.evolvedFormId === 10102)!
    expect(evolutionRequirementChapter(species(28), moon, alolanSandslash)).toBe(3)
    expect(evolutionText(species(28), moon, 'sandslash-alola')).toContain('얼음의돌')
    expect(getAvailability(species(28), moon).finalChapter).toBeGreaterThanOrEqual(4)
    // 각성의돌은 엔딩 후 구즈마 재대결 보상이라 본편 장을 넘깁니다.
    expect(evolutionRequirementChapter(species(475), moon)).toBeGreaterThan(8)
  })

  it('울트라비스트와 괴력몬 푸시 동굴은 필요한 진행 뒤로 막는다', () => {
    expect(getAvailability(species(793), getGame('sun'))).toMatchObject({ preChampion: false })
    const ultraSun = encounters['ultra-sun'].filter((row) => row.location === 'lush-jungle' && row.minLevel >= 40)
    expect(ultraSun.length).toBeGreaterThan(0)
    expect(ultraSun.every((row) => row.conditions.includes('machamp-shove'))).toBe(true)
    expect(getAvailability(species(636), getGame('ultra-sun')).chapter).toBeGreaterThanOrEqual(6)
  })

  it('버전별 기술 떠올리기 장소와 보스 레벨을 구분한다', () => {
    expect(getFamily(getGame('sun')).moveReminder).toMatchObject({ chapter: 4, cost: '하트비늘 1개' })
    expect(getFamily(getGame('ultra-sun')).moveReminder).toMatchObject({ chapter: 8, location: '라나키라마운틴 포켓몬센터' })
    const level = (gameId: string, bossId: string) => getBosses(getGame(gameId)).find((boss) => boss.id === bossId)?.level
    expect(level('sun', 'hala')).toBe('Lv.14–15')
    expect(level('moon', 'kukui')).toBe('Lv.56–58')
    expect(level('ultra-moon', 'hau')).toBe('Lv.58–60')
    expect(level('ultra-sun', 'nanu-usum')).toBe('Lv.43–44')
  })

  it('모든 알로라 스타터로 네 버전의 파티와 로드맵을 만든다', () => {
    for (const gameId of alolaGames) {
      const game = getGame(gameId)
      expect(getFamily(game).fieldMoves).toEqual([])
      for (const starter of game.starters) {
        const plan = generateParty(game, defaults, { requiredDexes: [starter] })
        expect(plan.members, `${gameId}/${starter}`).toHaveLength(6)
        expect(plan.members.every((member) => member.availability.obtainable && member.availability.preChampion)).toBe(true)
        expect(new Set(plan.members.map((member) => member.species.chainId)).size).toBe(6)
        for (const member of plan.members) {
          for (const move of member.moves) expect(move.source, `${member.species.name}/${move.name}`).not.toContain('기술가르침')
        }
        const roadmap = composeRoadmap(game, plan)
        expect(roadmap).toHaveLength(8)
        expect(roadmapReferencesAreAvailable(game, plan, roadmap)).toBe(true)
      }
    }
  }, 300_000)
})
