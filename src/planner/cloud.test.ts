import { beforeEach, describe, expect, it } from 'vitest'
import { activeStorageScope } from './auth'
import { cloudStorageScope, isCloudConfigured, readScopeSnapshot, writeScopeSnapshot } from './cloud'

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

describe('클라우드 상태 스냅샷', () => {
  it('클라우드 설정 여부와 무관하게 로그인 전 게스트 범위를 유지한다', () => {
    expect(typeof isCloudConfigured()).toBe('boolean')
    expect(activeStorageScope()).toBe('guest')
  })

  it('한 사용자 범위만 내보내고 복원한다', () => {
    localStorage.setItem('pokemon-roadmap:v3:guest:builder', '{"gameId":"red"}')
    localStorage.setItem('pokemon-roadmap:v3:other:builder', '{"gameId":"blue"}')
    const snapshot = readScopeSnapshot('guest')

    expect(snapshot).toEqual({ builder: '{"gameId":"red"}' })
    writeScopeSnapshot('restored', snapshot)
    expect(readScopeSnapshot('restored')).toEqual(snapshot)
    expect(readScopeSnapshot('other')).toEqual({ builder: '{"gameId":"blue"}' })
  })

  it('캐시된 온라인 사용자를 저장 범위로 사용한다', () => {
    const id = '12345678-1234-1234-1234-123456789abc'
    localStorage.setItem('pokemon-roadmap:v4:cloud-account', JSON.stringify({
      id,
      name: 'trainer',
      email: 'trainer@example.com',
      kind: 'cloud',
    }))

    expect(cloudStorageScope(id)).toBe(`cloud-${id}`)
    expect(activeStorageScope()).toBe(`cloud-${id}`)
  })
})
