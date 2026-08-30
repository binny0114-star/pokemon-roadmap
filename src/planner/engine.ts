import { evolutionText, generationLineage, getAvailability, speciesByDex, speciesCatalog } from './catalog'
import { getBosses, getFamily } from './games'
import { getLegalMoves, moveExistsInGeneration, type LegalMove } from './learnsets'
import { isStrongAgainst, typeCategory, weaknesses } from './typeChart'
import type {
  CatalogSpecies,
  Availability,
  CoverageSummary,
  FieldMove,
  GameConfig,
  GeneratedMember,
  GeneratedMove,
  GeneratedPlan,
  PlannerPreferences,
} from './types'

const typeKo: Record<string, string> = {
  normal: '노말', fire: '불꽃', water: '물', electric: '전기', grass: '풀', ice: '얼음',
  fighting: '격투', poison: '독', ground: '땅', flying: '비행', psychic: '에스퍼',
  bug: '벌레', rock: '바위', ghost: '고스트', dragon: '드래곤', dark: '악', steel: '강철', fairy: '페어리',
}

const fieldMoveKo: Record<string, string> = {
  cut: '풀베기', fly: '공중날기', surf: '파도타기', strength: '괴력', flash: '플래시',
  whirlpool: '소용돌이', waterfall: '폭포오르기', 'rock-smash': '바위깨기', dive: '다이빙',
  defog: '안개제거', 'rock-climb': '락클라임',
}

const typeEmoji: Record<string, string> = {
  normal: '◯', fire: '🔥', water: '💧', electric: '⚡', grass: '🌿', ice: '❄️',
  fighting: '🥊', poison: '☠️', ground: '⛰️', flying: '🪽', psychic: '✦',
  bug: '🐞', rock: '🪨', ghost: '👻', dragon: '◆', dark: '☾', steel: '⚙️', fairy: '✧',
}

export const challengeTypeOrder = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel',
]

const preFairyTypes: Record<number, string[]> = {
  35: ['normal'], 36: ['normal'], 39: ['normal'], 40: ['normal'], 122: ['psychic'],
  173: ['normal'], 174: ['normal'], 175: ['normal'], 176: ['normal', 'flying'],
  183: ['water'], 184: ['water'], 209: ['normal'], 210: ['normal'],
  280: ['psychic'], 281: ['psychic'], 282: ['psychic'], 298: ['normal'],
  303: ['steel'], 439: ['psychic'], 546: ['grass'], 547: ['grass'],
}

export function speciesTypes(species: CatalogSpecies, generation: number): string[] {
  if (generation <= 5 && species.types.includes('fairy')) return preFairyTypes[species.dex] ?? species.types.filter((type) => type !== 'fairy')
  if (generation === 1 && (species.dex === 81 || species.dex === 82)) return ['electric']
  return species.types
}

export function speciesIcon(species: CatalogSpecies, generation = 5): string {
  return typeEmoji[speciesTypes(species, generation)[0]] ?? '◉'
}

export function effectiveChapter(species: CatalogSpecies, game: GameConfig): number {
  return getAvailability(species, game).finalChapter
}

function legalMovesForLineage(species: CatalogSpecies, game: GameConfig, includeAncestors = true): {
  move: LegalMove
  learnedBy: CatalogSpecies
}[] {
  const stages = includeAncestors ? generationLineage(species, game.generation) : [species]
  return stages.flatMap((learnedBy) => getLegalMoves(learnedBy, game).map((move) => ({ move, learnedBy })))
}

export function isMoveLegalForSpecies(species: CatalogSpecies, game: GameConfig, moveId: string): boolean {
  return legalMovesForLineage(species, game).some((entry) => entry.move.id === moveId)
}

export function canLearnFieldMove(species: CatalogSpecies, move: FieldMove, game?: GameConfig): boolean {
  if (game) return legalMovesForLineage(species, game).some((entry) => entry.move.id === move.id)
  if (species.dex === 263 && move.id === 'strength') return false
  const types = new Set(species.types)
  if (['surf', 'waterfall', 'dive', 'whirlpool'].includes(move.id)) return types.has('water') || types.has('dragon')
  if (move.id === 'fly' || move.id === 'defog') return types.has('flying')
  if (move.id === 'flash') return ['electric', 'psychic', 'normal', 'grass'].some((type) => types.has(type))
  if (move.id === 'cut') return ['grass', 'bug', 'normal', 'flying', 'steel'].some((type) => types.has(type))
  if (['strength', 'rock-smash', 'rock-climb'].includes(move.id)) {
    return ['normal', 'fighting', 'rock', 'ground', 'steel', 'water'].some((type) => types.has(type))
  }
  return false
}

export interface RequiredValidation {
  errors: string[]
  warnings: string[]
}

export function validateRequired(
  dexes: number[],
  game: GameConfig,
  preferences: PlannerPreferences,
  challengeType: string | null = null,
): RequiredValidation {
  const errors: string[] = []
  const warnings: string[] = []
  if (dexes.length === 0) {
    errors.push(challengeType ? '데이터 수정으로 배정할 스타팅 포켓몬을 1마리 선택하세요.' : '필수 포켓몬을 1마리 이상 선택하세요.')
  }
  if (dexes.length > 6) errors.push('필수 포켓몬은 최대 6마리까지 선택할 수 있습니다.')
  if (new Set(dexes).size !== dexes.length) errors.push('같은 포켓몬을 중복 선택할 수 없습니다.')

  const groups = new Map<string, string[]>()
  const challengeStarter = challengeType && dexes.length ? speciesByDex.get(dexes[0]) : undefined
  for (const [index, dex] of dexes.entries()) {
    const species = speciesByDex.get(dex)
    if (!species) {
      errors.push(`전국도감 #${dex} 데이터를 찾을 수 없습니다.`)
      continue
    }
    const availability = getAvailability(species, game)
    const modifiedStarter = Boolean(challengeType && index === 0)
    if (challengeType && !speciesTypes(species, game.generation).includes(challengeType)) {
      errors.push(`${species.name}: ${typeKo[challengeType]} 타입 챌린지 조건과 맞지 않습니다.`)
    }
    if (modifiedStarter && species.generation > game.generation) {
      errors.push(`${species.name}: ${game.generation}세대에는 아직 존재하지 않는 포켓몬이라 스타팅으로 수정할 수 없습니다.`)
    }
    if (!modifiedStarter) {
      if (!availability.obtainable) errors.push(`${species.name}: ${availability.reason}`)
      if (preferences.noTrade && availability.tradeRequired) errors.push(`${species.name}: 무교환 설정과 충돌합니다. 통신교환이 필요한 진화입니다.`)
      if (!preferences.allowPostgame && availability.postgameOnly) errors.push(`${species.name}: 엔딩 후 입수 포켓몬입니다. 엔딩 후 허용을 켜세요.`)
      if (
        challengeType
        && availability.mutuallyExclusiveGroup === 'starter'
        && challengeStarter
        && species.chainId !== challengeStarter.chainId
      ) {
        errors.push(`${species.name}: 원래 스타터 이벤트는 개조 스타팅 ${challengeStarter.name}(으)로 교체되어 추가 입수할 수 없습니다.`)
      }
    }
    if (!preferences.allowLegendary && (species.legendary || species.mythical)) {
      warnings.push(`${species.name}: 필수 선택이므로 전설 허용 설정과 관계없이 유지합니다.`)
    }
    if (!modifiedStarter && availability.mutuallyExclusiveGroup) {
      const entries = groups.get(availability.mutuallyExclusiveGroup) ?? []
      entries.push(species.name)
      groups.set(availability.mutuallyExclusiveGroup, entries)
    }
  }
  for (const entries of groups.values()) {
    if (entries.length > 1) errors.push(`동시에 선택할 수 없는 입수 선택지입니다: ${entries.join(', ')}`)
  }
  if (challengeType && challengeStarter) {
    const count = challengeCandidateCount(game, preferences, challengeType, challengeStarter.dex)
    if (count < 6) warnings.push(`${typeKo[challengeType]} 타입의 개조 스타팅과 실제 입수 가능한 서로 다른 진화 계열을 합쳐 ${count}개라 ${count}인 파티로 생성됩니다.`)
  }
  return { errors, warnings }
}

function statTotal(species: CatalogSpecies): number {
  return Object.values(species.stats).reduce((sum, value) => sum + value, 0)
}

function memberRole(species: CatalogSpecies): string {
  const attack = species.stats['2'] ?? 0
  const defense = species.stats['3'] ?? 0
  const specialAttack = species.stats['4'] ?? 0
  const specialDefense = species.stats['5'] ?? 0
  const speed = species.stats['6'] ?? 0
  if (speed >= 100 && Math.max(attack, specialAttack) >= 90) return '고속 에이스'
  if (defense + specialDefense >= 190) return '내구형 안정축'
  if (attack > specialAttack + 20) return '물리 공격수'
  if (specialAttack > attack + 20) return '특수 공격수'
  return '균형형 올라운더'
}

const usefulStatusMoves = new Set([
  'toxic', 'protect', 'rest', 'sleep-talk', 'substitute', 'double-team', 'reflect',
  'light-screen', 'thunder-wave', 'will-o-wisp', 'swords-dance', 'bulk-up',
  'calm-mind', 'curse', 'leech-seed', 'recover', 'roost', 'agility',
])
const excludedStoryMoves = new Set([
  'self-destruct', 'explosion', 'memento', 'final-gambit', 'teleport', 'splash',
  'fissure', 'guillotine', 'horn-drill', 'sheer-cold',
])

function chapterForLevel(level: number, game: GameConfig): number {
  if (level <= 1) return 1
  const family = getFamily(game)
  const index = family.chapters.findIndex((chapter) => {
    const levels = chapter.level.match(/\d+/g)?.map(Number) ?? []
    return (levels.at(-1) ?? 0) >= level
  })
  return index >= 0 ? index + 1 : family.chapters.length
}

export function generatedMoves(
  species: CatalogSpecies,
  game: GameConfig,
  acquisitionChapter = getAvailability(species, game).chapter,
  includeAncestors = true,
): GeneratedMove[] {
  const family = getFamily(game)
  const directlyAcquired = !getAvailability(species, game).sourceSpeciesName
  const evolvedStages = new Set(generationLineage(species, game.generation).slice(1).map((stage) => stage.dex))
  const isReminderOnly = (move: LegalMove, learnedBy: CatalogSpecies) =>
    includeAncestors
    && move.method === 'level'
    && move.level <= 1
    && evolvedStages.has(learnedBy.dex)
    && !(directlyAcquired && learnedBy.dex === species.dex)
  const levelChapter = (move: LegalMove, learnedBy: CatalogSpecies) =>
    Math.max(
      acquisitionChapter,
      chapterForLevel(move.level, game),
      isReminderOnly(move, learnedBy) ? effectiveChapter(species, game) : 1,
      isReminderOnly(move, learnedBy) ? family.moveReminder?.chapter ?? 1 : 1,
    )
  const legal = legalMovesForLineage(species, game, includeAncestors)
    .filter(({ move, learnedBy }) => {
      const reminderOnly = isReminderOnly(move, learnedBy)
      return move.generation <= game.generation
        && !excludedStoryMoves.has(move.id)
        && (!reminderOnly || Boolean(family.moveReminder))
    })
  const bestSource = new Map<string, (typeof legal)[number]>()
  const sourceRank = { level: 3, machine: 2, tutor: 1 }
  for (const entry of legal) {
    const current = bestSource.get(entry.move.id)
    const bothLevelMoves = entry.move.method === 'level' && current?.move.method === 'level'
    if (
      !current
      || (bothLevelMoves && levelChapter(entry.move, entry.learnedBy) < levelChapter(current.move, current.learnedBy))
      || (bothLevelMoves && levelChapter(entry.move, entry.learnedBy) === levelChapter(current.move, current.learnedBy) && entry.move.level < current.move.level)
      || (!bothLevelMoves && sourceRank[entry.move.method] > sourceRank[current.move.method])
      || (!bothLevelMoves && entry.move.method === current.move.method && entry.move.level < current.move.level)
    ) bestSource.set(entry.move.id, entry)
  }
  const candidates = [...bestSource.values()]
  const ownTypes = speciesTypes(species, game.generation)
  const bosses = getBosses(game)
  const score = ({ move }: (typeof candidates)[number]) => {
    if (move.category === '변화') return usefulStatusMoves.has(move.id) ? 75 : 12
    const stab = ownTypes.includes(move.type) ? 45 : 0
    const bossCoverage = bosses.filter((boss) => boss.types.some((type) => isStrongAgainst(move.type, type))).length * 6
    const accuracyPenalty = move.accuracy ? Math.max(0, 100 - move.accuracy) * .4 : 0
    const sourceBonus = move.method === 'level' ? 18 : move.method === 'machine' ? 8 : 4
    return move.power + stab + bossCoverage + sourceBonus - accuracyPenalty
  }
  const levelCandidates = candidates
    .filter(({ move }) => move.method === 'level' && (move.level <= 60 || move.level === 0))
    .sort((a, b) => score(b) - score(a) || a.move.level - b.move.level || a.move.id.localeCompare(b.move.id))
  const otherCandidates = candidates
    .filter(({ move }) => move.method !== 'level')
    .sort((a, b) => score(b) - score(a) || a.move.id.localeCompare(b.move.id))
  const selected: (typeof candidates)[number][] = []
  for (const type of ownTypes) {
    const stab = levelCandidates.find((entry) => entry.move.type === type && entry.move.power > 0)
      ?? otherCandidates.find((entry) => entry.move.type === type && entry.move.power > 0)
    if (stab && !selected.some((entry) => entry.move.id === stab.move.id)) selected.push(stab)
  }
  for (const entry of [...levelCandidates, ...otherCandidates]) {
    if (selected.length >= 4) break
    if (!selected.some((current) => current.move.id === entry.move.id)) selected.push(entry)
  }
  return selected.slice(0, 4).map(({ move, learnedBy }) => {
    const reminderOnly = isReminderOnly(move, learnedBy)
    const availableChapter = move.method === 'level'
      ? levelChapter(move, learnedBy)
      : Math.max(acquisitionChapter, Math.ceil(family.chapters.length * .7))
    const source = move.method === 'level'
      ? move.level <= 1
        ? reminderOnly
          ? `${family.moveReminder!.location} 기술 떠올리기 · ${family.moveReminder!.cost}`
          : `${learnedBy.name} Lv.1 기술 목록`
        : `${learnedBy.name} Lv.${move.level} 자력 습득${learnedBy.dex !== species.dex ? ' 후 유지' : ''}`
      : move.method === 'machine'
        ? `${move.machine ?? '기술머신'} 호환 확인됨`
        : `${learnedBy.name} 기술가르침 호환 확인됨`
    return {
      id: move.id,
      name: move.name,
      type: move.type,
      category: move.category === '변화' ? '변화' : typeCategory(move.type, game.generation),
      source,
      availableChapter,
      quality: move.method === 'level' ? 'verified' : 'inferred',
    }
  })
}

function scoreCandidate(
  species: CatalogSpecies,
  game: GameConfig,
  selected: CatalogSpecies[],
  preferences: PlannerPreferences,
): { score: number; reason: string } {
  const family = getFamily(game)
  const availability = getAvailability(species, game)
  const selectedTypes = new Set(selected.flatMap((member) => speciesTypes(member, game.generation)))
  const candidateTypes = speciesTypes(species, game.generation)
  const newTypes = candidateTypes.filter((type) => !selectedTypes.has(type))
  const availableBosses = getBosses(game).filter((bossEntry) => bossEntry.chapter >= effectiveChapter(species, game))
  const bossWins = availableBosses.filter((bossEntry) =>
    candidateTypes.some((type) => bossEntry.types.some((bossType) => isStrongAgainst(type, bossType))),
  ).length
  const selectedWeaknesses = selected.flatMap((member) => weaknesses(speciesTypes(member, game.generation), game.generation))
  const sharedWeaknesses = weaknesses(candidateTypes, game.generation).filter((weakness) => selectedWeaknesses.includes(weakness)).length
  const fieldContribution = family.fieldMoves.filter((move) => canLearnFieldMove(species, move, game)).length
  const earlyScore = Math.max(0, family.chapters.length + 1 - availability.chapter) * 7
  const statsScore = Math.min(22, statTotal(species) / 28)
  const coverageScore = newTypes.length * 15 + bossWins * 5
  const hmScore = preferences.hmConvenience ? fieldContribution * 3 : 0
  const legendaryPenalty = species.legendary ? -8 : 0
  const favoriteBias = preferences.favoriteWeight / 100
  const score = earlyScore * (1.25 - favoriteBias * .5)
    + statsScore * (.8 + favoriteBias * .4)
    + coverageScore
    + hmScore
    - sharedWeaknesses * 7
    + legendaryPenalty
  const reasons = [
    availability.chapter <= 3 ? '초반 합류' : `${availability.chapter}장 합류`,
    newTypes.length ? `${newTypes.map((type) => typeKo[type]).join('·')} 커버 추가` : '기존 타입 보강',
    bossWins ? `남은 주요전 ${bossWins}곳 상성 기여` : '종족값·역할 균형 보완',
  ]
  if (preferences.hmConvenience && fieldContribution) reasons.push(`필드기 ${fieldContribution}종 후보`)
  return { score, reason: reasons.join(' · ') }
}

function assignFieldMoves(members: GeneratedMember[], game: GameConfig, enabled: boolean): void {
  if (!enabled) return
  const family = getFamily(game)
  const assignedCount = new Map<number, number>()
  for (const move of family.fieldMoves) {
    const candidates = members
      .filter((member) => canLearnFieldMove(member.species, move, game))
      .sort((a, b) => {
        const aNative = a.species.types.includes(move.type) ? 1 : 0
        const bNative = b.species.types.includes(move.type) ? 1 : 0
        return bNative - aNative
          || (assignedCount.get(a.species.dex) ?? 0) - (assignedCount.get(b.species.dex) ?? 0)
          || a.species.dex - b.species.dex
      })
    const owner = candidates[0]
    if (!owner) continue
    owner.fieldMoves.push(move.id)
    assignedCount.set(owner.species.dex, (assignedCount.get(owner.species.dex) ?? 0) + 1)
    const generated: GeneratedMove = {
      id: move.id,
      name: move.name,
      type: move.type,
      category: typeCategory(move.type, game.generation),
      source: `${legalMovesForLineage(owner.species, game).find((entry) => entry.move.id === move.id)?.move.machine ?? fieldMoveKo[move.id]} · ${family.chapters[move.unlockChapter - 1]?.title ?? `${move.unlockChapter}장`}에서 획득`,
      availableChapter: Math.max(move.unlockChapter, owner.availability.chapter),
      quality: 'verified',
    }
    const existingIndex = owner.moves.findIndex((entry) => entry.name === move.name)
    const replaceIndex = existingIndex >= 0
      ? existingIndex
      : owner.moves.findIndex((entry) => entry.type === move.type)
    if (replaceIndex >= 0) owner.moves[replaceIndex] = generated
    else owner.moves[owner.moves.length - 1] = generated
  }
}

function coverage(members: GeneratedMember[], game: GameConfig): CoverageSummary {
  const family = getFamily(game)
  const offensiveTypes = [...new Set(members.flatMap((member) => speciesTypes(member.species, game.generation)))]
  const weaknessCounts: Record<string, number> = {}
  for (const member of members) {
    for (const weakness of weaknesses(speciesTypes(member.species, game.generation), game.generation)) {
      weaknessCounts[weakness] = (weaknessCounts[weakness] ?? 0) + 1
    }
  }
  const bosses = getBosses(game)
  const bossCovered = bosses.filter((bossEntry) =>
    members.some((member) =>
      (member.challengeStarter ? 1 : effectiveChapter(member.species, game)) <= bossEntry.chapter
      && speciesTypes(member.species, game.generation).some((type) => bossEntry.types.some((bossType) => isStrongAgainst(type, bossType))),
    ),
  ).length
  const fieldMovesCovered = [...new Set(members.flatMap((member) => member.fieldMoves))]
  return {
    offensiveTypes,
    weaknesses: weaknessCounts,
    bossCoverage: Math.round((bossCovered / bosses.length) * 100),
    fieldMovesCovered,
    fieldMovesMissing: family.fieldMoves.filter((move) => !fieldMovesCovered.includes(move.id)).map((move) => move.id),
  }
}

function planId(
  game: GameConfig,
  members: GeneratedMember[],
  preferences: PlannerPreferences,
  challengeType: string | null,
  challengeStarterDex: number | null,
): string {
  const memberKey = members.map((member) => member.species.dex).sort((a, b) => a - b).join('-')
  return `${game.id}:${challengeType ? `mono-${challengeType}:starter-${challengeStarterDex}` : 'balanced'}:${memberKey}:${preferences.noTrade ? 'n' : 't'}:${preferences.hmConvenience ? 'h' : 'b'}`
}

export interface GenerateOptions {
  requiredDexes: number[]
  lockedDexes?: number[]
  previousMembers?: number[]
  variant?: number
  challengeType?: string | null
}

function hasFeasibleEvolution(species: CatalogSpecies, game: GameConfig, preferences: PlannerPreferences): boolean {
  return speciesCatalog.some((candidate) => {
    if (candidate.evolvesFrom !== species.dex || candidate.generation > game.generation) return false
    const availability = getAvailability(candidate, game)
    if (!availability.obtainable) return false
    if (preferences.noTrade && candidate.evolution?.trigger === 'trade') return false
    if (!preferences.allowPostgame && availability.postgameOnly) return false
    return true
  })
}

function isEligibleCandidate(
  species: CatalogSpecies,
  game: GameConfig,
  preferences: PlannerPreferences,
  challengeType: string | null,
): boolean {
  const availability = getAvailability(species, game)
  if (!availability.obtainable) return false
  if (hasFeasibleEvolution(species, game, preferences)) return false
  if (preferences.noTrade && availability.tradeRequired) return false
  if (!preferences.allowPostgame && availability.postgameOnly) return false
  if (!preferences.allowLegendary && (species.legendary || species.mythical)) return false
  if (new Set(legalMovesForLineage(species, game).map((entry) => entry.move.id)).size < 4) return false
  return !challengeType || speciesTypes(species, game.generation).includes(challengeType)
}

export function challengeCandidateCount(
  game: GameConfig,
  preferences: PlannerPreferences,
  challengeType: string,
  challengeStarterDex?: number,
): number {
  const challengeStarter = challengeStarterDex ? speciesByDex.get(challengeStarterDex) : undefined
  const candidates = speciesCatalog.filter((species) => {
    if (!isEligibleCandidate(species, game, preferences, challengeType)) return false
    if (!challengeStarter) return true
    if (species.chainId === challengeStarter.chainId) return false
    return getAvailability(species, game).mutuallyExclusiveGroup !== 'starter'
  })
  return new Set(candidates.map((species) => species.chainId)).size + (challengeStarter ? 1 : 0)
}

export function generateParty(game: GameConfig, preferences: PlannerPreferences, options: GenerateOptions): GeneratedPlan {
  const challengeType = options.challengeType ?? null
  const challengeStarterDex = challengeType ? options.requiredDexes[0] ?? null : null
  const validation = validateRequired(options.requiredDexes, game, preferences, challengeType)
  if (validation.errors.length) throw new Error(validation.errors.join('\n'))
  const locked = new Set(options.lockedDexes ?? [])
  const required = new Set(options.requiredDexes)
  const retainedDexes = [...new Set([
    ...options.requiredDexes,
    ...(options.previousMembers ?? []).filter((dex) => locked.has(dex)),
  ])]
  const selected = retainedDexes.map((dex) => speciesByDex.get(dex)).filter((entry): entry is CatalogSpecies => Boolean(entry))
  const eligible = speciesCatalog.filter((species) => {
    if (selected.some((member) => member.dex === species.dex)) return false
    if (selected.some((member) => member.chainId === species.chainId)) return false
    if (!isEligibleCandidate(species, game, preferences, challengeType)) return false
    const availability = getAvailability(species, game)
    if (challengeStarterDex && availability.mutuallyExclusiveGroup === 'starter') return false
    if (availability.mutuallyExclusiveGroup && selected.some((member) =>
      getAvailability(member, game).mutuallyExclusiveGroup === availability.mutuallyExclusiveGroup
    )) return false
    return true
  })

  const variant = Math.max(0, options.variant ?? 0)
  const alternativesPool: { species: CatalogSpecies; score: number; reason: string }[] = []
  while (selected.length < 6) {
    const ranked = eligible
      .filter((species) => !selected.some((member) => member.dex === species.dex))
      .filter((species) => !selected.some((member) => member.chainId === species.chainId))
      .filter((species) => {
        const group = getAvailability(species, game).mutuallyExclusiveGroup
        return !group || !selected.some((member) => getAvailability(member, game).mutuallyExclusiveGroup === group)
      })
      .map((species) => ({ species, ...scoreCandidate(species, game, selected, preferences) }))
      .sort((a, b) => b.score - a.score || a.species.dex - b.species.dex)
    if (!ranked.length) break
    alternativesPool.push(...ranked.slice(0, 10))
    const pickIndex = Math.min(variant, Math.max(0, ranked.length - 1))
    selected.push(ranked[pickIndex].species)
  }

  const members = selected.slice(0, 6).map((species) => {
    const scored = scoreCandidate(species, game, selected.filter((entry) => entry.dex !== species.dex), preferences)
    const challengeStarter = species.dex === challengeStarterDex
    const availability: Availability = challengeStarter
      ? {
          obtainable: true,
          preChampion: true,
          chapter: 1,
          finalChapter: 1,
          storyOrder: 1_000,
          location: '시작 마을 · 데이터 수정 스타팅',
          level: 'Lv.5',
          tradeRequired: false,
          postgameOnly: false,
          versionExclusive: false,
          sourceKind: 'starter',
          reason: '타입 챌린지를 위해 스타팅 데이터를 직접 교체합니다.',
          quality: 'verified',
        }
      : getAvailability(species, game)
    return {
      species,
      availability,
      required: required.has(species.dex),
      locked: locked.has(species.dex) || required.has(species.dex),
      challengeStarter,
      score: scored.score,
      reason: challengeStarter
        ? `데이터 수정으로 배정한 Lv.5 ${typeKo[challengeType!]} 타입 스타팅`
        : required.has(species.dex)
        ? `사용자가 선택한 ${challengeType ? `${typeKo[challengeType]} 챌린지 ` : ''}필수 포켓몬`
        : `${challengeType ? `${typeKo[challengeType]} 타입 조건 · ` : ''}${scored.reason}`,
      role: memberRole(species),
      moves: generatedMoves(species, game, availability.chapter, !challengeStarter),
      fieldMoves: [],
    }
  })
  assignFieldMoves(members, game, preferences.hmConvenience)
  const summary = coverage(members, game)
  const warnings = [...validation.warnings]
  if (challengeType) {
    warnings.unshift(`${typeKo[challengeType]} 단일 타입 규칙: 전투에 참가하는 1–6마리는 모두 ${typeKo[challengeType]} 타입을 공유합니다.`)
  }
  if (summary.fieldMovesMissing.length) {
    warnings.push(`파티 내 필드기 추정 커버가 부족합니다: ${summary.fieldMovesMissing.map((id) => fieldMoveKo[id] ?? id).join(', ')}. 임시 요원을 준비하세요.`)
    if (challengeType) warnings.push('타입 밖 임시 필드 요원은 이동용으로만 사용하고 전투에는 참가시키지 않는 규칙을 권장합니다.')
  }
  const shared = Object.entries(summary.weaknesses).filter(([, count]) => count >= 3)
  if (shared.length) warnings.push(`공통 약점 주의: ${shared.map(([type, count]) => `${typeKo[type]} ${count}마리`).join(', ')}`)
  if (game.generation <= 4) warnings.push('이 세대의 기술머신은 대부분 1회용입니다. 동일 TM을 여러 멤버에게 배정하기 전 저장 데이터를 확인하세요.')
  const shortMovesets = members.filter((member) => member.moves.length < 4)
  if (shortMovesets.length) {
    warnings.push(`${shortMovesets.map((member) => member.species.name).join(', ')}은(는) 이 버전의 실현 가능한 스토리 기술 후보가 4개 미만입니다. 존재하지 않는 기술로 채우지 않았습니다.`)
  }

  const alternativeMap = new Map<number, GeneratedMember>()
  for (const entry of alternativesPool) {
    if (members.some((member) => member.species.dex === entry.species.dex) || alternativeMap.has(entry.species.dex)) continue
    alternativeMap.set(entry.species.dex, {
      species: entry.species,
      availability: getAvailability(entry.species, game),
      required: false,
      locked: false,
      challengeStarter: false,
      score: entry.score,
      reason: entry.reason,
      role: memberRole(entry.species),
      moves: generatedMoves(entry.species, game),
      fieldMoves: [],
    })
  }

  return {
    id: planId(game, members, preferences, challengeType, challengeStarterDex),
    gameId: game.id,
    challengeType,
    challengeStarterDex,
    members,
    alternatives: [...alternativeMap.values()].slice(0, 12),
    coverage: summary,
    warnings,
  }
}

export { evolutionText, fieldMoveKo, moveExistsInGeneration, typeKo }
