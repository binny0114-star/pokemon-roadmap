import { beforeAll, describe, expect, it } from 'vitest'
import registryJson from '../data/version-registry.json'
import legalitySnapshot from '../generated/gen67-legality.json'
import speciesSnapshot from '../generated/species.json'
import { getAvailability, loadCatalog, speciesByDex, speciesCatalog } from './catalog'
import { canLearnFieldMove, generateParty, isMoveLegalForSpecies, validateRequired } from './engine'
import { families, games, getBosses, getFamily } from './games'
import { modernGames } from './modernGames'
import { composeRoadmap, roadmapReferencesAreAvailable } from './roadmap'
import type { PlannerPreferences } from './types'
import { gameCatalog, gen67Completeness, validateCompletenessManifest, validateRegistry } from './versionRegistry'

const defaults: PlannerPreferences = {
  noTrade: true,
  hmConvenience: true,
  allowLegendary: false,
  allowPostgame: false,
  favoriteWeight: 50,
}

beforeAll(async () => {
  await loadCatalog()
}, 20_000)

describe('릴리스 레지스트리와 전국도감', () => {
  it('문자열 gate 값이 truthy여도 완전 지원으로 승격하지 않는다', () => {
    const malformed = structuredClone(registryJson) as unknown as {
      games: {
        id: string
        plannerSupport: {
          accuracyGates?: Record<string, { complete: boolean | string; evidence: string }>
        }
      }[]
    }
    const x = malformed.games.find((game) => game.id === 'x')!
    x.plannerSupport.accuracyGates!.availability.complete = 'false'
    expect(() => validateRegistry(malformed)).toThrow('x/availability')
  })

  it('완전성 매니페스트가 누락 도메인과 시도한 대안을 요구한다', () => {
    const malformed = structuredClone(gen67Completeness)
    const blocked = malformed.families.kalos6.gates.availability.requirements
      .find((requirement) => requirement.status === 'blocked')!
    blocked.attemptedAlternatives = []
    expect(() => validateCompletenessManifest(malformed)).toThrow('kalos6/availability')
  })

  it('레지스트리 게이트를 행 수만으로 수동 승격할 수 없다', () => {
    const malformed = structuredClone(registryJson)
    const x = malformed.games.find((game) => game.id === 'x')!
    x.plannerSupport.accuracyGates!.availability.complete = true
    expect(() => validateRegistry(malformed)).toThrow('완전성 매니페스트')
  })

  it('완료로 선언한 소스 행 수가 고정 스냅샷과 정확히 일치한다', () => {
    const registryById = new Map(registryJson.games.map((game) => [game.id, game]))
    const legalityCounts = legalitySnapshot.coverage.pokemonByVersionGroup as Record<string, number>
    const encounterCounts = speciesSnapshot.coverage.encounterRowsByVersion as Record<string, number>
    for (const family of Object.values(gen67Completeness.families)) {
      for (const gate of Object.values(family.gates)) {
        for (const requirement of gate.requirements) {
          if (requirement.status !== 'complete' || !requirement.expected) continue
          for (const [key, expected] of Object.entries(requirement.expected)) {
            const versionGroupId = Number(key)
            const actual = Number.isInteger(versionGroupId)
              ? legalityCounts[key]
              : encounterCounts[String(registryById.get(key)!.versionId)]
            expect(actual, `${requirement.id}/${key}`).toBe(expected)
          }
        }
      }
    }
  })

  it('39개 스토리 게임과 지원 경계를 고유하고 상호 참조 가능하게 유지한다', () => {
    expect(gameCatalog).toHaveLength(39)
    expect(new Set(gameCatalog.map((game) => game.id)).size).toBe(39)
    expect(gameCatalog.filter((game) => game.plannerSupport.status === 'full')).toHaveLength(21)
    expect(gameCatalog.filter((game) => game.plannerSupport.status === 'catalog-only')).toHaveLength(18)
    expect(gameCatalog.some((game) => game.id === ('champions' as string))).toBe(false)

    const byId = new Map(gameCatalog.map((game) => [game.id, game]))
    for (const game of gameCatalog) {
      expect(game.dataVersionGroupIds).toContain(game.versionGroupId)
      expect(game.sourceVersionIds ?? [game.versionId]).toContain(game.versionId)
      for (const pairedId of game.pairedWith) {
        expect(byId.get(pairedId)?.pairedWith, `${game.id}/${pairedId}`).toContain(game.id)
      }
      if (game.plannerSupport.status === 'full') {
        expect(game.mechanicsFamily, game.id).toBe('classic')
        expect(game.plannerFamilyId, game.id).toBeTruthy()
      } else {
        expect(game.plannerSupport.reason.trim().length, game.id).toBeGreaterThan(0)
      }
    }

    const gamesByVersionId = new Map<number, typeof gameCatalog>()
    for (const game of gameCatalog) {
      gamesByVersionId.set(game.versionId, [...(gamesByVersionId.get(game.versionId) ?? []), game])
    }
    const duplicateVersionIds = [...gamesByVersionId]
      .filter(([, entries]) => entries.length > 1)
      .map(([versionId, entries]) => [versionId, entries.map((game) => game.id).sort()])
    expect(duplicateVersionIds).toEqual([[2, ['blue', 'green']]])
    expect(modernGames.map((game) => game.id).sort()).toEqual(
      gameCatalog
        .filter((game) => game.plannerSupport.status === 'catalog-only' && game.mechanicsFamily === 'classic')
        .map((game) => game.id)
        .sort(),
    )
  })

  it('전국도감 #001–1025를 누락과 중복 없이 유지한다', () => {
    expect(speciesCatalog.map((species) => species.dex)).toEqual(
      Array.from({ length: 1025 }, (_, index) => index + 1),
    )
    expect(new Set(speciesCatalog.map((species) => species.id)).size).toBe(1025)
  })
})

describe('21개 완전 지원 버전의 전체 생성 계약', () => {
  it('모든 스타터 입력이 6종·4기술·고유 체크리스트·합법 HM 계약을 지킨다', () => {
    for (const game of games) {
      for (const starterDex of game.starters) {
        const plan = generateParty(game, defaults, { requiredDexes: [starterDex] })
        const roadmap = composeRoadmap(game, plan)
        const actionIds = roadmap.flatMap((chapter) => chapter.actions.map((action) => action.id))

        expect(plan.members, `${game.id}/#${starterDex}`).toHaveLength(6)
        expect(new Set(plan.members.map((member) => member.species.dex)).size, game.id).toBe(6)
        expect(new Set(plan.members.map((member) => member.species.chainId)).size, game.id).toBe(6)
        expect(new Set(actionIds).size, game.id).toBe(actionIds.length)
        expect(roadmapReferencesAreAvailable(game, plan, roadmap), game.id).toBe(true)
        expect(
          roadmap.flatMap((chapter) => chapter.actions).filter((action) => action.kind === 'boss'),
          game.id,
        ).toHaveLength(getBosses(game).length)

        for (const member of plan.members) {
          expect(member.moves, `${game.id}/${member.species.id}`).toHaveLength(4)
          expect(new Set(member.moves.map((move) => move.id)).size, `${game.id}/${member.species.id}`).toBe(4)
          expect(
            member.moves.every((move) => isMoveLegalForSpecies(member.species, game, move.id)),
            `${game.id}/${member.species.id}`,
          ).toBe(true)
          expect(member.availability.storyOrder, `${game.id}/${member.species.id}`)
            .toBeGreaterThanOrEqual(member.availability.chapter * 1_000)
          for (const fieldMoveId of member.fieldMoves) {
            const fieldMove = getFamily(game).fieldMoves.find((move) => move.id === fieldMoveId)
            expect(fieldMove, `${game.id}/${fieldMoveId}`).toBeTruthy()
            expect(canLearnFieldMove(member.species, fieldMove!, game), `${game.id}/${member.species.id}/${fieldMoveId}`)
              .toBe(true)
          }
        }
      }
    }
  }, 30_000)

  it('모든 스타터·화석 선택 그룹을 상호 배타로 검증한다', () => {
    for (const game of games) {
      for (const group of [game.starters, ...game.fossils]) {
        if (group.length < 2) continue
        const validation = validateRequired(group.slice(0, 2), game, defaults)
        const availability = group.map((dex) => getAvailability(speciesByDex.get(dex)!, game))
        if (availability.every((entry) => entry.obtainable)) {
          expect(validation.errors.join(' '), `${game.id}/${group.join('-')}`).toContain('동시에 선택')
          expect(new Set(availability.map((entry) => entry.mutuallyExclusiveGroup)).size, game.id).toBe(1)
        } else {
          expect(availability.every((entry) => !entry.obtainable), `${game.id}/${group.join('-')}`).toBe(true)
        }
      }
    }
  })

  it('보스 순서·최종전·엔딩 후 데이터가 모든 패밀리에서 완결된다', () => {
    for (const family of Object.values(families)) {
      expect(family.postgame.length, family.id).toBeGreaterThan(0)
    }
    for (const game of games) {
      const bosses = getBosses(game)
      expect(bosses.map((boss) => boss.chapter), game.id).toEqual(
        [...bosses].map((boss) => boss.chapter).sort((left, right) => left - right),
      )
      expect(bosses.at(-1)?.chapter, game.id).toBe(getFamily(game).chapters.length)
    }
    expect(getBosses(games.find((game) => game.id === 'diamond')!).slice(0, 8).map((boss) => boss.id))
      .toEqual(['roark', 'gardenia', 'maylene', 'wake', 'fantina', 'byron', 'candice', 'volkner'])
    expect(getBosses(games.find((game) => game.id === 'platinum')!).slice(0, 8).map((boss) => boss.id))
      .toEqual(['roark', 'gardenia', 'fantina', 'maylene', 'wake', 'byron', 'candice', 'volkner'])
    expect(getBosses(games.find((game) => game.id === 'diamond')!).find((boss) => boss.id === 'gardenia')?.level)
      .toBe('Lv.19–22')
    expect(getBosses(games.find((game) => game.id === 'pearl')!).find((boss) => boss.id === 'gardenia')?.level)
      .toBe('Lv.19–22')
    expect(getBosses(games.find((game) => game.id === 'platinum')!).find((boss) => boss.id === 'gardenia')?.level)
      .toBe('Lv.20–22')
  })
})
