import { describe, expect, it } from 'vitest'
import { crystalGuide } from '../data/crystal'
import { emeraldGuide } from '../data/emerald'
import { validateGuide } from '../data/integrity'
import { sapphireGuide } from '../data/sapphire'
import { silverGuide } from '../data/silver'
import { filterChapters, loadProgress, progressPercent, saveProgress, storageKey } from './guide'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

describe('가이드 데이터 무결성', () => {
  it.each([silverGuide, crystalGuide, sapphireGuide, emeraldGuide])(
    '$name 데이터가 모든 무결성 규칙을 만족한다',
    (guide) => {
      expect(validateGuide(guide)).toEqual([])
    },
  )

  it('에메랄드 편의형 파티가 8개 HM을 동시에 커버한다', () => {
    const plan = emeraldGuide.plans[0]
    const covered = new Set(plan.members.flatMap((member) => member.moves.flatMap((move) => move.hm ? [move.hm] : [])))
    expect(covered).toEqual(new Set(emeraldGuide.requiredHms))
  })
})

describe('로드맵 검색', () => {
  it('제목뿐 아니라 목표와 기술 설명도 검색한다', () => {
    expect(filterChapters(sapphireGuide.chapters, '지진').map((chapter) => chapter.id)).toContain('sapphire-08')
    expect(filterChapters(crystalGuide.chapters, '라디오타워').map((chapter) => chapter.id)).toContain('crystal-07')
  })

  it('빈 검색어는 원본 챕터를 그대로 반환한다', () => {
    expect(filterChapters(silverGuide.chapters, '   ')).toBe(silverGuide.chapters)
  })
})

describe('진행률 계산', () => {
  it('완료 수를 반올림한 백분율로 계산한다', () => {
    expect(progressPercent(new Set(['a', 'b']), 3)).toBe(67)
  })

  it('항목이 없으면 0을 반환한다', () => {
    expect(progressPercent(new Set(), 0)).toBe(0)
  })

  it('버전별 진행 상태를 로컬 저장소에 저장하고 복원한다', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
    saveProgress('emerald', new Set(['emerald-01-a', 'emerald-01-b']))

    expect(loadProgress('emerald')).toEqual(new Set(['emerald-01-a', 'emerald-01-b']))
    expect(loadProgress('silver')).toEqual(new Set())
    expect(storageKey('emerald')).toBe('pokemon-roadmap:progress:emerald')
  })

  it('손상된 저장값은 안전하게 빈 진행 상태로 처리한다', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
    localStorage.setItem(storageKey('crystal'), '{broken')

    expect(loadProgress('crystal')).toEqual(new Set())
  })
})
