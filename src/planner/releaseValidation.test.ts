import { beforeAll, describe, expect, it } from 'vitest'
import registryJson from '../data/version-registry.json'
import legalitySnapshot from '../generated/gen67-legality.json'
import gen8LegalitySnapshot from '../generated/gen8-legality.json'
import speciesSnapshot from '../generated/species.json'
import { getAvailability, loadCatalog, speciesByDex, speciesCatalog } from './catalog'
import { canLearnFieldMove, generateParty, isMoveLegalForSpecies, validateRequired } from './engine'
import { families, games, getBosses, getFamily } from './games'
import { modernGames } from './modernGames'
import { composeRoadmap, roadmapReferencesAreAvailable } from './roadmap'
import type { PlannerPreferences } from './types'
import {
  gameCatalog,
  getPlannerCatalogGame,
  gen67Completeness,
  gen8Completeness,
  validateCompletenessManifest,
  validateGen8CompletenessManifest,
  validateRegistry,
} from './versionRegistry'

const defaults: PlannerPreferences = {
  noTrade: true,
  hmConvenience: true,
  allowLegendary: false,
  allowPostgame: false,
  favoriteWeight: 50,
}

beforeAll(async () => {
  await loadCatalog()
}, 120_000)

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

  it('레지스트리 게임의 플래너 패밀리를 바꾸면 승격을 거부한다', () => {
    const malformed = structuredClone(registryJson)
    const sword = malformed.games.find((game) => game.id === 'sword')!
    sword.plannerFamilyId = 'hisui8'
    expect(() => validateRegistry(malformed)).toThrow('플래너 패밀리 계약')
  })

  it('완전성 매니페스트가 누락 도메인과 시도한 대안을 요구한다', () => {
    const malformed = structuredClone(gen67Completeness)
    const requirement = malformed.families.kalos6.gates.availability.requirements[0]
    Object.assign(requirement, { status: 'blocked', missingFields: ['earliest-story-prerequisite'], attemptedAlternatives: [] })
    expect(() => validateCompletenessManifest(malformed)).toThrow('kalos6/availability')
  })

  it('Gen 8 완전성 매니페스트도 모든 대상과 차단 근거를 fail-closed로 요구한다', () => {
    // 차단으로 되돌린 요구사항은 누락 필드와 시도한 대안을 모두 적어야 합니다.
    const malformed = structuredClone(gen8Completeness)
    const blocked = malformed.families.hisui8.gates.availability.requirements[0] as {
      status: string
      missingFields?: string[]
      attemptedAlternatives?: string[]
    }
    blocked.status = 'blocked'
    blocked.missingFields = []
    blocked.attemptedAlternatives = ['PKHeX encounter_la']
    expect(() => validateGen8CompletenessManifest(malformed)).toThrow('hisui8/availability')

    const missingGame = structuredClone(gen8Completeness)
    missingGame.families.hisui8.games = []
    expect(() => validateGen8CompletenessManifest(missingGame)).toThrow('hisui8')

    const missingCategories = structuredClone(gen8Completeness)
    missingCategories.families.sinnoh8.requiredSourceCategories = []
    expect(() => validateGen8CompletenessManifest(missingCategories)).toThrow('필수 출처 범주')

    const deletedRequirement = structuredClone(gen8Completeness)
    deletedRequirement.families.galar8.gates.learnsets.requirements = []
    expect(() => validateGen8CompletenessManifest(deletedRequirement)).toThrow('galar8/learnsets')

    const renamedRequirement = structuredClone(gen8Completeness)
    renamedRequirement.families.galar8.gates.learnsets.requirements[0].id = 'replacement-that-claims-complete'
    expect(() => validateGen8CompletenessManifest(renamedRequirement)).toThrow('필수 요구사항 계약')

    const deletedCategory = structuredClone(gen8Completeness)
    deletedCategory.families.galar8.requiredSourceCategories =
      deletedCategory.families.galar8.requiredSourceCategories!.filter((category) => category !== 'tr')
    expect(() => validateGen8CompletenessManifest(deletedCategory)).toThrow('필수 출처 범주 계약')

    const swappedFamilyGame = structuredClone(gen8Completeness)
    swappedFamilyGame.families.galar8.games = ['sword', 'legends-arceus']
    swappedFamilyGame.families.hisui8.games = ['shield']
    expect(() => validateGen8CompletenessManifest(swappedFamilyGame)).toThrow('패밀리 게임 계약')
  })

  it('Gen 7 입수 게이트를 조우율이 아니라 방식·도달 시점 근거로 판단한다', () => {
    for (const familyId of ['alola7', 'alola7-ultra'] as const) {
      const requirement = gen67Completeness.families[familyId].gates.availability.requirements
        .find((entry) => entry.id === 'wild-sos-slots')!
      expect(requirement.status).toBe('complete')
      expect(requirement.evidence).toContain('Missing encounter rates alone do not block promotion')
      expect(requirement.evidence).toContain('method-unresolved')
    }
    for (const gameId of ['sun', 'moon', 'ultra-sun', 'ultra-moon']) {
      const game = gameCatalog.find((entry) => entry.id === gameId)!
      expect(game.plannerSupport.accuracyGates?.availability.complete).toBe(true)
      expect(game.plannerSupport.accuracyGates?.availability.evidence).toContain('방식 미확인')
    }
  })

  it('레지스트리 게이트를 행 수만으로 수동 승격할 수 없다', () => {
    const malformed = structuredClone(registryJson)
    const blockedGame = malformed.games.find((game) =>
      game.plannerSupport.accuracyGates
      && Object.values(game.plannerSupport.accuracyGates).some((gate) => !gate.complete))
    if (blockedGame) {
      const gateId = Object.entries(blockedGame.plannerSupport.accuracyGates!)
        .find(([, gate]) => !gate.complete)![0] as keyof NonNullable<typeof blockedGame.plannerSupport.accuracyGates>
      blockedGame.plannerSupport.accuracyGates![gateId].complete = true
      expect(() => validateRegistry(malformed)).toThrow('완전성 매니페스트')
    }
    const incompleteManifest = structuredClone(gen67Completeness)
    Object.assign(incompleteManifest.families.kalos6.gates.availability.requirements[0], {
      status: 'blocked',
      missingFields: ['earliest-story-prerequisite'],
      attemptedAlternatives: ['Row counts alone cannot prove story reachability.'],
    })
    expect(() => validateCompletenessManifest(incompleteManifest)).not.toThrow()
    expect(incompleteManifest.families.kalos6.gates.availability.requirements
      .every((requirement) => requirement.status === 'complete')).toBe(false)
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

  it('Gen 8 계열은 행 수만으로 승격하지 않고 기계 게이트와 원본 공백을 일치시킨다', () => {
    expect(gen8LegalitySnapshot.coverage.pokemonByVersionGroup).toEqual({
      19: 188,
      20: 750,
      23: 491,
      24: 247,
    })
    for (const family of Object.values(gen8Completeness.families)) {
      for (const gameId of family.games) {
        const game = gameCatalog.find((entry) => entry.id === gameId)!
        const familyComplete = Object.values(family.gates)
          .every((gate) => gate.requirements.every((requirement) => requirement.status === 'complete'))
        expect(game.plannerSupport.status, gameId).toBe(familyComplete ? 'full' : 'catalog-only')
        for (const [gateId, gate] of Object.entries(family.gates)) {
          const manifestComplete = gate.requirements.every((requirement) => requirement.status === 'complete')
          expect(game.plannerSupport.accuracyGates?.[gateId as keyof typeof game.plannerSupport.accuracyGates]?.complete, `${gameId}/${gateId}`)
            .toBe(manifestComplete)
        }
      }
    }
  })

  it('Gen 8 자원·조건 공백과 unsupported fallback을 구체적으로 고정한다', () => {
    // 8세대 계열 7개 버전은 이제 모두 완료 근거로 승격되어 차단 요구사항이 남아 있지 않습니다.
    expect(Object.values(gen8Completeness.families).flatMap((family) => Object.values(family.gates))
      .flatMap((gate) => gate.requirements).some((entry) => entry.status === 'blocked')).toBe(false)

    const letsGoAvailability = gen8Completeness.families.letsgo7.gates.availability.requirements[0]
    expect(letsGoAvailability.status).toBe('complete')
    expect(letsGoAvailability.evidence).toContain('Encounters7GG')
    expect(gen8Completeness.families.letsgo7.gates.evolutions.requirements[0].evidence).toContain('evos_gg')
    const galarLearnsets = gen8Completeness.families.galar8.gates.learnsets.requirements[0]
    expect(galarLearnsets.status).toBe('complete')
    expect(galarLearnsets.evidence).toContain('daily rotation')
    expect(galarLearnsets.evidence).toContain('resource-conflict')
    const sinnohAvailability = gen8Completeness.families.sinnoh8.gates.availability.requirements[1]
    const sinnohLearnsets = gen8Completeness.families.sinnoh8.gates.learnsets.requirements[0]
    expect(sinnohAvailability.status).toBe('complete')
    expect(sinnohAvailability.evidence).toContain('Poké Radar')
    expect(sinnohLearnsets.status).toBe('complete')
    expect(sinnohLearnsets.evidence).toContain('one-copy limits')
    const hisuiAvailability = gen8Completeness.families.hisui8.gates.availability.requirements[0]
    expect(hisuiAvailability.status).toBe('complete')
    expect(hisuiAvailability.evidence).toContain('Survey Corps rank')
    expect(gen8Completeness.families.hisui8.gates.evolutions.requirements[0].evidence).toContain('evos_la')

    for (const gameId of Object.values(gen8Completeness.families).flatMap((family) => family.games)) {
      const promoted = registryJson.games.some((entry) =>
        entry.id === gameId && entry.plannerSupport.status === 'full')
      if (promoted) {
        expect(() => getPlannerCatalogGame(gameId as never), gameId).not.toThrow()
        expect(games.some((game) => game.id === gameId), gameId).toBe(true)
      } else {
        expect(() => getPlannerCatalogGame(gameId as never), gameId).toThrow('플래너 지원 게임이 아닙니다')
        expect(games.some((game) => game.id === gameId), gameId).toBe(false)
      }
    }
  })

  it('39개 스토리 게임과 지원 경계를 고유하고 상호 참조 가능하게 유지한다', () => {
    expect(gameCatalog).toHaveLength(39)
    expect(new Set(gameCatalog.map((game) => game.id)).size).toBe(39)
    expect(gameCatalog.filter((game) => game.plannerSupport.status === 'full')).toHaveLength(38)
    expect(gameCatalog.filter((game) => game.plannerSupport.status === 'catalog-only')).toHaveLength(1)
    expect(gameCatalog.some((game) => game.id === ('champions' as string))).toBe(false)

    const byId = new Map(gameCatalog.map((game) => [game.id, game]))
    for (const game of gameCatalog) {
      expect(game.dataVersionGroupIds).toContain(game.versionGroupId)
      expect(game.sourceVersionIds ?? [game.versionId]).toContain(game.versionId)
      for (const pairedId of game.pairedWith) {
        expect(byId.get(pairedId)?.pairedWith, `${game.id}/${pairedId}`).toContain(game.id)
      }
      if (game.plannerSupport.status === 'full') {
        const expectedMechanics = game.id === 'sword' || game.id === 'shield'
          ? 'galar-wild-area'
          : game.id === 'brilliant-diamond' || game.id === 'shining-pearl'
            ? 'sinnoh-underground'
            : game.id === 'lets-go-pikachu' || game.id === 'lets-go-eevee'
              ? 'lets-go'
              : game.id === 'legends-arceus'
                ? 'legends'
                : 'classic'
        expect(game.mechanicsFamily, game.id).toBe(expectedMechanics)
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
    expect(modernGames.every((game) => gameCatalog.some((entry) => entry.id === game.id))).toBe(true)
    expect(modernGames.filter((game) => game.catalog.plannerSupport.status === 'full').map((game) => game.id).sort())
      .toEqual(['alpha-sapphire', 'brilliant-diamond', 'legends-arceus', 'lets-go-eevee', 'lets-go-pikachu', 'moon', 'omega-ruby', 'scarlet', 'shield', 'shining-pearl', 'sun', 'sword', 'ultra-moon', 'ultra-sun', 'violet', 'x', 'y'])
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
        ).toHaveLength(new Set(getBosses(game).map((boss) => `${boss.chapter}:${boss.branchGroup ?? boss.id}`)).size)

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
