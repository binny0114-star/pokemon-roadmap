import type { RoadmapChapter } from '../data/types'

export function filterChapters(chapters: RoadmapChapter[], query: string): RoadmapChapter[] {
  const normalized = query.trim().toLocaleLowerCase('ko')
  if (!normalized) return chapters

  return chapters.filter((chapter) =>
    [
      chapter.title,
      chapter.subtitle,
      chapter.level,
      chapter.warning ?? '',
      ...chapter.objectives.map((item) => item.text),
      ...chapter.actions,
      ...chapter.moves,
    ]
      .join(' ')
      .toLocaleLowerCase('ko')
      .includes(normalized),
  )
}

export function progressPercent(completed: Set<string>, total: number): number {
  if (total === 0) return 0
  return Math.round((completed.size / total) * 100)
}

export function storageKey(versionId: string): string {
  return `pokemon-roadmap:progress:${versionId}`
}

export function loadProgress(versionId: string): Set<string> {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(versionId)) ?? '[]')
    return new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [])
  } catch {
    return new Set()
  }
}

export function saveProgress(versionId: string, completed: Set<string>): void {
  localStorage.setItem(storageKey(versionId), JSON.stringify([...completed]))
}
