import { beforeAll, describe, expect, it } from 'vitest'
import { getAvailability, loadCatalog, speciesByDex, speciesCatalog } from './catalog'
import { canLearnFieldMove, generateParty, isMoveLegalForSpecies, moveExistsInGeneration, speciesTypes, validateRequired } from './engine'
import { families, games, getFamily, getGame } from './games'
import { getLegalMoves } from './learnsets'
import { composeRoadmap, roadmapReferencesAreAvailable } from './roadmap'
import { planProgressKey } from './storage'
import type { PlannerPreferences } from './types'

const defaults: PlannerPreferences = {
  noTrade: true,
  hmConvenience: true,
  allowLegendary: false,
  allowPostgame: false,
  favoriteWeight: 50,
}

beforeAll(async () => {
  await loadCatalog()
})

describe('지원 버전과 정적 카탈로그', () => {
  it('21개 버전과 8개 패밀리를 고유 ID로 로드한다', () => {
    expect(games).toHaveLength(21)
    expect(new Set(games.map((game) => game.id)).size).toBe(21)
    expect(Object.keys(families)).toHaveLength(8)
    for (const game of games) expect(getFamily(game).chapters.length).toBeGreaterThanOrEqual(8)
  })

  it('전국도감 1–649가 완전하고 참조가 유효하다', () => {
    expect(speciesCatalog).toHaveLength(649)
    expect(speciesCatalog[0].dex).toBe(1)
    expect(speciesCatalog[648].dex).toBe(649)
    expect(new Set(speciesCatalog.map((species) => species.id)).size).toBe(649)
    for (const species of speciesCatalog) {
      if (species.evolvesFrom) expect(speciesByDex.has(species.evolvesFrom)).toBe(true)
      expect(species.types.length).toBeGreaterThan(0)
    }
  })

  it('세대 당시 타입을 적용한다', () => {
    expect(speciesTypes(speciesByDex.get(35)!, 1)).toEqual(['normal'])
    expect(speciesTypes(speciesByDex.get(81)!, 1)).toEqual(['electric'])
    expect(speciesTypes(speciesByDex.get(282)!, 5)).toEqual(['psychic'])
  })
})

describe('획득 제약', () => {
  it('아직 존재하지 않거나 이벤트 전용인 포켓몬을 거부한다', () => {
    expect(getAvailability(speciesByDex.get(152)!, getGame('red')).obtainable).toBe(false)
    expect(getAvailability(speciesByDex.get(151)!, getGame('red')).obtainable).toBe(false)
  })

  it('통신교환 진화와 엔딩 후 제한을 검증한다', () => {
    const red = getGame('red')
    expect(validateRequired([65], red, defaults).errors.join(' ')).toContain('통신교환')
    expect(validateRequired([150], red, defaults).errors.join(' ')).toContain('엔딩 후')
  })

  it('긴 루트 번호를 앞자리 루트의 챕터로 오인하지 않는다', () => {
    const red = getGame('red')
    expect(getAvailability(speciesByDex.get(17)!, red).chapter).toBe(5)
    expect(getAvailability(speciesByDex.get(84)!, red).chapter).toBe(5)
  })

  it('상호 배타 스타터를 동시에 허용하지 않는다', () => {
    expect(validateRequired([1, 4], getGame('red'), defaults).errors.join(' ')).toContain('동시에 선택')
  })
})

describe('결정론 추천 엔진', () => {
  it.each([
    ['red', 1], ['crystal', 158], ['emerald', 252], ['firered', 4],
    ['platinum', 393], ['heartgold', 152], ['black', 501], ['black-2', 495],
  ] as const)('%s 대표 입력에서 고유한 6인 파티를 만든다', (gameId, starterDex) => {
    const game = getGame(gameId)
    const first = generateParty(game, defaults, { requiredDexes: [starterDex] })
    const second = generateParty(game, defaults, { requiredDexes: [starterDex] })
    expect(first.members.map((member) => member.species.dex)).toEqual(second.members.map((member) => member.species.dex))
    expect(first.members).toHaveLength(6)
    expect(new Set(first.members.map((member) => member.species.dex)).size).toBe(6)
    expect(first.members.some((member) => member.species.dex === starterDex && member.required)).toBe(true)
  })

  it('필수 및 잠금 멤버를 재생성에서도 유지한다', () => {
    const game = getGame('emerald')
    const first = generateParty(game, defaults, { requiredDexes: [252] })
    const locked = first.members[1].species.dex
    const next = generateParty(game, defaults, {
      requiredDexes: [252],
      lockedDexes: [locked],
      previousMembers: first.members.map((member) => member.species.dex),
      variant: 1,
    })
    expect(next.members.map((member) => member.species.dex)).toEqual(expect.arrayContaining([252, locked]))
  })

  it('파티는 같은 진화 계열을 중복 추천하지 않는다', () => {
    const plan = generateParty(getGame('white'), defaults, { requiredDexes: [501] })
    expect(new Set(plan.members.map((member) => member.species.chainId)).size).toBe(plan.members.length)
  })

  it('필드기 배정 뒤에도 각 멤버의 기술 이름이 중복되지 않는다', () => {
    const plan = generateParty(getGame('red'), defaults, { requiredDexes: [17] })
    for (const member of plan.members) {
      expect(new Set(member.moves.map((move) => move.name)).size).toBe(member.moves.length)
    }
  })

  it('모든 버전의 생성 기술이 해당 세대까지 실제로 존재한다', () => {
    for (const game of games) {
      const plan = generateParty(game, defaults, { requiredDexes: [game.starters[0]] })
      for (const member of plan.members) {
        expect(member.moves).toHaveLength(4)
        expect(member.moves.every((move) => moveExistsInGeneration(move.id, game.generation))).toBe(true)
        expect(member.moves.every((move) => isMoveLegalForSpecies(member.species, game, move.id))).toBe(true)
        expect(member.moves.map((move) => move.quality)).not.toContain('review')
      }
    }
  }, 20_000)

  it('1세대 기술의 당시 타입 변경 이력을 적용한다', () => {
    const bite = getLegalMoves(speciesByDex.get(58)!, getGame('red')).find((move) => move.id === 'bite')
    expect(bite?.type).toBe('normal')
  })

  it('1세대에서는 후대 타입 기술과 방어를 제안하지 않는다', () => {
    const forbidden = new Set(['에너지볼', '얼음뭉치', '깨트리기', '오물폭탄', '진흙뿌리기', '제비반환', '벌레먹음', '시그널빔', '섀도볼', '드래곤클로', '아이언헤드', '방어'])
    const starters = { grass: 1, ice: 124, fighting: 106, poison: 23, ground: 27, flying: 16, bug: 10, ghost: 92, dragon: 147 }
    for (const [challengeType, starterDex] of Object.entries(starters)) {
      const plan = generateParty(getGame('red'), { ...defaults, allowPostgame: true }, { requiredDexes: [starterDex], challengeType })
      expect(plan.members.flatMap((member) => member.moves).every((move) => !forbidden.has(move.name))).toBe(true)
    }
  })

  it('버전별 필드기만 평가하고 지그제구리 괴력 예외를 지킨다', () => {
    const emerald = getGame('emerald')
    const strength = getFamily(emerald).fieldMoves.find((move) => move.id === 'strength')!
    expect(canLearnFieldMove(speciesByDex.get(263)!, strength)).toBe(false)
    expect(canLearnFieldMove(speciesByDex.get(264)!, strength)).toBe(true)
    expect(getFamily(getGame('black')).fieldMoves.map((move) => move.id)).not.toContain('rock-smash')
  })
})

describe('세대별 단일 타입 챌린지', () => {
  it.each([
    ['red', 'water', 7],
    ['crystal', 'normal', 19],
    ['emerald', 'ground', 111],
    ['platinum', 'flying', 396],
    ['black-2', 'dark', 509],
  ] as const)('%s의 %s 파티는 모든 멤버가 선택 타입을 공유한다', (gameId, challengeType, starterDex) => {
    const game = getGame(gameId)
    const first = generateParty(game, defaults, { requiredDexes: [starterDex], challengeType })
    const second = generateParty(game, defaults, { requiredDexes: [starterDex], challengeType })
    expect(first.members.map((member) => member.species.dex)).toEqual(second.members.map((member) => member.species.dex))
    expect(first.members.length).toBeGreaterThan(0)
    expect(first.members.length).toBeLessThanOrEqual(6)
    expect(first.members.every((member) => speciesTypes(member.species, game.generation).includes(challengeType))).toBe(true)
    expect(first.challengeType).toBe(challengeType)
    expect(first.members[0]).toMatchObject({
      challengeStarter: true,
      availability: { chapter: 1, level: 'Lv.5', sourceKind: 'starter' },
    })
  })

  it('선택 타입과 맞지 않는 필수 멤버를 명시적으로 거부한다', () => {
    expect(validateRequired([1], getGame('red'), defaults, 'water').errors.join(' ')).toContain('타입 챌린지 조건')
  })

  it('일반 플랜과 타입 챌린지의 저장 ID를 분리한다', () => {
    const game = getGame('red')
    const balanced = generateParty(game, defaults, { requiredDexes: [7] })
    const monotype = generateParty(game, defaults, { requiredDexes: [7], challengeType: 'water' })
    expect(balanced.id).not.toBe(monotype.id)
  })

  it('버전 미등장·교환진화 포켓몬도 같은 세대와 타입이면 개조 스타팅으로 허용한다', () => {
    const red = getGame('red')
    const versionExclusive = generateParty(red, defaults, { requiredDexes: [37], challengeType: 'fire' })
    const tradeEvolution = generateParty(red, defaults, { requiredDexes: [94], challengeType: 'ghost' })
    expect(versionExclusive.members[0].availability.location).toContain('데이터 수정 스타팅')
    expect(tradeEvolution.members[0].availability.tradeRequired).toBe(false)
    expect(tradeEvolution.members[0].availability.chapter).toBe(1)
  })

  it('개조 스타팅을 고르지 않은 타입 챌린지는 생성하지 않는다', () => {
    expect(validateRequired([], getGame('red'), defaults, 'water').errors.join(' ')).toContain('스타팅 포켓몬')
  })
})

describe('동적 로드맵과 저장 격리', () => {
  it('선택 파티의 합류 이후 멤버만 액션에서 참조한다', () => {
    const game = getGame('platinum')
    const plan = generateParty(game, defaults, { requiredDexes: [393] })
    const roadmap = composeRoadmap(game, plan)
    expect(roadmapReferencesAreAvailable(game, plan, roadmap)).toBe(true)
    expect(roadmap.flatMap((chapter) => chapter.actions).some((action) => action.kind === 'boss')).toBe(true)
  })

  it('버전과 플랜별 진행 키를 분리한다', () => {
    expect(planProgressKey('red', 'a')).not.toBe(planProgressKey('blue', 'a'))
    expect(planProgressKey('red', 'a')).not.toBe(planProgressKey('red', 'b'))
  })

  it('타입 챌린지 규칙과 같은 타입의 임시 대응만 로드맵에 사용한다', () => {
    const game = getGame('emerald')
    const plan = generateParty(game, defaults, { requiredDexes: [111], challengeType: 'ground' })
    const roadmap = composeRoadmap(game, plan)
    expect(roadmap[0].actions.some((action) => action.id.includes(':challenge:ground'))).toBe(true)
    expect(roadmapReferencesAreAvailable(game, plan, roadmap)).toBe(true)
  })
})
