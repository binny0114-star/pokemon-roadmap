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

interface Gen67LegalitySnapshot {
  learnsets: Record<string, Record<string, (string | number | null)[][]>>
}

// 폼별 전체 기술 원본은 크므로 기술 스냅샷과 함께 지연 로드합니다.
let gen8Legality: Gen8LegalitySnapshot = { moves: {}, learnsets: {} }
let gen9Legality: Gen8LegalitySnapshot = { moves: {}, learnsets: {} }
let gen67Legality: Gen67LegalitySnapshot = { learnsets: {} }
const gen8VersionGroups = new Set([19, 20, 23, 24])
// 스칼렛·바이올렛 본편(그룹 25)은 폼별 행을 쓰고, DLC에서 추가된 TM172–229는 본편 계획에서 뺍니다.
const gen9VersionGroups = new Set([25])
const baseGameMaxTm: Partial<Record<number, number>> = { 25: 171 }
// 6·7세대 플래너 버전은 PokéAPI 포켓몬 식별자별 행을 씁니다.
const gen67VersionGroups = new Set([15, 16, 17, 18])

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
  const [module, gen8Module, gen67Module, gen9Module] = await Promise.all([
    import('../generated/learnsets.json'),
    import('../generated/gen8-legality.json'),
    import('../generated/gen67-legality.json'),
    import('../generated/gen9-legality.json'),
  ])
  gen8Legality = gen8Module.default as Gen8LegalitySnapshot
  gen9Legality = gen9Module.default as Gen8LegalitySnapshot
  gen67Legality = gen67Module.default as Gen67LegalitySnapshot
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
  const useGen9Legality = gen9VersionGroups.has(game.versionGroupId)
  const useGen8Legality = gen8VersionGroups.has(game.versionGroupId) || useGen9Legality
  const formLegality = useGen9Legality ? gen9Legality : gen8Legality
  const useGen67Legality = gen67VersionGroups.has(game.versionGroupId)
  const maxTm = baseGameMaxTm[game.versionGroupId]
  const identifier = formIdentifier
    ? getGen8FormProfileByIdentifier(formIdentifier)?.pokemonIdentifier ?? formIdentifier
    : getGen8DefaultFormProfile(species.dex)?.pokemonIdentifier ?? species.id
  const entries = useGen8Legality
    ? formLegality.learnsets[String(game.versionGroupId)]?.[identifier] ?? []
    : useGen67Legality
      ? gen67Legality.learnsets[String(game.versionGroupId)]?.[identifier] ?? []
      : snapshot.learnsets[String(game.versionGroupId)]?.[String(species.dex)] ?? []
  return entries.flatMap(([moveId, method, level, machine, eggParentIdentifiers]) => {
    if (
      typeof moveId !== 'number'
      || !['level', 'egg', 'machine', 'tutor'].includes(String(method))
      || typeof level !== 'number'
      || (machine !== null && typeof machine !== 'string')
    ) return []
    if (maxTm && typeof machine === 'string' && /^TM\d+$/.test(machine) && Number(machine.slice(2)) > maxTm) return []
    const move = useGen8Legality
      ? formLegality.moves[String(moveId)]
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
