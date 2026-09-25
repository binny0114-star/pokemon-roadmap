import { beforeAll, describe, expect, it } from 'vitest'
import encounterSnapshot from '../generated/modern-encounters.json'
import { evolutionRequirementChapter, evolutionText, getAvailability, loadCatalog, speciesByDex } from './catalog'
import { generateParty } from './engine'
import { getFamily, getGame } from './games'
import { getLegalMoves, loadLearnsets } from './learnsets'
import { modernEncounterChapter } from './modernGames'
import { composeRoadmap, roadmapReferencesAreAvailable } from './roadmap'
import type { PlannerPreferences } from './types'
import { gameCatalog } from './versionRegistry'

interface EncounterRow {
  species: number
  form: number
  location: string
  method: string
  minLevel: number
  conditions: string[]
}

const encounters = encounterSnapshot.games as Record<'scarlet' | 'violet', EncounterRow[]>
const locationNames = encounterSnapshot.locationNames as Record<string, Record<string, string>>
const defaults: PlannerPreferences = {
  noTrade: true,
  hmConvenience: true,
  allowLegendary: false,
  allowPostgame: false,
  favoriteWeight: 50,
}
const species = (dex: number) => speciesByDex.get(dex)!
const paldeaGames = ['scarlet', 'violet'] as const

describe('스칼렛·바이올렛 완전 플래너', () => {
  beforeAll(async () => {
    await Promise.all([loadCatalog(), loadLearnsets()])
  }, 120_000)

  it('두 버전을 paldea9 패밀리로 승격하고 모든 게이트 근거를 둔다', () => {
    for (const gameId of paldeaGames) {
      const entry = gameCatalog.find((game) => game.id === gameId)!
      expect(entry.plannerSupport.status).toBe('full')
      expect(entry.plannerFamilyId).toBe('paldea9')
      expect(Object.values(entry.plannerSupport.accuracyGates ?? {}).every((gate) => gate.complete && gate.evidence.trim())).toBe(true)
    }
  })

  it('평상시 날씨 슬롯은 날씨 조건 없이, 고정 심볼은 PKHeX 조건과 함께 싣는다', () => {
    for (const gameId of paldeaGames) {
      const rows = encounters[gameId]
      expect(rows.some((row) => row.conditions.includes('weather-normal'))).toBe(false)
      expect(rows.filter((row) => row.species === 999).every((row) => row.method === 'static' && row.conditions.includes('gimmighoul-chest'))).toBe(true)
      expect(rows.filter((row) => row.species >= 1001 && row.species <= 1004).every((row) => row.conditions.includes('postgame'))).toBe(true)
      expect(locationNames[gameId]['south-province-area-one']).toBe('남부 에리어 1')
      expect(locationNames[gameId]['cabo-poco']).toBe('티스푼마을')
    }
    expect(getAvailability(species(1001), getGame('scarlet'))).toMatchObject({ preChampion: false, postgameOnly: true })
  })

  it('배지에 따른 말 듣는 레벨을 넘는 야생 포켓몬은 그 장 이후로 둔다', () => {
    // 물 위 이동(3장)으로 갈 수 있어도 Lv.50 북팔데아해 포켓몬은 배지 6개(7장)부터 말을 듣습니다.
    expect(modernEncounterChapter('paldea9', 'north-paldean-sea', [], 'overworld', 50)).toBe(7)
    expect(modernEncounterChapter('paldea9', 'south-province-area-four', [], 'overworld', 23)).toBe(2)
    expect(modernEncounterChapter('paldea9', 'west-province-area-two', [], 'overworld', 54)).toBe(8)
    const game = getGame('scarlet')
    for (const dex of [130, 445, 149]) {
      const availability = getAvailability(species(dex), game)
      const level = Number(/\d+/.exec(availability.level)?.[0] ?? 0)
      const cap = [20, 25, 30, 35, 40, 45, 50][availability.chapter - 1] ?? Number.POSITIVE_INFINITY
      expect(level, `#${dex}`).toBeLessThanOrEqual(cap)
    }
  })

  it('팔데아 폼과 폼별 기술표를 쓴다', () => {
    const game = getGame('violet')
    expect(getAvailability(species(128), game).formIdentifier).toBe('tauros-paldea-combat-breed')
    expect(getAvailability(species(194), game).formIdentifier).toBe('wooper-paldea')
    const paldeanTauros = getLegalMoves(species(128), game, 'tauros-paldea-aqua-breed').map((move) => move.id)
    expect(paldeanTauros).toContain('raging-bull')
    // DLC에서 추가된 TM172 이후는 본편 계획에 쓰지 않습니다.
    const machines = getLegalMoves(species(906), game).filter((move) => move.method === 'machine')
    expect(machines.length).toBeGreaterThan(0)
    expect(machines.every((move) => Number(move.machine?.slice(2)) <= 171)).toBe(true)
  })

  it('팔데아 진화 조건과 버전 전용 갑옷, 멀티플레이 진화를 구분한다', () => {
    const scarlet = getGame('scarlet')
    const violet = getGame('violet')
    expect(getAvailability(species(936), scarlet).tradeRequired).toBe(false)
    expect(getAvailability(species(936), violet).tradeRequired).toBe(true)
    expect(getAvailability(species(937), scarlet).tradeRequired).toBe(true)
    expect(getAvailability(species(964), scarlet).tradeRequired).toBe(true)
    expect(evolutionText(species(923), scarlet)).toContain('1000걸음')
    // 파밀리쥐는 전투 중 레벨업으로만 진화하고, 1% 확률로 세식구가 됩니다.
    expect(evolutionText(species(925), scarlet)).toMatch(/^전투 중 Lv\.25 이상.*1% 세식구/)
    expect(evolutionText(species(982), scarlet)).toContain('1% 세마디폼')
    expect(evolutionText(species(981), scarlet)).toContain('트윈빔')
    expect(evolutionText(species(979), scarlet)).toContain('분노의주먹을 20번')
    expect(evolutionRequirementChapter(species(1000), scarlet)).toBe(getFamily(scarlet).chapters.length)
    expect(getAvailability(species(1000), scarlet).quality).toBe('inferred')
    // 배지 3개 뒤 프렌들리숍에서 파는 돌과 고정 입수 돌
    expect(evolutionRequirementChapter(species(470), scarlet)).toBe(4)
    expect(evolutionRequirementChapter(species(471), scarlet)).toBe(7)
    expect(evolutionRequirementChapter(species(40), scarlet)).toBe(2)
    // LEGENDS 아르세우스 전용 진화(흑요석 등)는 스칼렛·바이올렛 본편에 없습니다.
    expect(getAvailability(species(900), scarlet).obtainable).toBe(false)
  })

  it('모든 팔데아 스타터로 두 버전의 파티와 로드맵을 만든다', () => {
    for (const gameId of paldeaGames) {
      const game = getGame(gameId)
      for (const starter of game.starters) {
        const plan = generateParty(game, defaults, { requiredDexes: [starter] })
        expect(plan.members, `${gameId}/${starter}`).toHaveLength(6)
        expect(plan.members.every((member) => member.availability.obtainable && member.availability.preChampion)).toBe(true)
        expect(new Set(plan.members.map((member) => member.species.chainId)).size).toBe(6)
        for (const member of plan.members) {
          expect(member.availability.location, member.species.name).not.toMatch(/[A-Za-z]/)
          for (const move of member.moves) expect(move.source, `${member.species.name}/${move.name}`).not.toContain('기술가르침')
        }
        const roadmap = composeRoadmap(game, plan)
        expect(roadmap).toHaveLength(14)
        expect(roadmapReferencesAreAvailable(game, plan, roadmap)).toBe(true)
      }
    }
  }, 300_000)
})
