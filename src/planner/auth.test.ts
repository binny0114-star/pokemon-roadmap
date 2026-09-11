import { beforeEach, describe, expect, it } from 'vitest'
import { activeStorageScope, createAccount, getActiveAccount, login, logout } from './auth'
import {
  loadBuilderState,
  loadClearRecords,
  loadPlanProgress,
  loadPlanSession,
  saveBuilderState,
  saveClearRecord,
  savePlanProgress,
  savePlanSession,
} from './storage'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
})

describe('로컬 트레이너 계정', () => {
  it('PIN을 평문으로 저장하지 않고 로그인한다', async () => {
    const account = await createAccount('레드', '1234')
    const raw = localStorage.getItem('pokemon-roadmap:v3:accounts') ?? ''

    expect(raw).not.toContain('"1234"')
    expect(getActiveAccount()?.name).toBe('레드')
    logout()
    expect(getActiveAccount()).toBeNull()
    expect((await login('레드', '1234')).id).toBe(account.id)
  })

  it('잘못된 PIN과 중복 닉네임을 거부한다', async () => {
    await createAccount('그린', '5678')

    await expect(login('그린', '0000')).rejects.toThrow('올바르지 않습니다')
    await expect(createAccount('그린', '9999')).rejects.toThrow('이미 사용 중')
  })

  it('계정별 진행률과 클리어 기록을 격리한다', async () => {
    const first = await createAccount('실버', '1111')
    savePlanProgress('silver', 'plan-a', new Set(['one']))
    saveClearRecord({
      id: 'silver:plan-a',
      gameId: 'silver',
      gameName: '포켓몬스터 은',
      planId: 'plan-a',
      challengeType: null,
      memberNames: ['리아코'],
      completedAt: '2026-08-30T00:00:00.000Z',
      totalActions: 1,
    })
    logout()
    const second = await createAccount('골드', '2222')

    expect(second.id).not.toBe(first.id)
    expect(activeStorageScope()).toBe(second.id)
    expect(loadPlanProgress('silver', 'plan-a')).toEqual(new Set())
    expect(loadClearRecords()).toEqual([])

    logout()
    await login('실버', '1111')
    expect(loadPlanProgress('silver', 'plan-a')).toEqual(new Set(['one']))
    expect(loadClearRecords()).toHaveLength(1)
  })

  it('v3 게스트 상태를 같은 키로 저장하고 새로고침 뒤 복원한다', () => {
    const builder = { gameId: 'firered', requiredDexes: [4, 60], marker: 'preserved' }
    const session = {
      gameId: 'firered' as const,
      challengeType: null,
      memberDexes: [4, 60, 64, 75, 130, 143],
      lockedDexes: [143],
      variant: 2,
    }

    saveBuilderState(builder)
    savePlanSession(session)
    savePlanProgress('firered', 'stable-plan', new Set(['kan-2:capture:60']))

    expect(localStorage.getItem('pokemon-roadmap:v3:guest:builder')).toBe(JSON.stringify(builder))
    expect(localStorage.getItem('pokemon-roadmap:v3:guest:current-plan')).toBe(JSON.stringify(session))
    expect(localStorage.getItem('pokemon-roadmap:v3:guest:progress:firered:stable-plan')).toBe('["kan-2:capture:60"]')
    expect(loadBuilderState({ gameId: 'emerald', requiredDexes: [], marker: '' })).toEqual(builder)
    expect(loadPlanSession()).toEqual(session)
    expect(loadPlanProgress('firered', 'stable-plan')).toEqual(new Set(['kan-2:capture:60']))
  })

  it('v2 게스트 데이터를 읽되 기존 v3 데이터를 우선한다', () => {
    localStorage.setItem('pokemon-roadmap:v2:builder', JSON.stringify({ gameId: 'red', requiredDexes: [1] }))
    localStorage.setItem('pokemon-roadmap:v2:current-plan', JSON.stringify({
      gameId: 'red',
      challengeType: null,
      memberDexes: [1, 20, 26, 64, 75, 130],
      lockedDexes: [],
      variant: 0,
    }))
    localStorage.setItem('pokemon-roadmap:v2:progress:red:legacy-plan', '["kan-1:capture:1"]')

    expect(loadBuilderState({ gameId: 'emerald', requiredDexes: [] })).toMatchObject({
      gameId: 'red',
      requiredDexes: [1],
    })
    expect(loadPlanSession()?.gameId).toBe('red')
    expect(loadPlanProgress('red', 'legacy-plan')).toEqual(new Set(['kan-1:capture:1']))

    localStorage.setItem('pokemon-roadmap:v3:guest:builder', JSON.stringify({ gameId: 'yellow', requiredDexes: [25] }))
    expect(loadBuilderState({ gameId: 'emerald', requiredDexes: [] })).toMatchObject({
      gameId: 'yellow',
      requiredDexes: [25],
    })
  })
})
