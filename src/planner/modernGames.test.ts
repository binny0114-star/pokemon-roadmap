import { describe, expect, it } from 'vitest'
import modernEncounterSnapshot from '../generated/modern-encounters.json'
import {
  getModernBosses,
  modernEncounterChapter,
  modernFamilies,
  modernGames,
  type ModernFamilyId,
  type ModernPlannerGameId,
} from './modernGames'

interface ModernEncounterRow {
  species: number
  form: number
  location: string
  area: string
  minLevel: number
  maxLevel: number
  method: string
  conditions: string[]
}

const encounterGames = modernEncounterSnapshot.games as Record<string, ModernEncounterRow[]>

describe('6–9세대 스토리 패밀리', () => {
  it('14개 본편 버전과 7개 독립 패밀리를 제공한다', () => {
    expect(modernGames).toHaveLength(14)
    expect(new Set(modernGames.map((game) => game.id)).size).toBe(14)
    expect(Object.keys(modernFamilies)).toHaveLength(7)
  })

  it('세 기능이 완비되지 않은 14개 버전을 파티 플래너에서 명시적으로 차단한다', () => {
    for (const gameId of modernGames.map((game) => game.id) satisfies ModernPlannerGameId[]) {
      const support = modernGames.find((game) => game.id === gameId)?.catalog.plannerSupport
      if (!support || support.status !== 'catalog-only') {
        throw new Error(`${gameId}는 명시적으로 카탈로그 전용이어야 합니다.`)
      }
      expect(support.reason).toBeTruthy()
      if (['x', 'y', 'omega-ruby', 'alpha-sapphire'].includes(gameId)) {
        expect(support.reason).toContain('기술')
      }
    }
  })

  it('6–7세대 8개 버전은 모든 정확성 게이트 근거가 있고 미완료 게이트가 승격을 막는다', () => {
    const targetIds: ModernPlannerGameId[] = [
      'x', 'y', 'omega-ruby', 'alpha-sapphire',
      'sun', 'moon', 'ultra-sun', 'ultra-moon',
    ]
    for (const gameId of targetIds) {
      const support = modernGames.find((game) => game.id === gameId)!.catalog.plannerSupport
      expect(support.status, gameId).toBe('catalog-only')
      if (support.status !== 'catalog-only') throw new Error(`${gameId} 지원 게이트를 읽을 수 없습니다.`)
      expect(Object.keys(support.accuracyGates ?? {}).sort(), gameId).toEqual([
        'availability', 'evolutions', 'forms', 'integration', 'learnsets', 'mechanics', 'story',
      ])
      expect(Object.values(support.accuracyGates ?? {}).every((gate) => gate.evidence.trim()), gameId).toBe(true)
      expect(Object.values(support.accuracyGates ?? {}).some((gate) => !gate.complete), gameId).toBe(true)
    }
  })

  it('모든 보스가 실제 챕터에 연대순으로 연결된다', () => {
    for (const game of modernGames) {
      const family = modernFamilies[game.familyId]
      const bosses = getModernBosses(game.id)
      expect(family.chapters.at(-1)?.objectives.length, game.id).toBeGreaterThan(0)
      expect(new Set(family.chapters.map((chapter) => chapter.id)).size).toBe(family.chapters.length)
      expect(new Set(bosses.map((entry) => entry.id)).size).toBe(bosses.length)
      expect(bosses.map((entry) => entry.chapter), game.id)
        .toEqual([...bosses].map((entry) => entry.chapter).sort((a, b) => a - b))
      for (const entry of bosses) {
        expect(entry.chapter, `${game.id}/${entry.id}`).toBeGreaterThan(0)
        expect(entry.chapter, `${game.id}/${entry.id}`).toBeLessThanOrEqual(family.chapters.length)
      }
    }
  })

  it('각 패밀리의 핵심 보스 순서를 고정한다', () => {
    const sequence = (gameId: ModernPlannerGameId) => {
      const game = modernGames.find((entry) => entry.id === gameId)!
      return getModernBosses(game.id).map((entry) => entry.id)
    }
    expect(sequence('x')).toEqual([
      'viola', 'grant', 'korrina', 'ramos', 'clemont', 'valerie', 'olympia', 'lysandre',
      'wulfric', 'malva', 'siebold', 'wikstrom', 'drasna', 'diantha',
    ])
    expect(sequence('omega-ruby')).toEqual([
      'roxanne-oras', 'brawly-oras', 'wattson-oras', 'flannery-oras', 'norman-oras',
      'winona-oras', 'tate-liza-oras', 'maxie-or', 'wallace-oras', 'sidney-oras',
      'phoebe-oras', 'glacia-oras', 'drake-oras', 'steven-oras',
    ])
    expect(sequence('sun')).toEqual([
      'ilima-trial', 'hala', 'lana-trial', 'kiawe-trial', 'mallow-trial', 'olivia',
      'sophocles-trial', 'acerola-trial', 'nanu', 'lusamine-sm', 'hapu',
      'kommo-o-trial', 'lusamine-ultra-space-sm', 'hala-e4', 'olivia-e4',
      'acerola-e4', 'kahili', 'kukui',
    ])
    expect(sequence('moon')).toEqual(sequence('sun'))
    expect(sequence('ultra-sun')).toEqual([
      'ilima-trial-usum', 'hala-usum', 'lana-trial-usum', 'kiawe-trial-usum',
      'mallow-trial-usum', 'olivia-usum', 'sophocles-trial-usum',
      'acerola-trial-usum', 'nanu-usum', 'lusamine-usum', 'kommo-o-trial-usum',
      'ultra-necrozma', 'mina-trial', 'hapu-usum', 'molayne-e4',
      'olivia-e4-usum', 'acerola-e4-usum', 'kahili-usum', 'hau',
    ])
    expect(sequence('ultra-moon')).toEqual(sequence('ultra-sun'))
    expect(sequence('sword')).toEqual([
      'milo', 'nessa', 'kabu', 'bea', 'opal', 'gordie', 'piers', 'raihan',
      'marnie-cup', 'hop-cup', 'eternatus', 'leon',
    ])
    expect(sequence('shield')).toEqual([
      'milo', 'nessa', 'kabu', 'allister', 'opal', 'melony', 'piers', 'raihan',
      'marnie-cup', 'hop-cup', 'eternatus', 'leon',
    ])
  })

  it('버전 전용 보스와 악당 리더가 형제 버전에 섞이지 않는다', () => {
    const names = (gameId: ModernPlannerGameId) => {
      const game = modernGames.find((entry) => entry.id === gameId)!
      return getModernBosses(game.id).map((entry) => entry.id)
    }
    expect(names('sword')).toEqual(expect.arrayContaining(['bea', 'gordie']))
    expect(names('sword')).not.toEqual(expect.arrayContaining(['allister', 'melony']))
    expect(names('shield')).toEqual(expect.arrayContaining(['allister', 'melony']))
    expect(names('shield')).not.toEqual(expect.arrayContaining(['bea', 'gordie']))
    expect(names('omega-ruby')).toContain('maxie-or')
    expect(names('omega-ruby')).not.toContain('archie-as')
    expect(names('alpha-sapphire')).toContain('archie-as')
    expect(names('alpha-sapphire')).not.toContain('maxie-or')
    const boss = (gameId: ModernPlannerGameId, bossId: string) => {
      const game = modernGames.find((entry) => entry.id === gameId)!
      return getModernBosses(game.id).find((entry) => entry.id === bossId)!
    }
    expect(boss('sun', 'ilima-trial').name).toBe('주인 형사구스')
    expect(boss('moon', 'ilima-trial').name).toContain('레트라')
    expect(boss('ultra-sun', 'sophocles-trial-usum')).toMatchObject({
      name: '주인 토게데마루',
      types: ['electric', 'steel'],
      level: 'Lv.33',
    })
    expect(boss('sun', 'kommo-o-trial')).toMatchObject({ chapter: 6, level: 'Lv.45' })
    expect(boss('ultra-sun', 'kommo-o-trial-usum')).toMatchObject({ chapter: 6, level: 'Lv.49' })
    expect(boss('ultra-sun', 'ultra-necrozma').chapter).toBe(6)
    expect(boss('ultra-sun', 'mina-trial').chapter).toBe(7)
    expect(boss('ultra-sun', 'hapu-usum').chapter).toBe(7)
    expect(boss('scarlet', 'quaking-earth-titan').name).toBe('위대한엄니')
    expect(boss('violet', 'quaking-earth-titan').name).toBe('무쇠바퀴')
  })

  it('알로라 후반 챕터 목표가 버전별 필수 순서를 따른다', () => {
    expect(modernFamilies.alola7.chapters[5].objectives).toEqual([
      '섬의 여왕 하푸 격파',
      '포니대협곡에서 주인 짜랑고우거 격파',
      '솔가레오/루나아라와 함께 울트라스페이스 진입',
    ])
    expect(modernFamilies['alola7-ultra'].chapters[5].objectives).toEqual([
      '포니대협곡에서 주인 짜랑고우거 격파',
      '울트라메가로폴리스에서 울트라네크로즈마 격파',
    ])
    expect(modernFamilies['alola7-ultra'].chapters[3].level).toBe('Lv.29–44')
    expect(modernFamilies['alola7-ultra'].chapters[6].objectives).toEqual([
      '마츠리카의 시련과 주인 에리본 격파',
      '섬의 여왕 하푸 격파',
      '라나키라마운틴으로 이동',
    ])
  })

  it('팔데아 정식 선행 조건과 권장 레벨 순서를 분리한다', () => {
    const progression = modernFamilies.paldea9.storyProgression!
    expect(progression.mode).toBe('recommended-open-world')
    expect(progression.recommendedOrder.slice(0, 18)).toEqual([
      'katy', 'klawf-titan', 'brassius', 'bombirdier-titan', 'giacomo', 'iono',
      'mela', 'orthworm-titan', 'kofu', 'atticus', 'larry-gym', 'ryme',
      'quaking-earth-titan', 'tulip', 'grusha', 'ortega', 'false-dragon-titan', 'eri',
    ])
    expect(progression.prerequisites.rika).toHaveLength(8)
    expect(progression.prerequisites.arven).toHaveLength(5)
    expect(progression.prerequisites['paradise-protection']).toEqual(['arven', 'penny', 'nemona'])
    expect(progression.prerequisites.brassius).toBeUndefined()
  })

  it('HM 파티 요구는 6세대에서만 남고 이후 이동 시스템과 분리된다', () => {
    expect(modernFamilies.kalos6.fieldMoves.some((move) => move.required)).toBe(true)
    expect(modernFamilies.hoenn6.fieldMoves.some((move) => move.required)).toBe(true)
    for (const family of Object.values(modernFamilies).filter((entry) => entry.generation >= 7)) {
      expect(family.fieldMoves, family.id).toEqual([])
    }
  })
})

describe('6–9세대 정적 입수 스냅샷', () => {
  it('PKHeX 고정 리비전과 모든 지원 버전을 기록한다', () => {
    expect(modernEncounterSnapshot.provenance.revision).toBe('77dcd3a7895bceaafbbff12d25bdf77c1acd8ca5')
    expect(modernEncounterSnapshot.provenance.files).toEqual(expect.arrayContaining([
      'legality/wild/Gen7/encounter_sn.pkl',
      'legality/wild/Gen7/encounter_mn.pkl',
      'legality/wild/Gen7/encounter_us.pkl',
      'legality/wild/Gen7/encounter_um.pkl',
      'Legality/Encounters/Data/Gen8/Encounters8.cs',
      'Legality/Encounters/Data/Gen8/Encounters8b.cs',
      'Legality/Encounters/Data/Gen9/Encounters9.cs',
    ]))
    expect(Object.keys(encounterGames).sort()).toEqual([
      'alpha-sapphire',
      'brilliant-diamond',
      'moon',
      'omega-ruby',
      'scarlet',
      'shield',
      'shining-pearl',
      'sun',
      'sword',
      'ultra-moon',
      'ultra-sun',
      'violet',
      'x',
      'y',
    ])
    const pokeApiVersionIds = {
      x: 23, y: 24, 'omega-ruby': 25, 'alpha-sapphire': 26,
      sword: 33, shield: 34, 'brilliant-diamond': 37, 'shining-pearl': 38,
      scarlet: 40, violet: 41,
    }
    for (const [gameId, versionId] of Object.entries(pokeApiVersionIds)) {
      expect(modernGames.find((game) => game.id === gameId)?.catalog.versionId, gameId).toBe(versionId)
    }
    expect(Object.keys(encounterGames).some((key) => /^\d+$/.test(key))).toBe(false)
  })

  it('카탈로그 카드용 스토리 전용·스토리+입수 범위를 분리한다', () => {
    const encounterGameIds = new Set(Object.keys(encounterGames))
    expect(modernGames.filter((game) => encounterGameIds.has(game.id)).map((game) => game.id).sort()).toEqual([
      'alpha-sapphire',
      'brilliant-diamond',
      'moon',
      'omega-ruby',
      'scarlet',
      'shield',
      'shining-pearl',
      'sun',
      'sword',
      'ultra-moon',
      'ultra-sun',
      'violet',
      'x',
      'y',
    ])
    expect(modernGames.filter((game) => !encounterGameIds.has(game.id))).toEqual([])
  })

  it('Gen 7 버전별 야생·SOS 자원과 폼을 보존한다', () => {
    for (const gameId of ['sun', 'moon', 'ultra-sun', 'ultra-moon']) {
      const rows = encounterGames[gameId]
      expect(rows.some((row) => row.method === 'wild-unspecified'), gameId).toBe(true)
      expect(rows.some((row) => row.method === 'sos'), gameId).toBe(true)
      expect(rows.some((row) => row.species === 19 && row.form === 1), gameId).toBe(true)
    }
    const species = (gameId: string) => new Set(encounterGames[gameId].map((row) => row.species))
    expect(species('sun').has(776)).toBe(true)
    expect(species('moon').has(776)).toBe(false)
    expect(species('moon').has(780)).toBe(true)
    expect(species('sun').has(780)).toBe(false)
    expect(species('ultra-sun').has(693)).toBe(true)
    expect(species('ultra-moon').has(693)).toBe(false)
    expect(species('ultra-moon').has(691)).toBe(true)
    expect(species('ultra-sun').has(691)).toBe(false)
  })

  it('Gen 6 Standard 슬롯을 확인할 수 없는 세부 방식으로 오표기하지 않는다', () => {
    for (const gameId of ['x', 'y', 'omega-ruby', 'alpha-sapphire']) {
      expect(encounterGames[gameId].some((row) => row.method === 'unsupported-standard')).toBe(false)
    }
  })

  it('모든 조우가 장소·세부구역·방식·조건·유효 레벨을 가진다', () => {
    for (const [gameId, rows] of Object.entries(encounterGames)) {
      const minimumRows = ['x', 'y', 'omega-ruby', 'alpha-sapphire'].includes(gameId)
        ? 80
        : ['sun', 'moon'].includes(gameId)
          ? 900
          : ['ultra-sun', 'ultra-moon'].includes(gameId)
            ? 1_000
        : ['brilliant-diamond', 'shining-pearl'].includes(gameId)
          ? 500
          : 800
      expect(rows.length, gameId).toBeGreaterThan(minimumRows)
      for (const row of rows) {
        expect(row.species, gameId).toBeGreaterThan(0)
        expect(row.form, `${gameId}/#${row.species}`).toBeGreaterThanOrEqual(0)
        expect(row.location, `${gameId}/#${row.species}`).not.toBe('')
        expect(row.area, `${gameId}/#${row.species}`).not.toBe('')
        expect(row.method, `${gameId}/#${row.species}`).not.toBe('')
        expect(row.conditions, `${gameId}/#${row.species}`).toBeInstanceOf(Array)
        expect(row.minLevel, `${gameId}/#${row.species}`).toBeGreaterThan(0)
        expect(row.maxLevel, `${gameId}/#${row.species}`).toBeGreaterThanOrEqual(row.minLevel)
      }
    }
  })

  it('가라르와 팔데아 리전폼 식별자를 기본폼으로 평탄화하지 않는다', () => {
    expect(encounterGames.sword.some((row) => row.species === 52 && row.form === 2)).toBe(true)
    expect(encounterGames.shield.some((row) => row.species === 77 && row.form === 1)).toBe(true)
    for (const gameId of ['scarlet', 'violet']) {
      expect(encounterGames[gameId].some((row) => row.species === 128 && row.form === 1)).toBe(true)
    }
    expect(encounterGames.scarlet.some((row) => row.species === 128 && row.form === 2)).toBe(true)
    expect(encounterGames.scarlet.some((row) => row.species === 128 && row.form === 3)).toBe(false)
    expect(encounterGames.violet.some((row) => row.species === 128 && row.form === 2)).toBe(false)
    expect(encounterGames.violet.some((row) => row.species === 128 && row.form === 3)).toBe(true)
    expect(Object.values(encounterGames).flat().every((row) => row.form < 30)).toBe(true)
    expect(encounterGames.x.some((row) =>
      row.species === 665
      && row.form === 0
      && row.conditions.includes('form-region-dependent'),
    )).toBe(true)
    for (const gameId of ['scarlet', 'violet']) {
      expect(encounterGames[gameId].some((row) =>
        [664, 665, 666].includes(row.species)
        && row.form === 18,
      )).toBe(true)
      expect(encounterGames[gameId].some((row) =>
        row.conditions.includes('form-region-dependent'),
      )).toBe(false)
    }
  })

  it('DLC 지역을 기본 엔딩 데이터에서 제외하고 레이드 조건을 보존한다', () => {
    const allRows = Object.values(encounterGames).flat()
    expect(allRows.some((row) => /kitakami|blueberry|fields-of-honor|ballimere/.test(row.location))).toBe(false)
    expect(encounterGames.sword.some((row) =>
      row.method === 'raid'
      && row.area.startsWith('max-den-')
      && row.conditions.some((condition) => condition.startsWith('badge-count-'))
      && row.conditions.some((condition) => condition.startsWith('raid-stars-')),
    )).toBe(true)
    expect(encounterGames.sword.some((row) =>
      row.conditions.some((condition) => condition.startsWith('raid-stars-4-'))
      && row.conditions.includes('badge-count-6'),
    )).toBe(true)
    expect(encounterGames.sword.some((row) =>
      row.conditions.some((condition) => condition.startsWith('raid-stars-4-'))
      && row.conditions.includes('badge-count-5'),
    )).toBe(false)
  })

  it('소드·실드의 본편 선물과 화석 복원 경로를 보존한다', () => {
    for (const gameId of ['sword', 'shield']) {
      const rows = encounterGames[gameId]
      expect(rows.some((row) => row.species === 848 && row.method === 'gift' && row.location === 'route-5')).toBe(true)
      for (const species of [880, 881, 882, 883]) {
        expect(rows.some((row) => row.species === species && row.method === 'fossil' && row.location === 'route-6')).toBe(true)
      }
      expect(rows.some((row) => row.species === 772 && row.conditions.includes('postgame'))).toBe(true)
    }
  })

  it('대표 버전 한정 포켓몬이 다른 버전 조우표에 유출되지 않는다', () => {
    const species = (gameId: string) => new Set(encounterGames[gameId].map((row) => row.species))
    expect(species('sword').has(888)).toBe(true)
    expect(species('shield').has(888)).toBe(false)
    expect(species('shield').has(889)).toBe(true)
    expect(species('sword').has(889)).toBe(false)
    expect(species('brilliant-diamond').has(483)).toBe(true)
    expect(species('shining-pearl').has(483)).toBe(false)
    expect(species('shining-pearl').has(484)).toBe(true)
    expect(species('brilliant-diamond').has(484)).toBe(false)
    expect(species('scarlet').has(1007)).toBe(true)
    expect(species('violet').has(1007)).toBe(false)
    expect(species('violet').has(1008)).toBe(true)
    expect(species('scarlet').has(1008)).toBe(false)
  })

  it('모든 조우 장소가 스토리 장 또는 명시적 엔딩 후 경계로 해석된다', () => {
    const familyByGame: Record<string, ModernFamilyId> = {
      x: 'kalos6',
      y: 'kalos6',
      'omega-ruby': 'hoenn6',
      'alpha-sapphire': 'hoenn6',
      sun: 'alola7',
      moon: 'alola7',
      'ultra-sun': 'alola7-ultra',
      'ultra-moon': 'alola7-ultra',
      sword: 'galar8',
      shield: 'galar8',
      'brilliant-diamond': 'sinnoh8',
      'shining-pearl': 'sinnoh8',
      scarlet: 'paldea9',
      violet: 'paldea9',
    }
    const unmapped = new Set<string>()
    for (const [gameId, rows] of Object.entries(encounterGames)) {
      for (const row of rows) {
        const chapter = modernEncounterChapter(
          familyByGame[gameId],
          row.location,
          row.conditions,
          row.method,
          row.minLevel,
        )
        if (chapter === null) unmapped.add(`${gameId}:${row.location}`)
        else expect(chapter, `${gameId}/#${row.species}/${row.location}`).toBeGreaterThan(0)
      }
    }
    expect([...unmapped].sort()).toEqual([])
  })

  it('이동기와 최종 지역의 실제 접근 시점을 앞당기지 않는다', () => {
    expect(modernEncounterChapter('alola7', 'kalae-bay')).toBe(2)
    expect(modernEncounterChapter('alola7', 'melemele-sea')).toBe(2)
    expect(modernEncounterChapter('alola7', 'seaward-cave')).toBe(2)
    expect(modernEncounterChapter('alola7', 'hano-beach')).toBe(3)
    expect(modernEncounterChapter('alola7-ultra', 'dividing-peak-tunnel')).toBe(2)
    expect(modernEncounterChapter('galar8', 'axews-eye')).toBe(7)
    expect(modernEncounterChapter('galar8', 'south-lake-miloch', [], 'surf')).toBe(7)
    expect(modernEncounterChapter('galar8', 'rolling-fields', ['badge-count-8'], 'raid')).toBe(10)
    expect(modernEncounterChapter('galar8', 'giants-seat', [], 'overworld', 33)).toBe(5)
    expect(modernEncounterChapter('galar8', 'rolling-fields', ['weather-heavy-fog'], 'overworld', 15)).toBe(11)
    expect(modernEncounterChapter('galar8', 'rolling-fields', ['weather-normal', 'weather-heavy-fog'], 'overworld', 15)).toBe(2)
    expect(modernEncounterChapter('galar8', 'east-lake-axewell', ['badge-count-3', 'water-bike'], 'raid', 35)).toBe(7)
    expect(modernEncounterChapter('galar8', 'slumbering-weald', [], 'overworld', 45)).toBe(10)
    expect(modernEncounterChapter('sinnoh8', 'route-219', [], 'super-rod')).toBe(9)
    expect(modernEncounterChapter('sinnoh8', 'route-219', [], 'old-rod')).toBe(1)
    expect(modernEncounterChapter('hoenn6', 'mirage-forest', [], 'horde')).toBe(9)
    expect(modernEncounterChapter('hoenn6', 'route-115', [], 'horde')).toBe(5)
    expect(modernEncounterChapter('paldea9', 'area-zero')).toBe(14)
    expect(Object.values(encounterGames).flat().some((row) => row.location === 'grand-underground')).toBe(false)
    expect(Object.values(encounterGames).flat().some((row) => row.location === 'trophy-garden')).toBe(false)
    expect(Object.values(encounterGames).flat().some((row) => row.location === 'great-marsh')).toBe(false)
    expect(encounterGames['brilliant-diamond'].some((row) => row.method === 'grass')).toBe(false)
    expect(encounterGames.sword.some((row) =>
      row.area === 'max-den-90'
      && row.location === 'south-lake-miloch'
      && row.conditions.includes('water-bike'),
    )).toBe(true)
  })
})
