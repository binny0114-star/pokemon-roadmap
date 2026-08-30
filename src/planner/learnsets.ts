import type { CatalogSpecies, GameConfig, GeneratedMove } from './types'

interface SnapshotMove {
  id: string
  name: string
  type: string
  category: string
  power: number
  accuracy: number | null
  generation: number
}

interface Snapshot {
  source: string
  moves: Record<string, SnapshotMove>
  versions: Record<string, Record<string, Partial<Pick<SnapshotMove, 'type' | 'power' | 'accuracy'>>>>
  learnsets: Record<string, Record<string, (string | number | null)[][]>>
}

export interface LegalMove extends Omit<SnapshotMove, 'category'> {
  category: GeneratedMove['category']
  method: 'level' | 'machine' | 'tutor'
  level: number
  machine: string | null
}

let snapshot: Snapshot | null = null

export async function loadLearnsets(): Promise<void> {
  if (snapshot) return
  const module = await import('../generated/learnsets.json')
  snapshot = module.default
}

export function learnsetSource(): string {
  return snapshot?.source ?? '기술 데이터 로딩 중'
}

export function getLegalMoves(species: CatalogSpecies, game: GameConfig): LegalMove[] {
  if (!snapshot) return []
  const entries = snapshot.learnsets[String(game.versionGroupId)]?.[String(species.dex)] ?? []
  return entries.flatMap(([moveId, method, level, machine]) => {
    if (
      typeof moveId !== 'number'
      || !['level', 'machine', 'tutor'].includes(String(method))
      || typeof level !== 'number'
      || (machine !== null && typeof machine !== 'string')
    ) return []
    const move = snapshot?.moves[String(moveId)]
    const override = snapshot?.versions[String(game.versionGroupId)]?.[String(moveId)]
    if (!move) return []
    const category: GeneratedMove['category'] = move.category === '변화'
      ? '변화'
      : move.category === '특수'
        ? '특수'
        : '물리'
    const legalMethod: LegalMove['method'] = method === 'level' ? 'level' : method === 'machine' ? 'machine' : 'tutor'
    return [{
      ...move,
      ...override,
      category,
      method: legalMethod,
      level,
      machine,
    }]
  })
}

export function moveExistsInGeneration(nameOrId: string, generation: number): boolean {
  return Object.values(snapshot?.moves ?? {}).some((move) =>
    (move.name === nameOrId || move.id === nameOrId) && move.generation <= generation,
  )
}

export function legalMoveToGenerated(move: LegalMove, availableChapter: number): GeneratedMove {
  const source = move.method === 'level'
    ? move.level <= 1 ? 'Lv.1 기술 목록 · 기술 떠올리기 가능' : `Lv.${move.level} 자력 습득`
    : move.method === 'machine'
      ? `${move.machine ?? '기술머신'}으로 습득`
      : 'NPC 기술가르침으로 습득'
  return {
    id: move.id,
    name: move.name,
    type: move.type,
    category: move.category,
    source,
    availableChapter,
    quality: move.method === 'level' ? 'verified' : 'inferred',
  }
}
