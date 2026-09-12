import registryJson from '../data/version-registry.json'
import completenessJson from '../data/gen67-completeness.json'
import gen8CompletenessJson from '../data/gen8-completeness.json'
import type { FamilyId, PlannerGameId } from './types'

export type CatalogGameId =
  | PlannerGameId
  | 'x' | 'y' | 'omega-ruby' | 'alpha-sapphire'
  | 'sun' | 'moon' | 'ultra-sun' | 'ultra-moon' | 'lets-go-pikachu' | 'lets-go-eevee'
  | 'sword' | 'shield' | 'brilliant-diamond' | 'shining-pearl' | 'legends-arceus'
  | 'scarlet' | 'violet' | 'legends-z-a'

export type MechanicsFamily = 'classic' | 'galar-wild-area' | 'sinnoh-underground' | 'lets-go' | 'legends'
export type ReleaseKind = 'original' | 'third' | 'enhanced' | 'sequel' | 'remake'
export type AccuracyGateId =
  | 'availability'
  | 'forms'
  | 'learnsets'
  | 'evolutions'
  | 'story'
  | 'mechanics'
  | 'integration'
export interface AccuracyGate {
  complete: boolean
  evidence: string
}
export type PlannerSupport =
  | {
      status: 'full'
      accuracyGates?: Record<AccuracyGateId, AccuracyGate>
    }
  | {
      status: 'catalog-only'
      reason: string
      accuracyGates?: Record<AccuracyGateId, AccuracyGate>
    }

export interface GameCatalogEntry {
  id: CatalogGameId
  name: string
  shortName: string
  generation: number
  region: string
  releaseFamily: string
  releaseKind: ReleaseKind
  mechanicsFamily: MechanicsFamily
  versionId: number
  sourceVersionIds?: number[]
  versionGroupId: number
  dataVersionGroupIds: number[]
  pairedWith: CatalogGameId[]
  dataAlias?: string
  supportReview?: string
  plannerSupport: PlannerSupport
  plannerFamilyId?: FamilyId
}

export type PlannerCatalogEntry = GameCatalogEntry & {
  id: PlannerGameId
  plannerSupport: { status: 'full' }
  plannerFamilyId: FamilyId
}

export interface VersionRegistrySource {
  name: string
  repository: string
  revision: string
}

export interface LegacyPlannerSnapshot {
  repository: string
  revision: string
  speciesPath: string
  learnsetsPath: string
  generations: number[]
  reason: string
}

type CompletenessRequirement = {
  id: string
  status: 'complete' | 'blocked'
  sourceRefs: string[]
  evidence: string
  expected?: Record<string, number>
  missingFields?: string[]
  attemptedAlternatives?: string[]
}

type CompletenessManifest = {
  schemaVersion: number
  sources: Record<string, { repository: string; revision: string }>
  families: Record<string, {
    games: string[]
    requiredSourceCategories?: string[]
    gates: Record<AccuracyGateId, { requirements: CompletenessRequirement[] }>
  }>
}

type Gen8GateContract = Record<string, {
  gameIds: string[]
  gates: Record<AccuracyGateId, {
    requirementIds: string[]
    sourceCategories: string[]
  }>
}>

const gen8GateContract: Gen8GateContract = {
  letsgo7: {
    gameIds: ['lets-go-pikachu', 'lets-go-eevee'],
    gates: {
    availability: {
      requirementIds: ['wild-static-gift-trade'],
      sourceCategories: ['wild', 'overworld', 'static', 'gift', 'trade', 'catch-combo'],
    },
    forms: {
      requirementIds: ['partner-and-alolan-forms'],
      sourceCategories: [],
    },
    learnsets: {
      requirementIds: ['level-tm-tutor-reminder'],
      sourceCategories: ['level-up', 'tm', 'tutor', 'reminder'],
    },
    evolutions: {
      requirementIds: ['letsgo-evolution-reachability'],
      sourceCategories: ['evolution'],
    },
    story: {
      requirementIds: ['mandatory-chronology'],
      sourceCategories: ['story'],
    },
    mechanics: {
      requirementIds: ['secret-techniques'],
      sourceCategories: ['secret-techniques'],
    },
    integration: {
      requirementIds: ['full-planner-contract'],
      sourceCategories: [],
    },
    },
  },
  galar8: {
    gameIds: ['sword', 'shield'],
    gates: {
    availability: {
      requirementIds: ['base-wild-symbol-raid', 'dlc-and-distribution-scope'],
      sourceCategories: [
        'wild-hidden', 'overworld-symbol', 'raid', 'static', 'gift', 'egg', 'fossil', 'trade',
        'weather', 'badges', 'bike', 'isle-of-armor', 'crown-tundra',
      ],
    },
    forms: {
      requirementIds: ['galar-and-dlc-forms'],
      sourceCategories: [],
    },
    learnsets: {
      requirementIds: ['level-egg-tm-tr-tutor'],
      sourceCategories: ['level-up', 'tm', 'tr', 'tutor', 'reminder'],
    },
    evolutions: {
      requirementIds: ['galar-evolution-reachability'],
      sourceCategories: ['evolution'],
    },
    story: {
      requirementIds: ['base-game-mandatory-chronology', 'dlc-chronology'],
      sourceCategories: ['story'],
    },
    mechanics: {
      requirementIds: ['bike-weather-badges-raids'],
      sourceCategories: [],
    },
    integration: {
      requirementIds: ['full-planner-contract'],
      sourceCategories: [],
    },
    },
  },
  sinnoh8: {
    gameIds: ['brilliant-diamond', 'shining-pearl'],
    gates: {
    availability: {
      requirementIds: ['overworld-static', 'conditional-and-underground-pools'],
      sourceCategories: [
        'wild', 'overworld', 'static', 'gift', 'egg', 'fossil', 'trade', 'grand-underground',
        'swarm', 'poke-radar', 'great-marsh', 'trophy-garden',
      ],
    },
    forms: {
      requirementIds: ['sinnoh-forms'],
      sourceCategories: [],
    },
    learnsets: {
      requirementIds: ['level-egg-tm-tutor-reminder'],
      sourceCategories: ['level-up', 'tm', 'tutor', 'reminder'],
    },
    evolutions: {
      requirementIds: ['bdsp-evolution-reachability'],
      sourceCategories: ['evolution'],
    },
    story: {
      requirementIds: ['mandatory-chronology'],
      sourceCategories: ['story'],
    },
    mechanics: {
      requirementIds: ['poketch-hidden-moves'],
      sourceCategories: ['poketch-hidden-moves'],
    },
    integration: {
      requirementIds: ['full-planner-contract'],
      sourceCategories: [],
    },
    },
  },
  hisui8: {
    gameIds: ['legends-arceus'],
    gates: {
    availability: {
      requirementIds: ['field-static-outbreak-distortion-task'],
      sourceCategories: [
        'field', 'overworld', 'static', 'gift', 'outbreak', 'space-time-distortion',
        'request', 'research-rank', 'research-task', 'alpha',
      ],
    },
    forms: {
      requirementIds: ['hisui-and-alpha-forms'],
      sourceCategories: [],
    },
    learnsets: {
      requirementIds: ['level-shop-mastery-styles'],
      sourceCategories: ['level-up', 'move-shop', 'mastery'],
    },
    evolutions: {
      requirementIds: ['pla-evolution-reachability'],
      sourceCategories: ['evolution'],
    },
    story: {
      requirementIds: ['mandatory-chronology'],
      sourceCategories: ['story'],
    },
    mechanics: {
      requirementIds: ['survey-rank-rides-styles'],
      sourceCategories: ['research-rank', 'ride', 'styles'],
    },
    integration: {
      requirementIds: ['full-planner-contract'],
      sourceCategories: [],
    },
    },
  },
}

const gen67GatedGameIds = new Set([
  'x', 'y', 'omega-ruby', 'alpha-sapphire',
  'sun', 'moon', 'ultra-sun', 'ultra-moon',
])
const gen8GatedGameIds = new Set([
  'lets-go-pikachu', 'lets-go-eevee',
  'sword', 'shield',
  'brilliant-diamond', 'shining-pearl',
  'legends-arceus',
])
const canonicalGen8FamilyByGame = new Map(
  Object.entries(gen8GateContract).flatMap(([familyId, contract]) =>
    contract.gameIds.map((gameId) => [gameId, familyId] as const)),
)
const gatedGameIds = new Set([...gen67GatedGameIds, ...gen8GatedGameIds])
const requiredAccuracyGates: AccuracyGateId[] = [
  'availability', 'forms', 'learnsets', 'evolutions', 'story', 'mechanics', 'integration',
]

function validateScopedCompletenessManifest(
  value: unknown,
  targetGameIds: ReadonlySet<string>,
  scope: string,
): CompletenessManifest {
  if (!value || typeof value !== 'object') throw new Error(`${scope} 완전성 매니페스트가 객체가 아닙니다.`)
  const manifest = value as Partial<CompletenessManifest>
  if (
    manifest.schemaVersion !== 1
    || !manifest.sources
    || !manifest.families
  ) {
    throw new Error(`${scope} 완전성 매니페스트 스키마가 올바르지 않습니다.`)
  }
  for (const [sourceId, source] of Object.entries(manifest.sources)) {
    if (!source.repository || !source.revision) {
      throw new Error(`${scope} 완전성 출처가 올바르지 않습니다: ${sourceId}`)
    }
  }
  const coveredGames = new Set<string>()
  for (const [familyId, family] of Object.entries(manifest.families)) {
    if (!family.games.length) throw new Error(`${scope} 완전성 게임이 없습니다: ${familyId}`)
    if (scope === '8세대 계열' && (
      !family.requiredSourceCategories?.length
      || new Set(family.requiredSourceCategories).size !== family.requiredSourceCategories.length
    )) {
      throw new Error(`${scope} 필수 출처 범주가 올바르지 않습니다: ${familyId}`)
    }
    for (const gameId of family.games) {
      if (!targetGameIds.has(gameId) || coveredGames.has(gameId)) {
        throw new Error(`${scope} 완전성 게임 범위가 올바르지 않습니다: ${gameId}`)
      }
      coveredGames.add(gameId)
    }
    for (const gateId of requiredAccuracyGates) {
      const gate = family.gates[gateId]
      if (!gate?.requirements.length) {
        throw new Error(`${scope} 완전성 요구사항이 없습니다: ${familyId}/${gateId}`)
      }
      const requirementIds = new Set<string>()
      for (const requirement of gate.requirements) {
        if (
          !requirement.id
          || requirementIds.has(requirement.id)
          || !['complete', 'blocked'].includes(requirement.status)
          || !requirement.evidence.trim()
          || !requirement.sourceRefs.length
          || requirement.sourceRefs.some((sourceId) => !manifest.sources![sourceId])
        ) {
          throw new Error(`${scope} 완전성 요구사항이 올바르지 않습니다: ${familyId}/${gateId}/${requirement.id}`)
        }
        requirementIds.add(requirement.id)
        if (
          requirement.status === 'blocked'
          && (!requirement.missingFields?.length || !requirement.attemptedAlternatives?.length)
        ) {
          throw new Error(`${scope} 차단 근거가 불완전합니다: ${familyId}/${gateId}/${requirement.id}`)
        }
      }
    }
  }
  if (
    coveredGames.size !== targetGameIds.size
    || [...targetGameIds].some((gameId) => !coveredGames.has(gameId))
  ) {
    throw new Error(`${scope} 완전성 매니페스트가 모든 대상 게임을 포함하지 않습니다.`)
  }
  if (scope === '8세대 계열') {
    const familyIds = Object.keys(manifest.families).sort()
    if (familyIds.join(',') !== Object.keys(gen8GateContract).sort().join(',')) {
      throw new Error(`${scope} 필수 패밀리 계약이 올바르지 않습니다.`)
    }
    for (const [familyId, contract] of Object.entries(gen8GateContract)) {
      const family = manifest.families[familyId]
      if ([...family.games].sort().join(',') !== [...contract.gameIds].sort().join(',')) {
        throw new Error(`${scope} 패밀리 게임 계약이 올바르지 않습니다: ${familyId}`)
      }
      for (const gateId of requiredAccuracyGates) {
        const actualIds = family.gates[gateId].requirements.map((requirement) => requirement.id).sort()
        const expectedIds = [...contract.gates[gateId].requirementIds].sort()
        if (actualIds.join(',') !== expectedIds.join(',')) {
          throw new Error(`${scope} 필수 요구사항 계약이 올바르지 않습니다: ${familyId}/${gateId}`)
        }
      }
      const expectedCategories = [...new Set(
        requiredAccuracyGates.flatMap((gateId) => contract.gates[gateId].sourceCategories),
      )].sort()
      const actualCategories = [...(family.requiredSourceCategories ?? [])].sort()
      if (actualCategories.join(',') !== expectedCategories.join(',')) {
        throw new Error(`${scope} 필수 출처 범주 계약이 올바르지 않습니다: ${familyId}`)
      }
    }
  }
  return manifest as CompletenessManifest
}

export function validateCompletenessManifest(value: unknown): CompletenessManifest {
  return validateScopedCompletenessManifest(value, gen67GatedGameIds, '6–7세대')
}

export function validateGen8CompletenessManifest(value: unknown): CompletenessManifest {
  return validateScopedCompletenessManifest(value, gen8GatedGameIds, '8세대 계열')
}

export const gen67Completeness = validateCompletenessManifest(completenessJson)
export const gen8Completeness = validateGen8CompletenessManifest(gen8CompletenessJson)
const completenessFamilyByGame = new Map(
  [gen67Completeness, gen8Completeness]
    .flatMap((manifest) => Object.values(manifest.families))
    .flatMap((family) => family.games.map((gameId) => [gameId, family] as const)),
)

export function validateRegistry(value: unknown): {
  schemaVersion: number
  source: VersionRegistrySource
  legacyPlannerSnapshot: LegacyPlannerSnapshot
  games: GameCatalogEntry[]
} {
  if (!value || typeof value !== 'object') throw new Error('버전 레지스트리가 객체가 아닙니다.')
  const candidate = value as {
    schemaVersion?: unknown
    source?: unknown
    legacyPlannerSnapshot?: unknown
    games?: unknown
  }
  if (candidate.schemaVersion !== 1 || !Array.isArray(candidate.games)) {
    throw new Error('지원하지 않는 버전 레지스트리 스키마입니다.')
  }
  const games = candidate.games as GameCatalogEntry[]
  const ids = new Set(games.map((game) => game.id))
  if (ids.size !== games.length) throw new Error('버전 레지스트리 게임 ID가 중복됩니다.')
  for (const game of games) {
    if (
      !game.id
      || !game.name
      || game.generation < 1
      || game.generation > 9
      || game.versionId < 1
      || (game.sourceVersionIds && !game.sourceVersionIds.includes(game.versionId))
      || game.versionGroupId < 1
      || !game.dataVersionGroupIds.includes(game.versionGroupId)
    ) {
      throw new Error(`버전 레지스트리 항목이 올바르지 않습니다: ${game.id ?? 'unknown'}`)
    }
    if (game.plannerSupport.status === 'full' && !game.plannerFamilyId) {
      throw new Error(`완전 지원 게임에 플래너 패밀리가 없습니다: ${game.id}`)
    }
    if (gatedGameIds.has(game.id)) {
      const scope = gen8GatedGameIds.has(game.id) ? '8세대 계열' : '6–7세대'
      const canonicalFamily = canonicalGen8FamilyByGame.get(game.id)
      if (canonicalFamily && game.plannerFamilyId && game.plannerFamilyId !== canonicalFamily) {
        throw new Error(`${scope} 플래너 패밀리 계약이 올바르지 않습니다: ${game.id}`)
      }
      if (!game.plannerSupport.accuracyGates) {
        throw new Error(`${scope} 지원 게이트가 없습니다: ${game.id}`)
      }
      if (!game.supportReview || !/^\d{4}-\d{2}-\d{2}$/.test(game.supportReview)) {
        throw new Error(`${scope} 지원 검수일이 없습니다: ${game.id}`)
      }
      const gates = game.plannerSupport.accuracyGates
      const completeness = completenessFamilyByGame.get(game.id)
      if (!completeness) throw new Error(`${scope} 완전성 매니페스트 게임이 없습니다: ${game.id}`)
      for (const gateId of requiredAccuracyGates) {
        const gate = gates[gateId]
        if (
          !gate
          || typeof gate.complete !== 'boolean'
          || typeof gate.evidence !== 'string'
          || !gate.evidence.trim()
        ) {
          throw new Error(`${scope} 지원 게이트 근거가 없습니다: ${game.id}/${gateId}`)
        }
        const manifestComplete = completeness.gates[gateId].requirements
          .every((requirement) => requirement.status === 'complete')
        if (gate.complete !== manifestComplete) {
          throw new Error(`${scope} 지원 게이트가 완전성 매니페스트와 일치하지 않습니다: ${game.id}/${gateId}`)
        }
      }
      const allComplete = requiredAccuracyGates.every((gateId) => gates[gateId].complete === true)
      if ((game.plannerSupport.status === 'full') !== allComplete) {
        throw new Error(`${scope} 지원 상태가 정확성 게이트와 일치하지 않습니다: ${game.id}`)
      }
    }
    for (const sibling of game.pairedWith) {
      if (!ids.has(sibling)) throw new Error(`${game.id}의 페어 ${sibling}가 레지스트리에 없습니다.`)
    }
  }
  const source = candidate.source as VersionRegistrySource
  const legacyPlannerSnapshot = candidate.legacyPlannerSnapshot as LegacyPlannerSnapshot
  if (!source?.repository || !/^[a-f0-9]{40}$/.test(source.revision)) {
    throw new Error('버전 레지스트리 출처 리비전이 올바르지 않습니다.')
  }
  if (
    !legacyPlannerSnapshot?.repository
    || !/^[a-f0-9]{40}$/.test(legacyPlannerSnapshot.revision)
    || legacyPlannerSnapshot.generations.join(',') !== '1,2,3,4,5'
  ) {
    throw new Error('기존 플래너 호환 스냅샷이 올바르지 않습니다.')
  }
  return { schemaVersion: 1, source, legacyPlannerSnapshot, games }
}

const validated = validateRegistry(registryJson)

export const versionRegistrySource = validated.source
export const legacyPlannerSnapshot = validated.legacyPlannerSnapshot
export const gameCatalog = validated.games
export const gameCatalogById = new Map(gameCatalog.map((game) => [game.id, game]))
export const plannerGameCatalog = gameCatalog.filter(
  (game): game is PlannerCatalogEntry =>
    game.plannerSupport.status === 'full',
)
export const catalogVersionGroupIds = [
  ...new Set(gameCatalog.flatMap((game) => game.dataVersionGroupIds)),
].sort((a, b) => a - b)

export function getCatalogGame(id: string): GameCatalogEntry | undefined {
  return gameCatalogById.get(id as CatalogGameId)
}

export function getPlannerCatalogGame(id: PlannerGameId): PlannerCatalogEntry {
  const game = getCatalogGame(id)
  if (!game || game.plannerSupport.status !== 'full' || !game.plannerFamilyId) {
    throw new Error(`플래너 지원 게임이 아닙니다: ${id}`)
  }
  return {
    ...game,
    id,
    plannerSupport: game.plannerSupport,
    plannerFamilyId: game.plannerFamilyId,
  }
}
