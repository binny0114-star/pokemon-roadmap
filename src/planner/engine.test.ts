import { beforeAll, describe, expect, it } from 'vitest'
import { generationLineage, getAvailability, loadCatalog, speciesByDex, speciesCatalog } from './catalog'
import { canLearnFieldMove, effectiveChapter, generatedMoves, generateParty, isMoveLegalForSpecies, moveExistsInGeneration, speciesTypes, validateRequired } from './engine'
import { families, games, getFamily, getGame } from './games'
import { getLegalMoves } from './learnsets'
import { composeRoadmap, roadmapReferencesAreAvailable } from './roadmap'
import { mergePlanProgress, planProgressKey, reconcilePlanProgress } from './storage'
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
    expect(getAvailability(speciesByDex.get(132)!, red).chapter).toBe(5)
    expect(getAvailability(speciesByDex.get(84)!, red).chapter).toBe(5)
  })

  it('야생 진화형보다 빠른 진화 전 형태가 있으면 실제 최종 진화 시점을 비교한다', () => {
    const pidgeotto = getAvailability(speciesByDex.get(17)!, getGame('red'))
    expect(pidgeotto).toMatchObject({
      chapter: 1,
      finalChapter: 3,
      location: '1번도로',
      sourceSpeciesName: '구구',
    })
  })

  it('레드의 3번도로를 달맞이산보다 먼저 배치한다', () => {
    const red = getGame('red')
    const jigglypuff = getAvailability(speciesByDex.get(39)!, red)
    const clefable = getAvailability(speciesByDex.get(36)!, red)

    expect(jigglypuff.location).toBe('3번도로')
    expect(clefable.location).toBe('달맞이산')
    expect(jigglypuff.chapter).toBe(2)
    expect(clefable.chapter).toBe(2)
    expect(jigglypuff.storyOrder).toBeLessThan(clefable.storyOrder)
  })

  it('엔딩 후 진화형 직접 조우보다 엔딩 전 진화 계열을 우선한다', () => {
    const red = getGame('red')
    const wigglytuff = getAvailability(speciesByDex.get(40)!, red)
    const chansey = getAvailability(speciesByDex.get(113)!, red)

    expect(wigglytuff).toMatchObject({
      location: '3번도로',
      chapter: 2,
      postgameOnly: false,
      sourceKind: 'evolution',
    })
    expect(chansey).toMatchObject({
      location: '사파리존',
      chapter: 5,
      postgameOnly: false,
    })
  })

  it('블루시티동굴 전용 포켓몬은 엔딩 후로 분류한다', () => {
    const mewtwo = getAvailability(speciesByDex.get(150)!, getGame('red'))

    expect(mewtwo).toMatchObject({
      location: '블루시티동굴',
      chapter: 9,
      preChampion: false,
      postgameOnly: true,
    })
  })

  it('레드의 진화 안내에서 후세대 베이비 포켓몬을 제외한다', () => {
    const red = getGame('red')
    const plan = generateParty(red, defaults, { requiredDexes: [40, 36, 26, 113] })
    const actions = composeRoadmap(red, plan).flatMap((chapter) => chapter.actions.map((action) => action.text))

    expect(actions.join(' ')).not.toMatch(/푸푸린|피츄|핑복/)
    expect(actions.some((text) => text.startsWith('삐 →'))).toBe(false)
    expect(actions.some((text) => text.includes('푸린') && text.includes('푸크린 진화'))).toBe(true)
  })

  it('조우 방식 해금 전의 이른 장소를 입수 시기로 오인하지 않는다', () => {
    const fireRedPoliwrath = getAvailability(speciesByDex.get(62)!, getGame('firered'))
    expect(fireRedPoliwrath).toMatchObject({
      chapter: 5,
      location: '연분홍시티',
      method: '좋은낚싯대',
      sourceSpeciesName: '발챙이',
      postgameOnly: false,
    })

    expect(getAvailability(speciesByDex.get(60)!, getGame('gold'))).toMatchObject({
      chapter: 2,
      method: '낡은낚싯대',
    })
    expect(getAvailability(speciesByDex.get(299)!, getGame('ruby'))).toMatchObject({
      chapter: 3,
      method: '바위깨기',
    })
  })

  it('후반 해금·외부 카트리지 조건을 기본 입수 경로로 사용하지 않는다', () => {
    expect(getAvailability(speciesByDex.get(29)!, getGame('diamond'))).toMatchObject({
      postgameOnly: true,
      method: '풀숲·동굴 · 포켓트레',
    })
    expect(getAvailability(speciesByDex.get(10)!, getGame('diamond'))).toMatchObject({
      obtainable: false,
      sourceKind: 'unknown',
    })
    expect(getAvailability(speciesByDex.get(263)!, getGame('heartgold')).postgameOnly).toBe(true)
    expect(getAvailability(speciesByDex.get(60)!, getGame('black')).postgameOnly).toBe(true)
    expect(getAvailability(speciesByDex.get(39)!, getGame('black-2')).postgameOnly).toBe(true)
  })

  it('진화 도구와 장소가 열리기 전에 최종 진화형을 사용하지 않는다', () => {
    expect(effectiveChapter(speciesByDex.get(26)!, getGame('red'))).toBe(4)
    expect(effectiveChapter(speciesByDex.get(470)!, getGame('diamond'))).toBeGreaterThanOrEqual(2)
    expect(effectiveChapter(speciesByDex.get(471)!, getGame('diamond'))).toBeGreaterThanOrEqual(6)
    expect(effectiveChapter(speciesByDex.get(470)!, getGame('black-2'))).toBe(9)
  })

  it('버전 안에서 불가능한 진화는 다른 버전 교환이 필요하다고 표시한다', () => {
    expect(validateRequired([26], getGame('yellow'), defaults).errors.join(' ')).toContain('통신교환')
    expect(validateRequired([196], getGame('firered'), defaults).errors.join(' ')).toContain('통신교환')
    expect(validateRequired([462], getGame('heartgold'), defaults).errors.join(' ')).toContain('통신교환')
    expect(getAvailability(speciesByDex.get(470)!, getGame('black-2')).postgameOnly).toBe(true)
  })

  it('배포 장소와 다른 지방의 오염된 조우를 일반 입수로 사용하지 않는다', () => {
    expect(getAvailability(speciesByDex.get(386)!, getGame('emerald')).obtainable).toBe(false)
    expect(getAvailability(speciesByDex.get(491)!, getGame('diamond')).obtainable).toBe(false)
    expect(getAvailability(speciesByDex.get(494)!, getGame('black')).obtainable).toBe(false)
    expect(getAvailability(speciesByDex.get(380)!, getGame('ruby')).obtainable).toBe(false)
    expect(getAvailability(speciesByDex.get(101)!, getGame('ruby')).location).toBe('뉴보라')
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
  })

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

  it('파이어레드 갸라도스의 난동부리기는 2섬 이후에만 안내한다', () => {
    const thrash = generatedMoves(speciesByDex.get(130)!, getGame('firered'))
      .find((move) => move.name === '난동부리기')
    expect(thrash?.availableChapter).toBe(7)
    expect(thrash?.source).toBe('2섬 기술 떠올리기 · 작은버섯 2개 또는 큰버섯 1개')
  })

  it('기술 떠올리기가 없는 1·2세대에는 떠올리기 전용 기술을 제안하지 않는다', () => {
    for (const gameId of ['red', 'crystal'] as const) {
      const moves = generatedMoves(speciesByDex.get(130)!, getGame(gameId))
      expect(moves.some((move) => move.source.includes('기술 떠올리기'))).toBe(false)
      expect(moves.some((move) => move.name === '난동부리기')).toBe(false)
    }
    expect(generatedMoves(speciesByDex.get(25)!, getGame('red')).some((move) => move.name === '전기쇼크')).toBe(true)
    expect(generatedMoves(speciesByDex.get(169)!, getGame('crystal')).some((move) => move.name === '싫은소리')).toBe(false)
    expect(generatedMoves(speciesByDex.get(51)!, getGame('crystal')).some((move) => move.name === '트라이어택')).toBe(true)
  })

  it('자연 습득과 개조 스타팅의 Lv.1 기술을 기술 떠올리기로 오인하지 않는다', () => {
    const venusaurMoves = generatedMoves(speciesByDex.get(3)!, getGame('firered'))
    const vineWhip = venusaurMoves.find((move) => move.name === '덩굴채찍')
    expect(vineWhip?.source).toContain('이상해씨 Lv.10')
    expect(vineWhip?.availableChapter).toBeLessThan(7)

    const starterMoves = generatedMoves(speciesByDex.get(94)!, getGame('red'), 1, false)
    expect(starterMoves.some((move) => move.availableChapter === 1)).toBe(true)
    expect(starterMoves.some((move) => move.source.includes('Lv.1 기술 목록'))).toBe(true)
  })

  it('진화 시점을 지난 진화 전 자력기를 조건 없이 유지한다고 안내하지 않는다', () => {
    const charizardMoves = generatedMoves(speciesByDex.get(6)!, getGame('firered'))
    const flamethrower = charizardMoves.find((move) => move.name === '화염방사')
    expect(flamethrower?.source).toContain('리자드 Lv.34')
    expect(flamethrower?.source).not.toContain('파이리 Lv.31')
    const shedinjaMoves = generatedMoves(speciesByDex.get(292)!, getGame('emerald'))
    expect(shedinjaMoves.some((move) => move.source.includes('토중몬 Lv.38') || move.source.includes('토중몬 Lv.45'))).toBe(false)

    for (const game of games) {
      for (const species of speciesCatalog.filter((entry) => entry.generation <= game.generation)) {
        const lineage = generationLineage(species, game.generation)
        for (const move of generatedMoves(species, game)) {
          const match = move.source.match(/^(.+) Lv\.(\d+) 자력 습득 후 유지$/)
          if (!match) continue
          const learnedByIndex = lineage.findIndex((stage) => stage.name === match[1])
          const nextStage = lineage[learnedByIndex + 1]
          const evolutionLevel = nextStage?.evolution?.minLevel
            ?? (nextStage?.evolution?.trigger === 'shed'
              ? speciesCatalog.find((candidate) =>
                  candidate.evolvesFrom === nextStage.evolvesFrom
                  && candidate.evolution?.trigger === 'level-up',
                )?.evolution?.minLevel
              : null)
          if (!evolutionLevel) continue
          expect(Number(match[2]), `${game.id} ${species.name} ${move.name}`)
            .toBeLessThanOrEqual(evolutionLevel)
        }
      }
    }
  })

  it('모든 버전과 포켓몬에서 기술 떠올리기 해금 시점을 지킨다', () => {
    for (const game of games) {
      const reminder = getFamily(game).moveReminder
      let reminderMoveCount = 0
      for (const species of speciesCatalog.filter((entry) => entry.generation <= game.generation)) {
        const reminderMoves = generatedMoves(species, game)
          .filter((move) => move.source.includes('기술 떠올리기'))
        if (!reminder) {
          expect(reminderMoves, `${game.id} #${species.dex}`).toEqual([])
          continue
        }
        reminderMoveCount += reminderMoves.length
        expect(
          reminderMoves.every((move) => (
            move.availableChapter >= reminder.chapter
            && move.source.includes(reminder.location)
            && move.source.includes(reminder.cost)
          )),
          `${game.id} #${species.dex}`,
        ).toBe(true)
      }
      if (reminder) expect(reminderMoveCount, game.id).toBeGreaterThan(0)
    }
  })

  it('버전별 필드기만 평가하고 지그제구리 괴력 예외를 지킨다', () => {
    const emerald = getGame('emerald')
    const strength = getFamily(emerald).fieldMoves.find((move) => move.id === 'strength')!
    expect(canLearnFieldMove(speciesByDex.get(263)!, strength)).toBe(false)
    expect(canLearnFieldMove(speciesByDex.get(264)!, strength)).toBe(true)
    expect(getFamily(getGame('black')).fieldMoves.map((move) => move.id)).not.toContain('rock-smash')
  }, 20_000)
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

  it('액션이 다른 장으로 이동해도 기존 완료 상태를 이어받는다', () => {
    const saved = new Set([
      'kan-2:move:130:난동부리기',
      'kan-1:capture:130',
      'removed:move:130:삭제된기술',
    ])
    const reconciled = reconcilePlanProgress(saved, [
      'kan-7:move:130:난동부리기',
      'kan-5:capture:130',
      'kan-8:boss:champion-k',
    ])

    expect(reconciled).toEqual(new Set([
      'kan-7:move:130:난동부리기',
      'kan-5:capture:130',
    ]))
  })

  it('장마다 반복되는 늦은 합류 경고의 완료 상태는 합치지 않는다', () => {
    const reconciled = reconcilePlanProgress(
      new Set(['joh-1:late:130']),
      ['joh-1:late:130', 'joh-2:late:130'],
    )
    expect(reconciled).toEqual(new Set(['joh-1:late:130']))
  })

  it('현재 로드맵에 없는 대체 액션 진행률은 저장할 때 보존한다', () => {
    const merged = mergePlanProgress(
      new Set(['kan-2:move:130:난동부리기', 'kan-1:late:130']),
      ['kan-7:move:130:난동부리기', 'kan-5:capture:130'],
      new Set(['kan-7:move:130:난동부리기']),
    )
    expect(merged).toEqual(new Set([
      'kan-1:late:130',
      'kan-7:move:130:난동부리기',
    ]))
  })

  it('타입 챌린지 규칙과 같은 타입의 임시 대응만 로드맵에 사용한다', () => {
    const game = getGame('emerald')
    const plan = generateParty(game, defaults, { requiredDexes: [111], challengeType: 'ground' })
    const roadmap = composeRoadmap(game, plan)
    expect(roadmap[0].actions.some((action) => action.id.includes(':challenge:ground'))).toBe(true)
    expect(roadmapReferencesAreAvailable(game, plan, roadmap)).toBe(true)
  })

  it('이미 선택한 스타터·화석과 양립할 수 없는 임시 카운터를 추천하지 않는다', () => {
    for (const game of games) {
      for (const choiceDex of [...game.starters, ...game.fossils.flat()]) {
        const preferences = { ...defaults, allowPostgame: true, allowLegendary: true }
        const validation = validateRequired([choiceDex], game, preferences, null)
        if (validation.errors.length) continue
        const plan = generateParty(game, preferences, { requiredDexes: [choiceDex] })
        const selectedGroups = new Set(
          plan.members
            .map((member) => getAvailability(member.species, game).mutuallyExclusiveGroup)
            .filter(Boolean),
        )
        const forbiddenNames = speciesCatalog
          .filter((species) => {
            const group = getAvailability(species, game).mutuallyExclusiveGroup
            return group && selectedGroups.has(group) && !plan.members.some((member) => member.species.chainId === species.chainId)
          }, 20_000)
          .map((species) => species.name)
        const roadmapText = composeRoadmap(game, plan)
          .flatMap((chapter) => chapter.actions.map((action) => action.text))
          .join('\n')
        for (const name of forbiddenNames) {
          expect(roadmapText, `${game.id} #${choiceDex} -> ${name}`)
            .not.toContain(`${name}(`)
        }
      }
    }
  }, 20_000)

  it('개조 스타팅은 원래 스타터 선택만 소비하고 해당 포켓몬의 자연 입수 선택지는 소비하지 않는다', () => {
    const game = getGame('ruby')
    const plan = generateParty(
      game,
      defaults,
      { requiredDexes: [347], challengeType: 'rock' },
    )
    const roadmapText = composeRoadmap(game, plan)
      .flatMap((chapter) => chapter.actions.map((action) => action.text))
      .join('\n')
    expect(roadmapText).toContain('릴링(')
    for (const starterDex of game.starters) {
      expect(roadmapText).not.toContain(`${speciesByDex.get(starterDex)!.name}(`)
    }
  })
})
