import { generationLineage, getAvailability, speciesCatalog } from './catalog'
import { effectiveChapter, evolutionText, fieldMoveKo, speciesTypes, typeKo } from './engine'
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
  const candidate = speciesCatalog
    .filter((species) => !ownedChains.has(species.chainId))
    .filter((species) => {
      const availability = getAvailability(species, game)
      return availability.obtainable && !availability.postgameOnly && availability.chapter <= chapter && !availability.tradeRequired
    })
    .filter((species) => !challengeType || speciesTypes(species, game.generation).includes(challengeType))
    .filter((species) => speciesTypes(species, game.generation).some((type) => bossTypes.some((bossType) => isStrongAgainst(type, bossType))))
    .sort((a, b) => getAvailability(a, game).chapter - getAvailability(b, game).chapter || a.dex - b.dex)[0]
  if (!candidate) return null
  const availability = getAvailability(candidate, game)
  return `${candidate.name}(${availability.location}) 같은 ${speciesTypes(candidate, game.generation).map((type) => typeKo[type]).join('/')} ${challengeType ? '챌린지 내 ' : ''}임시 카운터를 고려하세요.`
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
      (a, b) => a.availability.storyOrder - b.availability.storyOrder || a.species.dex - b.species.dex,
    )
    for (const member of chronologicalMembers) {
      if (member.availability.chapter === number) {
        actions.push({
          id: `${chapter.id}:capture:${member.species.dex}`,
          kind: 'capture',
          memberDex: member.species.dex,
          quality: member.availability.quality,
          text: member.challengeStarter
            ? `${member.species.name} 스타팅 합류 — 시작 데이터의 포켓몬을 직접 교체, Lv.5`
            : member.availability.sourceSpeciesName
              ? `${member.species.name} 준비 — ${member.availability.sourceSpeciesName} 포획: ${member.availability.location}${member.availability.method ? ` · ${member.availability.method}` : ''}, ${member.availability.level}`
              : `${member.species.name} 합류 — ${member.availability.location}${member.availability.method ? ` · ${member.availability.method}` : ''}, ${member.availability.level}`,
        })
      }
      if (member.availability.sourceSpeciesName) {
        for (const stage of generationLineage(member.species, game.generation).slice(1)) {
          const evolutionAt = effectiveChapter(stage, game)
          if (evolutionAt !== number || evolutionAt < member.availability.chapter) continue
          const parent = stage.evolvesFrom ? speciesCatalog.find((species) => species.dex === stage.evolvesFrom) : undefined
          actions.push({
            id: `${chapter.id}:evolve:${stage.dex}`,
            kind: 'evolution',
            memberDex: member.species.dex,
            quality: stage.evolution?.trigger ? 'verified' : 'inferred',
            text: `${parent?.name ?? '진화 전 형태'} → ${evolutionText(stage, game)}`,
          })
        }
      }
      for (const move of member.moves.filter((entry) => entry.availableChapter === number)) {
        actions.push({
          id: `${chapter.id}:move:${member.species.dex}:${move.name}`,
          kind: 'move',
          memberDex: member.species.dex,
          quality: move.quality,
          text: `${member.species.name}: ${move.name} (${typeKo[move.type] ?? move.type}·${move.category}) — ${move.source}`,
        })
      }
    }

    for (const boss of bosses.filter((entry) => entry.chapter === number)) {
      const counters = plan.members.filter((member) =>
        stageAtChapter(member, game, number)
        && member.moves.some((move) =>
          move.availableChapter <= number
          && boss.types.some((bossType) => isStrongAgainst(move.type, bossType)),
        ),
      )
      const counterText = counters.length
        ? counters.map((member) => {
            const move = member.moves.find((entry) => entry.availableChapter <= number && boss.types.some((type) => isStrongAgainst(entry.type, type)))
            const stage = stageAtChapter(member, game, number)
            return `${stage?.name ?? member.species.name}${move ? `의 ${move.name}` : ''}`
          }).join(', ')
        : temporaryCounter(game, boss.types, number, plan.members, plan.challengeType) ?? '직접 약점 공략 수단이 부족하므로 레벨 우위와 상태이상을 활용하세요.'
      actions.push({
        id: `${chapter.id}:boss:${boss.id}`,
        kind: 'boss',
        quality: counters.length ? (counters.some((member) => member.moves.some((move) => move.quality !== 'verified')) ? 'inferred' : 'verified') : 'inferred',
        text: `${boss.title} ${boss.name} (${boss.types.map((type) => typeKo[type] ?? type).join('/')}·${boss.level}) — ${counterText}`,
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
