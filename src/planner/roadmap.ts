import { generationLineage, getAvailability, speciesCatalog } from './catalog'
import { effectiveChapter, evolutionText, fieldMoveKo, speciesDisplayName, speciesTypes, typeKo } from './engine'
import { getBosses, getFamily } from './games'
import { isStrongAgainst } from './typeChart'
import type { DynamicRoadmapChapter, GameConfig, GeneratedMember, GeneratedPlan } from './types'

function stageAtChapter(member: GeneratedMember, game: GameConfig, chapter: number): GeneratedMember['species'] | null {
  if (member.challengeStarter) return chapter >= 1 ? member.species : null
  const stages = generationLineage(member.species, game.generation).filter((species) => getAvailability(species, game).obtainable)
  const available = stages.filter((species) => effectiveChapter(species, game) <= chapter)
  return available.at(-1) ?? null
}

function temporaryCounter(
  game: GameConfig,
  bossTypes: string[],
  chapter: number,
  members: GeneratedMember[],
  challengeType: string | null,
): string | null {
  const ownedChains = new Set(members.map((member) => member.species.chainId))
  const consumedChoiceGroups = new Set(
    members
      .map((member) => member.challengeStarter ? 'starter' : member.availability.mutuallyExclusiveGroup)
      .filter((group): group is string => Boolean(group)),
  )
  const candidate = speciesCatalog
    .filter((species) => !ownedChains.has(species.chainId))
    .filter((species) => {
      const availability = getAvailability(species, game)
      return availability.obtainable
        && !availability.postgameOnly
        && availability.chapter <= chapter
        && !availability.tradeRequired
        && (!availability.mutuallyExclusiveGroup || !consumedChoiceGroups.has(availability.mutuallyExclusiveGroup))
    })
    .filter((species) => !challengeType || speciesTypes(species, game.generation, game).includes(challengeType))
    .filter((species) => speciesTypes(species, game.generation, game).some((type) => bossTypes.some((bossType) => isStrongAgainst(type, bossType))))
    .sort((a, b) => getAvailability(a, game).chapter - getAvailability(b, game).chapter || a.dex - b.dex)[0]
  if (!candidate) return null
  const availability = getAvailability(candidate, game)
  return `${speciesDisplayName(candidate, game)}(${availability.location}) 같은 ${speciesTypes(candidate, game.generation, game).map((type) => typeKo[type]).join('/')} ${challengeType ? '챌린지 내 ' : ''}임시 카운터를 고려하세요.`
}

export function composeRoadmap(game: GameConfig, plan: GeneratedPlan): DynamicRoadmapChapter[] {
  const family = getFamily(game)
  const bosses = getBosses(game)
  return family.chapters.map((chapter, chapterIndex) => {
    const number = chapterIndex + 1
    const actions: DynamicRoadmapChapter['actions'] = []

    if (number === 1 && plan.challengeType) {
      actions.push({
        id: `${chapter.id}:challenge:${plan.challengeType}`,
        kind: 'warning',
        quality: 'verified',
        text: `${typeKo[plan.challengeType]} 단일 타입 챌린지 — 전투 멤버는 모두 ${typeKo[plan.challengeType]} 타입을 공유합니다. 타입 밖 필드 요원은 전투에 참가시키지 마세요.`,
      })
    }

    const chronologicalMembers = [...plan.members].sort(
      (a, b) => (a.availability.dlcChapter ? a.availability.dlcChapter * 1_000 : a.availability.storyOrder)
        - (b.availability.dlcChapter ? b.availability.dlcChapter * 1_000 : b.availability.storyOrder)
        || a.species.dex - b.species.dex,
    )
    for (const member of chronologicalMembers) {
      const captureChapter = member.availability.dlcChapter ?? member.availability.chapter
      if (captureChapter === number) {
        actions.push({
          id: `${chapter.id}:capture:${member.species.dex}`,
          kind: 'capture',
          memberDex: member.species.dex,
          quality: member.availability.quality,
          text: member.challengeStarter
            ? `${speciesDisplayName(member.species, game, member.availability.formIdentifier)} 스타팅 합류 — 시작 데이터의 포켓몬을 직접 교체, Lv.5`
            : member.availability.sourceSpeciesName
              ? `${speciesDisplayName(member.species, game, member.availability.formIdentifier)} 준비 — ${member.availability.sourceSpeciesName}${member.availability.sourceFormName ? ` (${member.availability.sourceFormName})` : ''} 포획: ${member.availability.location}${member.availability.method ? ` · ${member.availability.method}` : ''}, ${member.availability.level}`
              : `${speciesDisplayName(member.species, game, member.availability.formIdentifier)} 합류 — ${member.availability.location}${member.availability.method ? ` · ${member.availability.method}` : ''}, ${member.availability.level}`,
        })
      }
      if (member.availability.sourceSpeciesName) {
        for (const stage of generationLineage(member.species, game.generation).slice(1)) {
          const evolutionAt = member.availability.evolutionDlcFinalChapter
            ?? member.availability.dlcFinalChapter
            ?? (member.availability.dlcChapter ? Math.max(member.availability.dlcChapter, effectiveChapter(stage, game)) : effectiveChapter(stage, game))
          if (evolutionAt !== number || evolutionAt < captureChapter) continue
          const parent = stage.evolvesFrom ? speciesCatalog.find((species) => species.dex === stage.evolvesFrom) : undefined
          actions.push({
            id: `${chapter.id}:evolve:${stage.dex}`,
            kind: 'evolution',
            memberDex: member.species.dex,
            quality: stage.evolution?.trigger ? 'verified' : 'inferred',
            text: `${parent?.name ?? '진화 전 형태'} → ${evolutionText(
              stage,
              game,
              stage.dex === member.species.dex ? member.availability.formIdentifier : undefined,
            )}`,
          })
        }
      }
      for (const move of member.moves.filter((entry) =>
        Math.max(captureChapter, entry.dlcChapter ?? entry.availableChapter) === number)) {
        actions.push({
          id: `${chapter.id}:move:${member.species.dex}:${move.name}`,
          kind: 'move',
          memberDex: member.species.dex,
          quality: move.quality,
          text: `${speciesDisplayName(member.species, game, member.availability.formIdentifier)}: ${move.name} (${typeKo[move.type] ?? move.type}·${move.category}) — ${move.source}`,
        })
      }
    }

    const chapterBosses = bosses.filter((entry) => entry.chapter === number)
    for (const boss of chapterBosses) {
      const branchAlternatives = boss.branchGroup
        ? chapterBosses.filter((entry) => entry.branchGroup === boss.branchGroup)
        : [boss]
      if (branchAlternatives[0] !== boss) continue
      const bossTypes = [...new Set(branchAlternatives.flatMap((entry) => entry.types))]
      const counterFor = (types: string[]) => {
        const counters = plan.members.filter((member) => {
          const memberChapter = member.availability.dlcChapter ?? member.availability.chapter
          return memberChapter <= number
            && stageAtChapter(member, game, number)
            && member.moves.some((move) =>
              Math.max(memberChapter, move.dlcChapter ?? move.availableChapter) <= number
              && types.some((bossType) => isStrongAgainst(move.type, bossType)))
        })
        const text = counters.length
          ? counters.map((member) => {
              const memberChapter = member.availability.dlcChapter ?? member.availability.chapter
              const move = member.moves.find((entry) =>
                Math.max(memberChapter, entry.dlcChapter ?? entry.availableChapter) <= number
                && types.some((type) => isStrongAgainst(entry.type, type)))
              const stage = stageAtChapter(member, game, number)
              return `${stage?.name ?? member.species.name}${move ? `의 ${move.name}` : ''}`
            }).join(', ')
          : temporaryCounter(game, types, number, plan.members, plan.challengeType)
            ?? '직접 약점 공략 수단이 부족하므로 레벨 우위와 상태이상을 활용하세요.'
        return { counters, text }
      }
      const branchCounters = branchAlternatives.map((alternative) => ({
        alternative,
        ...counterFor(alternative.types),
      }))
      const counters = branchCounters.flatMap((entry) => entry.counters)
      const counterText = branchAlternatives.length > 1
        ? branchCounters.map(({ alternative, text }) => `${alternative.name}: ${text}`).join(' / ')
        : branchCounters[0].text
      const branchLabel = branchAlternatives.length > 1
        ? `분기 선택: ${branchAlternatives.map((entry) => `${entry.title} ${entry.name}`).join(' 또는 ')}`
        : `${boss.title} ${boss.name}`
      const branchWarning = branchAlternatives.map((entry) => entry.warning).filter(Boolean).join(' / ')
      actions.push({
        id: `${chapter.id}:boss:${branchAlternatives.length > 1 ? boss.branchGroup : boss.id}`,
        kind: 'boss',
        quality: counters.length ? (counters.some((member) => member.moves.some((move) => move.quality !== 'verified')) ? 'inferred' : 'verified') : 'inferred',
        text: `${branchLabel} (${bossTypes.map((type) => typeKo[type] ?? type).join('/')}·${boss.level})${boss.winRequired === false ? ' · 승리 불필요' : ''} — ${counterText}${branchWarning ? ` · 주의: ${branchWarning}` : ''}`,
      })
    }

    if (game.generation <= 4) {
      const duplicateMoves = plan.members.flatMap((member) => member.moves.map((move) => move.name))
        .filter((move, index, all) => all.indexOf(move) !== index)
      if (number === family.chapters.length && duplicateMoves.length) {
        actions.push({
          id: `${chapter.id}:warning:tm-conflict`,
          kind: 'warning',
          quality: 'inferred',
          text: `1회용 TM 충돌 가능성: ${[...new Set(duplicateMoves)].join(', ')}. 실제 TM 수량과 자력 습득 여부를 확인하세요.`,
        })
      }
    }

    for (const move of family.fieldMoves.filter((entry) => entry.unlockChapter === number)) {
      if (game.familyId === 'sinnoh8') {
        actions.push({
          id: `${chapter.id}:field:${move.id}`,
          kind: 'move',
          quality: 'verified',
          text: `배지 조건 충족 후 포켓치 비전기술 ${fieldMoveKo[move.id]} 사용 가능 · 파티 기술칸 불필요`,
        })
        continue
      }
      const owner = plan.members.find((member) => member.fieldMoves.includes(move.id))
      const ownerAvailable = owner && owner.availability.chapter <= number
      actions.push({
        id: `${chapter.id}:field:${move.id}`,
        kind: ownerAvailable ? 'move' : 'warning',
        memberDex: ownerAvailable ? owner.species.dex : undefined,
        quality: ownerAvailable ? 'inferred' : 'verified',
        text: ownerAvailable
          ? `${fieldMoveKo[move.id]} 획득 후 ${owner.species.name}에게 배정 후보`
          : owner
            ? `${fieldMoveKo[move.id]} 사용 구간 — 최종 담당 ${owner.species.name} 합류 전까지 임시 요원이 필요합니다.`
            : `${fieldMoveKo[move.id]} 사용 구간 — 파티 내 추정 호환자가 없어 임시 요원이 필요합니다.`,
      })
    }

    for (const member of plan.members.filter((entry) => entry.availability.chapter > number && entry.required)) {
      const bossHere = bosses.some((entry) => entry.chapter === number)
      if (bossHere) {
        actions.push({
          id: `${chapter.id}:late:${member.species.dex}`,
          kind: 'warning',
          memberDex: member.species.dex,
          quality: 'verified',
          text: `필수 멤버 ${member.species.name}은(는) ${member.availability.chapter}장 합류 예정입니다. 이 장의 보스전에는 임시 멤버를 유지하세요.`,
        })
      }
    }

    return { ...chapter, actions }
  })
}

export function roadmapReferencesAreAvailable(_game: GameConfig, plan: GeneratedPlan, roadmap: DynamicRoadmapChapter[]): boolean {
  return roadmap.every((chapter, index) => chapter.actions.every((action) => {
    if (!action.memberDex || action.kind === 'capture' || action.kind === 'warning') return true
    const member = plan.members.find((entry) => entry.species.dex === action.memberDex)
    return Boolean(member && (index + 1 >= member.availability.chapter))
  }))
}
