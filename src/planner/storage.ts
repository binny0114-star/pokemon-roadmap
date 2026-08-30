import type { PlannerGameId } from './types'
import { activeStorageScope } from './auth'
import { queueCloudSync } from './cloud'

export interface SavedPlanSession {
  gameId: PlannerGameId
  challengeType: string | null
  memberDexes: number[]
  lockedDexes: number[]
  variant: number
}

export interface ClearRecord {
  id: string
  gameId: PlannerGameId
  gameName: string
  planId: string
  challengeType: string | null
  memberNames: string[]
  completedAt: string
  totalActions: number
}

function storageKey(name: string): string {
  return `pokemon-roadmap:v3:${activeStorageScope()}:${name}`
}

export function planProgressKey(gameId: PlannerGameId, planId: string): string {
  return storageKey(`progress:${gameId}:${planId}`)
}

export function loadPlanProgress(gameId: PlannerGameId, planId: string): Set<string> {
  try {
    const current = localStorage.getItem(planProgressKey(gameId, planId))
    const legacy = activeStorageScope() === 'guest'
      ? localStorage.getItem(`pokemon-roadmap:v2:progress:${gameId}:${planId}`)
      : null
    const parsed = JSON.parse(current ?? legacy ?? '[]')
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [])
  } catch {
    return new Set()
  }
}

function actionIdentity(id: string): string {
  const kind = id.split(':', 2)[1]
  return ['capture', 'evolve', 'move'].includes(kind)
    ? id.slice(id.indexOf(':') + 1)
    : id
}

export function reconcilePlanProgress(saved: Set<string>, currentActionIds: string[]): Set<string> {
  const completedIdentities = new Set([...saved].map(actionIdentity))
  return new Set(currentActionIds.filter((id) => saved.has(id) || completedIdentities.has(actionIdentity(id))))
}

export function mergePlanProgress(
  saved: Set<string>,
  currentActionIds: string[],
  completed: Set<string>,
): Set<string> {
  const currentIdentities = new Set(currentActionIds.map(actionIdentity))
  const unmatched = [...saved].filter((id) => !currentIdentities.has(actionIdentity(id)))
  return new Set([...unmatched, ...completed])
}

export function savePlanProgress(gameId: PlannerGameId, planId: string, values: Set<string>): void {
  localStorage.setItem(planProgressKey(gameId, planId), JSON.stringify([...values]))
  queueCloudSync()
}

export function saveBuilderState(value: unknown): void {
  localStorage.setItem(storageKey('builder'), JSON.stringify(value))
  queueCloudSync()
}

export function loadBuilderState<T>(fallback: T): T {
  try {
    const current = localStorage.getItem(storageKey('builder'))
    const legacy = activeStorageScope() === 'guest' ? localStorage.getItem('pokemon-roadmap:v2:builder') : null
    return { ...fallback, ...JSON.parse(current ?? legacy ?? '{}') }
  } catch {
    return fallback
  }
}

export function savePlanSession(value: SavedPlanSession): void {
  localStorage.setItem(storageKey('current-plan'), JSON.stringify(value))
  queueCloudSync()
}

export function loadPlanSession(): SavedPlanSession | null {
  try {
    const current = localStorage.getItem(storageKey('current-plan'))
    const legacy = activeStorageScope() === 'guest' ? localStorage.getItem('pokemon-roadmap:v2:current-plan') : null
    const value = JSON.parse(current ?? legacy ?? 'null')
    return value && Array.isArray(value.memberDexes) && Array.isArray(value.lockedDexes) ? value : null
  } catch {
    return null
  }
}

export function clearPlanSession(): void {
  localStorage.removeItem(storageKey('current-plan'))
  queueCloudSync()
}

export function loadClearRecords(): ClearRecord[] {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey('clear-records')) ?? '[]')
    return Array.isArray(value)
      ? value.filter((record): record is ClearRecord =>
          typeof record?.id === 'string'
          && typeof record?.gameName === 'string'
          && Array.isArray(record?.memberNames),
        ).sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      : []
  } catch {
    return []
  }
}

export function saveClearRecord(record: ClearRecord): ClearRecord[] {
  const records = loadClearRecords()
  const next = [record, ...records.filter((entry) => entry.id !== record.id)]
  localStorage.setItem(storageKey('clear-records'), JSON.stringify(next))
  queueCloudSync()
  return next
}
