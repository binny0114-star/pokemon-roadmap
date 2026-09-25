import { beforeAll, describe, expect, it } from 'vitest'
import encounterSnapshot from '../generated/modern-encounters.json'
import { evolutionForGame, evolutionRequirementChapter, evolutionText, getAvailability, loadCatalog, speciesByDex } from './catalog'
import { generateParty } from './engine'
import { getBosses, getFamily, getGame } from './games'
import { loadLearnsets } from './learnsets'
import { composeRoadmap, roadmapReferencesAreAvailable } from './roadmap'
import type { PlannerPreferences } from './types'
import { gameCatalog, gen8Completeness } from './versionRegistry'

interface EncounterRow {
  species: number
  form: number
  location: string
  method: string
  minLevel: number
  conditions: string[]
}

const encounters = encounterSnapshot.games as Record<'lets-go-pikachu' | 'lets-go-eevee', EncounterRow[]>
const defaults: PlannerPreferences = {
  noTrade: true,
  hmConvenience: true,
  allowLegendary: false,
  allowPostgame: false,
  favoriteWeight: 50,
}
const species = (dex: number) => speciesByDex.get(dex)!
const letsGoGames = ['lets-go-pikachu', 'lets-go-eevee'] as const

describe('레츠고 피카츄·이브이 완전 플래너', () => {
  beforeAll(async () => {
    await Promise.all([loadCatalog(), loadLearnsets()])
  }, 120_000)

  it('모든 letsgo7 완전성 요구사항이 끝난 뒤에만 두 버전을 승격한다', () => {
    for (const gameId of letsGoGames) {
      const entry = gameCatalog.find((game) => game.id === gameId)!
      expect(entry.plannerSupport.status).toBe('full')
      expect(entry.plannerFamilyId).toBe('letsgo7')
    }
    expect(Object.values(gen8Completeness.families.letsgo7.gates)
      .every((gate) => gate.requirements.every((requirement) => requirement.status === 'complete'))).toBe(true)
  })

  it('하늘 출현은 엔딩 후, 수면 출현은 물결타기 이후로 둔다', () => {
    for (const gameId of letsGoGames) {
      const rows = encounters[gameId]
      const sky = rows.filter((row) => row.method === 'sky')
      expect(sky.length).toBeGreaterThan(0)
      expect(sky.every((row) => row.conditions.includes('postgame'))).toBe(true)
      expect(rows.some((row) => row.method === 'sea-skim')).toBe(true)
      // 무인발전소 고정 붐볼은 PKHeX가 야생 슬롯과 겹친다고 주석 처리한 항목이라 싣지 않습니다.
      expect(rows.some((row) => row.method === 'static' && row.species === 101)).toBe(false)
    }
    const game = getGame('lets-go-pikachu')
    // 리자몽·망나뇽의 하늘 출현은 쓰지 않습니다.
    expect(getAvailability(species(149), game).method).not.toContain('하늘')
    expect(getAvailability(species(149), game).chapter).toBeGreaterThanOrEqual(5)
    expect(getAvailability(species(143), game)).toMatchObject({ chapter: 5, preChampion: true })
    expect(getAvailability(species(150), game)).toMatchObject({ preChampion: false, postgameOnly: true })
  })

  it('파트너는 전용 폼으로 합류하고 진화 경로로 쓰지 않는다', () => {
    const pikachu = getGame('lets-go-pikachu')
    expect(getAvailability(species(25), pikachu)).toMatchObject({ chapter: 1, formIdentifier: 'pikachu-starter', location: '태초마을' })
    const raichu = getAvailability(species(26), pikachu)
    expect(raichu.formIdentifier).toBe('raichu')
    expect(raichu.location).not.toBe('태초마을')
    // 천둥의돌은 무지개시티 백화점에서 삽니다.
    expect(raichu.finalChapter).toBe(4)
    const eevee = getGame('lets-go-eevee')
    expect(getAvailability(species(133), eevee)).toMatchObject({ chapter: 1, formIdentifier: 'eevee-starter' })
    const vaporeon = getAvailability(species(134), eevee)
    expect(vaporeon.chapter).toBeGreaterThanOrEqual(5)
    expect(vaporeon.location).not.toBe('태초마을')
  })

  it('관동 151종과 버전 전용·알로라 교환을 구분한다', () => {
    const pikachu = getGame('lets-go-pikachu')
    const eevee = getGame('lets-go-eevee')
    expect(getAvailability(species(172), pikachu).obtainable).toBe(false)
    expect(getAvailability(species(808), pikachu).obtainable).toBe(false)
    expect(getAvailability(species(28), pikachu)).toMatchObject({ obtainable: true, versionExclusive: true })
    expect(getAvailability(species(28), eevee).obtainable).toBe(false)
    expect(getAvailability(species(38), eevee).obtainable).toBe(true)
    expect(getAvailability(species(38), pikachu).obtainable).toBe(false)
    // 알로라 교환은 요구하는 관동 포켓몬을 준비한 뒤에만 합니다(라이츄는 천둥의돌 이후 노랑시티).
    const alolanRaichu = getAvailability(species(26), pikachu, 1)
    expect(alolanRaichu).toMatchObject({ obtainable: true, formIdentifier: 'raichu-alola', chapter: 6 })
    const alolanMarowak = getAvailability(species(105), pikachu, 1)
    expect(alolanMarowak.chapter).toBe(5)
    for (const gameId of letsGoGames) {
      expect(encounters[gameId].filter((row) => row.method === 'npc-trade')
        .every((row) => row.form === 1 && row.conditions.some((condition) => condition.startsWith('trade-for-')))).toBe(true)
    }
  })

  it('확률 낮은 희귀 출현보다 확실한 선물을, 비용만 드는 잉어킹 판매원을 먼저 쓴다', () => {
    const game = getGame('lets-go-pikachu')
    expect(getAvailability(species(1), game)).toMatchObject({ location: '블루시티', chapter: 2 })
    expect(getAvailability(species(1), game).conditions).toContain('누적 포획 30마리 이상')
    expect(getAvailability(species(130), game)).toMatchObject({ chapter: 2, finalChapter: 3 })
    expect(getAvailability(species(113), game).conditions?.some((condition) => condition.startsWith('희귀 출현'))).toBe(true)
    expect(getAvailability(species(106), game).mutuallyExclusiveGroup)
      .toBe(getAvailability(species(107), game).mutuallyExclusiveGroup)
    expect(getAvailability(species(138), game).mutuallyExclusiveGroup)
      .toBe(getAvailability(species(140), game).mutuallyExclusiveGroup)
    expect(getAvailability(species(131), game)).toMatchObject({ location: '실프주식회사', chapter: 6 })
  })

  it('레츠고 진화표(PKHeX evos_gg)대로 관동 모습·알로라 모습을 잇는다', () => {
    const game = getGame('lets-go-pikachu')
    // 관동 가디·가라·아라리는 관동 모습으로만 진화합니다.
    expect(evolutionForGame(species(105), game)).toMatchObject({ trigger: 'level-up', minLevel: 28 })
    expect(getAvailability(species(105), game).formIdentifier).toBe('marowak')
    expect(getAvailability(species(103), game).formIdentifier).toBe('exeggutor')
    // 알로라 레트라는 시간대 없이 Lv.20, 알로라 페르시온은 Lv.28에 진화합니다.
    expect(evolutionText(species(20), game, 'raticate-alola')).not.toContain('밤')
    const alolanPersian = evolutionForGame(species(53), getGame('lets-go-eevee'), 10107, 1)
    expect(alolanPersian).toMatchObject({ minLevel: 28, minHappiness: null })
    expect(evolutionRequirementChapter(species(28), game)).toBe(1)
    expect(evolutionRequirementChapter(species(36), game)).toBe(2)
    expect(evolutionRequirementChapter(species(134), game)).toBe(4)
  })

  it('보스 레벨과 기술 떠올리기 장소를 검증값으로 둔다', () => {
    const level = (bossId: string) => getBosses(getGame('lets-go-eevee')).find((boss) => boss.id === bossId)?.level
    expect(level('giovanni-silph-lg')).toBe('Lv.39')
    expect(level('agatha-lg')).toBe('Lv.53–54')
    expect(level('lance-lg')).toBe('Lv.54–55')
    expect(getFamily(getGame('lets-go-pikachu')).moveReminder).toMatchObject({ chapter: 8, cost: '하트비늘 1개' })
    expect(getFamily(getGame('lets-go-pikachu')).fieldMoves).toEqual([])
  })

  it('두 버전의 파트너로 파티와 로드맵을 만든다', () => {
    for (const gameId of letsGoGames) {
      const game = getGame(gameId)
      for (const starter of game.starters) {
        const plan = generateParty(game, defaults, { requiredDexes: [starter] })
        expect(plan.members, `${gameId}/${starter}`).toHaveLength(6)
        expect(plan.members.every((member) => member.availability.obtainable && member.availability.preChampion)).toBe(true)
        expect(plan.members.every((member) => member.species.dex <= 151)).toBe(true)
        expect(new Set(plan.members.map((member) => member.species.chainId)).size).toBe(6)
        for (const member of plan.members) {
          for (const move of member.moves) expect(move.source, `${member.species.name}/${move.name}`).not.toContain('기술가르침')
        }
        const roadmap = composeRoadmap(game, plan)
        expect(roadmap).toHaveLength(8)
        expect(roadmapReferencesAreAvailable(game, plan, roadmap)).toBe(true)
        // 파트너가 아닌 다른 개체로 진화 전 단계를 안내하지 않습니다.
        expect(roadmap.flatMap((chapter) => chapter.actions).some((action) => action.text.includes('피츄'))).toBe(false)
      }
    }
  }, 300_000)
})
