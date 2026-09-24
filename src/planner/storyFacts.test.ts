import { describe, expect, it } from 'vitest'
import { encounterMethodUnlockChapter } from './catalog'
import { games, getBosses, getFamily, getGame } from './games'
import { getModernBosses, modernFamilies } from './modernGames'

const bossLevel = (gameId: string, bossId: string) =>
  getBosses(getGame(gameId)).find((entry) => entry.id === bossId)?.level

const fieldMoveChapters = (gameId: string) =>
  Object.fromEntries(getFamily(getGame(gameId)).fieldMoves.map((move) => [move.id, move.unlockChapter]))

describe('원작 트레이너 데이터와 보스 레벨', () => {
  // pret/pokered·pokeyellow data/trainers/parties.asm, pret/pokefirered src/data/trainer_parties.h
  it('관동 보스 레벨을 레드·블루, 피카츄, 파이어레드·리프그린별로 구분한다', () => {
    expect(bossLevel('red', 'surge')).toBe('Lv.18–24')
    expect(bossLevel('red', 'blaine')).toBe('Lv.40–47')
    expect(bossLevel('red', 'lorelei')).toBe('Lv.53–56')
    expect(bossLevel('red', 'lance-k')).toBe('Lv.56–62')
    expect(bossLevel('red', 'champion-k')).toBe('Lv.59–65')

    expect(bossLevel('yellow', 'brock')).toBe('Lv.10–12')
    expect(bossLevel('yellow', 'surge')).toBe('Lv.28')
    expect(bossLevel('yellow', 'sabrina')).toBe('Lv.50')
    expect(getBosses(getGame('yellow')).find((entry) => entry.id === 'koga'))
      .toMatchObject({ level: 'Lv.44–50', types: ['bug', 'poison'] })

    expect(bossLevel('firered', 'surge')).toBe('Lv.18–24')
    expect(bossLevel('firered', 'lorelei')).toBe('Lv.51–54')
    expect(bossLevel('leafgreen', 'lance-k')).toBe('Lv.54–60')
    expect(bossLevel('leafgreen', 'champion-k')).toBe('Lv.57–63')
  })

  // pret/pokegold·pokecrystal parties.asm, pret/pokeheartgold files/poketool/trainer/trainers.json
  it('성도 관장 레벨을 금·은·크리스탈과 하트골드·소울실버별로 구분한다', () => {
    expect(bossLevel('gold', 'falkner')).toBe('Lv.7–9')
    expect(bossLevel('crystal', 'pryce')).toBe('Lv.27–31')
    expect(bossLevel('silver', 'lance-j')).toBe('Lv.44–50')
    expect(bossLevel('heartgold', 'falkner')).toBe('Lv.9–13')
    expect(bossLevel('soulsilver', 'pryce')).toBe('Lv.30–34')
    expect(bossLevel('heartgold', 'lance-j')).toBe('Lv.46–50')
  })

  // pret/pokeruby·pokeemerald src/data/trainer_parties.h
  it('호연 관장 레벨을 루비·사파이어와 에메랄드별로 구분한다', () => {
    expect(bossLevel('ruby', 'roxanne')).toBe('Lv.14–15')
    expect(bossLevel('sapphire', 'tate-liza')).toBe('Lv.42')
    expect(bossLevel('emerald', 'roxanne')).toBe('Lv.12–15')
    expect(bossLevel('emerald', 'juan')).toBe('Lv.41–46')
  })

  it('같은 인물의 한국어 이름을 보스표 안에서 일관되게 쓴다', () => {
    const galar = getBosses(getGame('sword'))
    expect(galar.find((entry) => entry.id === 'nessa')?.name).toBe('야청')
    expect(galar.find((entry) => entry.id === 'nessa-finals')?.name).toBe('야청')
    expect(getFamily(getGame('gold')).chapters[4].objectives).toContain('빛나리 치료')
  })
})

describe('원작 필드기 입수 시점', () => {
  it('엔딩 후에만 얻는 비전머신을 스토리 필드기로 배치하지 않는다', () => {
    // pokefirered: HM07은 4섬 얼음폭포동굴, pokeheartgold: HM08은 태초마을 오박사 연구소
    expect(fieldMoveChapters('firered')).not.toHaveProperty('waterfall')
    expect(fieldMoveChapters('heartgold')).not.toHaveProperty('rock-climb')
    // 블랙·화이트의 다이빙은 엔딩 후 지역인 산로마을에서 받습니다.
    expect(fieldMoveChapters('black')).not.toHaveProperty('dive')
  })

  it('버전별 비전머신 입수 장을 원작 진행과 맞춘다', () => {
    expect(fieldMoveChapters('heartgold')).toMatchObject({ 'rock-smash': 3, strength: 6 })
    expect(fieldMoveChapters('platinum')).toMatchObject({ waterfall: 8 })
    expect(fieldMoveChapters('diamond')).toMatchObject({ waterfall: 8 })
    expect(fieldMoveChapters('white')).toMatchObject({ fly: 5, surf: 6, strength: 4 })
    expect(fieldMoveChapters('white-2')).toMatchObject({ strength: 2, fly: 3, surf: 4, dive: 5 })
    expect(encounterMethodUnlockChapter(getGame('soulsilver'), 'rock-smash')).toBe(3)
    expect(encounterMethodUnlockChapter(getGame('black'), 'surf')).toBe(6)
  })

  it('피카츄 버전도 달맞이산 화석을 하나만 선택한다', () => {
    expect(getGame('yellow').fossils).toEqual([[138, 140]])
  })
})

describe('버전에서 실제로 할 수 있는 스토리 목표', () => {
  it('피카츄 버전은 스타터를 고르지 않고 오박사에게 피카츄를 받는다', () => {
    expect(getFamily(getGame('yellow')).chapters[0].objectives).toContain('오박사에게 피카츄 받기')
    expect(getFamily(getGame('yellow')).chapters[0].objectives).not.toContain('스타터 선택')
    expect(getFamily(getGame('red')).chapters[0].objectives).toContain('스타터 선택')
  })

  it('1–5세대 장의 해금 표시는 그 버전의 필드기 입수 장과 같다', () => {
    for (const game of games.filter((entry) => entry.generation <= 5)) {
      const family = getFamily(game)
      family.chapters.forEach((chapter, index) => {
        expect(chapter.unlocks, `${game.id} ${chapter.id}`).toEqual(
          family.fieldMoves.filter((move) => move.unlockChapter === index + 1).map((move) => move.name),
        )
      })
    }
    expect(getFamily(getGame('heartgold')).chapters[4].unlocks).not.toContain('괴력')
    expect(getFamily(getGame('heartgold')).chapters[5].unlocks).toContain('괴력')
  })

  // pokediamond trdata.json에는 봉신마을 태홍 전투가 없고, BDSP 봉신마을 유적 앞 상대는 갤럭시단 조무래기(뷰티플라이 25·삐딱구리 27)입니다.
  it('BDSP 봉신마을에서는 태홍이 아니라 갤럭시단 조무래기와 싸운다', () => {
    const celestic = getModernBosses('brilliant-diamond').find((entry) => entry.id === 'cyrus-celestic')
    expect(celestic).toMatchObject({ name: '갤럭시단 조무래기', level: 'Lv.25–27' })
    expect(modernFamilies.sinnoh8.chapters[4].objectives.join(' ')).not.toContain('태홍')
  })

  it('XY의 관동 스타터는 미르시티에서 받는다', () => {
    expect(modernFamilies.kalos6.chapters[0].objectives.join(' ')).not.toContain('관동 스타터')
    expect(modernFamilies.kalos6.chapters[1].objectives).toContain('미르시티에서 관동 스타터 받기')
  })

  it('보스 타입은 실제 파티에 있는 타입만 쓴다', () => {
    const sword = getModernBosses('sword')
    expect(sword.find((entry) => entry.id === 'oleana')?.types).not.toContain('steel')
    expect(sword.find((entry) => entry.id === 'bede-stow')?.types).toEqual(['psychic'])
    expect(getModernBosses('sun').find((entry) => entry.id === 'lusamine-sm')?.types).not.toContain('ice')
  })

  it('소드·실드와 BDSP의 확인된 트레이너 레벨을 유지한다', () => {
    const sword = getModernBosses('sword')
    const level = (id: string) => sword.find((entry) => entry.id === id)?.level
    expect(level('hop-route-2')).toBe('Lv.5–8')
    expect(level('hop-circhester')).toBe('Lv.39–41')
    expect(level('hop-cup')).toBe('Lv.47–49')
    expect(level('hop-final')).toBe('Lv.68–70')
    const bdsp = getModernBosses('shining-pearl')
    const bdspLevel = (id: string) => bdsp.find((entry) => entry.id === id)?.level
    expect(bdspLevel('saturn-lake-valor')).toBe('Lv.35–37')
    expect(bdspLevel('mars-lake-verity')).toBe('Lv.37–39')
    expect(bdspLevel('barry-canalave')).toBe('Lv.30–35')
    expect(bdspLevel('barry-league')).toBe('Lv.48–53')
  })
})
