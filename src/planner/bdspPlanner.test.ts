import { beforeAll, describe, expect, it } from 'vitest'
import encounterSnapshot from '../generated/modern-encounters.json'
import {
  evolutionForGame,
  evolutionRequirementChapter,
  getAvailability,
  loadCatalog,
  speciesByDex,
} from './catalog'
import { generateParty, generatedMoves } from './engine'
import { games, getBosses, getFamily } from './games'
import { getLegalMoves, loadLearnsets, type LegalMove } from './learnsets'
import { bdspUndergroundVendorTmChapters, getMoveAcquisition } from './moveResources'
import { composeRoadmap } from './roadmap'
import { gameCatalog, gen8Completeness } from './versionRegistry'

interface EncounterRow {
  species: number
  form: number
  location: string
  area: string
  method: string
  minLevel: number
  maxLevel: number
  conditions: string[]
}

const encounters = encounterSnapshot.games as Record<'brilliant-diamond' | 'shining-pearl', EncounterRow[]>
const preNationalUndergroundSpecies = {
  'brilliant-diamond': [
    41, 42, 54, 64, 66, 67, 72, 73, 74, 75, 77, 81, 92, 95, 108, 111, 122, 123,
    163, 175, 190, 194, 195, 198, 203, 207, 215, 220, 224, 229, 238, 239, 265,
    266, 278, 279, 280, 307, 315, 333, 339, 340, 355, 359, 361, 362, 399, 400,
    401, 403, 404, 406, 415, 417, 418, 420, 422, 423, 427, 433, 434, 435, 436,
    443, 444, 446, 449, 451, 453, 458, 459,
  ],
  'shining-pearl': [
    41, 42, 54, 64, 66, 67, 72, 73, 74, 75, 77, 81, 92, 95, 108, 111, 122, 127,
    163, 175, 190, 194, 195, 200, 203, 215, 216, 220, 224, 229, 238, 240, 265,
    268, 278, 279, 280, 307, 315, 333, 339, 340, 355, 359, 361, 362, 399, 400,
    401, 403, 404, 406, 415, 417, 418, 420, 422, 423, 427, 431, 432, 433, 436,
    443, 444, 446, 449, 451, 453, 458, 459,
  ],
} as const
const machine = (id: string): LegalMove => ({
  id,
  name: id,
  type: 'normal',
  category: '변화',
  power: 0,
  accuracy: null,
  generation: 8,
  method: 'machine',
  level: 0,
  machine: null,
})

describe('BDSP 완전 플래너 게이트', () => {
  beforeAll(async () => {
    await Promise.all([loadCatalog(), loadLearnsets()])
  }, 30_000)

  it('두 버전과 canonical Sinnoh 게이트를 모두 통과해 승격한다', () => {
    for (const gameId of ['brilliant-diamond', 'shining-pearl']) {
      const support = gameCatalog.find((entry) => entry.id === gameId)!.plannerSupport
      expect(support.status).toBe('full')
      expect(Object.values(support.accuracyGates ?? {}).every((gate) => gate.complete)).toBe(true)
    }
    expect(Object.values(gen8Completeness.families.sinnoh8.gates)
      .every((gate) => gate.requirements.every((requirement) => requirement.status === 'complete'))).toBe(true)
  })

  it('버전별 지상·지하·고정·선물·화석·교환과 조건부 풀을 보존한다', () => {
    expect(encounters['brilliant-diamond']).toHaveLength(7905)
    expect(encounters['shining-pearl']).toHaveLength(7886)
    for (const gameId of ['brilliant-diamond', 'shining-pearl'] as const) {
      const rows = encounters[gameId]
      expect(rows.filter((row) => row.method === 'grand-underground').length).toBeGreaterThan(2200)
      expect(new Set(rows.filter((row) => row.method === 'grand-underground').map((row) => row.area)).size).toBe(18)
      expect([...new Set(rows
        .filter((row) => row.method === 'grand-underground' && row.minLevel < 58)
        .map((row) => row.species))].sort((a, b) => a - b)).toEqual(preNationalUndergroundSpecies[gameId])
      expect(rows.some((row) => row.method === 'grass')).toBe(true)
      expect(rows.some((row) => row.method === 'honey-tree')).toBe(true)
      expect(rows.some((row) => row.method === 'gift' && row.species === 151 && row.conditions.includes('lets-go-save-data'))).toBe(true)
      expect(rows.some((row) => row.method === 'trade' && row.species === 93 && row.conditions.includes('medicham-required-everstone'))).toBe(true)
      expect(rows.some((row) => row.species === 16 && row.conditions.includes('daily-swarm'))).toBe(true)
      expect(rows.some((row) => row.species === 440 && row.conditions.includes('daily-trophy-garden'))).toBe(true)
      expect(rows.some((row) => row.species === 455 && row.conditions.includes('daily-great-marsh-binoculars'))).toBe(true)
      expect(rows.some((row) =>
        row.method === 'grand-underground'
        && row.conditions.includes('badge-count-1')
        && row.conditions.includes('explorer-kit'))).toBe(true)
      expect(rows.some((row) =>
        row.method === 'grand-underground'
        && row.conditions.includes('national-dex')
        && row.conditions.includes('elite-four-defeated'))).toBe(true)
      expect(rows.some((row) =>
        row.species === 349
        && row.method === 'feebas-tile-fishing'
        && ['daily-feebas-tiles', 'defog', 'surf', 'strength']
          .every((condition) => row.conditions.includes(condition)))).toBe(true)
      for (const species of [46, 102, 115, 193, 285, 316]) {
        expect(rows.some((row) =>
          row.species === species
          && row.location === 'great-marsh'
          && row.conditions.includes('national-dex')
          && row.conditions.includes('postgame')), `great-marsh/#${species}`).toBe(true)
      }
      for (const species of [1, 4, 7]) {
        const undergroundRows = rows.filter((row) => row.species === species && row.method === 'grand-underground')
        expect(undergroundRows.length, `grand-underground/#${species}`).toBeGreaterThan(0)
        expect(undergroundRows.every((row) =>
          row.minLevel === 58
          && row.maxLevel === 63
          && row.conditions.includes('national-dex')
          && row.conditions.includes('elite-four-defeated')), `grand-underground/#${species}`).toBe(true)
      }
      for (const [species, condition] of [
        [42, 'strength-obtained'],
        [64, 'defog'],
        [72, 'icicle-badge'],
        [224, 'waterfall'],
      ] as const) {
        const first = rows
          .filter((row) => row.species === species && row.method === 'grand-underground')
          .sort((a, b) => a.minLevel - b.minLevel)[0]
        expect(first.conditions, `grand-underground/#${species}`).toContain(condition)
        expect(first.conditions).not.toContain('national-dex')
      }
      for (const species of [229, 280]) {
        const first = rows
          .filter((row) => row.species === species && row.method === 'grand-underground')
          .sort((a, b) => a.minLevel - b.minLevel)[0]
        expect(first.minLevel, `grand-underground/#${species}`).toBe(16)
        expect(first.conditions).toEqual(expect.arrayContaining(['badge-count-1', 'explorer-kit']))
        expect(first.conditions).not.toContain('national-dex')
      }
    }
    expect(encounters['brilliant-diamond'].some((row) => row.species === 408 && row.conditions.includes('skull-fossil'))).toBe(true)
    expect(encounters['brilliant-diamond'].some((row) => row.species === 410 && row.method === 'fossil')).toBe(false)
    expect(encounters['shining-pearl'].some((row) => row.species === 410 && row.conditions.includes('armor-fossil'))).toBe(true)
    expect(encounters['shining-pearl'].some((row) => row.species === 408 && row.method === 'fossil')).toBe(false)
    expect(encounters['brilliant-diamond'].some((row) => row.species === 246 && row.conditions.includes('poke-radar'))).toBe(true)
    expect(encounters['shining-pearl'].some((row) => row.species === 246)).toBe(false)
  })

  it('폼·조건·버전 배타성과 최초 도달 장을 런타임에 반영한다', () => {
    const diamond = games.find((entry) => entry.id === 'brilliant-diamond')!
    const pearl = games.find((entry) => entry.id === 'shining-pearl')!
    expect(getAvailability(speciesByDex.get(422)!, diamond).formChoices?.map((choice) => choice.formIdentifier))
      .toEqual(expect.arrayContaining(['shellos-west', 'shellos-east']))
    expect(getAvailability(speciesByDex.get(198)!, diamond)).toMatchObject({ chapter: 2, versionExclusive: true })
    expect(getAvailability(speciesByDex.get(200)!, pearl)).toMatchObject({ chapter: 2, versionExclusive: true })
    expect(getAvailability(speciesByDex.get(16)!, diamond)).toMatchObject({ chapter: 11, postgameOnly: true })
    expect(getAvailability(speciesByDex.get(246)!, pearl)).toMatchObject({ obtainable: false, sourceKind: 'unknown' })
    expect(getAvailability(speciesByDex.get(408)!, diamond)).toMatchObject({ chapter: 2, sourceKind: 'fossil' })
    expect(getAvailability(speciesByDex.get(198)!, diamond)).toMatchObject({ chapter: 2, conditions: ['밤 한정'] })
    expect(getAvailability(speciesByDex.get(200)!, pearl)).toMatchObject({ chapter: 2, conditions: ['밤 한정'] })
    for (const species of [480, 481, 482]) {
      expect(getAvailability(speciesByDex.get(species)!, diamond)).toMatchObject({ chapter: 8, postgameOnly: false })
    }
    for (const species of [46, 102, 115, 193, 285, 316]) {
      expect(getAvailability(speciesByDex.get(species)!, diamond)).toMatchObject({ chapter: 11, postgameOnly: true })
    }
    expect(getAvailability(speciesByDex.get(229)!, diamond)).toMatchObject({ chapter: 2, postgameOnly: false })
    expect(getAvailability(speciesByDex.get(280)!, pearl)).toMatchObject({ chapter: 2, postgameOnly: false })
    for (let species = 494; species <= 1025; species += 1) {
      expect(getAvailability(speciesByDex.get(species)!, diamond), `BDSP roster #${species}`)
        .toMatchObject({ obtainable: false, sourceKind: 'unknown' })
    }
  })

  it('정확한 TM 수량·반복 획득·알기술·가르침·떠올리기 시점을 사용한다', () => {
    const diamond = games.find((entry) => entry.id === 'brilliant-diamond')!
    expect(getMoveAcquisition(diamond, machine('stealth-rock'))).toMatchObject({
      chapter: 1, resourceId: 'TM76', reusable: false, repeatable: true,
      guaranteedCopies: 5, repeatableChapter: 3,
    })
    expect(getMoveAcquisition(diamond, machine('earthquake'))).toMatchObject({
      chapter: 6, resourceId: 'TM26', reusable: false, repeatable: true,
      guaranteedCopies: 1, repeatableChapter: 6,
    })
    expect(getMoveAcquisition(diamond, machine('swords-dance'))).toMatchObject({
      chapter: 3, resourceId: 'TM75', reusable: false, repeatable: true, repeatableChapter: 3,
    })
    expect(getMoveAcquisition(diamond, machine('thunder-wave'))).toMatchObject({
      chapter: 2, resourceId: 'TM73', availability: 'daily-rotation', repeatableChapter: 2,
    })
    expect(getMoveAcquisition(diamond, machine('work-up'))).toMatchObject({
      chapter: 1, resourceId: 'TM10', reusable: false, guaranteedCopies: 3,
    })
    for (const move of ['hail', 'sunny-day', 'rain-dance', 'sandstorm']) {
      expect(getMoveAcquisition(diamond, machine(move))).toMatchObject({
        chapter: 5, reusable: false, repeatable: true, repeatableChapter: 5,
      })
    }
    expect(getMoveAcquisition(diamond, {
      ...machine('draco-meteor'), method: 'tutor',
    })).toMatchObject({ chapter: 8, reusable: true, repeatable: true })
    const eggMove = getLegalMoves(speciesByDex.get(172)!, diamond).find((entry) => entry.method === 'egg')
    expect(eggMove?.eggParentIdentifiers?.length).toBeGreaterThan(0)
    expect(getMoveAcquisition(diamond, eggMove!)).toMatchObject({
      chapter: 3, availability: 'compatible-parent-required', storyFlag: 'solaceon-nursery-access',
    })
    expect(getFamily(diamond).moveReminder).toEqual({
      chapter: 4, location: '들판시티', cost: '하트비늘 1개 · 10회 지불 후 무료',
    })
    expect(bdspUndergroundVendorTmChapters).toEqual({
      5: 2, 31: 2, 56: 2, 67: 2, 73: 2, 82: 2, 87: 2, 88: 2,
      3: 2, 4: 2, 9: 2, 34: 2, 40: 2, 59: 2, 69: 2, 98: 2,
      8: 3, 12: 3, 23: 3, 36: 3, 41: 3, 46: 3, 47: 3, 51: 3, 76: 3, 80: 3, 86: 3, 92: 3, 93: 3,
      1: 4, 2: 4, 6: 4, 30: 4, 42: 4, 45: 4, 55: 4, 60: 4, 62: 4, 66: 4, 81: 4,
      43: 5, 53: 5, 61: 5, 64: 5, 78: 5, 85: 5, 94: 5,
      19: 6, 26: 6, 39: 6, 48: 6, 49: 6, 50: 6, 63: 6, 71: 6, 77: 6, 91: 6, 95: 6, 97: 6,
      65: 7, 72: 7, 84: 7, 96: 7,
      57: 9, 79: 9, 100: 9,
      99: 11,
    })
  })

  it('진화 도구·장소·통신 조건을 BDSP 도달 시점에 고정한다', () => {
    const diamond = games.find((entry) => entry.id === 'brilliant-diamond')!
    const pearl = games.find((entry) => entry.id === 'shining-pearl')!
    expect(evolutionRequirementChapter(speciesByDex.get(470)!, diamond)).toBe(2)
    expect(evolutionRequirementChapter(speciesByDex.get(471)!, diamond)).toBe(7)
    expect(evolutionRequirementChapter(speciesByDex.get(466)!, diamond)).toBe(2)
    expect(evolutionRequirementChapter(speciesByDex.get(467)!, pearl)).toBe(2)
    expect(evolutionRequirementChapter(speciesByDex.get(472)!, diamond)).toBe(11)
    expect(getAvailability(speciesByDex.get(472)!, diamond)).toMatchObject({ postgameOnly: true })
    expect(evolutionRequirementChapter(speciesByDex.get(475)!, diamond)).toBe(5)
    expect(evolutionRequirementChapter(speciesByDex.get(478)!, diamond)).toBe(5)
    expect(evolutionForGame(speciesByDex.get(350)!, diamond)).toMatchObject({
      trigger: 'level-up', minBeauty: 170,
    })
    expect(evolutionRequirementChapter(speciesByDex.get(350)!, diamond)).toBe(3)
    expect(getAvailability(speciesByDex.get(350)!, diamond)).toMatchObject({
      chapter: 6, finalChapter: 6, tradeRequired: false, postgameOnly: false,
    })
  })

  it('모든 의무 보스와 포켓치 비전기술을 순서대로 로드맵에 넣는다', () => {
    const diamond = games.find((entry) => entry.id === 'brilliant-diamond')!
    const bosses = getBosses(diamond)
    for (const id of [
      'barry-route-203', 'mars-valley-windworks', 'jupiter-eterna', 'galactic-veilstone-double',
      'saturn-lake-valor', 'mars-lake-verity', 'cyrus-galactic-hq', 'commanders-spear-pillar',
      'cyrus-spear-pillar', 'dialga-bdsp', 'barry-league', 'cynthia-bdsp',
    ]) {
      expect(bosses.some((boss) => boss.id === id), id).toBe(true)
    }
    expect(bosses.some((boss) => boss.id === 'palkia-bdsp')).toBe(false)
    expect(bosses.some((boss) => boss.id === 'galactic-iron-island-double')).toBe(false)
    const plan = generateParty(diamond, {
      noTrade: true, allowPostgame: false, allowLegendary: false, hmConvenience: true, favoriteWeight: 1,
    }, { requiredDexes: [387], lockedDexes: [], previousMembers: [] })
    const roadmap = composeRoadmap(diamond, plan)
    expect(roadmap).toHaveLength(12)
    expect(plan.members.every((member) => member.fieldMoves.length === 0)).toBe(true)
    expect(plan.coverage.fieldMovesCovered).toEqual(getFamily(diamond).fieldMoves.map((move) => move.id))
    expect(plan.coverage.fieldMovesMissing).toEqual([])
    expect(plan.warnings.some((warning) => warning.includes('임시 요원'))).toBe(false)
    const fieldActions = roadmap.flatMap((chapter) => chapter.actions)
      .filter((action) => action.id.includes(':field:'))
    expect(fieldActions).toHaveLength(8)
    expect(fieldActions.every((action) => action.text.includes('파티 기술칸 불필요'))).toBe(true)
  })

  it('6마리·4기술 플랜이 스토리 중 한정 TM 수량을 초과하지 않는다', () => {
    for (const game of games.filter((entry) =>
      entry.id === 'brilliant-diamond' || entry.id === 'shining-pearl')) {
      const plan = generateParty(game, {
        noTrade: true, allowPostgame: false, allowLegendary: false, hmConvenience: true, favoriteWeight: 1,
      }, { requiredDexes: [387], lockedDexes: [], previousMembers: [] })
      expect(plan.members).toHaveLength(6)
      expect(plan.members.every((member) => member.moves.length === 4)).toBe(true)
      const use = new Map<string, number>()
      for (const move of plan.members.flatMap((member) => member.moves)) {
        if (!move.resourceId || move.reusable !== false) continue
        use.set(move.resourceId, (use.get(move.resourceId) ?? 0) + 1)
      }
      for (const [resourceId, count] of use) {
        const assigned = plan.members.flatMap((member) => member.moves).find((move) => move.resourceId === resourceId)!
        const repeatableInStory = assigned.repeatable
          && (assigned.repeatableChapter ?? Number.POSITIVE_INFINITY) <= 10
        expect(repeatableInStory || count <= (assigned.guaranteedCopies ?? 1), resourceId).toBe(true)
      }
      expect(plan.warnings.some((warning) => warning.includes('BDSP 기술머신은 1회용'))).toBe(true)
      expect(generatedMoves(speciesByDex.get(445)!, game)).toHaveLength(4)
    }
  })
})
