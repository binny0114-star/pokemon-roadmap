import { evolutionText, generationLineage, getAvailability, speciesByDex, speciesCatalog } from './catalog'
import { getGen8DefaultFormProfile, getGen8FormProfile, getGen8FormProfileByIdentifier } from './gen8Forms'
import { getBosses, getFamily, getMainStoryChapterCount } from './games'
import { getLegalMoves, moveExistsInGeneration, type LegalMove } from './learnsets'
import { getMoveAcquisition } from './moveResources'
import { modernClassicFamilies } from './modernPolicy'
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

export function speciesTypes(
  species: CatalogSpecies,
  generation: number,
  game?: GameConfig,
  formIdentifier?: string,
): string[] {
  const selectedProfile = formIdentifier ? getGen8FormProfileByIdentifier(formIdentifier) : undefined
  if (selectedProfile?.speciesId === species.dex) return selectedProfile.types
  if (game) {
    const formTypes = getAvailability(species, game).formTypes
    if (formTypes?.length) return formTypes
  }
  if (generation <= 5 && species.types.includes('fairy')) return preFairyTypes[species.dex] ?? species.types.filter((type) => type !== 'fairy')
  if (generation === 1 && (species.dex === 81 || species.dex === 82)) return ['electric']
  return species.types
}

export function speciesIcon(species: CatalogSpecies, generation = 5, game?: GameConfig, formIdentifier?: string): string {
  return typeEmoji[speciesTypes(species, generation, game, formIdentifier)[0]] ?? '◉'
}

export function speciesDisplayName(species: CatalogSpecies, game: GameConfig, formIdentifier?: string): string {
  const availability = getAvailability(species, game)
  const selected = availability.formChoices?.find((choice) => choice.formIdentifier === formIdentifier)
  if (selected) return `${species.name} (${selected.formName ?? selected.formIdentifier})`
  if (availability.formChoices?.length) {
    return `${species.name} (${availability.formChoices.map((choice) => choice.formName ?? choice.formIdentifier).join('/')})`
  }
  const formName = availability.formName
  return formName ? `${species.name} (${formName})` : species.name
}

function selectedAvailability(species: CatalogSpecies, game: GameConfig, formIdentifier?: string): Availability {
  const availability = getAvailability(species, game)
  if (!availability.formChoices?.length || !formIdentifier) return availability
  const choice = availability.formChoices.find((entry) => entry.formIdentifier === formIdentifier)
  const profile = getGen8FormProfileByIdentifier(formIdentifier)
  if (!choice || profile?.speciesId !== species.dex) return availability
  const scopedAvailability = ['capture-form', 'gender-random'].includes(choice.evolutionTrigger)
    ? getAvailability(species, game, choice.formIndex)
    : availability
  return {
    ...scopedAvailability,
    formIndex: choice.formIndex,
    formIdentifier: choice.formIdentifier,
    formName: choice.formName,
    formTypes: choice.types,
    formStats: profile.stats,
    formChoices: undefined,
  }
}

export function effectiveChapter(species: CatalogSpecies, game: GameConfig): number {
  return getAvailability(species, game).finalChapter
}

function legalMovesForLineage(
  species: CatalogSpecies,
  game: GameConfig,
  includeAncestors = true,
  selectedFormIdentifier?: string,
): {
  move: LegalMove
  learnedBy: CatalogSpecies
}[] {
  const stages = includeAncestors ? generationLineage(species, game.generation, game.familyId) : [species]
  const availability = selectedAvailability(species, game, selectedFormIdentifier)
  return stages.flatMap((learnedBy) => {
    const inheritedFormIndex = learnedBy.dex === species.dex
      ? availability.formIndex
      : availability.sourceFormIndex
    const formIdentifier = learnedBy.dex === species.dex
      ? availability.formIdentifier
      : getGen8FormProfile(learnedBy.dex, inheritedFormIndex)?.identifier
        ?? getGen8DefaultFormProfile(learnedBy.dex)?.identifier
    const moves = getLegalMoves(learnedBy, game, formIdentifier)
    if (learnedBy.dex !== species.dex || !availability.formChoices?.length || selectedFormIdentifier) {
      return moves.map((move) => ({ move, learnedBy }))
    }
    const legalInEveryForm = availability.formChoices
      .map((choice) => new Set(getLegalMoves(learnedBy, game, choice.formIdentifier).map((move) => move.id)))
    return moves
      .filter((move) => legalInEveryForm.every((moveIds) => moveIds.has(move.id)))
      .map((move) => ({ move, learnedBy }))
  })
}

export function isMoveLegalForSpecies(
  species: CatalogSpecies,
  game: GameConfig,
  moveId: string,
  formIdentifier?: string,
): boolean {
  return legalMovesForLineage(species, game, true, formIdentifier).some((entry) => entry.move.id === moveId)
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
  formSelections: Readonly<Record<number, string>> = {},
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
    const selectedForm = formSelections[dex]
    if (availability.formChoices?.length) {
      if (!selectedForm) {
        errors.push(`${species.name}: 사용할 폼을 선택하세요.`)
      } else if (!availability.formChoices.some((choice) => choice.formIdentifier === selectedForm)) {
        errors.push(`${species.name}: 이 버전에서 유효하지 않은 폼 선택입니다.`)
      }
    }
    const modifiedStarter = Boolean(challengeType && index === 0)
    if (challengeType && !speciesTypes(species, game.generation, game, selectedForm).includes(challengeType)) {
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
  const chosen = dexes.map((dex) => speciesByDex.get(dex)).filter((entry): entry is CatalogSpecies => Boolean(entry))
  const starterChainIds = new Set(
    game.starters.map((dex) => speciesByDex.get(dex)?.chainId).filter((chainId): chainId is number => chainId !== undefined),
  )
  const selectedStarter = chosen.find((species) => starterChainIds.has(species.chainId))
  for (const species of chosen) {
    const requiredStarterDex = getAvailability(species, game).requiredStarterDex
    if (requiredStarterDex) {
      if (!selectedStarter) {
        errors.push(`${species.name}: 디그다 보상에 대응하는 가라르 스타팅을 함께 선택해야 합니다.`)
      } else if (selectedStarter.chainId !== speciesByDex.get(requiredStarterDex)?.chainId) {
        errors.push(`${species.name}: 선택한 가라르 스타팅 ${selectedStarter.name}의 디그다 보상과 일치하지 않습니다.`)
      }
    }
  }
  if (challengeType && challengeStarter) {
    const count = challengeCandidateCount(game, preferences, challengeType, challengeStarter.dex)
    if (count < 6) warnings.push(`${typeKo[challengeType]} 타입의 개조 스타팅과 실제 입수 가능한 서로 다른 진화 계열을 합쳐 ${count}개라 ${count}인 파티로 생성됩니다.`)
  }
  return { errors, warnings }
}

function statsFor(species: CatalogSpecies, game: GameConfig, formIdentifier?: string): Record<string, number> {
  return selectedAvailability(species, game, formIdentifier).formStats ?? species.stats
}

function statTotal(species: CatalogSpecies, game: GameConfig, formIdentifier?: string): number {
  return Object.values(statsFor(species, game, formIdentifier)).reduce((sum, value) => sum + value, 0)
}

function memberRole(species: CatalogSpecies, game: GameConfig, formIdentifier?: string): string {
  const stats = statsFor(species, game, formIdentifier)
  const attack = stats['2'] ?? 0
  const defense = stats['3'] ?? 0
  const specialAttack = stats['4'] ?? 0
  const specialDefense = stats['5'] ?? 0
  const speed = stats['6'] ?? 0
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
  return index >= 0 ? Math.min(index + 1, getMainStoryChapterCount(game)) : getMainStoryChapterCount(game)
}

export function generatedMoves(
  species: CatalogSpecies,
  game: GameConfig,
  acquisitionChapter = getAvailability(species, game).chapter,
  includeAncestors = true,
  resourceUsage: ReadonlyMap<string, number> = new Map(),
  formIdentifier?: string,
): GeneratedMove[] {
  const family = getFamily(game)
  const speciesAvailability = selectedAvailability(species, game, formIdentifier)
  const directlyAcquired = !includeAncestors || !speciesAvailability.sourceSpeciesName
  const finalStageChapter = directlyAcquired
    ? acquisitionChapter
    : speciesAvailability.evolutionDlcFinalChapter
      ?? speciesAvailability.dlcFinalChapter
      ?? speciesAvailability.finalChapter
  const lineage = generationLineage(species, game.generation, game.familyId)
  const evolvedStages = new Set(lineage.slice(1).map((stage) => stage.dex))
  const evolutionLevel = (stage: CatalogSpecies) =>
    stage.evolution?.minLevel
    ?? (stage.evolution?.trigger === 'shed'
      ? speciesCatalog.find((candidate) =>
          candidate.evolvesFrom === stage.evolvesFrom
          && candidate.evolution?.trigger === 'level-up',
        )?.evolution?.minLevel
      : null)
  const requiresDelayedEvolution = (move: LegalMove, learnedBy: CatalogSpecies) => {
    if (!includeAncestors || move.method !== 'level' || learnedBy.dex === species.dex) return false
    const nextStage = lineage[lineage.findIndex((stage) => stage.dex === learnedBy.dex) + 1]
    const nextEvolutionLevel = nextStage ? evolutionLevel(nextStage) : null
    return Boolean(nextEvolutionLevel) && move.level > nextEvolutionLevel!
  }
  // 합류 레벨까지 배운 자력기 중 마지막 4개만 처음부터 알고 있습니다. 같은 레벨 기술의 게임 내 순서는
  // 원본에 없으므로, 4칸 경계에 걸친 레벨의 기술은 모두 기술 떠올리기가 필요한 것으로 보수적으로 둡니다.
  const joinLevel = Number(/\d+/.exec(speciesAvailability.level)?.[0] ?? 1)
  const knownAtJoin = modernClassicFamilies.has(game.familyId) && directlyAcquired
    ? (() => {
        const byLevel = new Map<number, Set<string>>()
        for (const move of getLegalMoves(species, game, speciesAvailability.formIdentifier)) {
          if (move.method !== 'level' || move.level > joinLevel) continue
          const level = Math.max(1, move.level)
          byLevel.set(level, (byLevel.get(level) ?? new Set()).add(move.id))
        }
        const known = new Set<string>()
        for (const level of [...byLevel.keys()].sort((a, b) => b - a)) {
          const ids = [...byLevel.get(level)!].filter((id) => !known.has(id))
          if (known.size + ids.length > 4) break
          for (const id of ids) known.add(id)
        }
        return known
      })()
    : null
  const isReminderOnly = (move: LegalMove, learnedBy: CatalogSpecies) =>
    (
      knownAtJoin !== null
      && move.method === 'level'
      && learnedBy.dex === species.dex
      && move.level <= joinLevel
      && !knownAtJoin.has(move.id)
    )
    || (
      includeAncestors
      && move.method === 'level'
      && evolvedStages.has(learnedBy.dex)
      && !(directlyAcquired && learnedBy.dex === species.dex)
      && (
        move.level <= 1
        || (
          Boolean(evolutionLevel(learnedBy))
          && move.level < evolutionLevel(learnedBy)!
        )
      )
    )
  const levelChapter = (move: LegalMove, learnedBy: CatalogSpecies) =>
    Math.max(
      acquisitionChapter,
      chapterForLevel(move.level, game),
      learnedBy.dex === species.dex ? finalStageChapter : 1,
      isReminderOnly(move, learnedBy) ? effectiveChapter(species, game) : 1,
      isReminderOnly(move, learnedBy) ? family.moveReminder?.chapter ?? 1 : 1,
    )
  const eggParentTiming = (move: LegalMove) => move.eggParentIdentifiers
    ?.flatMap((identifier) => {
      const profile = getGen8FormProfileByIdentifier(identifier)
      const parent = profile ? speciesByDex.get(profile.speciesId) : undefined
      if (!profile || !parent) return []
      const availability = getAvailability(parent, game, profile.formIndex)
      if (!availability.obtainable || availability.postgameOnly) return []
      const parentMove = getLegalMoves(parent, game, identifier)
        .filter((entry) => entry.id === move.id && entry.method !== 'egg')
        .map((entry) => {
          const acquisition = getMoveAcquisition(game, entry)
          const chapter = entry.method === 'level'
            ? Math.max(availability.dlcFinalChapter ?? availability.finalChapter, chapterForLevel(entry.level, game))
            : Math.max(availability.dlcFinalChapter ?? availability.finalChapter, acquisition?.dlcChapter ?? acquisition?.chapter ?? getMainStoryChapterCount(game))
          return { chapter, parent }
        })
        .sort((a, b) => a.chapter - b.chapter)[0]
      return parentMove ? [parentMove] : []
    })
    .sort((a, b) => a.chapter - b.chapter)[0]
  const legal = legalMovesForLineage(species, game, includeAncestors, formIdentifier)
    .filter(({ move, learnedBy }) => {
      const reminderOnly = isReminderOnly(move, learnedBy)
      const acquisition = getMoveAcquisition(game, move)
      return move.generation <= game.generation
        && !excludedStoryMoves.has(move.id)
        && !requiresDelayedEvolution(move, learnedBy)
        && (!reminderOnly || Boolean(family.moveReminder))
        && (move.method !== 'egg' || Boolean(eggParentTiming(move)))
        // 입수 장소를 모델링하지 않은 기술가르침은 추천하지 않습니다.
        && !(modernClassicFamilies.has(game.familyId) && move.method === 'tutor')
        && (move.method === 'level' || !['sword', 'shield'].includes(game.id) || (
          Boolean(acquisition) && acquisition!.chapter <= getMainStoryChapterCount(game)
        ))
    })
  const bestSource = new Map<string, (typeof legal)[number]>()
  const sourceRank = { level: 4, machine: 3, tutor: 2, egg: 1 }
  for (const entry of legal) {
    const current = bestSource.get(entry.move.id)
    const bothLevelMoves = entry.move.method === 'level' && current?.move.method === 'level'
    const entryAcquisition = getMoveAcquisition(game, entry.move)
    const currentAcquisition = current ? getMoveAcquisition(game, current.move) : undefined
    const entryChapter = entry.move.method === 'level'
      ? levelChapter(entry.move, entry.learnedBy)
      : Math.max(entryAcquisition?.chapter ?? getMainStoryChapterCount(game), entry.move.method === 'egg' ? eggParentTiming(entry.move)?.chapter ?? getMainStoryChapterCount(game) : 1)
    const currentChapter = !current
      ? Number.POSITIVE_INFINITY
      : current.move.method === 'level'
        ? levelChapter(current.move, current.learnedBy)
        : Math.max(currentAcquisition?.chapter ?? getMainStoryChapterCount(game), current.move.method === 'egg' ? eggParentTiming(current.move)?.chapter ?? getMainStoryChapterCount(game) : 1)
    if (
      !current
      || (['sword', 'shield'].includes(game.id) && entryChapter < currentChapter)
      || (bothLevelMoves && levelChapter(entry.move, entry.learnedBy) < levelChapter(current.move, current.learnedBy))
      || (bothLevelMoves && levelChapter(entry.move, entry.learnedBy) === levelChapter(current.move, current.learnedBy) && entry.move.level < current.move.level)
      || (!bothLevelMoves && sourceRank[entry.move.method] > sourceRank[current.move.method])
      || (!bothLevelMoves && entry.move.method === current.move.method && entry.move.level < current.move.level)
    ) bestSource.set(entry.move.id, entry)
  }
  const candidates = [...bestSource.values()].filter(({ move }) => {
    const acquisition = getMoveAcquisition(game, move)
    if (!acquisition?.resourceId || acquisition.reusable) return true
    const repeatableInStory = acquisition.repeatable
      && (acquisition.repeatableChapter ?? acquisition.chapter) <= getMainStoryChapterCount(game)
    return repeatableInStory
      || (resourceUsage.get(acquisition.resourceId) ?? 0) < (acquisition.guaranteedCopies ?? 1)
  })
  const ownTypes = speciesTypes(species, game.generation, game, formIdentifier)
  const bosses = getBosses(game).filter((entry) => entry.chapter <= getMainStoryChapterCount(game))
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
    const acquisition = getMoveAcquisition(game, move)
    const eggParent = move.method === 'egg' ? eggParentTiming(move) : undefined
    const availableChapter = move.method === 'level'
      ? levelChapter(move, learnedBy)
      : Math.max(
          acquisitionChapter,
          learnedBy.dex === species.dex ? finalStageChapter : 1,
          acquisition?.chapter ?? Math.ceil(getMainStoryChapterCount(game) * .7),
          eggParent?.chapter ?? 1,
        )
    const source = move.method === 'level'
      ? reminderOnly
        ? `${family.moveReminder!.location} 기술 떠올리기 · ${family.moveReminder!.cost}`
        : move.level <= 1
          ? `${learnedBy.name} Lv.1 기술 목록`
          : `${learnedBy.name} Lv.${move.level} 자력 습득${learnedBy.dex !== species.dex ? ' 후 유지' : ''}`
      : acquisition
        ? `${acquisition.source}${eggParent ? ` · ${eggParent.parent.name} 부모 계열에서 유전` : ''}`
        : move.method === 'machine'
        ? `${move.machine ?? '기술머신'} 호환 확인됨`
        : `${learnedBy.name} 기술가르침 호환 확인됨`
    return {
      id: move.id,
      name: move.name,
      type: move.type,
      category: game.generation >= 4 ? move.category : typeCategory(move.type, game.generation),
      source,
      availableChapter,
      resourceId: acquisition?.resourceId,
      dlcMilestone: acquisition?.dlcMilestone,
      dlcChapter: acquisition?.dlcChapter,
      reusable: acquisition?.reusable,
      repeatable: acquisition?.repeatable,
      guaranteedCopies: acquisition?.guaranteedCopies,
      repeatableChapter: acquisition?.repeatableChapter,
      unitCost: acquisition?.unitCost,
      currency: acquisition?.currency,
      quality: move.method === 'level' || acquisition ? 'verified' : 'inferred',
    }
  })
}

function scoreCandidate(
  species: CatalogSpecies,
  game: GameConfig,
  selected: CatalogSpecies[],
  preferences: PlannerPreferences,
  formSelections: Readonly<Record<number, string>>,
): { score: number; reason: string } {
  const family = getFamily(game)
  const availability = getAvailability(species, game)
  const selectedTypes = new Set(selected.flatMap((member) =>
    speciesTypes(member, game.generation, game, formSelections[member.dex])))
  const candidateTypes = speciesTypes(species, game.generation, game, formSelections[species.dex])
  const newTypes = candidateTypes.filter((type) => !selectedTypes.has(type))
  const availableBosses = getBosses(game).filter((bossEntry) =>
    bossEntry.chapter <= getMainStoryChapterCount(game)
    && bossEntry.chapter >= effectiveChapter(species, game))
  const bossWins = availableBosses.filter((bossEntry) =>
    candidateTypes.some((type) => bossEntry.types.some((bossType) => isStrongAgainst(type, bossType))),
  ).length
  const selectedWeaknesses = selected.flatMap((member) =>
    weaknesses(speciesTypes(member, game.generation, game, formSelections[member.dex]), game.generation))
  const sharedWeaknesses = weaknesses(candidateTypes, game.generation).filter((weakness) => selectedWeaknesses.includes(weakness)).length
  const fieldContribution = game.familyId === 'sinnoh8'
    ? 0
    : family.fieldMoves.filter((move) => canLearnFieldMove(species, move, game)).length
  const earlyScore = Math.max(0, getMainStoryChapterCount(game) + 1 - availability.chapter) * 7
  const statsScore = Math.min(22, statTotal(species, game, formSelections[species.dex]) / 28)
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
  if (!enabled || game.familyId === 'sinnoh8') return
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
    const legalFieldMove = legalMovesForLineage(owner.species, game).find((entry) => entry.move.id === move.id)?.move
    const generated: GeneratedMove = {
      id: move.id,
      name: move.name,
      type: move.type,
      // 4세대부터는 기술마다 물리·특수가 정해져 있습니다(예: 폭포오르기는 물리).
      category: game.generation >= 4 && legalFieldMove ? legalFieldMove.category : typeCategory(move.type, game.generation),
      source: `${legalFieldMove?.machine ?? fieldMoveKo[move.id]} · ${family.chapters[move.unlockChapter - 1]?.title ?? `${move.unlockChapter}장`}에서 획득`,
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
  const memberTypes = (member: GeneratedMember) =>
    member.availability.formTypes ?? speciesTypes(member.species, game.generation, game)
  const offensiveTypes = [...new Set(members.flatMap(memberTypes))]
  const weaknessCounts: Record<string, number> = {}
  for (const member of members) {
    for (const weakness of weaknesses(memberTypes(member), game.generation)) {
      weaknessCounts[weakness] = (weaknessCounts[weakness] ?? 0) + 1
    }
  }
  const bosses = getBosses(game).filter((entry) => entry.chapter <= getMainStoryChapterCount(game))
  const bossCovered = bosses.filter((bossEntry) =>
    members.some((member) =>
      (member.challengeStarter ? 1 : effectiveChapter(member.species, game)) <= bossEntry.chapter
      && memberTypes(member).some((type) => bossEntry.types.some((bossType) => isStrongAgainst(type, bossType))),
    ),
  ).length
  const fieldMovesCovered = game.familyId === 'sinnoh8'
    ? family.fieldMoves.map((move) => move.id)
    : [...new Set(members.flatMap((member) => member.fieldMoves))]
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
  formSelections: Readonly<Record<number, string>>,
): string {
  const memberKey = members.map((member) => member.species.dex).sort((a, b) => a - b).join('-')
  const formKey = members
    .map((member) => [member.species.dex, formSelections[member.species.dex]] as const)
    .filter((entry): entry is readonly [number, string] => Boolean(entry[1]))
    .sort(([left], [right]) => left - right)
    .map(([dex, form]) => `${dex}-${form}`)
    .join('-')
  const legacyId = `${game.id}:${challengeType ? `mono-${challengeType}:starter-${challengeStarterDex}` : 'balanced'}:${memberKey}:${preferences.noTrade ? 'n' : 't'}:${preferences.hmConvenience ? 'h' : 'b'}`
  return formKey ? `${legacyId}:forms-${formKey}` : legacyId
}

export interface GenerateOptions {
  requiredDexes: number[]
  lockedDexes?: number[]
  previousMembers?: number[]
  variant?: number
  challengeType?: string | null
  formSelections?: Readonly<Record<number, string>>
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
  if (game.familyId === 'galar8' && (availability.dlcChapter || availability.evolutionDlcChapter)) return false
  if (hasFeasibleEvolution(species, game, preferences)) return false
  if (preferences.noTrade && availability.tradeRequired) return false
  if (!preferences.allowPostgame && availability.postgameOnly) return false
  if (!preferences.allowLegendary && (species.legendary || species.mythical)) return false
  if (new Set(legalMovesForLineage(species, game).map((entry) => entry.move.id)).size < 4) return false
  return !challengeType || speciesTypes(species, game.generation, game).includes(challengeType)
}

const challengeCandidateCountCache = new Map<string, number>()

export function challengeCandidateCount(
  game: GameConfig,
  preferences: PlannerPreferences,
  challengeType: string,
  challengeStarterDex?: number,
): number {
  // 화면이 다시 그려질 때마다 타입별로 전국도감 전체를 훑지 않도록, 결과에 영향을 주는 입력만 키로 캐시합니다.
  const cacheKey = [
    game.id,
    challengeType,
    challengeStarterDex ?? '',
    preferences.noTrade ? 'n' : 't',
    preferences.allowPostgame ? 'p' : '-',
    preferences.allowLegendary ? 'l' : '-',
  ].join(':')
  const cached = challengeCandidateCountCache.get(cacheKey)
  if (cached !== undefined) return cached
  const count = computeChallengeCandidateCount(game, preferences, challengeType, challengeStarterDex)
  if (speciesCatalog.length) challengeCandidateCountCache.set(cacheKey, count)
  return count
}

function computeChallengeCandidateCount(
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

function satisfiesStarterDependency(species: CatalogSpecies, selected: CatalogSpecies[], game: GameConfig): boolean {
  const requiredDex = getAvailability(species, game).requiredStarterDex
  if (!requiredDex) return true
  const starterChainIds = new Set(
    game.starters.map((dex) => speciesByDex.get(dex)?.chainId).filter((chainId): chainId is number => chainId !== undefined),
  )
  const selectedStarter = selected.find((member) => starterChainIds.has(member.chainId))
  return Boolean(selectedStarter) && selectedStarter!.chainId === speciesByDex.get(requiredDex)?.chainId
}

function fitsSelection(
  species: CatalogSpecies,
  selected: CatalogSpecies[],
  game: GameConfig,
  challengeStarterDex: number | null,
): boolean {
  if (selected.some((member) => member.dex === species.dex || member.chainId === species.chainId)) return false
  const group = getAvailability(species, game).mutuallyExclusiveGroup
  if (group && challengeStarterDex && group === 'starter') return false
  if (group && selected.some((member) => getAvailability(member, game).mutuallyExclusiveGroup === group)) return false
  return satisfiesStarterDependency(species, selected, game)
}

export function replacementAlternatives(game: GameConfig, plan: GeneratedPlan, targetDex: number): GeneratedMember[] {
  const kept = plan.members
    .filter((member) => member.species.dex !== targetDex)
    .map((member) => member.species)
  return plan.alternatives.filter((alternative) =>
    fitsSelection(alternative.species, kept, game, plan.challengeStarterDex))
}

export function generateParty(game: GameConfig, preferences: PlannerPreferences, options: GenerateOptions): GeneratedPlan {
  const challengeType = options.challengeType ?? null
  const challengeStarterDex = challengeType ? options.requiredDexes[0] ?? null : null
  const formSelections: Record<number, string> = { ...options.formSelections }
  const validation = validateRequired(options.requiredDexes, game, preferences, challengeType, formSelections)
  if (validation.errors.length) throw new Error(validation.errors.join('\n'))
  const locked = new Set(options.lockedDexes ?? [])
  const required = new Set(options.requiredDexes)
  const selected = [...new Set(options.requiredDexes)]
    .map((dex) => speciesByDex.get(dex))
    .filter((entry): entry is CatalogSpecies => Boolean(entry))
  // 잠금 멤버는 필수 멤버 뒤에 유지하되, 같은 진화 계열이나 스타터·화석처럼 함께 입수할 수 없는 조합은 들이지 않습니다.
  for (const dex of options.previousMembers ?? []) {
    const species = locked.has(dex) ? speciesByDex.get(dex) : undefined
    if (species && selected.length < 6 && fitsSelection(species, selected, game, challengeStarterDex)) selected.push(species)
  }
  for (const species of selected) {
    const choices = getAvailability(species, game).formChoices
    if (!choices?.length) continue
    const selectedForm = formSelections[species.dex]
    if (selectedForm && !choices.some((choice) => choice.formIdentifier === selectedForm)) {
      throw new Error(`${species.name}: 이 버전에서 유효하지 않은 폼 선택입니다.`)
    }
    if (!selectedForm && species.dex === 892) {
      throw new Error(`${species.name}: 사용할 폼을 선택하세요.`)
    }
  }
  const eligible = speciesCatalog.filter((species) =>
    fitsSelection(species, selected, game, challengeStarterDex)
    && isEligibleCandidate(species, game, preferences, challengeType))

  const variant = Math.max(0, options.variant ?? 0)
  const alternativesPool: { species: CatalogSpecies; score: number; reason: string }[] = []
  while (selected.length < 6) {
    const ranked = eligible
      .filter((species) => fitsSelection(species, selected, game, challengeStarterDex))
      .map((species) => ({ species, ...scoreCandidate(species, game, selected, preferences, formSelections) }))
      .sort((a, b) => b.score - a.score || a.species.dex - b.species.dex)
    if (!ranked.length) break
    alternativesPool.push(...ranked.slice(0, 10))
    const pickIndex = Math.min(variant, Math.max(0, ranked.length - 1))
    selected.push(ranked[pickIndex].species)
  }
  for (const species of selected) {
    if (formSelections[species.dex]) continue
    const choices = getAvailability(species, game).formChoices
    const choice = choices?.find((entry) => !challengeType || entry.types.includes(challengeType)) ?? choices?.[0]
    if (choice) formSelections[species.dex] = choice.formIdentifier
  }
  if (challengeType) {
    const invalidMember = selected.find((species) =>
      !speciesTypes(species, game.generation, game, formSelections[species.dex]).includes(challengeType))
    if (invalidMember) {
      throw new Error(`${invalidMember.name}: ${typeKo[challengeType]} 타입 챌린지 조건과 맞지 않습니다.`)
    }
  }

  const moveResourceUsage = new Map<string, number>()
  const members = selected.slice(0, 6).map((species) => {
    const selectedForm = formSelections[species.dex]
    const scored = scoreCandidate(
      species,
      game,
      selected.filter((entry) => entry.dex !== species.dex),
      preferences,
      formSelections,
    )
    const challengeStarter = species.dex === challengeStarterDex
    const concreteAvailability = selectedAvailability(species, game, selectedForm)
    const availability: Availability = challengeStarter
      ? {
          ...concreteAvailability,
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
          method: undefined,
          methodId: undefined,
          sourceSpeciesName: undefined,
          sourceSpeciesDex: undefined,
          sourceFormIndex: undefined,
          sourceFormIdentifier: undefined,
          sourceFormName: undefined,
          conditions: undefined,
          mutuallyExclusiveGroup: undefined,
          requiredStarterDex: undefined,
          dlcMilestone: undefined,
          dlcChapter: undefined,
          dlcFinalChapter: undefined,
          evolutionDlcMilestone: undefined,
          evolutionDlcChapter: undefined,
          evolutionDlcFinalChapter: undefined,
          reason: '타입 챌린지를 위해 스타팅 데이터를 직접 교체합니다.',
          quality: 'verified',
        }
      : concreteAvailability
    const moves = generatedMoves(
      species,
      game,
      availability.chapter,
      !challengeStarter,
      moveResourceUsage,
      selectedForm,
    )
    for (const move of moves) {
      if (move.resourceId && move.reusable === false) {
        moveResourceUsage.set(move.resourceId, (moveResourceUsage.get(move.resourceId) ?? 0) + 1)
      }
    }
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
      role: memberRole(species, game, selectedForm),
      moves,
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
  const consumableResources = new Map<string, GeneratedMove[]>()
  for (const move of members.flatMap((member) => member.moves)) {
    if (!move.resourceId || move.reusable !== false) continue
    consumableResources.set(move.resourceId, [...(consumableResources.get(move.resourceId) ?? []), move])
  }
  if (game.id === 'sword' || game.id === 'shield') {
    const trMoves = [...consumableResources.entries()].filter(([resourceId]) => resourceId.startsWith('TR'))
    const totalWatts = trMoves.reduce((sum, [, moves]) =>
      sum + moves.reduce((subtotal, move) => subtotal + (move.unitCost ?? 0), 0), 0)
    if (trMoves.length) {
      warnings.push(`TR은 1회용이며 와트숍 재고가 매일 순환합니다. 이 플랜은 ${trMoves.reduce((sum, [, moves]) => sum + moves.length, 0)}개 복사본·총 ${totalWatts.toLocaleString('ko-KR')}W가 필요하며, 같은 TR은 필요한 수만큼 따로 구매하거나 레이드 보상으로 확보해야 합니다.`)
    }
    const armoriteCount = [...consumableResources.values()].flat()
      .filter((move) => move.currency === '갑옷광석')
      .reduce((sum, move) => sum + (move.unitCost ?? 0), 0)
    if (armoriteCount) warnings.push(`갑옷섬 기술가르침 비용 합계: 갑옷광석 ${armoriteCount}개.`)
  }
  if (game.id === 'brilliant-diamond' || game.id === 'shining-pearl') {
    warnings.push('BDSP 기술머신은 1회용입니다. 스토리 중 보장 수량 안에서 배정했으며, 반복 구매가 없는 TM은 같은 복사본을 중복 사용하지 않습니다.')
  }
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
      role: memberRole(entry.species, game),
      moves: generatedMoves(entry.species, game, undefined, true, moveResourceUsage),
      fieldMoves: [],
    })
  }

  return {
    id: planId(game, members, preferences, challengeType, challengeStarterDex, formSelections),
    legacyId: Object.keys(formSelections).length
      ? planId(game, members, preferences, challengeType, challengeStarterDex, {})
      : undefined,
    gameId: game.id,
    challengeType,
    challengeStarterDex,
    formSelections: Object.fromEntries(
      members
        .map((member) => [member.species.dex, formSelections[member.species.dex]] as const)
        .filter((entry): entry is readonly [number, string] => Boolean(entry[1])),
    ),
    members,
    alternatives: [...alternativeMap.values()].slice(0, 12),
    coverage: summary,
    warnings,
  }
}

export { evolutionText, fieldMoveKo, moveExistsInGeneration, typeKo }
