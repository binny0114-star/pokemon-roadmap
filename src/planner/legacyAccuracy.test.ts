import { beforeAll, describe, expect, it } from 'vitest'
import { encounterMethodUnlockChapter, evolutionText, getAvailability, loadCatalog, speciesByDex, speciesCatalog } from './catalog'
import { canLearnFieldMove, generatedMoves, generateParty, validateRequired } from './engine'
import { games, getFamily, getGame } from './games'
import { loadLearnsets } from './learnsets'
import { composeRoadmap } from './roadmap'
import type { PlannerPreferences } from './types'

const defaults: PlannerPreferences = {
  noTrade: true,
  hmConvenience: true,
  allowLegendary: false,
  allowPostgame: false,
  favoriteWeight: 50,
}
const species = (dex: number) => speciesByDex.get(dex)!

describe('1–5세대 정확도 회귀', () => {
  beforeAll(async () => {
    await Promise.all([loadCatalog(), loadLearnsets()])
  }, 120_000)

  it('파이어레드 전기 단일 챌린지를 원작 진행에 맞춰 만든다', () => {
    const game = getGame('firered')
    const plan = generateParty(game, defaults, { requiredDexes: [25], challengeType: 'electric' })
    const member = (dex: number) => plan.members.find((entry) => entry.species.dex === dex)!
    // 무인발전소는 파도타기(독수의 핑크배지 이후)로만 갈 수 있고 공식 한국어 이름을 씁니다.
    expect(member(82).availability).toMatchObject({ chapter: 6, location: '무인발전소' })
    expect(member(125).availability).toMatchObject({ chapter: 6, location: '무인발전소' })
    // 찌리리공은 10번도로 풀숲(4장)에서도 나옵니다.
    expect(member(101).availability).toMatchObject({ chapter: 4, location: '10번도로' })
    // 피츄·에레키드는 파이어레드 스토리에서 얻을 수 없어 그 진화 조건을 안내하지 않습니다.
    expect(evolutionText(species(25), game)).toBe('진화 전 단계(피츄)를 이 버전에서 얻을 수 없음')
    expect(evolutionText(species(125), game)).toBe('진화 전 단계(에레키드)를 이 버전에서 얻을 수 없음')
    // 바로 잡은 에레브는 에레키드 기술을, 야생 피카츄 계열은 피츄 기술을 쓰지 않습니다.
    expect(plan.members.flatMap((entry) => entry.moves).some((move) => /에레키드|피츄/.test(move.source))).toBe(false)
    // Lv.25 이브이를 쥬피썬더로 진화시키면 Lv.16 전기쇼크는 2의 섬 기술 떠올리기로만 배웁니다.
    const thunderShock = member(135).moves.find((move) => move.id === 'thunder-shock')
    expect(thunderShock).toMatchObject({ availableChapter: 7 })
    expect(thunderShock?.source).toContain('2의 섬 기술 떠올리기')
    // 4장에 진화시킨 쥬피썬더가 이브이 Lv.42 돌진을 유지한다고 하지 않습니다.
    expect(member(135).moves.some((move) => move.source.includes('이브이 Lv.42'))).toBe(false)
    // 빛의장막·전기자석파는 변화 기술이며 보스 약점 공략 수단이 아닙니다.
    const statusMoves = plan.members.flatMap((entry) => entry.moves).filter((move) => ['light-screen', 'thunder-wave'].includes(move.id))
    expect(statusMoves.length).toBeGreaterThan(0)
    expect(statusMoves.every((move) => move.category === '변화')).toBe(true)
    const roadmapText = composeRoadmap(game, plan).flatMap((chapter) => chapter.actions.map((action) => action.text)).join('\n')
    expect(roadmapText.split('\n').filter((line) => line.includes('사천왕') || line.includes('체육관'))
      .some((line) => /의 (빛의장막|전기자석파)/.test(line))).toBe(false)
    // 자력기는 1회용 TM이 아니므로 TM 충돌 경고를 띄우지 않습니다.
    expect(roadmapText).not.toContain('1회용 TM')
    // 파이어레드 피카츄·에레브는 플래시·바위깨기를 배울 수 있으므로 이 둘을 부족 필드기로 경고하지 않습니다.
    expect(plan.warnings.join(' ')).not.toMatch(/필드기 추정 커버가 부족합니다: [^.]*(플래시|바위깨기)/)
  })

  it('필드기 호환을 위력과 관계없이 싣고 플래시는 노말 변화 기술로 다룬다', () => {
    const fireRed = getGame('firered')
    const flash = getFamily(fireRed).fieldMoves.find((move) => move.id === 'flash')!
    const rockSmash = getFamily(fireRed).fieldMoves.find((move) => move.id === 'rock-smash')!
    expect(flash.type).toBe('normal')
    expect(canLearnFieldMove(species(25), flash, fireRed)).toBe(true)
    expect(canLearnFieldMove(species(25), rockSmash, fireRed)).toBe(true)
    expect(canLearnFieldMove(species(81), flash, fireRed)).toBe(true)
    // 바위깨기는 강연 격파 뒤 1섬 불꽃온천에서 받으므로 마지막 장입니다.
    expect(rockSmash.unlockChapter).toBe(8)
    const whirlpool = getFamily(getGame('crystal')).fieldMoves.find((move) => move.id === 'whirlpool')!
    expect(canLearnFieldMove(species(130), whirlpool, getGame('crystal'))).toBe(true)
  })

  it('파도타기·바위깨기·다이빙은 배지를 주는 관장 다음 장부터 조우에 쓴다', () => {
    // 관동 파도타기(핑크배지), 파이어레드 바위깨기(강연 뒤 1섬), 성도 파도타기(팬텀배지),
    // 호연 파도타기(밸런스배지)·바위깨기(다이나모배지)·다이빙(마인드배지), 신오 바위깨기(콜배지)
    expect(encounterMethodUnlockChapter(getGame('red'), 'surf')).toBe(6)
    expect(encounterMethodUnlockChapter(getGame('firered'), 'surf')).toBe(6)
    expect(encounterMethodUnlockChapter(getGame('firered'), 'rock-smash')).toBe(8)
    expect(encounterMethodUnlockChapter(getGame('crystal'), 'surf')).toBe(5)
    expect(encounterMethodUnlockChapter(getGame('ruby'), 'surf')).toBe(6)
    expect(encounterMethodUnlockChapter(getGame('ruby'), 'rock-smash')).toBe(4)
    expect(encounterMethodUnlockChapter(getGame('ruby'), 'seaweed')).toBe(9)
    expect(encounterMethodUnlockChapter(getGame('diamond'), 'rock-smash')).toBe(2)
    expect(getAvailability(species(299), getGame('ruby')).chapter).toBe(4)
  })

  it('스토리 장 목록에 없는 장소를 야생 레벨로 이른 장에 두지 않는다', () => {
    // 금·은·크리스탈의 관동은 엔딩 후이지만 성도 26·27번도로와 챔피언로드는 본편입니다.
    expect(getAvailability(species(51), getGame('crystal')).postgameOnly).toBe(true)
    const tohjoOnly = speciesCatalog.find((entry) => (entry.encounters['6'] ?? []).length > 0
      && (entry.encounters['6'] ?? []).every((encounter) => /^kanto-route-2[67]$|^kanto-victory-road-1$/.test(encounter.location)))
    if (tohjoOnly) expect(getAvailability(tohjoOnly, getGame('crystal')).postgameOnly).toBe(false)
    // 에메랄드 뉴보라는 파도타기 이후, 블랙·화이트 1번도로 강 건너 진한 풀숲은 1장이 아닙니다.
    expect(getAvailability(species(81), getGame('emerald')).chapter).toBeGreaterThanOrEqual(6)
    expect(getAvailability(species(559), getGame('black')).chapter).toBeGreaterThan(1)
    // 다이아몬드 물가시티 낚시는 8장입니다(철자 sunyshore).
    const sunyshoreOnly = speciesCatalog.find((entry) => (entry.encounters['12'] ?? []).length > 0
      && (entry.encounters['12'] ?? []).every((encounter) => encounter.location === 'sunyshore-city'))
    if (sunyshoreOnly) expect(getAvailability(sunyshoreOnly, getGame('diamond')).chapter).toBe(8)
    // 1–5세대 본편 추천 장은 그 장 권장 레벨보다 10 넘게 높은 야생 조우를 쓰지 않습니다(전설 배회 제외).
    for (const game of games.filter((entry) => entry.generation <= 5)) {
      const family = getFamily(game)
      for (const entry of speciesCatalog) {
        const availability = getAvailability(entry, game)
        if (!availability.obtainable || !availability.preChampion || availability.chapter >= family.chapters.length) continue
        if (entry.legendary || entry.mythical) continue
        const level = Number(/\d+/.exec(availability.level)?.[0] ?? 0)
        const maxLevel = Number(family.chapters[availability.chapter - 1].level.match(/\d+/g)?.at(-1) ?? 0)
        expect(level, `${game.id} ${entry.name} ${availability.location}`).toBeLessThanOrEqual(maxLevel + 10)
      }
    }
  }, 60_000)

  it('선물과 고정 심볼의 받는 시점과 조건을 원작에 맞춘다', () => {
    // 호연 화석은 Go고글 이후, 에메랄드 성도 스타팅·메탕은 엔딩 후입니다.
    expect(getAvailability(species(345), getGame('ruby')).chapter).toBe(5)
    expect(getAvailability(species(158), getGame('emerald')).postgameOnly).toBe(true)
    expect(getAvailability(species(374), getGame('ruby')).postgameOnly).toBe(true)
    // 피카츄 버전 꼬부기는 마티스 격파 뒤입니다.
    expect(getAvailability(species(7), getGame('yellow')).chapter).toBe(4)
    // 크리스탈 이상한 알은 무작위라 배루키를 절구산 선물로 안내합니다.
    expect(getAvailability(species(236), getGame('crystal'))).toMatchObject({ chapter: 6, location: '절구산' })
    // 블랙2·화이트2 딥상어동·미뇽 선물은 엔딩 후, 블랙·화이트 조로아는 이벤트 전용입니다.
    expect(getAvailability(species(443), getGame('black-2')).postgameOnly).toBe(true)
    expect(getAvailability(species(570), getGame('black')).obtainable).toBe(false)
    // 유크시·아그놈은 창기둥 사건 뒤, 반대 버전 표지 전설은 엔딩 후입니다.
    expect(getAvailability(species(480), getGame('diamond')).chapter).toBe(8)
    expect(getAvailability(species(249), getGame('gold')).postgameOnly).toBe(true)
    expect(getAvailability(species(250), getGame('soulsilver')).postgameOnly).toBe(true)
    expect(getAvailability(species(384), getGame('emerald')).postgameOnly).toBe(true)
  })

  it('블랙·화이트 꿈터 원숭이는 고른 스타팅에 맞는 한 마리만 받는다', () => {
    const black = getGame('black')
    expect(getAvailability(species(515), black).requiredStarterDex).toBe(495)
    expect(getAvailability(species(511), black).requiredStarterDex).toBe(498)
    expect(getAvailability(species(513), black).requiredStarterDex).toBe(501)
    expect(validateRequired([495, 515], black, defaults).errors).toEqual([])
    expect(validateRequired([498, 515], black, defaults).errors.join(' ')).toContain('주리비얀')
  })

  it('1–5세대 장소를 PKHeX 한국어 이름으로 표시한다', () => {
    expect(getAvailability(species(81), getGame('firered')).location).toBe('무인발전소')
    expect(getAvailability(species(41), getGame('gold')).location).not.toMatch(/[A-Za-z]/)
    for (const game of games.filter((entry) => entry.generation <= 5)) {
      for (const entry of speciesCatalog) {
        const availability = getAvailability(entry, game)
        if (!availability.obtainable) continue
        // N의 성·P2랩처럼 공식 이름에 영문자가 들어간 곳만 허용합니다.
        expect(availability.location.replace(/N의 성|P2랩/g, ''), `${game.id} ${entry.name}`).not.toMatch(/[A-Za-z]/)
      }
    }
  }, 60_000)

  it('진화 전 단계의 기술은 잡은 단계부터, 진화하기 전에 배우는 것만 쓴다', () => {
    const fireRed = getGame('firered')
    // 레어코일은 무인발전소 코일(Lv.22)에서 오므로 코일 Lv.26 스파크는 쓸 수 있습니다.
    expect(generatedMoves(species(82), fireRed).some((move) => move.source === '코일 Lv.26 자력 습득 후 유지')).toBe(true)
    for (const move of generatedMoves(species(135), fireRed)) {
      const match = /^이브이 Lv\.(\d+)/.exec(move.source)
      if (match) expect(move.availableChapter, move.name).toBeLessThanOrEqual(4)
    }
  })
})
