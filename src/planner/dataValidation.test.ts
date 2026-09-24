import { beforeAll, describe, expect, it } from 'vitest'
import legalitySnapshot from '../generated/gen67-legality.json'
import gen8LegalitySnapshot from '../generated/gen8-legality.json'
import learnsetSnapshot from '../generated/learnsets.json'
import modernEncounterSnapshot from '../generated/modern-encounters.json'
import { catalogCoverage, encounterMethodUnlockChapter, getAvailability, loadCatalog, speciesByDex, speciesCatalog, supportedEncounterMethods } from './catalog'
import { families, games, getBosses, getFamily } from './games'
import { getLegalMoves } from './learnsets'
import { gameCatalog } from './versionRegistry'

const validTypes = new Set(['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'])

beforeAll(async () => {
  await loadCatalog()
}, 120_000)

describe('정적 데이터셋 검증 스크립트', () => {
  it('도감 ID, 타입, 진화 참조가 유효하다', () => {
    expect(speciesCatalog).toHaveLength(1025)
    expect(new Set(speciesCatalog.map((species) => species.dex)).size).toBe(1025)
    expect(new Set(speciesCatalog.map((species) => species.id)).size).toBe(1025)
    expect(catalogCoverage?.plannerEncounterMethods.every((method) => supportedEncounterMethods.has(method))).toBe(true)
    for (const species of speciesCatalog) {
      expect(species.formDataStatus).toBe('default-form-only')
      expect(species.types.every((type) => validTypes.has(type))).toBe(true)
      if (species.evolvesFrom) {
        expect(speciesByDex.has(species.evolvesFrom)).toBe(true)
        expect(species.evolutionMethods.length > 0 || species.evolutionDataStatus === 'missing-source').toBe(true)
        expect(species.evolutionMethods.every((method) =>
          method.generation === null || method.generation >= species.generation,
        )).toBe(true)
      } else {
        expect(species.evolutionMethods).toEqual([])
        expect(species.evolutionDataStatus).toBe('not-applicable')
      }
      for (const [versionId, encounters] of Object.entries(species.encounters)) {
        for (const encounter of encounters) {
          expect(encounter.location.length).toBeGreaterThan(0)
          expect(encounter.area.length).toBeGreaterThan(0)
          expect(encounter.regionId === null || encounter.regionId > 0).toBe(true)
          if (catalogCoverage?.plannerVersionIds.includes(Number(versionId))) {
            expect(supportedEncounterMethods.has(encounter.method)).toBe(true)
            expect(encounter.slot === null || encounter.slot > 0).toBe(true)
          } else {
            expect(encounter.slot === null || encounter.slot >= 0).toBe(true)
          }
          expect(encounter.conditions).toBeInstanceOf(Array)
          expect(encounter.minLevel).toBeGreaterThan(0)
          expect(encounter.maxLevel).toBeGreaterThanOrEqual(encounter.minLevel)
        }
      }
    }
  }, 20_000)

  it('조우 데이터가 버전과 세대 경계를 넘지 않는다', () => {
    const generationsByVersion = new Map<number, number>()
    for (const game of gameCatalog) {
      for (const versionId of game.sourceVersionIds ?? [game.versionId]) {
        generationsByVersion.set(
          versionId,
          Math.max(generationsByVersion.get(versionId) ?? 0, game.generation),
        )
      }
    }
    expect(catalogCoverage?.encounterVersionIds).toEqual([...generationsByVersion.keys()].sort((a, b) => a - b))
    for (const species of speciesCatalog) {
      for (const versionId of Object.keys(species.encounters).map(Number)) {
        expect(generationsByVersion.has(versionId), `#${species.dex} version ${versionId}`).toBe(true)
        expect(species.generation, `#${species.dex} version ${versionId}`)
          .toBeLessThanOrEqual(generationsByVersion.get(versionId)!)
      }
    }
  })

  it('호환 오버레이 뒤에도 현대 버전 조우와 DLC 버전을 보존한다', () => {
    expect(speciesByDex.get(25)?.encounters['33']?.length).toBeGreaterThan(0)
    expect(speciesByDex.get(891)?.encounters['35']?.length).toBeGreaterThan(0)
    expect(catalogCoverage?.serializedEncounterEntriesByVersion['23']).toBeGreaterThan(1_000)
    expect(catalogCoverage?.serializedEncounterEntriesByVersion['35']).toBeGreaterThan(0)
    const generatedGames = modernEncounterSnapshot.games as Record<string, unknown[]>
    for (const [gameId, versionId] of Object.entries({
      x: 23,
      y: 24,
      'omega-ruby': 25,
      'alpha-sapphire': 26,
    })) {
      const overlaidRows = speciesCatalog.flatMap((species) =>
        (species.encounters[String(versionId)] ?? []).filter((encounter) => encounter.source === 'pkhex'),
      )
      expect(overlaidRows, gameId).toHaveLength(generatedGames[gameId].length)
    }
  })

  it('버전별 진화 방식의 세부 조건을 손실 없이 보존한다', () => {
    expect(speciesByDex.get(475)?.evolutionMethods.some((method) => method.genderId === 2)).toBe(true)
    expect(speciesByDex.get(350)?.evolutionMethods.some((method) => (method.minBeauty ?? 0) > 0)).toBe(true)
    expect(speciesByDex.get(26)?.evolutionMethods.some((method) => method.regionId === 7)).toBe(true)
    const constrained = speciesCatalog.flatMap((species) => species.evolutionMethods).filter((method) =>
      method.baseFormId !== null
      || method.evolvedFormId !== null
      || method.usedMoveId !== null
      || method.minMoveCount !== null
      || method.minSteps !== null
      || method.minDamageTaken !== null,
    )
    expect(constrained.length).toBeGreaterThan(0)
    expect(speciesByDex.get(904)?.evolutionMethods).toEqual(expect.arrayContaining([
      expect.objectContaining({ versionGroupId: 30, usedMoveId: 839, minMoveCount: 20 }),
    ]))
  })

  it('게임, 챕터, 보스, 필드기 ID가 중복되거나 끊어지지 않는다', () => {
    expect(new Set(games.map((game) => game.id)).size).toBe(games.length)
    for (const game of games) {
      const family = families[game.familyId]
      expect(family).toBeTruthy()
      expect(game.versionGroupId).toBeGreaterThan(0)
      expect(getLegalMoves(speciesByDex.get(game.starters[0])!, game).length).toBeGreaterThan(0)
      expect(new Set(family.chapters.map((chapter) => chapter.id)).size).toBe(family.chapters.length)
      expect(new Set(family.fieldMoves.map((move) => move.id)).size).toBe(family.fieldMoves.length)
      for (const move of family.fieldMoves) {
        expect(validTypes.has(move.type)).toBe(true)
        expect(move.unlockChapter).toBeGreaterThan(0)
        expect(move.unlockChapter).toBeLessThanOrEqual(family.chapters.length)
      }
      const bosses = getBosses(game)
      expect(new Set(bosses.map((boss) => boss.id)).size).toBe(bosses.length)
      for (const boss of bosses) {
        expect(boss.chapter).toBeGreaterThan(0)
        expect(boss.chapter).toBeLessThanOrEqual(family.chapters.length)
        expect(boss.types.length).toBeGreaterThan(0)
        expect(boss.types.every((type) => validTypes.has(type))).toBe(true)
      }
      for (const group of game.fossils) {
        for (const dex of group) expect(speciesByDex.has(dex)).toBe(true)
      }
      for (const dex of game.starters) expect(speciesByDex.has(dex)).toBe(true)
    }
  })

  it('Gen 6–7 전체 합법성 행을 폼별 식별자와 네 가지 습득법으로 보존한다', () => {
    expect(legalitySnapshot.coverage.versionGroupIds).toEqual([15, 16, 17, 18])
    expect(legalitySnapshot.coverage.pokemonByVersionGroup).toEqual({
      15: 784,
      16: 811,
      17: 944,
      18: 959,
    })
    for (const groupId of ['15', '16', '17', '18'] as const) {
      const methods = new Set(Object.values(legalitySnapshot.learnsets[groupId]).flat().map((row) => row[1]))
      const expectedMethods = groupId === '15' || groupId === '16'
        ? ['level', 'egg', 'tutor', 'machine', 'light-ball-egg', 'form-change']
        : ['level', 'egg', 'tutor', 'machine', 'light-ball-egg', 'form-change', 'zygarde-cube']
      expect(methods, groupId).toEqual(new Set(expectedMethods))
    }
    const male = legalitySnapshot.learnsets['15']['meowstic-male']
    const female = legalitySnapshot.learnsets['15']['meowstic-female']
    const moves = learnsetSnapshot.moves as Record<string, { id: string }>
    const moveName = (row: (typeof male)[number]) => moves[String(row[0])].id
    expect(male.some((row) => moveName(row) === 'reflect' && row[1] === 'level' && row[2] === 35)).toBe(true)
    expect(female.some((row) => moveName(row) === 'extrasensory' && row[1] === 'level' && row[2] === 35)).toBe(true)
    expect(female.some((row) => moveName(row) === 'reflect' && row[1] === 'level' && row[2] === 35)).toBe(false)
    expect(legalitySnapshot.learnsets['15'].pichu.some((row) =>
      moveName(row as (typeof male)[number]) === 'volt-tackle' && row[1] === 'light-ball-egg',
    )).toBe(true)
    expect(Object.values(legalitySnapshot.learnsets['15']).flat().some((row) => row[1] === 'form-change')).toBe(true)
    expect(Object.values(legalitySnapshot.learnsets['17']).flat().some((row) => row[1] === 'zygarde-cube')).toBe(true)
  })

  it('Gen 8 계열 합법성 원본 행을 게임별 폼 식별자와 습득법으로 격리한다', () => {
    expect(gen8LegalitySnapshot.coverage.versionGroupIds).toEqual([19, 20, 23, 24])
    expect(gen8LegalitySnapshot.coverage.pokemonByVersionGroup).toEqual({
      19: 188,
      20: 750,
      23: 491,
      24: 247,
    })
    const expectedMethods = {
      19: ['level', 'machine', 'tutor'],
      20: ['egg', 'form-change', 'level', 'machine', 'tutor'],
      23: ['egg', 'level', 'machine', 'tutor'],
      24: ['level', 'tutor'],
    } as const
    for (const groupId of ['19', '20', '23', '24'] as const) {
      const methods = [...new Set(Object.values(gen8LegalitySnapshot.learnsets[groupId]).flat().map((row) => row[1]))].sort()
      expect(methods, groupId).toEqual(expectedMethods[Number(groupId) as keyof typeof expectedMethods])
    }
    expect(gen8LegalitySnapshot.coverage.policy).toMatchObject({
      acquisitionTiming: 'not-ingested',
      resourceConsumption: 'not-ingested',
      masteryAndStyles: 'not-ingested',
    })
    expect(gen8LegalitySnapshot.pokemonForms['meowth-galar']).toMatchObject({
      speciesId: 52,
      isDefault: false,
    })
  })

  it('21개 버전의 선택 입수 경로가 방식 해금과 엔딩 경계를 지킨다', () => {
    for (const game of games) {
      const lastChapter = getFamily(game).chapters.length
      for (const species of speciesCatalog) {
        const availability = getAvailability(species, game)
        if (!availability.obtainable) continue
        expect(availability.finalChapter).toBeGreaterThanOrEqual(availability.chapter)
        if (availability.methodId) {
          expect(availability.chapter).toBeGreaterThanOrEqual(encounterMethodUnlockChapter(game, availability.methodId))
        }
        expect(availability.preChampion).toBe(!availability.postgameOnly)
        if (!availability.postgameOnly) expect(availability.finalChapter).toBeLessThanOrEqual(lastChapter)
      }
    }
  }, 20_000)
})
