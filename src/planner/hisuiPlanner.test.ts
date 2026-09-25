import { beforeAll, describe, expect, it } from 'vitest'
import encounterSnapshot from '../generated/modern-encounters.json'
import { evolutionForGame, evolutionRequirementChapter, evolutionText, getAvailability, loadCatalog, speciesByDex } from './catalog'
import { generateParty } from './engine'
import { getFamily, getGame } from './games'
import { loadLearnsets } from './learnsets'
import { modernEncounterChapter } from './modernGames'
import { composeRoadmap, roadmapReferencesAreAvailable } from './roadmap'
import type { PlannerPreferences } from './types'
import { gameCatalog, gen8Completeness } from './versionRegistry'

interface EncounterRow {
  species: number
  form: number
  location: string
  area: string
  method: string
  minLevel: number
  conditions: string[]
}

const rows = (encounterSnapshot.games as Record<string, EncounterRow[]>)['legends-arceus']
const defaults: PlannerPreferences = {
  noTrade: true,
  hmConvenience: true,
  allowLegendary: false,
  allowPostgame: false,
  favoriteWeight: 50,
}
const species = (dex: number) => speciesByDex.get(dex)!

describe('LEGENDS 아르세우스 완전 플래너', () => {
  beforeAll(async () => {
    await Promise.all([loadCatalog(), loadLearnsets()])
  }, 120_000)

  it('모든 hisui8 완전성 요구사항이 끝난 뒤에만 승격한다', () => {
    const entry = gameCatalog.find((game) => game.id === 'legends-arceus')!
    expect(entry.plannerSupport.status).toBe('full')
    expect(entry.plannerFamilyId).toBe('hisui8')
    expect(Object.values(gen8Completeness.families.hisui8.gates)
      .every((gate) => gate.requirements.every((requirement) => requirement.status === 'complete'))).toBe(true)
  })

  it('기본·나무/광석 조우만 싣고 우두머리와 물 위 구역 조건을 남긴다', () => {
    expect(new Set(rows.map((row) => row.method))).toEqual(new Set(['overworld', 'landmark', 'gift']))
    expect(rows.some((row) => row.conditions.includes('alpha'))).toBe(true)
    // 해당화섬·시련의 모래톱에만 나오는 조우는 대쓰여너 라이드(3장) 뒤에만 갈 수 있고,
    // 불꽃숭이처럼 걸어서 가는 큰뿔 산길에도 나오면 1장부터 씁니다.
    const islandOnly = rows.filter((row) => /^(obsidian-fieldlands-ramanas-island|crimson-mirelands-holm-of-trials)-\d+$/.test(row.area))
    expect(islandOnly.length).toBeGreaterThan(0)
    expect(islandOnly.every((row) => row.conditions.includes('basculegion-ride'))).toBe(true)
    expect(getAvailability(species(390), getGame('legends-arceus'))).toMatchObject({ chapter: 1, location: '흑요 들판' })
    expect(rows.filter((row) => row.method === 'gift').map((row) => row.species).sort((a, b) => a - b)).toEqual([155, 501, 722])
  })

  it('조사단 랭크에 따른 말 듣는 레벨을 넘는 포켓몬은 그 장 이후로 둔다', () => {
    expect(modernEncounterChapter('hisui8', 'obsidian-fieldlands', [], 'overworld', 30)).toBe(1)
    expect(modernEncounterChapter('hisui8', 'obsidian-fieldlands', [], 'overworld', 41)).toBe(3)
    expect(modernEncounterChapter('hisui8', 'obsidian-fieldlands', ['alpha'], 'overworld', 68)).toBe(8)
    expect(modernEncounterChapter('hisui8', 'crimson-mirelands', ['basculegion-ride'], 'overworld', 16)).toBe(3)
  })

  it('PLA 진화표대로 통신교환 없이 연결의끈·도구 사용으로 진화하고 시점은 추론으로 둔다', () => {
    const game = getGame('legends-arceus')
    expect(evolutionForGame(species(65), game)).toMatchObject({ trigger: 'use-item', item: 'linking-cord' })
    expect(evolutionForGame(species(212), game)).toMatchObject({ trigger: 'use-item', item: 'metal-coat' })
    expect(evolutionForGame(species(462), game)).toMatchObject({ trigger: 'use-item', item: 'thunder-stone' })
    const alakazam = getAvailability(species(65), game)
    expect(alakazam).toMatchObject({ obtainable: true, tradeRequired: false, quality: 'inferred' })
    expect(alakazam.finalChapter).toBe(getFamily(game).chapters.length)
    expect(evolutionText(species(65), game)).toContain('연결의끈')
    expect(evolutionText(species(899), game)).toContain('배리어러시')
    expect(evolutionRequirementChapter(species(899), game)).toBe(getFamily(game).chapters.length)
  })

  it('히스이 지역 진화는 히스이에서만, 다른 지역 진화는 쓰지 않는다', () => {
    const game = getGame('legends-arceus')
    expect(getAvailability(species(628), game).formIdentifier).toBe('braviary-hisui')
    expect(getAvailability(species(59), game).formIdentifier).toBe('arcanine-hisui')
    expect(getAvailability(species(724), game).formIdentifier).toBe('decidueye-hisui')
    // 피카츄는 히스이에서 관동 라이츄로 진화합니다(알로라 라이츄는 알로라 전용).
    expect(getAvailability(species(26), game).formIdentifier).toBe('raichu')
    expect(getAvailability(species(122), game).formIdentifier).toBe('mr-mime')
    // 다른 지역 게임에서도 알로라·히스이 지역 진화를 쓰지 않습니다.
    expect(getAvailability(species(26), getGame('brilliant-diamond')).formIdentifier).toBe('raichu')
    expect(getAvailability(species(628), getGame('scarlet')).formIdentifier).not.toBe('braviary-hisui')
  })

  it('모든 히스이 스타터로 파티와 로드맵을 만든다', () => {
    const game = getGame('legends-arceus')
    expect(getFamily(game).fieldMoves).toEqual([])
    for (const starter of game.starters) {
      const plan = generateParty(game, defaults, { requiredDexes: [starter] })
      expect(plan.members, `${starter}`).toHaveLength(6)
      expect(plan.members.every((member) => member.availability.obtainable && member.availability.preChampion)).toBe(true)
      expect(new Set(plan.members.map((member) => member.species.chainId)).size).toBe(6)
      for (const member of plan.members) {
        expect(member.availability.location, member.species.name).not.toMatch(/[A-Za-z]/)
        for (const move of member.moves) expect(move.source, `${member.species.name}/${move.name}`).not.toContain('기술가르침')
      }
      const roadmap = composeRoadmap(game, plan)
      expect(roadmap).toHaveLength(7)
      expect(roadmapReferencesAreAvailable(game, plan, roadmap)).toBe(true)
    }
  }, 300_000)
})
