import { beforeAll, describe, expect, it } from 'vitest'
import encounterSnapshot from '../generated/modern-encounters.json'
import {
  evolutionRequirementChapter,
  evolutionText,
  evolutionForGame,
  getAvailability,
  loadCatalog,
  speciesByDex,
} from './catalog'
import { getGen8FormProfile, getGen8FormProfileByPokemonId, swshFormChangeRules } from './gen8Forms'
import { games, getBosses } from './games'
import { generateParty, generatedMoves, isMoveLegalForSpecies, validateRequired } from './engine'
import { getLegalMoves, loadLearnsets, type LegalMove } from './learnsets'
import { getMoveAcquisition } from './moveResources'
import { composeRoadmap } from './roadmap'
import { gameCatalog, gen8Completeness } from './versionRegistry'

interface EncounterRow {
  species: number
  form: number
  location: string
  method: string
  conditions: string[]
}

const encounters = encounterSnapshot.games as Record<'sword' | 'shield', EncounterRow[]>
const move = (id: string, method: LegalMove['method'], machine: string | null = null): LegalMove => ({
  id,
  name: id,
  type: 'normal',
  category: '변화',
  power: 0,
  accuracy: null,
  generation: 8,
  method,
  level: 0,
  machine,
})

describe('Sword/Shield 완전 플래너 게이트', () => {
  beforeAll(async () => {
    await Promise.all([loadCatalog(), loadLearnsets()])
  }, 120_000)

  it('두 버전과 모든 Galar 매니페스트 게이트만 완전 지원으로 승격한다', () => {
    for (const gameId of ['sword', 'shield']) {
      const support = gameCatalog.find((entry) => entry.id === gameId)!.plannerSupport
      expect(support.status).toBe('full')
      expect(Object.values(support.accuracyGates ?? {}).every((gate) => gate.complete)).toBe(true)
    }
    expect(Object.values(gen8Completeness.families.galar8.gates)
      .every((gate) => gate.requirements.every((requirement) => requirement.status === 'complete'))).toBe(true)
  })

  it('버전별 영구 조우와 DLC/update/Max Lair 범위를 보존한다', () => {
    expect(encounters.sword).toHaveLength(8680)
    expect(encounters.shield).toHaveLength(8659)
    for (const rows of [encounters.sword, encounters.shield]) {
      expect(rows.filter((row) => row.method === 'dynamax-adventure')).toHaveLength(274)
      expect(rows.some((row) => row.location.startsWith('galar-location-'))).toBe(false)
      expect(rows.some((row) => row.conditions.includes('distribution-event'))).toBe(false)
      expect(rows.some((row) =>
        row.conditions.includes('base-game')
        && row.conditions.includes('content-update-1.3.0'))).toBe(false)
      expect(rows.some((row) =>
        row.conditions.includes('base-game')
        && row.conditions.includes('launch-version-1.0.0'))).toBe(true)
      const maxLair = rows.filter((row) => row.method === 'dynamax-adventure')
      expect(maxLair.every((row) => row.conditions.includes('crown-tundra'))).toBe(true)
      expect(maxLair.every((row) => row.conditions.includes('content-update-1.3.0'))).toBe(true)
      expect(maxLair.every((row) => row.conditions.includes('dlc-milestone-crown-access'))).toBe(true)
      expect(maxLair.every((row) => row.conditions.includes('rental-team'))).toBe(true)
      expect(maxLair.filter((row) => row.conditions.includes('multiplayer-opposite-version-host'))).toHaveLength(8)
      expect(maxLair.filter((row) => row.conditions.includes('ultra-beast-clue-complete'))).toHaveLength(9)
    }
    expect(encounters.sword.some((row) => row.species === 888 && row.conditions.includes('postgame'))).toBe(true)
    expect(encounters.sword.some((row) => row.species === 889)).toBe(false)
    expect(encounters.shield.some((row) => row.species === 889 && row.conditions.includes('postgame'))).toBe(true)
    expect(encounters.shield.some((row) => row.species === 888)).toBe(false)
    expect(new Set(encounters.sword
      .filter((row) => row.species === 131 && row.method === 'static')
      .map((row) => row.location))).toEqual(new Set([
      'route-2', 'west-lake-axewell', 'south-lake-miloch', 'north-lake-miloch', 'lake-of-outrage',
    ]))
    for (const rows of [encounters.sword, encounters.shield]) {
      expect(rows.some((row) =>
        row.species === 79
        && row.form === 1
        && row.location === 'wedgehurst-station'
        && row.conditions.includes('content-update-1.1.0')
        && row.conditions.includes('no-paid-dlc-required'))).toBe(true)
      expect(rows.some((row) =>
        row.species === 79
        && row.form === 0
        && row.location === 'fields-of-honor'
        && row.conditions.includes('content-update-1.2.0')
        && row.conditions.includes('isle-diglett-found-10')
        && !row.conditions.includes('content-update-1.1.0'))).toBe(true)
      expect(rows.some((row) =>
        row.species === 50
        && row.form === 1
        && row.conditions.includes('isle-diglett-found-150'))).toBe(true)
      expect(rows.some((row) => row.species === 592 && row.form === 1)).toBe(true)
      expect(rows.some((row) => row.species === 593 && row.form === 1)).toBe(true)
      for (const species of [144, 145, 146]) {
        expect(rows.filter((row) => row.species === species && row.form === 1)
          .every((row) => row.conditions.includes('dlc-milestone-crown-legendary-clues'))).toBe(true)
      }
      expect(rows.filter((row) => row.method === 'npc-trade' && row.conditions.includes('regina-random-location'))
        .every((row) => row.conditions.includes('dlc-milestone-isle-access'))).toBe(true)
    }
  })

  it('지역폼·검왕/방패왕·우라오스·버드렉스 폼 규칙을 분리한다', () => {
    expect(getGen8FormProfile(52, 2)).toMatchObject({ identifier: 'meowth-galar', types: ['steel'] })
    expect(getGen8FormProfile(592, 0)).toMatchObject({ identifier: 'frillish-male' })
    expect(getGen8FormProfile(592, 1)).toMatchObject({ identifier: 'frillish-female' })
    expect(getGen8FormProfile(854, 0)).toMatchObject({ identifier: 'sinistea-phony' })
    expect(getGen8FormProfile(854, 1)).toMatchObject({ identifier: 'sinistea-antique' })
    expect(getAvailability(speciesByDex.get(592)!, games.find((entry) => entry.id === 'sword')!)
      .formChoices?.map((choice) => choice.formIdentifier)).toEqual(['frillish-male', 'frillish-female'])
    expect(getGen8FormProfile(110, 1)).toMatchObject({ identifier: 'weezing-galar', types: ['poison', 'fairy'] })
    expect(getGen8FormProfile(888, 1)).toMatchObject({ identifier: 'zacian-crowned', battleOnly: true })
    expect(getGen8FormProfile(898, 2)).toMatchObject({ identifier: 'calyrex-shadow', types: ['psychic', 'ghost'] })
    expect(swshFormChangeRules.filter((rule) => rule.speciesId === 898)).toHaveLength(2)
    expect(new Set(swshFormChangeRules.filter((rule) => rule.speciesId === 898)
      .map((rule) => rule.choiceGroup))).toEqual(new Set(['calyrex-steed']))
    const sword = games.find((entry) => entry.id === 'sword')!
    const galarDarumaka = getGen8FormProfile(554, 1)!
    const darmanitanEvolution = evolutionForGame(speciesByDex.get(555)!, sword, galarDarumaka.pokemonId)
    const evolvedFormId = darmanitanEvolution && 'evolvedFormId' in darmanitanEvolution
      ? darmanitanEvolution.evolvedFormId
      : 0
    expect(getGen8FormProfileByPokemonId(evolvedFormId ?? 0)).toMatchObject({
      identifier: 'darmanitan-galar-standard',
      types: ['ice'],
    })
    expect(getAvailability(speciesByDex.get(888)!, sword)).toMatchObject({
      formIdentifier: 'zacian-crowned',
      formTypes: ['fairy', 'steel'],
      location: '타워톱',
      postgameOnly: true,
    })
    expect(getAvailability(speciesByDex.get(894)!, sword).mutuallyExclusiveGroup)
      .toBe(getAvailability(speciesByDex.get(895)!, sword).mutuallyExclusiveGroup)
    expect(getAvailability(speciesByDex.get(892)!, sword).formChoices?.map((choice) => choice.formIdentifier))
      .toEqual(['urshifu-single-strike', 'urshifu-rapid-strike'])
    const shield = games.find((entry) => entry.id === 'shield')!
    expect(evolutionForGame(speciesByDex.get(855)!, sword, 854, 0)).toMatchObject({ item: 'cracked-pot' })
    expect(evolutionForGame(speciesByDex.get(855)!, sword, 854, 1)).toMatchObject({ item: 'chipped-pot' })
    expect(getAvailability(speciesByDex.get(864)!, shield)).toMatchObject({
      sourceFormIdentifier: 'corsola-galar',
    })
    expect(getAvailability(speciesByDex.get(841)!, shield)).toMatchObject({
      tradeRequired: true,
      reason: expect.stringContaining('새콤한사과'),
    })
    expect(getAvailability(speciesByDex.get(842)!, sword)).toMatchObject({
      tradeRequired: true,
      reason: expect.stringContaining('달콤한사과'),
    })
    expect(getAvailability(speciesByDex.get(834)!, sword).dlcChapter).toBeUndefined()
    expect(getAvailability(speciesByDex.get(53)!, sword)).toMatchObject({
      sourceFormIdentifier: 'meowth',
      dlcChapter: undefined,
    })
    expect(getAvailability(speciesByDex.get(563)!, sword)).toMatchObject({
      sourceFormIdentifier: 'yamask',
      dlcChapter: undefined,
    })
  })

  it('TM/TR/가르침의 재사용·회전·소모 비용과 시점을 구분한다', () => {
    const sword = games.find((entry) => entry.id === 'sword')!
    expect(getLegalMoves(speciesByDex.get(778)!, sword)
      .find((entry) => entry.id === 'play-rough')).toMatchObject({ category: '물리' })
    const eggMove = getLegalMoves(speciesByDex.get(778)!, sword).find((entry) => entry.method === 'egg')
    expect(eggMove?.eggParentIdentifiers?.length).toBeGreaterThan(0)
    expect(getMoveAcquisition(sword, eggMove!)).toMatchObject({
      chapter: 3,
      storyFlag: 'route-5-nursery-access',
      source: expect.stringContaining('5번도로'),
    })
    expect(getLegalMoves(speciesByDex.get(172)!, sword)
      .filter((entry) => entry.method === 'egg')
      .every((entry) => (entry.eggParentIdentifiers?.length ?? 0) > 0)).toBe(true)
    expect(getMoveAcquisition(sword, move('mega-punch', 'machine', 'TM00')))
      .toMatchObject({ chapter: 5, reusable: true, repeatable: true, resourceId: 'TM00' })
    expect(getMoveAcquisition(sword, move('swords-dance', 'machine', 'TR00')))
      .toMatchObject({
        chapter: 1,
        reusable: false,
        repeatable: true,
        unitCost: 2000,
        currency: 'W',
        availability: 'daily-rotation',
        storyFlag: 'wild-area-watt-trader-access',
      })
    expect(getMoveAcquisition(sword, move('steel-beam', 'tutor')))
      .toMatchObject({ chapter: 11, reusable: true })
    expect(getMoveAcquisition(sword, move('grassy-glide', 'tutor')))
      .toMatchObject({
        chapter: 1,
        reusable: false,
        unitCost: 5,
        currency: '갑옷광석',
        dlcMilestone: 'dlc-milestone-isle-first-trial',
        dlcChapter: 12,
      })
    expect(generatedMoves(speciesByDex.get(824)!, sword).find((entry) => entry.id === 'infestation')?.source)
      .toContain('부모 계열에서 유전')
    expect(generatedMoves(speciesByDex.get(824)!, sword).find((entry) => entry.id === 'infestation')?.availableChapter)
      .toBeGreaterThanOrEqual(3)
  })

  it('DLC 병행 진행과 스타터 연동 보상을 독립된 기계 판독 필드로 보존한다', () => {
    const sword = games.find((entry) => entry.id === 'sword')!
    expect(getAvailability(speciesByDex.get(891)!, sword)).toMatchObject({
      dlcMilestone: 'dlc-milestone-isle-trials-complete',
      dlcChapter: 13,
    })
    expect(getAvailability(speciesByDex.get(789)!, sword)).toMatchObject({
      dlcMilestone: 'dlc-milestone-crown-calyrex-complete',
      dlcChapter: 17,
    })
    expect(getAvailability(speciesByDex.get(896)!, sword)).toMatchObject({
      dlcMilestone: 'dlc-milestone-crown-calyrex-complete',
      dlcChapter: 17,
    })
    expect(getAvailability(speciesByDex.get(894)!, sword)).toMatchObject({
      dlcMilestone: 'dlc-milestone-crown-legendary-clues',
      dlcChapter: 18,
    })
    expect(getAvailability(speciesByDex.get(79)!, sword)).toMatchObject({
      chapter: 1,
      dlcChapter: undefined,
      formIdentifier: 'slowpoke-galar',
    })
    expect(getAvailability(speciesByDex.get(80)!, sword)).toMatchObject({
      dlcChapter: undefined,
      evolutionDlcMilestone: 'dlc-milestone-isle-access',
      evolutionDlcChapter: 12,
      evolutionDlcFinalChapter: 12,
      formIdentifier: 'slowbro-galar',
      sourceSpeciesName: '야돈',
      postgameOnly: false,
    })
    expect(getAvailability(speciesByDex.get(199)!, sword)).toMatchObject({
      dlcChapter: undefined,
      evolutionDlcMilestone: 'dlc-milestone-crown-access',
      evolutionDlcChapter: 16,
      evolutionDlcFinalChapter: 16,
      postgameOnly: false,
    })
    const slowbroPlan = generateParty(sword, {
      noTrade: true, allowPostgame: false, allowLegendary: true, hmConvenience: true, favoriteWeight: 1,
    }, { requiredDexes: [80] })
    const slowbroRoadmap = composeRoadmap(sword, slowbroPlan)
    expect(slowbroRoadmap[0].actions.some((action) => action.id.includes(':capture:80'))).toBe(true)
    expect(slowbroRoadmap[11].actions.some((action) => action.id.includes(':evolve:80'))).toBe(true)
    expect(getAvailability(speciesByDex.get(722)!, sword)).toMatchObject({
      mutuallyExclusiveGroup: 'choice-group-galar-starter-reward',
      requiredStarterDex: 810,
    })
    const preferences = { noTrade: false, allowPostgame: true, allowLegendary: true, hmConvenience: true, favoriteWeight: 1 }
    expect(validateRequired([810, 722], sword, preferences).errors).toHaveLength(0)
    expect(validateRequired([722], sword, preferences).errors)
      .toContain('나몰빼미: 디그다 보상에 대응하는 가라르 스타팅을 함께 선택해야 합니다.')
    expect(validateRequired([813, 722], sword, preferences).errors)
      .toContain('나몰빼미: 선택한 가라르 스타팅 염버니의 디그다 보상과 일치하지 않습니다.')
    expect(validateRequired([722, 725], sword, preferences).errors.some((error) =>
      error.includes('동시에 선택할 수 없는 입수 선택지'))).toBe(true)

    const plan = generateParty(sword, preferences, {
      requiredDexes: [891],
      lockedDexes: [],
      previousMembers: [],
    })
    plan.members[0].moves.push({
      id: 'grassy-glide',
      name: '그래스슬라이더',
      type: 'grass',
      category: '물리',
      source: '갑옷섬 첫 번째 수행 이후',
      availableChapter: 1,
      dlcMilestone: 'dlc-milestone-isle-first-trial',
      dlcChapter: 12,
      quality: 'verified',
    })
    const roadmap = composeRoadmap(sword, plan)
    expect(roadmap[0].actions.some((action) => action.id.includes(':capture:891'))).toBe(false)
    expect(roadmap[12].actions.some((action) => action.id.includes(':capture:891'))).toBe(true)
    expect(roadmap[11].actions.some((action) => action.id.includes(':move:891:그래스슬라이더'))).toBe(false)
    expect(roadmap[12].actions.some((action) => action.id.includes(':move:891:그래스슬라이더'))).toBe(true)
    const calyrexBranches = roadmap[16].actions.filter((action) => action.id.endsWith(':boss:steed-choice'))
    expect(calyrexBranches).toHaveLength(1)
    expect(calyrexBranches[0].text).toContain('또는')
    const basePlan = generateParty(sword, { ...preferences, allowPostgame: false }, {
      requiredDexes: [810],
      lockedDexes: [],
      previousMembers: [],
    })
    expect(basePlan.members.slice(1).every((member) => !member.availability.dlcChapter)).toBe(true)
  })

  it('우라오스 태세를 타입·기술·표시·플랜 ID에 구체적으로 고정한다', () => {
    const sword = games.find((entry) => entry.id === 'sword')!
    const preferences = {
      noTrade: true,
      allowPostgame: false,
      allowLegendary: true,
      hmConvenience: true,
      favoriteWeight: 1,
    }
    expect(validateRequired([892], sword, preferences, 'dark').errors)
      .toContain('우라오스: 사용할 폼을 선택하세요.')

    const single = generateParty(sword, preferences, {
      requiredDexes: [892],
      challengeType: 'dark',
      formSelections: { 892: 'urshifu-single-strike' },
    })
    const rapid = generateParty(sword, preferences, {
      requiredDexes: [892],
      challengeType: 'water',
      formSelections: { 892: 'urshifu-rapid-strike' },
    })
    expect(single.members[0].availability).toMatchObject({
      formIdentifier: 'urshifu-single-strike',
      formTypes: ['fighting', 'dark'],
      formChoices: undefined,
    })
    expect(rapid.members[0].availability).toMatchObject({
      formIdentifier: 'urshifu-rapid-strike',
      formTypes: ['fighting', 'water'],
      formChoices: undefined,
    })
    expect(single.members[0].moves.map((entry) => entry.id)).toContain('wicked-blow')
    expect(single.members[0].moves.every((entry) =>
      isMoveLegalForSpecies(speciesByDex.get(892)!, sword, entry.id, 'urshifu-single-strike'))).toBe(true)
    expect(rapid.members[0].moves.every((entry) =>
      isMoveLegalForSpecies(speciesByDex.get(892)!, sword, entry.id, 'urshifu-rapid-strike'))).toBe(true)
    expect(rapid.members[0].moves.map((entry) => entry.id)).not.toContain('wicked-blow')
    expect(single.id).toContain('forms-892-urshifu-single-strike')
    expect(rapid.id).toContain('892-urshifu-rapid-strike')
    expect(single.id).not.toBe(rapid.id)
    expect(single.formSelections).toMatchObject({ 892: 'urshifu-single-strike' })
    expect(rapid.formSelections).toMatchObject({ 892: 'urshifu-rapid-strike' })
    expect(single.members[0].availability).toMatchObject({
      chapter: 1,
      finalChapter: 1,
      sourceSpeciesName: undefined,
      dlcChapter: undefined,
      dlcFinalChapter: undefined,
    })
    const starterRoadmap = composeRoadmap(sword, single)
    expect(starterRoadmap[0].actions.some((action) => action.id.includes(':capture:892'))).toBe(true)
    expect(starterRoadmap.flatMap((chapter) => chapter.actions)
      .some((action) => action.id.includes(':evolve:892'))).toBe(false)

    const storyUrshifu = generateParty(sword, preferences, {
      requiredDexes: [892],
      formSelections: { 892: 'urshifu-single-strike' },
    })
    const storyRoadmap = composeRoadmap(sword, storyUrshifu)
    expect(storyRoadmap[12].actions.some((action) => action.id.includes(':capture:892'))).toBe(true)
    expect(storyRoadmap[13].actions.some((action) => action.id.includes(':evolve:892'))).toBe(true)
    expect(storyRoadmap[12].actions.some((action) => action.id.includes(':move:892:암흑강타'))).toBe(false)
    expect(storyRoadmap[13].actions.some((action) => action.id.includes(':move:892:암흑강타'))).toBe(true)
    expect(storyRoadmap[13].actions.find((action) => action.id.includes(':move:892:암흑강타'))?.text)
      .toContain('일격의 태세')

    expect(() => generateParty(sword, preferences, {
      requiredDexes: [810],
      lockedDexes: [892],
      previousMembers: [892],
      formSelections: { 892: 'not-a-real-form' },
    })).toThrow('유효하지 않은 폼')
    expect(() => generateParty(sword, preferences, {
      requiredDexes: [810],
      lockedDexes: [892],
      previousMembers: [892],
    })).toThrow('사용할 폼을 선택')
  })

  it('Galar 고유 진화와 필수 본편/DLC 종점을 고정한다', () => {
    const sword = games.find((entry) => entry.id === 'sword')!
    const runerigus = speciesByDex.get(867)!
    expect(evolutionRequirementChapter(runerigus, sword)).toBe(5)
    expect(evolutionText(runerigus, sword)).toContain('49 이상 피해')
    const bosses = getBosses(sword)
    expect(bosses.find((entry) => entry.id === 'bea')?.gameIds).toEqual(['sword'])
    expect(bosses.find((entry) => entry.id === 'mustard-tower')).toMatchObject({
      chapter: 14,
      branchGroup: 'single-tower-choice',
      winRequired: true,
    })
    expect(bosses.find((entry) => entry.id === 'peony')).toMatchObject({ winRequired: false })
    expect(bosses.find((entry) => entry.id === 'vespiquen-max-honey')).toMatchObject({ chapter: 15 })
    expect(bosses.find((entry) => entry.id === 'calyrex-first')).toMatchObject({ chapter: 17 })
    expect(bosses.find((entry) => entry.id === 'glastrier-freezington')?.branchGroup).toBe('steed-choice-prelude')
    expect(bosses.map((entry) => entry.id)).toEqual(expect.arrayContaining([
      'regirock-capture',
      'regice-capture',
      'registeel-capture',
      'regieleki-capture',
      'regidrago-capture',
      'articuno-galar-capture',
      'zapdos-galar-capture',
      'moltres-galar-capture',
    ]))
    expect(bosses.find((entry) => entry.id === 'calyrex-ice-rider')?.types).toEqual(['psychic', 'ice'])
    expect(bosses.find((entry) => entry.id === 'calyrex-shadow-rider')?.types).toEqual(['psychic', 'ghost'])
    expect(bosses.at(-1)).toMatchObject({ id: 'galar-star-tournament', chapter: 18 })
    expect(bosses.filter((entry) => entry.chapter <= 10).map((entry) => entry.id))
      .toEqual(expect.arrayContaining(['oleana', 'rose', 'eternatus', 'eternamax', 'leon']))
  })
})
