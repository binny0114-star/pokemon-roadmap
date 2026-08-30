import type { PlannerGameId } from './types'

export interface SavedPlanSession {
  gameId: PlannerGameId
  challengeType: string | null
  memberDexes: number[]
  lockedDexes: number[]
  variant: number
}

export function planProgressKey(gameId: PlannerGameId, planId: string): string {
  return `pokemon-roadmap:v2:progress:${gameId}:${planId}`
}

export function loadPlanProgress(gameId: PlannerGameId, planId: string): Set<string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(planProgressKey(gameId, planId)) ?? '[]')
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [])
  } catch {
    return new Set()
  }
}

export function savePlanProgress(gameId: PlannerGameId, planId: string, values: Set<string>): void {
  localStorage.setItem(planProgressKey(gameId, planId), JSON.stringify([...values]))
}

export function saveBuilderState(value: unknown): void {
  localStorage.setItem('pokemon-roadmap:v2:builder', JSON.stringify(value))
}

export function loadBuilderState<T>(fallback: T): T {
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem('pokemon-roadmap:v2:builder') ?? '{}') }
  } catch {
    return fallback
  }
}

export function savePlanSession(value: SavedPlanSession): void {
  localStorage.setItem('pokemon-roadmap:v2:current-plan', JSON.stringify(value))
}

export function loadPlanSession(): SavedPlanSession | null {
  try {
    const value = JSON.parse(localStorage.getItem('pokemon-roadmap:v2:current-plan') ?? 'null')
    return value && Array.isArray(value.memberDexes) && Array.isArray(value.lockedDexes) ? value : null
  } catch {
    return null
  }
}

export function clearPlanSession(): void {
  localStorage.removeItem('pokemon-roadmap:v2:current-plan')
}
