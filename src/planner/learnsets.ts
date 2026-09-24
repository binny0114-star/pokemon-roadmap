import gen8LegalityJson from '../generated/gen8-legality.json'
import { getGen8DefaultFormProfile, getGen8FormProfileByIdentifier } from './gen8Forms'
import type { CatalogSpecies, GameConfig, GeneratedMove } from './types'
import { catalogVersionGroupIds, versionRegistrySource } from './versionRegistry'

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
  provenance: {
    source: string
    repository: string
    revision: string
    files: string[]
    compatibilitySnapshot: {
      repository: string
      revision: string
      speciesPath: string
      learnsetsPath: string
      generations: number[]
      reason: string
    }
  }
  coverage: {
    nationalDexMax: number
    versionGroupIds: number[]
    versionGroupGeneration: Record<string, number>
    learnsetSpeciesByVersionGroup: Record<string, number>
    completeLegalityVersionGroupIds: number[]
    completeLegalityPokemonByVersionGroup: Record<string, number>
    completeLegalityMethods: string[]
    methods: string[]
    isolatedVersionGroups: boolean
    plannerDataPolicy: {
      speciesForms: string
      levelUp: string
      machines: string
      tutors: string
      eggMoves: string
      reminderRules: string
      acquisitionTiming: string
    }
    forms: {
      policy: string
      planning: string
    }
  }
  moves: Record<string, SnapshotMove>
  versions: Record<string, Record<string, Partial<Pick<SnapshotMove, 'type' | 'power' | 'accuracy'>>>>
  learnsets: Record<string, Record<string, (string | number | null)[][]>>
}

export interface LegalMove extends Omit<SnapshotMove, 'category'> {
  category: GeneratedMove['category']
  method: 'level' | 'egg' | 'machine' | 'tutor'
  level: number
  machine: string | null
  eggParentIdentifiers?: string[]
}

interface Gen8LegalitySnapshot {
  moves: Record<string, SnapshotMove>
  learnsets: Record<string, Record<string, (string | number | null | string[])[][]>>
}

const gen8Legality = gen8LegalityJson as Gen8LegalitySnapshot
const gen8VersionGroups = new Set([19, 20, 23, 24])

let snapshot: Snapshot | null = null
export let learnsetProvenance: Snapshot['provenance'] | null = null
export let learnsetCoverage: Snapshot['coverage'] | null = null

function readSnapshot(value: unknown): Snapshot {
  if (!value || typeof value !== 'object') throw new Error('기술 스냅샷이 객체가 아닙니다.')
  const data = value as Partial<Snapshot>
  if (
    typeof data.source !== 'string'
    || !data.provenance
    || data.provenance.revision !== versionRegistrySource.revision
    || !data.coverage
    || data.coverage.nationalDexMax !== 1025
    || data.coverage.isolatedVersionGroups !== true
    || data.coverage.plannerDataPolicy?.eggMoves !== 'not-ingested'
    || data.coverage.plannerDataPolicy?.acquisitionTiming !== 'not-ingested'
    || data.coverage.completeLegalityVersionGroupIds.join(',') !== '15,16,17,18'
    || data.coverage.completeLegalityMethods.join(',') !== 'level,egg,tutor,machine,light-ball-egg,form-change,zygarde-cube'
    || data.coverage.versionGroupIds.join(',') !== catalogVersionGroupIds.join(',')
    || !data.moves
    || !data.versions
    || !data.learnsets
  ) {
    throw new Error('기술 스냅샷 메타데이터가 올바르지 않습니다.')
  }
  for (const [groupId, speciesLearnsets] of Object.entries(data.learnsets)) {
    const generation = data.coverage.versionGroupGeneration[groupId]
    if (!generation || !catalogVersionGroupIds.includes(Number(groupId))) {
      throw new Error(`지원하지 않는 버전 그룹 기술 데이터입니다: ${groupId}`)
    }
    for (const entries of Object.values(speciesLearnsets)) {
      for (const [moveId] of entries) {
        const move = data.moves[String(moveId)]
        if (!move || move.generation > generation) {
          throw new Error(`버전 그룹 ${groupId}에 미래 세대 기술이 섞였습니다: ${moveId}`)
        }
      }
    }
  }
  return data as Snapshot
}

export async function loadLearnsets(): Promise<void> {
  if (snapshot) return
  const module = await import('../generated/learnsets.json')
  snapshot = readSnapshot(module.default)
  learnsetProvenance = snapshot.provenance
  learnsetCoverage = snapshot.coverage
}

export function learnsetSource(): string {
  return snapshot?.source ?? '기술 데이터 로딩 중'
}

const legalMovesCache = new Map<string, readonly LegalMove[]>()

export function getLegalMoves(species: CatalogSpecies, game: GameConfig, formIdentifier?: string): readonly LegalMove[] {
  if (!snapshot || species.generation > game.generation) return []
  // 불변 스냅샷에서 같은 버전 그룹·폼의 기술표를 반복 생성하지 않도록 읽기 전용으로 캐시합니다.
  const cacheKey = `${game.versionGroupId}:${game.generation}:${species.dex}:${formIdentifier ?? ''}`
  const cached = legalMovesCache.get(cacheKey)
  if (cached) return cached
  const moves = Object.freeze(readLegalMoves(species, game, formIdentifier))
  legalMovesCache.set(cacheKey, moves)
  return moves
}

function readLegalMoves(species: CatalogSpecies, game: GameConfig, formIdentifier?: string): LegalMove[] {
  if (!snapshot) return []
  const useGen8Legality = gen8VersionGroups.has(game.versionGroupId)
  const identifier = formIdentifier
    ? getGen8FormProfileByIdentifier(formIdentifier)?.pokemonIdentifier ?? formIdentifier
    : getGen8DefaultFormProfile(species.dex)?.pokemonIdentifier ?? species.id
  const entries = useGen8Legality
    ? gen8Legality.learnsets[String(game.versionGroupId)]?.[identifier] ?? []
    : snapshot.learnsets[String(game.versionGroupId)]?.[String(species.dex)] ?? []
  return entries.flatMap(([moveId, method, level, machine, eggParentIdentifiers]) => {
    if (
      typeof moveId !== 'number'
      || !['level', 'egg', 'machine', 'tutor'].includes(String(method))
      || typeof level !== 'number'
      || (machine !== null && typeof machine !== 'string')
    ) return []
    const move = useGen8Legality
      ? gen8Legality.moves[String(moveId)]
      : snapshot?.moves[String(moveId)]
    const override = useGen8Legality
      ? undefined
      : snapshot?.versions[String(game.versionGroupId)]?.[String(moveId)]
    if (!move || move.generation > game.generation) return []
    const category: GeneratedMove['category'] = move.category === '변화'
      ? '변화'
      : move.category === '특수'
        ? '특수'
        : '물리'
    const legalMethod: LegalMove['method'] = method === 'level'
      ? 'level'
      : method === 'egg'
        ? 'egg'
        : method === 'machine'
          ? 'machine'
          : 'tutor'
    return [{
      ...move,
      ...override,
      category,
      method: legalMethod,
      level,
      machine,
      eggParentIdentifiers: Array.isArray(eggParentIdentifiers) ? eggParentIdentifiers : undefined,
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
