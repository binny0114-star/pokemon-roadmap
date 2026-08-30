import type { GameGuide, PartyPlan } from './types'

export function getPlan(guide: GameGuide, planId: string): PartyPlan {
  return guide.plans.find((plan) => plan.id === planId) ?? guide.plans[0]
}

export function validateGuide(guide: GameGuide): string[] {
  const errors: string[] = []
  const allIds: string[] = []

  for (const plan of guide.plans) {
    if (plan.members.length !== 6) {
      errors.push(`${guide.id}/${plan.id}: 파티는 6마리여야 합니다.`)
    }
    if (new Set(plan.members.map((member) => member.id)).size !== 6) {
      errors.push(`${guide.id}/${plan.id}: 파티 멤버가 중복됩니다.`)
    }
    for (const member of plan.members) {
      if (member.moves.length !== 4) {
        errors.push(`${guide.id}/${plan.id}/${member.id}: 기술은 4개여야 합니다.`)
      }
    }
  }

  for (const chapter of guide.chapters) {
    allIds.push(chapter.id, ...chapter.objectives.map((item) => item.id))
  }
  if (new Set(allIds).size !== allIds.length) {
    errors.push(`${guide.id}: 로드맵/체크리스트 ID가 중복됩니다.`)
  }

  const memberIds = new Set(guide.plans.flatMap((plan) => plan.members.map((member) => member.id)))
  for (const boss of guide.bosses) {
    if (boss.recommendedMemberIds.some((id) => !memberIds.has(id))) {
      errors.push(`${guide.id}/${boss.id}: 존재하지 않는 파티 멤버를 추천합니다.`)
    }
  }

  if (guide.hmConveniencePromised) {
    const primary = getPlan(guide, guide.defaultPlanId)
    const covered = new Set(primary.members.flatMap((member) => member.moves.flatMap((move) => (move.hm ? [move.hm] : []))))
    for (const hm of guide.requiredHms) {
      if (!covered.has(hm)) {
        errors.push(`${guide.id}: 편의성 프리셋에 ${hm} 커버가 없습니다.`)
      }
    }
  }

  return errors
}

export function assertGuides(guides: GameGuide[]): void {
  const errors = guides.flatMap(validateGuide)
  if (errors.length) {
    throw new Error(`가이드 데이터 오류:\n${errors.join('\n')}`)
  }
}
