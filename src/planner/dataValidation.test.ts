import { beforeAll, describe, expect, it } from 'vitest'
import { encounterMethodUnlockChapter, getAvailability, loadCatalog, speciesByDex, speciesCatalog, supportedEncounterMethods } from './catalog'
import { families, games, getBosses, getFamily } from './games'
import { getLegalMoves } from './learnsets'

const validTypes = new Set(['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'])

beforeAll(async () => {
  await loadCatalog()
}, 20_000)

describe('정적 데이터셋 검증 스크립트', () => {
  it('도감 ID, 타입, 진화 참조가 유효하다', () => {
    expect(speciesCatalog).toHaveLength(649)
    expect(new Set(speciesCatalog.map((species) => species.dex)).size).toBe(649)
    expect(new Set(speciesCatalog.map((species) => species.id)).size).toBe(649)
    for (const species of speciesCatalog) {
      expect(species.types.every((type) => validTypes.has(type))).toBe(true)
      if (species.evolvesFrom) expect(speciesByDex.has(species.evolvesFrom)).toBe(true)
      for (const encounters of Object.values(species.encounters)) {
        for (const encounter of encounters) {
          expect(encounter.location.length).toBeGreaterThan(0)
          expect(encounter.area.length).toBeGreaterThan(0)
          expect(encounter.regionId === null || encounter.regionId > 0).toBe(true)
          expect(supportedEncounterMethods.has(encounter.method)).toBe(true)
          expect(encounter.slot === null || encounter.slot > 0).toBe(true)
          expect(encounter.conditions).toBeInstanceOf(Array)
          expect(encounter.minLevel).toBeGreaterThan(0)
          expect(encounter.maxLevel).toBeGreaterThanOrEqual(encounter.minLevel)
        }
      }
    }
  }, 20_000)

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
