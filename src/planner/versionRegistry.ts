import registryJson from '../data/version-registry.json'
import type { FamilyId, PlannerGameId } from './types'

export type CatalogGameId =
  | PlannerGameId
  | 'x' | 'y' | 'omega-ruby' | 'alpha-sapphire'
  | 'sun' | 'moon' | 'ultra-sun' | 'ultra-moon' | 'lets-go-pikachu' | 'lets-go-eevee'
  | 'sword' | 'shield' | 'brilliant-diamond' | 'shining-pearl' | 'legends-arceus'
  | 'scarlet' | 'violet' | 'legends-z-a'

export type MechanicsFamily = 'classic' | 'lets-go' | 'legends'
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

function validateRegistry(value: unknown): {
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
  const gatedGameIds = new Set([
    'x', 'y', 'omega-ruby', 'alpha-sapphire',
    'sun', 'moon', 'ultra-sun', 'ultra-moon',
  ])
  const requiredAccuracyGates: AccuracyGateId[] = [
    'availability', 'forms', 'learnsets', 'evolutions', 'story', 'mechanics', 'integration',
  ]
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
      if (!game.plannerSupport.accuracyGates) {
        throw new Error(`6–7세대 지원 게이트가 없습니다: ${game.id}`)
      }
      if (!game.supportReview || !/^\d{4}-\d{2}-\d{2}$/.test(game.supportReview)) {
        throw new Error(`6–7세대 지원 검수일이 없습니다: ${game.id}`)
      }
      const gates = game.plannerSupport.accuracyGates
      for (const gateId of requiredAccuracyGates) {
        const gate = gates[gateId]
        if (!gate || !gate.evidence.trim()) {
          throw new Error(`6–7세대 지원 게이트 근거가 없습니다: ${game.id}/${gateId}`)
        }
      }
      const allComplete = requiredAccuracyGates.every((gateId) => gates[gateId].complete)
      if ((game.plannerSupport.status === 'full') !== allComplete) {
        throw new Error(`6–7세대 지원 상태가 정확성 게이트와 일치하지 않습니다: ${game.id}`)
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
