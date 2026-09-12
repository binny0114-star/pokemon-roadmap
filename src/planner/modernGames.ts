import type { FieldMove, PlannerBoss, StoryChapter } from './types'
import { getCatalogGame, type GameCatalogEntry } from './versionRegistry'

export type ModernFamilyId =
  | 'kalos6'
  | 'hoenn6'
  | 'alola7'
  | 'alola7-ultra'
  | 'letsgo7'
  | 'galar8'
  | 'sinnoh8'
  | 'hisui8'
  | 'paldea9'

export type ModernPlannerGameId =
  | 'x'
  | 'y'
  | 'omega-ruby'
  | 'alpha-sapphire'
  | 'sun'
  | 'moon'
  | 'ultra-sun'
  | 'ultra-moon'
  | 'lets-go-pikachu'
  | 'lets-go-eevee'
  | 'sword'
  | 'shield'
  | 'brilliant-diamond'
  | 'shining-pearl'
  | 'legends-arceus'
  | 'scarlet'
  | 'violet'

export interface ModernFamilyConfig {
  id: ModernFamilyId
  generation: number
  region: string
  chapters: StoryChapter[]
  bosses: PlannerBoss[]
  fieldMoves: FieldMove[]
  moveReminder?: { chapter: number; location: string; cost: string }
  mainStoryChapterCount?: number
  postgame: string[]
  storyProgression?: {
    mode: 'recommended-open-world'
    recommendedOrder: string[]
    prerequisites: Record<string, string[]>
  }
}

interface ModernGameDefinition {
  id: ModernPlannerGameId
  familyId: ModernFamilyId
  endpoint: string
  accent: string
  starters: number[]
  fossils: number[][]
  notes: string[]
}

export interface ModernGameConfig extends ModernGameDefinition {
  catalog: GameCatalogEntry
}

const chapter = (
  id: string,
  title: string,
  subtitle: string,
  level: string,
  locationTokens: string[],
  objectives: string[],
  unlocks: string[] = [],
): StoryChapter => ({ id, title, subtitle, level, locationTokens, objectives, unlocks })

const boss = (
  id: string,
  name: string,
  title: string,
  chapterIndex: number,
  types: string[],
  level: string,
  details: Partial<PlannerBoss> = {},
): PlannerBoss => ({ id, name, title, chapter: chapterIndex, types, level, winRequired: true, ...details })

const kalosChapters = [
  chapter('kal-1', '조아마을 → 백단시티', '첫 파트너와 버그배지', 'Lv.5–12', ['vaniville', 'aquacorde', 'route-2', 'santalune-forest', 'route-3', 'santalune'], ['스타터와 관동 스타터 선택', '백단체육관 비올라 격파']),
  chapter('kal-2', '미르시티 → 삼채시티', '화석과 월배지', 'Lv.12–25', ['route-4', 'lumiose', 'route-5', 'camphrier', 'parfum-palace', 'route-6', 'connecting-cave', 'route-7', 'route-8', 'ambrette', 'glittering-cave', 'cyllage'], ['파르팽궁전에서 포켓몬피리 회수', '빛나는동굴에서 플레어단 격퇴', '삼채체육관 자크로 격파'], ['바위깨기', '괴력']),
  chapter('kal-3', '사라시티', '코스트배지와 메가진화', 'Lv.25–34', ['route-10', 'geosenge', 'route-11', 'reflection-cave', 'shalour', 'tower-of-mastery'], ['사라체육관 코르니 격파', '마스터타워에서 메가링 획득'], ['파도타기', '메가진화']),
  chapter('kal-4', '비익시티', '플랜트배지', 'Lv.30–37', ['route-12', 'azure-bay', 'coumarine'], ['비익체육관 후쿠지 격파'], ['공중날기']),
  chapter('kal-5', '미르시티', '프리즘배지와 발전소', 'Lv.35–42', ['route-13', 'kalos-power-plant', 'lumiose'], ['칼로스발전소 탈환', '미르체육관 시트론 격파']),
  chapter('kal-6', '후늬시티', '페어리배지와 볼 공장', 'Lv.40–48', ['route-14', 'laverre', 'poke-ball-factory'], ['후늬체육관 마슈 격파', '볼 공장에서 플레어단 격퇴']),
  chapter('kal-7', '향전시티', '마운틴칼로스와 사이킥배지', 'Lv.44–50', ['route-15', 'lost-hotel', 'dendemille', 'frost-cavern', 'route-17', 'anistar'], ['프로스트케이브 사건 해결', '향전체육관 고지카 격파']),
  chapter('kal-8', '플레어단 최종 작전', '최종병기와 전설의 포켓몬', 'Lv.47–53', ['lysandre-labs', 'geosenge', 'team-flare-secret-hq'], ['플라드리 래버러토리 돌파', 'X는 제르네아스, Y는 이벨타르와 조우', '플라드리 최종전 승리']),
  chapter('kal-9', '이설시티 → 칼로스리그', '아이스버그배지와 챔피언', 'Lv.50–68', ['route-18', 'couriway', 'route-19', 'snowbelle', 'pokemon-village', 'route-21', 'victory-road', 'pokemon-league'], ['이설체육관 우르프 격파', '챔피언로드 돌파', '사천왕과 카르네 격파'], ['폭포오르기']),
]

const kalosBosses = [
  boss('viola', '비올라', '백단 체육관', 1, ['bug'], 'Lv.10–12'),
  boss('grant', '자크로', '삼채 체육관', 2, ['rock'], 'Lv.25'),
  boss('korrina', '코르니', '사라 체육관', 3, ['fighting'], 'Lv.29–32'),
  boss('ramos', '후쿠지', '비익 체육관', 4, ['grass'], 'Lv.30–34'),
  boss('clemont', '시트론', '미르 체육관', 5, ['electric'], 'Lv.35–37'),
  boss('valerie', '마슈', '후늬 체육관', 6, ['fairy'], 'Lv.38–42'),
  boss('olympia', '고지카', '향전 체육관', 7, ['psychic'], 'Lv.44–48'),
  boss('lysandre', '플라드리', '플레어단 최종전', 8, ['dark', 'water'], 'Lv.49–53'),
  boss('wulfric', '우르프', '이설 체육관', 9, ['ice'], 'Lv.56–59'),
  boss('malva', '파키라', '사천왕', 9, ['fire'], 'Lv.63–65'),
  boss('siebold', '즈미', '사천왕', 9, ['water'], 'Lv.63–65'),
  boss('wikstrom', '간피', '사천왕', 9, ['steel'], 'Lv.63–65'),
  boss('drasna', '드라세나', '사천왕', 9, ['dragon'], 'Lv.63–65'),
  boss('diantha', '카르네', '챔피언', 9, ['fairy', 'psychic'], 'Lv.64–68'),
]

const orasChapters = [
  chapter('or-1', '미로마을 → 금탄시티', '첫 파트너와 스톤배지', 'Lv.5–14', ['littleroot', 'route-101', 'route-102', 'route-103', 'route-104', 'petalburg-woods', 'rustboro', 'route-116', 'rusturf-tunnel'], ['스타터 선택', '금탄체육관 원규 격파', '데봉화물 회수'], ['풀베기']),
  chapter('or-2', '무로마을 → 잿빛시티', '너클배지와 해양박물관', 'Lv.14–20', ['route-105', 'route-106', 'dewford', 'granite-cave', 'route-107', 'route-108', 'route-109', 'slateport'], ['무로체육관 철구 격파', '성호에게 편지 전달', '해양박물관 사건 해결'], ['플래시']),
  chapter('or-3', '보라시티', '다이나모배지', 'Lv.19–25', ['route-110', 'mauville', 'route-117', 'verdanturf'], ['라이벌전 승리', '보라체육관 암페어 격파'], ['바위깨기']),
  chapter('or-4', '굴뚝산 → 용암마을', '히트배지와 운석', 'Lv.24–30', ['route-111', 'route-112', 'fiery-path', 'route-113', 'fallarbor', 'route-114', 'meteor-falls', 'mt-chimney', 'jagged-pass', 'lavaridge'], ['유성폭포에서 악당 조직 추적', '굴뚝산 간부전 승리', '용암체육관 연돌 격파'], ['괴력']),
  chapter('or-5', '등화시티', '밸런스배지와 파도타기', 'Lv.28–33', ['petalburg'], ['등화체육관 종길 격파', '파도타기 획득'], ['파도타기']),
  chapter('or-6', '검방울시티', '날씨연구소와 페더배지', 'Lv.30–36', ['route-118', 'route-119', 'weather-institute', 'fortree', 'route-120', 'scorched-slab'], ['날씨연구소 구출', '데봉스코프로 길 확보', '검방울체육관 은송 격파'], ['공중날기']),
  chapter('or-7', '송화산 → 해안시티', '악당 조직 아지트', 'Lv.34–40', ['route-121', 'safari-zone', 'route-122', 'mt-pyre', 'route-123', 'lilycove', 'magma-hideout', 'aqua-hideout', 'team-magma-hideout', 'team-aqua-hideout'], ['송화산에서 구슬 사건 확인', '해안시티 아지트 돌파']),
  chapter('or-8', '이끼시티 → 해저동굴', '마인드배지와 그란돈·가이오가', 'Lv.38–46', ['mossdeep', 'route-124', 'route-125', 'shoal-cave', 'route-126', 'route-127', 'route-128', 'seafloor-cavern'], ['이끼체육관 풍과 란 격파', '우주센터 방어', '해저동굴에서 마적/아강 격파'], ['다이빙']),
  chapter('or-9', '루네시티', '원시회귀와 레인배지', 'Lv.43–47', ['sootopolis', 'cave-of-origin', 'route-129', 'route-130', 'route-131', 'pacifidlog', 'route-132', 'route-133', 'route-134', 'sea-mauville', 'new-mauville', 'sealed-chamber'], ['오메가루비는 그란돈, 알파사파이어는 가이오가 진정', '루네체육관 윤진 격파'], ['폭포오르기']),
  chapter('or-10', '챔피언로드 → 호연리그', '사천왕과 챔피언 성호', 'Lv.46–59', ['ever-grande', 'victory-road', 'pokemon-league'], ['챔피언로드 돌파', '사천왕과 성호 격파']),
]

const orasBosses = [
  boss('roxanne-oras', '원규', '금탄 체육관', 1, ['rock'], 'Lv.12–14'),
  boss('brawly-oras', '철구', '무로 체육관', 2, ['fighting'], 'Lv.14–16'),
  boss('wattson-oras', '암페어', '보라 체육관', 3, ['electric'], 'Lv.19–21'),
  boss('flannery-oras', '연돌', '용암 체육관', 4, ['fire'], 'Lv.26–28'),
  boss('norman-oras', '종길', '등화 체육관', 5, ['normal'], 'Lv.28–30'),
  boss('winona-oras', '은송', '검방울 체육관', 6, ['flying'], 'Lv.33–35'),
  boss('tate-liza-oras', '풍과 란', '이끼 체육관', 8, ['psychic'], 'Lv.45'),
  boss('wallace-oras', '윤진', '루네 체육관', 9, ['water'], 'Lv.44–46'),
  boss('sidney-oras', '혁진', '사천왕', 10, ['dark'], 'Lv.50–52'),
  boss('phoebe-oras', '회연', '사천왕', 10, ['ghost'], 'Lv.51–53'),
  boss('glacia-oras', '미혜', '사천왕', 10, ['ice'], 'Lv.52–54'),
  boss('drake-oras', '권수', '사천왕', 10, ['dragon'], 'Lv.53–55'),
  boss('steven-oras', '성호', '챔피언', 10, ['steel', 'rock'], 'Lv.57–59'),
]

const alolaChapters = [
  chapter('alo-1', '멜레멜레섬', '일리마의 시련과 큰 시련', 'Lv.5–16', ['route-1', 'hauoli', 'trainer-school', 'verdant-cavern', 'route-2', 'melemele-meadow', 'iki-town'], ['스타터 선택', '일리마의 일반 시련 완수', '섬의 왕 할라 격파'], ['켄타로스 러시']),
  chapter('alo-2', '아칼라섬 전반', '물·불꽃·풀 시련', 'Lv.15–24', ['heahea', 'route-4', 'paniola', 'brooklet-hill', 'route-5', 'wela-volcano', 'route-7', 'lush-jungle'], ['수련·키아웨·마오의 시련 완수'], ['라프라스 스윔', '리자몽 플라이트']),
  chapter('alo-3', '아칼라섬 후반', '에테르재단과 큰 시련', 'Lv.22–28', ['route-8', 'fossil-restoration-center', 'aether-paradise', 'diglett-tunnel', 'konikoni', 'memorial-hill', 'ruins-of-life'], ['에테르파라다이스 첫 방문', '섬의 여왕 라이치 격파'], ['바랜드 서치']),
  chapter('alo-4', '울라울라섬', '전기·고스트 시련과 큰 시련', 'Lv.27–39', ['malie', 'route-10', 'hokulani', 'route-11', 'route-12', 'blush-mountain', 'tapu-village', 'route-14', 'abandoned-thrifty-megamart', 'route-15', 'po-town'], ['마마네와 아세로라의 시련 완수', '포마을 스컬단 본거지 돌파', '섬의 왕 나누 격파'], ['만마드 대시', '샤크니아 제트']),
  chapter('alo-5', '에테르파라다이스', '울트라홀과 루자미네', 'Lv.38–42', ['aether-paradise'], ['에테르파라다이스 돌파', '루자미네 격파', '릴리에와 포니섬으로 이동']),
  chapter('alo-6', '포니섬', '마지막 큰 시련과 포니대협곡 시련', 'Lv.40–48', ['seafolk-village', 'poni-wilds', 'ancient-poni-path', 'ruins-of-hope', 'exeggutor-island', 'vast-poni-canyon', 'altar-of-the-sunne', 'altar-of-the-moone'], ['섬의 여왕 하푸 격파', '포니대협곡에서 주인 짜랑고우거 격파', '솔가레오/루나아라와 함께 울트라스페이스 진입']),
  chapter('alo-7', '울트라스페이스 귀환', '울트라비스트 사건 종결', 'Lv.47–50', ['ultra-space', 'altar-of-the-sunne', 'altar-of-the-moone', 'mount-lanakila'], ['울트라스페이스에서 루자미네 격파 및 구출', '솔가레오/루나아라 포획', '라나키라마운틴 등반']),
  chapter('alo-8', '알로라리그', '초대 챔피언', 'Lv.50–58', ['pokemon-league'], ['사천왕 격파', '쿠쿠이박사와 초대 챔피언 결정전 승리']),
]

const alolaBosses = [
  boss('ilima-trial', '주인 형사구스/레트라', '일리마의 시련', 1, ['normal'], 'Lv.12'),
  boss('hala', '할라', '멜레멜레 큰 시련', 1, ['fighting'], 'Lv.14–16'),
  boss('lana-trial', '주인 약어리', '수련의 시련', 2, ['water'], 'Lv.20'),
  boss('kiawe-trial', '주인 염뉴트', '키아웨의 시련', 2, ['fire', 'poison'], 'Lv.22'),
  boss('mallow-trial', '주인 라란티스', '마오의 시련', 2, ['grass'], 'Lv.24'),
  boss('olivia', '라이치', '아칼라 큰 시련', 3, ['rock'], 'Lv.26–27'),
  boss('sophocles-trial', '주인 투구뿌논', '마마네의 시련', 4, ['electric', 'bug'], 'Lv.29'),
  boss('acerola-trial', '주인 따라큐', '아세로라의 시련', 4, ['ghost', 'fairy'], 'Lv.33'),
  boss('nanu', '나누', '울라울라 큰 시련', 4, ['dark'], 'Lv.38–39'),
  boss('lusamine-sm', '루자미네', '에테르대표', 5, ['fairy', 'ice'], 'Lv.41'),
  boss('hapu', '하푸', '포니 큰 시련', 6, ['ground'], 'Lv.47–48'),
  boss('kommo-o-trial', '주인 짜랑고우거', '포니대협곡 시련', 6, ['dragon', 'fighting'], 'Lv.45'),
  boss('lusamine-ultra-space-sm', '루자미네', '울트라스페이스 최종전', 7, ['fairy', 'water'], 'Lv.50'),
  boss('hala-e4', '할라', '사천왕', 8, ['fighting'], 'Lv.54–55'),
  boss('olivia-e4', '라이치', '사천왕', 8, ['rock'], 'Lv.54–55'),
  boss('acerola-e4', '아세로라', '사천왕', 8, ['ghost'], 'Lv.54–55'),
  boss('kahili', '카일리', '사천왕', 8, ['flying'], 'Lv.54–55'),
  boss('kukui', '쿠쿠이박사', '챔피언 결정전', 8, ['normal'], 'Lv.57–58'),
]

const ultraChapters = [
  ...alolaChapters.slice(0, 4).map((entry, index) => ({
    ...entry,
    id: entry.id.replace('alo-', 'ult-'),
    ...(index === 3 ? { level: 'Lv.29–44' } : {}),
  })),
  chapter('ult-5', '에테르파라다이스', '네크로즈마의 습격', 'Lv.42–47', ['aether-paradise'], ['에테르파라다이스 돌파', '루자미네 격파', '울트라조사대와 네크로즈마 추적']),
  chapter('ult-6', '포니대협곡 → 울트라메가로폴리스', '마지막 시련과 울트라네크로즈마', 'Lv.44–60', ['seafolk-village', 'poni-wilds', 'ancient-poni-path', 'ruins-of-hope', 'exeggutor-island', 'vast-poni-canyon', 'altar-of-the-sunne', 'altar-of-the-moone', 'ultra-megalopolis'], ['포니대협곡에서 주인 짜랑고우거 격파', '울트라메가로폴리스에서 울트라네크로즈마 격파']),
  chapter('ult-7', '마츠리카의 시련 → 나시 아일랜드', '페어리 시련과 마지막 큰 시련', 'Lv.51–55', ['seafolk-village', 'hauoli-cemetery', 'lush-jungle', 'wela-volcano-park', 'hokulani-observatory', 'aether-house', 'exeggutor-island', 'mount-lanakila'], ['마츠리카의 시련과 주인 에리본 격파', '섬의 여왕 하푸 격파', '라나키라마운틴으로 이동']),
  chapter('ult-8', '알로라리그', '하우와 초대 챔피언 결정전', 'Lv.54–60', ['mount-lanakila', 'pokemon-league'], ['사천왕 격파', '하우와 초대 챔피언 결정전 승리']),
]

const ultraBosses = [
  boss('ilima-trial-usum', '주인 형사구스/레트라', '일리마의 시련', 1, ['normal'], 'Lv.12'),
  boss('hala-usum', '할라', '멜레멜레 큰 시련', 1, ['fighting'], 'Lv.15–16'),
  boss('lana-trial-usum', '주인 깨비물거미', '수련의 시련', 2, ['water', 'bug'], 'Lv.20'),
  boss('kiawe-trial-usum', '주인 텅구리', '키아웨의 시련', 2, ['fire', 'ghost'], 'Lv.22'),
  boss('mallow-trial-usum', '주인 라란티스', '마오의 시련', 2, ['grass'], 'Lv.24'),
  boss('olivia-usum', '라이치', '아칼라 큰 시련', 3, ['rock'], 'Lv.27–28'),
  boss('sophocles-trial-usum', '주인 토게데마루', '마마네의 시련', 4, ['electric', 'steel'], 'Lv.33'),
  boss('acerola-trial-usum', '주인 따라큐', '아세로라의 시련', 4, ['ghost', 'fairy'], 'Lv.35'),
  boss('nanu-usum', '나누', '울라울라 큰 시련', 4, ['dark'], 'Lv.43–44'),
  boss('lusamine-usum', '루자미네', '에테르대표', 5, ['fairy', 'ice'], 'Lv.47'),
  boss('kommo-o-trial-usum', '주인 짜랑고우거', '포니대협곡 시련', 6, ['dragon', 'fighting'], 'Lv.49'),
  boss('ultra-necrozma', '울트라네크로즈마', '울트라메가로폴리스', 6, ['psychic', 'dragon'], 'Lv.60'),
  boss('mina-trial', '주인 에리본', '마츠리카의 시련', 7, ['bug', 'fairy'], 'Lv.55'),
  boss('hapu-usum', '하푸', '포니 큰 시련', 7, ['ground'], 'Lv.53–54'),
  boss('molayne-e4', '멀레인', '사천왕', 8, ['steel'], 'Lv.56–57'),
  boss('olivia-e4-usum', '라이치', '사천왕', 8, ['rock'], 'Lv.56–57'),
  boss('acerola-e4-usum', '아세로라', '사천왕', 8, ['ghost'], 'Lv.56–57'),
  boss('kahili-usum', '카일리', '사천왕', 8, ['flying'], 'Lv.56–57'),
  boss('hau', '하우', '챔피언 결정전', 8, ['electric'], 'Lv.59–60'),
]

const letsGoChapters = [
  chapter('lg-1', '태초마을 → 회색시티', '파트너와 회색배지', 'Lv.5–12', ['pallet-town', 'route-1', 'viridian-city', 'route-2', 'viridian-forest', 'pewter-city'], ['파트너 피카츄/이브이와 출발', '회색체육관 웅 격파']),
  chapter('lg-2', '달맞이산 → 블루시티', '달맞이산과 블루배지', 'Lv.10–21', ['route-3', 'mt-moon', 'route-4', 'cerulean-city', 'route-24', 'route-25'], ['달맞이산에서 로켓단 격퇴', '블루체육관 이슬 격파', '이수재를 도와 승선티켓 획득']),
  chapter('lg-3', '갈색시티 → 무지개시티', '오렌지배지와 비전기술', 'Lv.16–34', ['route-5', 'underground-path', 'route-6', 'vermilion-city', 'ss-anne', 'digletts-cave', 'route-9', 'rock-tunnel', 'lavender-town', 'route-8', 'celadon-city'], ['상트앙느호에서 비전기술 풀베기 습득', '갈색체육관 마티스 격파', '비전기술 빛내기 습득', '포켓몬타워의 유령 확인']),
  chapter('lg-4', '무지개시티 → 포켓몬타워', '레인보우배지와 포켓몬피리', 'Lv.30–36', ['celadon-city', 'rocket-game-corner', 'pokemon-tower', 'lavender-town'], ['무지개체육관 민화 격파', '로켓단 아지트에서 실프스코프 획득', '비전기술 하늘날기 습득', '포켓몬타워 구출과 포켓몬피리 획득']),
  chapter('lg-5', '연분홍시티', '핑크배지와 물길', 'Lv.34–44', ['route-12', 'route-13', 'route-14', 'route-15', 'fuchsia-city', 'go-park'], ['잠만보를 깨우고 연분홍시티 도착', '비전기술 밀어내기 습득', '비전기술 물결타기 습득', '연분홍체육관 독수 격파']),
  chapter('lg-6', '노랑시티와 실프주식회사', '로켓단과 골드배지', 'Lv.38–44', ['saffron-city', 'silph-co'], ['실프주식회사에서 로켓단과 비주기 격파', '노랑체육관 초련 격파']),
  chapter('lg-7', '홍련마을 → 상록시티', '크림슨배지와 그린배지', 'Lv.40–50', ['route-19', 'seafoam-islands', 'route-20', 'cinnabar-island', 'pokemon-mansion', 'route-21', 'viridian-city'], ['포켓몬저택에서 비밀의열쇠 획득', '홍련체육관 강연 격파', '상록체육관 비주기 최종전 승리']),
  chapter('lg-8', '챔피언로드 → 포켓몬리그', '사천왕과 라이벌 챔피언', 'Lv.45–57', ['route-22', 'route-23', 'victory-road', 'indigo-plateau'], ['챔피언로드 돌파', '사천왕 격파', '라이벌과 챔피언 결정전 승리']),
]

const letsGoBosses = [
  boss('brock-lg', '웅', '회색 체육관', 1, ['rock'], 'Lv.11–12'),
  boss('misty-lg', '이슬', '블루 체육관', 2, ['water'], 'Lv.18–19'),
  boss('surge-lg', '마티스', '갈색 체육관', 3, ['electric'], 'Lv.25–26'),
  boss('erika-lg', '민화', '무지개 체육관', 4, ['grass'], 'Lv.33–34'),
  boss('koga-lg', '독수', '연분홍 체육관', 5, ['poison'], 'Lv.43–44'),
  boss('giovanni-silph-lg', '비주기', '실프주식회사', 6, ['ground'], 'Lv.39–41'),
  boss('sabrina-lg', '초련', '노랑 체육관', 6, ['psychic'], 'Lv.43–44'),
  boss('blaine-lg', '강연', '홍련 체육관', 7, ['fire'], 'Lv.47–48'),
  boss('giovanni-gym-lg', '비주기', '상록 체육관', 7, ['ground'], 'Lv.49–50'),
  boss('lorelei-lg', '칸나', '사천왕', 8, ['ice', 'water'], 'Lv.51–52'),
  boss('bruno-lg', '시바', '사천왕', 8, ['fighting'], 'Lv.52'),
  boss('agatha-lg', '국화', '사천왕', 8, ['ghost', 'poison'], 'Lv.53'),
  boss('lance-lg', '목호', '사천왕', 8, ['dragon'], 'Lv.54'),
  boss('trace-lg', '라이벌', '챔피언', 8, ['normal'], 'Lv.56–57'),
]

const galarChapters = [
  chapter('gal-1', '펄롱마을 → 엔진시티', '파트너와 체육관 챌린지', 'Lv.5–15', ['postwick', 'slumbering-weald', 'route-1', 'wedgehurst', 'route-2', 'wild-area', 'motostoke'], ['스타터 선택', '와일드에리어 통과', '체육관 챌린지 개막']),
  chapter('gal-2', '터검니호 동쪽 → 터프마을', '풀배지', 'Lv.14–20', ['rolling-fields', 'dappled-grove', 'watchtower-ruins', 'east-lake-axewell', 'route-3', 'galar-mine', 'route-4', 'turffield'], ['터프스타디움 아킬 격파'], ['물 위 자전거 이전 와일드에리어 남부']),
  chapter('gal-3', '바우마을', '물배지', 'Lv.18–24', ['route-5', 'hulbury', 'galar-mine-no-2', 'motostoke-outskirts'], ['바우스타디움 야청 격파', '로토무자전거 획득']),
  chapter('gal-4', '엔진시티', '불꽃배지', 'Lv.23–28', ['motostoke'], ['엔진스타디움 순무 격파']),
  chapter('gal-5', '너클시티 → 래터럴마을', '격투/고스트배지', 'Lv.27–36', ['north-lake-miloch', 'giants-seat', 'hammerlocke', 'route-6', 'stow-on-side', 'glimwood-tangle'], ['소드에서는 채두, 실드에서는 어니언 격파']),
  chapter('gal-6', '아라베스크마을', '페어리배지', 'Lv.34–38', ['ballonlea'], ['아라베스크스타디움 포플러 격파']),
  chapter('gal-7', '키르쿠스마을', '바위/얼음배지', 'Lv.37–42', ['route-7', 'route-8', 'circhester', 'route-9'], ['소드에서는 마쿠와, 실드에서는 멜론 격파'], ['수상 로토무자전거']),
  chapter('gal-8', '스파이크마을', '악배지', 'Lv.40–46', ['spikemuth'], ['스파이크체육관 두송 격파']),
  chapter('gal-9', '너클시티', '드래곤배지와 챔피언컵 진출', 'Lv.45–49', ['route-10', 'hammerlocke'], ['너클스타디움 금랑 격파']),
  chapter('gal-10', '슛시티와 에너지플랜트', '챔피언컵·무한다이노·단델', 'Lv.47–65', ['wyndon', 'rose-tower', 'energy-plant', 'slumbering-weald', 'tower-summit'], ['챔피언컵 예선과 본선 통과', '무한다이노 격파', '챔피언 단델 격파']),
  chapter('gal-11', '챔피언 이후 가라르', '전설의 검·방패 사건', 'Lv.58–70', ['slumbering-weald', 'wedgehurst', 'hammerlocke-stadium'], ['소드워드/실디와트 사건 해결', '자시안/자마젠타 포획', '호브의 마지막 승부'], ['배틀타워', '본토 안개 날씨']),
  chapter('gal-12', '갑옷섬 입문', '도장 도착과 첫 번째 수행', 'Lv.10–65 · 진행도 스케일링', ['fields-of-honor', 'master-dojo'], ['도장 라이벌 첫 승부', '빠르기 야돈 3마리 포획'], ['갑옷섬 기술가르침', '갑옷광석']),
  chapter('gal-13', '갑옷섬 수행', '버섯 채집과 다이버섯 전투', 'Lv.20–68 · 진행도 스케일링', ['forest-of-focus', 'warm-up-tunnel', 'master-dojo'], ['두 번째 수행', '라이벌 다이맥스 승부', '치고마 받기'], ['다이수프']),
  chapter('gal-14', '쌍권의 탑', '치고마와 물/악의 탑 선택', 'Lv.30–70 · 진행도 스케일링', ['challenge-road', 'tower-of-darkness', 'tower-of-waters'], ['치고마와 친밀도 올리기', '물의 탑 또는 악의 탑 한 곳만 선택', '우라오스 진화'], ['우라오스']),
  chapter('gal-15', '갑옷섬 후일담', '다이꿀과 마스터드 최종전', 'Lv.70–75', ['honeycalm-island', 'master-dojo'], ['다이꿀 획득', '마스터드 최종전'], ['우라오스 거다이맥스']),
  chapter('gal-16', '왕관설원 입문', '피오니와 맥스다이맥스 어드벤처', 'Lv.60–70', ['slippery-slope', 'freezington', 'max-lair'], ['피오니 탐험대 합류', '렌탈 포켓몬으로 맥스다이맥스 어드벤처 진행'], ['왕관패스와 업데이트 1.3.0 필요']),
  chapter('gal-17', '풍요의 왕', '버드렉스와 애마 선택', 'Lv.65–80', ['freezington', 'old-cemetery', 'snowslide-slope', 'crown-shrine'], ['당근밭 한 곳만 선택', '블리자포스 또는 레이스포스 분기', '버드렉스 포획'], ['유대의고삐 폼체인지']),
  chapter('gal-18', '왕관설원 전설 탐사', '거인·새·울트라비스트', 'Lv.70–80', ['giants-bed', 'split-decision-ruins', 'dyna-tree-hill', 'max-lair'], ['레지에레키/레지드래고 한 쪽 선택', '가라르 전설의 새 조사', '피오니의 단서 완료'], ['가라르 스타 토너먼트']),
]

const galarBosses = [
  boss('hop-route-2', '호브', '2번도로 라이벌전', 1, ['normal'], 'Lv.5–7', { sequence: 1 }),
  boss('hop-motostoke', '호브', '엔진시티 라이벌전', 2, ['normal'], 'Lv.11–14', { sequence: 2 }),
  boss('bede-mine', '비트', '가라르광산 라이벌전', 2, ['psychic'], 'Lv.13–16', { sequence: 3 }),
  boss('milo', '아킬', '터프 스타디움', 2, ['grass'], 'Lv.19–20'),
  boss('hop-route-5', '호브', '5번도로 라이벌전', 3, ['normal'], 'Lv.18–21', { sequence: 5 }),
  boss('nessa', '야청', '바우 스타디움', 3, ['water'], 'Lv.22–24'),
  boss('bede-mine-2', '비트', '제2광산 라이벌전', 4, ['psychic'], 'Lv.21–24'),
  boss('marnie-motostoke', '마리', '엔진시티 라이벌전', 4, ['dark'], 'Lv.24–26'),
  boss('kabu', '순무', '엔진 스타디움', 4, ['fire'], 'Lv.25–27'),
  boss('hop-stow', '호브', '래터럴마을 라이벌전', 5, ['normal'], 'Lv.29–33'),
  boss('bede-stow', '비트', '래터럴마을 라이벌전', 5, ['psychic', 'fairy'], 'Lv.32–35'),
  boss('bea', '채두', '래터럴 스타디움', 5, ['fighting'], 'Lv.34–36', { gameIds: ['sword'], branchGroup: 'version-gym' }),
  boss('allister', '어니언', '래터럴 스타디움', 5, ['ghost'], 'Lv.34–36', { gameIds: ['shield'], branchGroup: 'version-gym' }),
  boss('opal', '포플러', '아라베스크 스타디움', 6, ['fairy'], 'Lv.36–38'),
  boss('hop-route-7', '호브', '7번도로 라이벌전', 7, ['normal'], 'Lv.34–37'),
  boss('gordie', '마쿠와', '키르쿠스 스타디움', 7, ['rock'], 'Lv.40–42', { gameIds: ['sword'], branchGroup: 'version-gym' }),
  boss('melony', '멜론', '키르쿠스 스타디움', 7, ['ice'], 'Lv.40–42', { gameIds: ['shield'], branchGroup: 'version-gym' }),
  boss('hop-circhester', '호브', '키르쿠스마을 라이벌전', 7, ['normal'], 'Lv.40–41'),
  boss('marnie-spikemuth', '마리', '스파이크마을 라이벌전', 8, ['dark'], 'Lv.42–44'),
  boss('piers', '두송', '스파이크 체육관', 8, ['dark'], 'Lv.44–46'),
  boss('raihan', '금랑', '너클 스타디움', 9, ['dragon'], 'Lv.46–48'),
  boss('marnie-cup', '마리', '챔피언컵 준결승', 10, ['dark'], 'Lv.47–49'),
  boss('hop-cup', '호브', '챔피언컵 준결승', 10, ['normal'], 'Lv.48–49'),
  boss('oleana', '올리브', '로즈타워', 10, ['steel', 'ice'], 'Lv.50–52'),
  boss('bede-finals', '비트', '챔피언컵 난입전', 10, ['fairy'], 'Lv.51–53'),
  boss('nessa-finals', '루리나', '챔피언컵 결승', 10, ['water'], 'Lv.51–53'),
  boss('bea-finals', '채두', '챔피언컵 결승', 10, ['fighting'], 'Lv.52–54', { gameIds: ['sword'], branchGroup: 'version-finals' }),
  boss('allister-finals', '어니언', '챔피언컵 결승', 10, ['ghost'], 'Lv.52–54', { gameIds: ['shield'], branchGroup: 'version-finals' }),
  boss('raihan-finals', '금랑', '챔피언컵 결승', 10, ['dragon'], 'Lv.53–55'),
  boss('rose', '로즈', '에너지플랜트', 10, ['steel'], 'Lv.55–57'),
  boss('eternatus', '무한다이노', '블랙나이트 1차전', 10, ['poison', 'dragon'], 'Lv.60'),
  boss('eternamax', '무한다이노', '무한다이맥스 협동전', 10, ['poison', 'dragon'], 'Lv.60'),
  boss('leon', '단델', '챔피언', 10, ['fire', 'dragon'], 'Lv.62–65'),
  boss('zacian-capture', '자시안', '포스트게임 전설 포획전', 11, ['fairy'], 'Lv.70', { gameIds: ['sword'], branchGroup: 'version-box-legend' }),
  boss('zamazenta-capture', '자마젠타', '포스트게임 전설 포획전', 11, ['fighting'], 'Lv.70', { gameIds: ['shield'], branchGroup: 'version-box-legend' }),
  boss('hop-final', '호브', '포스트게임 마지막 승부', 11, ['normal'], 'Lv.58–70'),
  boss('klara-1', '도정', '갑옷섬 첫 라이벌전', 12, ['poison'], '진행도 스케일링', { gameIds: ['sword'], branchGroup: 'version-dojo-rival' }),
  boss('avery-1', '세이버리', '갑옷섬 첫 라이벌전', 12, ['psychic'], '진행도 스케일링', { gameIds: ['shield'], branchGroup: 'version-dojo-rival' }),
  boss('mustard-dojo', '마스터드', '마스터 도장 입문전', 12, ['fighting'], '진행도 스케일링'),
  boss('klara-2', '도정', '두 번째 수행', 13, ['poison'], '진행도 스케일링', { gameIds: ['sword'], branchGroup: 'version-dojo-rival' }),
  boss('avery-2', '세이버리', '두 번째 수행', 13, ['psychic'], '진행도 스케일링', { gameIds: ['shield'], branchGroup: 'version-dojo-rival' }),
  boss('klara-3', '도정', '도장 다이맥스전', 13, ['poison'], '진행도 스케일링', { gameIds: ['sword'], branchGroup: 'version-dojo-rival' }),
  boss('avery-3', '세이버리', '도장 다이맥스전', 13, ['psychic'], '진행도 스케일링', { gameIds: ['shield'], branchGroup: 'version-dojo-rival' }),
  boss('mustard-tower', '마스터드', '쌍권의 탑 정상', 14, ['fighting'], 'Lv.30 또는 Lv.70', { branchGroup: 'single-tower-choice', warning: '두 탑 중 한 곳만 선택할 수 있습니다.' }),
  boss('vespiquen-max-honey', '다이맥스 비퀸', '다이꿀 수급 전투', 15, ['bug', 'flying'], 'Lv.80'),
  boss('mustard-final', '마스터드', '갑옷섬 최종전', 15, ['fighting'], 'Lv.73–75'),
  boss('peony', '피오니', '왕관설원역', 16, ['steel'], 'Lv.70', { winRequired: false, warning: '패배해도 왕관설원 스토리가 진행됩니다.' }),
  boss('calyrex-first', '버드렉스', '프리즈마을 첫 전투', 17, ['psychic', 'grass'], 'Lv.70', { warning: '첫 전투에서는 포획할 수 없습니다.' }),
  boss('glastrier-freezington', '블리자포스', '프리즈마을 습격', 17, ['ice'], 'Lv.75', { branchGroup: 'steed-choice-prelude', warning: '블리자포스 경로에서만 진행합니다.' }),
  boss('spectrier-freezington', '레이스포스', '프리즈마을 습격', 17, ['ghost'], 'Lv.75', { branchGroup: 'steed-choice-prelude', warning: '레이스포스 경로에서만 진행합니다.' }),
  boss('calyrex-ice-rider', '버드렉스 백마 탄 모습', '왕관의 사당', 17, ['psychic', 'ice'], 'Lv.80', { branchGroup: 'steed-choice', warning: '블리자포스 경로를 골랐을 때만 진행합니다.' }),
  boss('calyrex-shadow-rider', '버드렉스 흑마 탄 모습', '왕관의 사당', 17, ['psychic', 'ghost'], 'Lv.80', { branchGroup: 'steed-choice', warning: '레이스포스 경로를 골랐을 때만 진행합니다.' }),
  boss('regirock-capture', '레지락', '바위산의 유적', 18, ['rock'], 'Lv.70'),
  boss('regice-capture', '레지아이스', '빙산의 유적', 18, ['ice'], 'Lv.70'),
  boss('registeel-capture', '레지스틸', '흑철의 유적', 18, ['steel'], 'Lv.70'),
  boss('regieleki-capture', '레지에레키', '선택의 유적', 18, ['electric'], 'Lv.70', { branchGroup: 'split-decision-regi', warning: '레지드래고와 동시에 선택할 수 없습니다.' }),
  boss('regidrago-capture', '레지드래고', '선택의 유적', 18, ['dragon'], 'Lv.70', { branchGroup: 'split-decision-regi', warning: '레지에레키와 동시에 선택할 수 없습니다.' }),
  boss('articuno-galar-capture', '가라르 프리져', '왕관설원 배회 포획', 18, ['psychic', 'flying'], 'Lv.70'),
  boss('zapdos-galar-capture', '가라르 썬더', '와일드에리어 배회 포획', 18, ['fighting', 'flying'], 'Lv.70'),
  boss('moltres-galar-capture', '가라르 파이어', '갑옷섬 배회 포획', 18, ['dark', 'flying'], 'Lv.70'),
  boss('galar-star-tournament', '가라르 스타 토너먼트', '왕관설원 최종 토너먼트', 18, ['normal'], 'Lv.72–80'),
]

const sinnohRemakeChapters = [
  chapter('bd-1', '떡잎마을 → 무쇠시티', '콜배지', 'Lv.5–14', ['twinleaf', 'route-201', 'lake-verity', 'sandgem', 'route-202', 'jubilife', 'route-203', 'oreburgh-gate', 'oreburgh'], ['스타터 선택', '무쇠체육관 강석 격파'], ['포켓치 비전기술 바위깨기']),
  chapter('bd-2', '꽃향기마을 → 영원시티', '포리스트배지', 'Lv.14–22', ['route-204', 'floaroma', 'valley-windworks', 'route-205', 'eterna-forest', 'eterna'], ['골짜기발전소 사건 해결', '영원체육관 유채 격파'], ['포켓치 비전기술 풀베기']),
  chapter('bd-3', '장막시티', '코블배지', 'Lv.20–30', ['route-206', 'wayward-cave', 'route-207', 'mt-coronet', 'route-208', 'hearthome', 'route-209', 'solaceon', 'route-210', 'route-215', 'veilstone'], ['장막체육관 자두 격파'], ['포켓치 비전기술 공중날기']),
  chapter('bd-4', '들판시티 → 연고시티', '펜배지와 레릭배지', 'Lv.27–36', ['route-214', 'valor-lakefront', 'route-213', 'pastoria', 'great-marsh', 'route-212', 'hearthome'], ['들판체육관 맥실러 격파', '갤럭시단 조무래기 추적', '연고체육관 멜리사 격파'], ['포켓치 비전기술 안개제거']),
  chapter('bd-5', '봉신마을 → 운하시티', '마인배지', 'Lv.32–39', ['route-210', 'celestic', 'route-211', 'route-218', 'canalave', 'iron-island'], ['봉신마을 유적 조사', '운하체육관 동관 격파'], ['포켓치 비전기술 파도타기', '포켓치 비전기술 괴력']),
  chapter('bd-6', '선단시티', '글레이셔배지', 'Lv.36–42', ['route-216', 'route-217', 'acuity-lakefront', 'snowpoint'], ['선단체육관 무청 격파'], ['포켓치 비전기술 락클라임']),
  chapter('bd-7', '갤럭시단 본부 → 창기둥', '디아루가/펄기아 사건', 'Lv.39–48', ['lake-verity', 'lake-valor', 'lake-acuity', 'veilstone', 'mt-coronet', 'spear-pillar'], ['갤럭시단 본부 돌파', '창기둥에서 태홍 격파', '디아루가/펄기아와 조우'], ['포켓치 비전기술 폭포오르기']),
  chapter('bd-8', '물가시티 → 신오리그', '비컨배지와 챔피언 난천', 'Lv.46–66', ['route-222', 'sunnyshore', 'route-223', 'victory-road', 'pokemon-league'], ['물가체육관 전진 격파', '챔피언로드 돌파', '사천왕과 난천 격파']),
]

const sinnohRemakeBosses = [
  boss('roark-bdsp', '강석', '무쇠 체육관', 1, ['rock'], 'Lv.12–14'),
  boss('gardenia-bdsp', '유채', '영원 체육관', 2, ['grass'], 'Lv.19–22'),
  boss('maylene-bdsp', '자두', '장막 체육관', 3, ['fighting'], 'Lv.27–30'),
  boss('wake-bdsp', '맥실러', '들판 체육관', 4, ['water'], 'Lv.27–30'),
  boss('fantina-bdsp', '멜리사', '연고 체육관', 4, ['ghost'], 'Lv.32–36'),
  boss('byron-bdsp', '동관', '운하 체육관', 5, ['steel'], 'Lv.36–39'),
  boss('candice-bdsp', '무청', '선단 체육관', 6, ['ice'], 'Lv.38–42'),
  boss('volkner-bdsp', '전진', '물가 체육관', 8, ['electric'], 'Lv.46–49'),
  boss('aaron-bdsp', '충호', '사천왕', 8, ['bug'], 'Lv.53–57'),
  boss('bertha-bdsp', '들국화', '사천왕', 8, ['ground'], 'Lv.55–59'),
  boss('flint-bdsp', '대엽', '사천왕', 8, ['fire'], 'Lv.58–61'),
  boss('lucian-bdsp', '오엽', '사천왕', 8, ['psychic'], 'Lv.59–63'),
  boss('cynthia-bdsp', '난천', '챔피언', 8, ['dragon'], 'Lv.60–66'),
]

const hisuiChapters = [
  chapter('his-1', '축복마을 → 흑요 들판', '조사단 입단과 숲의 왕', 'Lv.5–18', ['jubilife-village', 'obsidian-fieldlands', 'grandtree-arena'], ['스타터 선택과 조사단 입단', '신비록 라이드 해금', '진화한 숲의 왕 사마자르 진정']),
  chapter('his-2', '홍련 습지', '금강단·진주단과 늪지의 여왕', 'Lv.18–30', ['crimson-mirelands', 'solaceon-ruins', 'brava-arena'], ['미도의 의뢰 해결', '다투곰 라이드 해금', '진화한 늪지의 여왕 드레디어 진정']),
  chapter('his-3', '군청 해안', '화산섬과 섬의 왕', 'Lv.29–36', ['cobalt-coastlands', 'firespit-island', 'molten-arena'], ['유라의 사건과 해안 조사', '대쓰여너 라이드 해금', '진화한 섬의 왕 윈디 진정']),
  chapter('his-4', '천관산 기슭', '동굴과 동굴의 왕', 'Lv.35–46', ['coronet-highlands', 'ancient-quarry', 'moonview-arena'], ['전목의 시험을 통과해 산 정상 진입', '포푸니크 라이드 해금', '진화한 동굴의 왕 붐볼 진정']),
  chapter('his-5', '순백 동토', '설원과 동토의 왕', 'Lv.45–56', ['alabaster-icelands', 'snowpoint-temple', 'icepeak-arena'], ['선단신전의 수수께끼 해결', '워글 라이드 해금', '진화한 동토의 왕 크레베이스 진정']),
  chapter('his-6', '세 호수와 추방', '붉은 사슬 제작', 'Lv.55–60', ['lake-verity', 'lake-valor', 'lake-acuity', 'ancient-retreat'], ['세 호수의 시련 완수', '붉은 사슬 제작', '축복마을 귀환']),
  chapter('his-7', '신오신전', '전목과 시공의 균열 최종전', 'Lv.60–65', ['temple-of-sinnoh', 'coronet-highlands'], ['전목 격파', '디아루가/펄기아 포획', '오리진폼 디아루가/펄기아 진정']),
]

const hisuiBosses = [
  boss('kleavor', '사마자르', '숲의 왕', 1, ['bug', 'rock'], 'Lv.18'),
  boss('lilligant-hisui', '드레디어(히스이의 모습)', '늪지의 여왕', 2, ['grass', 'fighting'], 'Lv.30'),
  boss('arcanine-hisui', '윈디(히스이의 모습)', '섬의 왕', 3, ['fire', 'rock'], 'Lv.36'),
  boss('electrode-hisui', '붐볼(히스이의 모습)', '동굴의 왕', 4, ['electric', 'grass'], 'Lv.46'),
  boss('avalugg-hisui', '크레베이스(히스이의 모습)', '동토의 왕', 5, ['ice', 'rock'], 'Lv.56'),
  boss('kamado', '전목', '은하단 단장', 7, ['normal', 'fighting'], 'Lv.60–61'),
  boss('space-time-legend', '디아루가/펄기아', '신오신전', 7, ['steel', 'water'], 'Lv.65'),
  boss('origin-legend', '오리진폼 디아루가/펄기아', '최종 진정', 7, ['steel', 'water'], 'Lv.65'),
]

const paldeaChapters = [
  chapter('pal-1', '티스푼마을 → 테이블시티', '보물찾기 출발', 'Lv.5–10', ['cabo-poco', 'poco-path', 'los-platos', 'south-province-area-one', 'mesagoza'], ['스타터 선택', '아카데미 입학', '챔피언로드·레전드루트·스타더스트★스트리트 시작'], ['코라이돈/미라이돈 라이드']),
  chapter('pal-2', '세르클체육관·암벽의 주인', '첫 체육관과 주인 포켓몬', 'Lv.14–16', ['south-province-area-two', 'cortondo', 'south-province-area-three'], ['세르클체육관 단풍 격파', '암벽의 주인 절벼게 격파'], ['대시']),
  chapter('pal-3', '보울체육관·대공의 주인·악 군단', '동부와 서부 진출', 'Lv.16–21', ['artazon', 'east-province-area-one', 'west-province-area-one'], ['보울체육관 콜사 격파', '대공의 주인 떨구새 격파', '악 군단 피나 격파'], ['물 위 이동']),
  chapter('pal-4', '누룩스체육관·불꽃 군단', '전기배지와 스타단', 'Lv.23–29', ['east-province-area-two', 'levincia', 'east-province-area-one'], ['누룩스체육관 모야모 격파', '불꽃 군단 메로코 격파']),
  chapter('pal-5', '잠강의 주인·카라프체육관', '동부 지하와 서부 사막', 'Lv.28–33', ['east-province-area-three', 'asado-desert', 'cascarrafa'], ['잠강의 주인 꿈트렁 격파', '카라프체육관 곤포 격파'], ['점프 강화']),
  chapter('pal-6', '독 군단·참푸르체육관', '중반 보물찾기', 'Lv.32–36', ['tagtree-thicket', 'medali', 'west-province-area-three'], ['독 군단 추명 격파', '참푸르체육관 청목 격파']),
  chapter('pal-7', '프리지체육관·토진의 주인', '설산과 로스트사막', 'Lv.41–45', ['glaseado-mountain', 'montenevera', 'asado-desert'], ['프리지체육관 라임 격파', '토진의 주인 위대한엄니/무쇠바퀴 격파'], ['활공']),
  chapter('pal-8', '베이크체육관·나페산체육관·페어리 군단', '남부 고지와 북부 설원', 'Lv.44–51', ['south-province-area-six', 'alfornada', 'glaseado-mountain', 'north-province-area-three'], ['베이크체육관 리파 격파', '나페산체육관 그루샤 격파', '페어리 군단 오르티가 격파']),
  chapter('pal-9', '위룡의 주인·격투 군단', '18개 배지 완성', 'Lv.55–56', ['casseroya-lake', 'north-province-area-two'], ['위룡의 주인 어써러셔·싸리용 격파', '격투 군단 비파 격파'], ['벽타기']),
  chapter('pal-10', '챔피언로드 결승', '사천왕과 톱 챔피언', 'Lv.57–62', ['pokemon-league'], ['사천왕 칠리·뽀삐·청목·팔자크 격파', '톱 챔피언 테사 격파']),
  chapter('pal-11', '레전드루트 결승', '페퍼와 비전스파이스', 'Lv.58–63', ['poco-path'], ['페퍼의 파티 격파']),
  chapter('pal-12', '스타더스트★스트리트 결승', '카시오페아의 정체', 'Lv.60–63', ['academy-schoolyard', 'mesagoza'], ['클라벨 교장 격파', '카시오페아 모란 격파']),
  chapter('pal-13', '챔피언 네모', '라이벌 최종전', 'Lv.65–66', ['mesagoza'], ['챔피언 네모와 최종전 승리']),
  chapter('pal-14', '에리어 제로', '더 홈웨이와 엔딩', 'Lv.62–67', ['area-zero', 'research-station', 'zero-lab'], ['에리어 제로 관측소 네 곳 해제', '낙원방어프로토콜 격파', '엔딩 감상']),
]

const paldeaBosses = [
  boss('katy', '단풍', '세르클 체육관', 2, ['bug'], 'Lv.14–15'),
  boss('klawf-titan', '절벼게', '암벽의 주인', 2, ['rock'], 'Lv.16'),
  boss('brassius', '콜사', '보울 체육관', 3, ['grass'], 'Lv.16–17'),
  boss('bombirdier-titan', '떨구새', '대공의 주인', 3, ['flying', 'dark'], 'Lv.20'),
  boss('giacomo', '피나', '악 군단', 3, ['dark'], 'Lv.20–21'),
  boss('iono', '모야모', '누룩스 체육관', 4, ['electric'], 'Lv.23–24'),
  boss('mela', '메로코', '불꽃 군단', 4, ['fire'], 'Lv.26–27'),
  boss('orthworm-titan', '꿈트렁', '잠강의 주인', 5, ['steel'], 'Lv.28'),
  boss('kofu', '곤포', '카라프 체육관', 5, ['water'], 'Lv.29–30'),
  boss('atticus', '추명', '독 군단', 6, ['poison'], 'Lv.32–33'),
  boss('larry-gym', '청목', '참푸르 체육관', 6, ['normal'], 'Lv.35–36'),
  boss('ryme', '라임', '프리지 체육관', 7, ['ghost'], 'Lv.41–42'),
  boss('quaking-earth-titan', '위대한엄니/무쇠바퀴', '토진의 주인', 7, ['ground'], 'Lv.44–45'),
  boss('tulip', '리파', '베이크 체육관', 8, ['psychic'], 'Lv.44–45'),
  boss('grusha', '그루샤', '나페산 체육관', 8, ['ice'], 'Lv.47–48'),
  boss('ortega', '오르티가', '페어리 군단', 8, ['fairy'], 'Lv.50–51'),
  boss('false-dragon-titan', '어써러셔·싸리용', '위룡의 주인', 9, ['water', 'dragon'], 'Lv.55–56'),
  boss('eri', '비파', '격투 군단', 9, ['fighting'], 'Lv.55–56'),
  boss('rika', '칠리', '사천왕', 10, ['ground'], 'Lv.57–58'),
  boss('poppy', '뽀삐', '사천왕', 10, ['steel'], 'Lv.58–59'),
  boss('larry-e4', '청목', '사천왕', 10, ['flying'], 'Lv.59–60'),
  boss('hassel', '팔자크', '사천왕', 10, ['dragon'], 'Lv.60–61'),
  boss('geeta', '테사', '톱 챔피언', 10, ['rock'], 'Lv.61–62'),
  boss('arven', '페퍼', '레전드루트 결승', 11, ['normal'], 'Lv.58–63'),
  boss('clavell', '클라벨', '스타더스트★스트리트', 12, ['psychic'], 'Lv.60–61'),
  boss('penny', '모란', '카시오페아', 12, ['fairy'], 'Lv.62–63'),
  boss('nemona', '네모', '챔피언 최종전', 13, ['normal'], 'Lv.65–66'),
  boss('paradise-protection', '낙원방어프로토콜', '제로랩 최종전', 14, ['dragon'], 'Lv.66–67'),
]

const gen6Fields: FieldMove[] = [
  { id: 'cut', name: '풀베기', type: 'normal', unlockChapter: 2, required: false },
  { id: 'rock-smash', name: '바위깨기', type: 'fighting', unlockChapter: 2, required: false },
  { id: 'strength', name: '괴력', type: 'normal', unlockChapter: 2, required: true },
  { id: 'surf', name: '파도타기', type: 'water', unlockChapter: 3, required: true },
  { id: 'fly', name: '공중날기', type: 'flying', unlockChapter: 4, required: false },
  { id: 'waterfall', name: '폭포오르기', type: 'water', unlockChapter: 9, required: true },
]

const orasFields: FieldMove[] = [
  { id: 'cut', name: '풀베기', type: 'normal', unlockChapter: 1, required: false },
  { id: 'rock-smash', name: '바위깨기', type: 'fighting', unlockChapter: 3, required: true },
  { id: 'strength', name: '괴력', type: 'normal', unlockChapter: 4, required: true },
  { id: 'surf', name: '파도타기', type: 'water', unlockChapter: 5, required: true },
  { id: 'fly', name: '공중날기', type: 'flying', unlockChapter: 6, required: false },
  { id: 'dive', name: '다이빙', type: 'water', unlockChapter: 8, required: true },
  { id: 'waterfall', name: '폭포오르기', type: 'water', unlockChapter: 9, required: true },
]

export const modernFamilies: Record<ModernFamilyId, ModernFamilyConfig> = {
  kalos6: { id: 'kalos6', generation: 6, region: '칼로스', chapters: kalosChapters, bosses: kalosBosses, fieldMoves: gen6Fields, moveReminder: { chapter: 7, location: '버들비마을', cost: '하트비늘 1개' }, postgame: ['기남시티 배틀하우스', '메가링 강화와 메가스톤', '핸섬 에피소드'] },
  hoenn6: { id: 'hoenn6', generation: 6, region: '호연', chapters: orasChapters, bosses: orasBosses, fieldMoves: orasFields, moveReminder: { chapter: 4, location: '단풍마을', cost: '하트비늘 1개' }, postgame: ['에피소드 델타와 레쿠쟈·테오키스', '배틀리조트', '환상의 장소와 전설 포켓몬'] },
  alola7: { id: 'alola7', generation: 7, region: '알로라', chapters: alolaChapters, bosses: alolaBosses, fieldMoves: [], moveReminder: { chapter: 8, location: '라나키라마운틴 포켓몬센터', cost: '무료' }, postgame: ['울트라비스트 포획 임무', '배틀트리', '수호신과 네크로즈마'] },
  'alola7-ultra': { id: 'alola7-ultra', generation: 7, region: '알로라', chapters: ultraChapters, bosses: ultraBosses, fieldMoves: [], moveReminder: { chapter: 8, location: '라나키라마운틴 포켓몬센터', cost: '무료' }, postgame: ['에피소드 RR', '울트라워프라이드 전설 포켓몬', '배틀트리와 수호신'] },
  letsgo7: { id: 'letsgo7', generation: 7, region: '관동', chapters: letsGoChapters, bosses: letsGoBosses, fieldMoves: [], postgame: ['블루와 체육관 관장 재대결', '블루시티동굴의 뮤츠', '마스터 트레이너와 레드'] },
  galar8: { id: 'galar8', generation: 8, region: '가라르', chapters: galarChapters, bosses: galarBosses, fieldMoves: [], moveReminder: { chapter: 1, location: '모든 포켓몬센터', cost: '무료' }, mainStoryChapterCount: 10, postgame: ['소드·실드 전설 에피소드', '배틀타워', '갑옷섬 마스터 도장', '왕관설원 전설의 메모'] },
  sinnoh8: { id: 'sinnoh8', generation: 8, region: '신오', chapters: sinnohRemakeChapters, bosses: sinnohRemakeBosses, fieldMoves: [], moveReminder: { chapter: 4, location: '들판시티', cost: '하트비늘 10회 이후 무료' }, postgame: ['전국도감과 파이트에리어', '배틀타워', '라마나스파크와 하드마운틴'] },
  hisui8: { id: 'hisui8', generation: 8, region: '히스이', chapters: hisuiChapters, bosses: hisuiBosses, fieldMoves: [], moveReminder: { chapter: 1, location: '기술 변경 메뉴', cost: '무료' }, postgame: ['모든 석판과 월로·기라티나', '히스이도감 완성과 아르세우스', '대량발생·시공의 뒤틀림·서브 임무'] },
  paldea9: {
    id: 'paldea9',
    generation: 9,
    region: '팔데아',
    chapters: paldeaChapters,
    bosses: paldeaBosses,
    fieldMoves: [],
    moveReminder: { chapter: 1, location: '기술 메뉴', cost: '무료' },
    postgame: ['체육관 재대결과 학교 최강 선발대회', '에리어 제로 패러독스 포켓몬', '벽록의 가면·남청의 원반 DLC는 본편 엔딩 조건과 분리'],
    storyProgression: {
      mode: 'recommended-open-world',
      recommendedOrder: [
        'katy', 'klawf-titan', 'brassius', 'bombirdier-titan', 'giacomo', 'iono',
        'mela', 'orthworm-titan', 'kofu', 'atticus', 'larry-gym', 'ryme',
        'quaking-earth-titan', 'tulip', 'grusha', 'ortega', 'false-dragon-titan', 'eri',
        'rika', 'poppy', 'larry-e4', 'hassel', 'geeta', 'arven', 'clavell', 'penny',
        'nemona', 'paradise-protection',
      ],
      prerequisites: {
        rika: ['katy', 'brassius', 'iono', 'kofu', 'larry-gym', 'ryme', 'tulip', 'grusha'],
        poppy: ['rika'],
        'larry-e4': ['poppy'],
        hassel: ['larry-e4'],
        geeta: ['hassel'],
        arven: ['klawf-titan', 'bombirdier-titan', 'orthworm-titan', 'quaking-earth-titan', 'false-dragon-titan'],
        clavell: ['giacomo', 'mela', 'atticus', 'ortega', 'eri'],
        penny: ['clavell'],
        nemona: ['geeta'],
        'paradise-protection': ['arven', 'penny', 'nemona'],
      },
    },
  },
}

const modernGameDefinitions: ModernGameDefinition[] = [
  { id: 'x', familyId: 'kalos6', endpoint: '챔피언 카르네', accent: '#4267b2', starters: [650, 653, 656], fossils: [[696, 698]], notes: ['제르네아스와 플라드리의 X 버전 최종병기를 따릅니다.'] },
  { id: 'y', familyId: 'kalos6', endpoint: '챔피언 카르네', accent: '#b3313c', starters: [650, 653, 656], fossils: [[696, 698]], notes: ['이벨타르와 플라드리의 Y 버전 최종병기를 따릅니다.'] },
  { id: 'omega-ruby', familyId: 'hoenn6', endpoint: '챔피언 성호', accent: '#c53b48', starters: [252, 255, 258], fossils: [[345, 347]], notes: ['마그마단·마적·원시그란돈 경로를 사용합니다.'] },
  { id: 'alpha-sapphire', familyId: 'hoenn6', endpoint: '챔피언 성호', accent: '#345fbd', starters: [252, 255, 258], fossils: [[345, 347]], notes: ['아쿠아단·아강·원시가이오가 경로를 사용합니다.'] },
  { id: 'sun', familyId: 'alola7', endpoint: '챔피언 결정전 쿠쿠이', accent: '#df7126', starters: [722, 725, 728], fossils: [], notes: ['포켓라이드가 이동을 맡으므로 파티에 비전기술 담당이 필요하지 않습니다.'] },
  { id: 'moon', familyId: 'alola7', endpoint: '챔피언 결정전 쿠쿠이', accent: '#4e5da8', starters: [722, 725, 728], fossils: [], notes: ['포켓라이드가 이동을 맡으므로 파티에 비전기술 담당이 필요하지 않습니다.'] },
  { id: 'ultra-sun', familyId: 'alola7-ultra', endpoint: '챔피언 결정전 하우', accent: '#e6792b', starters: [722, 725, 728], fossils: [], notes: ['울트라네크로즈마와 마츠리카 시련을 포함한 울트라 버전 전용 순서입니다.'] },
  { id: 'ultra-moon', familyId: 'alola7-ultra', endpoint: '챔피언 결정전 하우', accent: '#5964b7', starters: [722, 725, 728], fossils: [], notes: ['울트라네크로즈마와 마츠리카 시련을 포함한 울트라 버전 전용 순서입니다.'] },
  { id: 'lets-go-pikachu', familyId: 'letsgo7', endpoint: '라이벌 챔피언', accent: '#f4c430', starters: [25], fossils: [[138, 140]], notes: ['파트너 비전기술이 이동을 맡으며 파티에 HM 기술을 요구하지 않습니다.', '포획 콤보·유인향·공중 출현은 완전성 게이트가 닫혀 있어 추천에 사용하지 않습니다.'] },
  { id: 'lets-go-eevee', familyId: 'letsgo7', endpoint: '라이벌 챔피언', accent: '#9b6b43', starters: [133], fossils: [[138, 140]], notes: ['파트너 비전기술이 이동을 맡으며 파티에 HM 기술을 요구하지 않습니다.', '포획 콤보·유인향·공중 출현은 완전성 게이트가 닫혀 있어 추천에 사용하지 않습니다.'] },
  { id: 'sword', familyId: 'galar8', endpoint: '챔피언 단델', accent: '#39a7d7', starters: [810, 813, 816], fossils: [], notes: ['채두·마쿠와가 등장하며, DLC 포켓몬은 본편 엔딩 파티에 필수로 추천하지 않습니다.'] },
  { id: 'shield', familyId: 'galar8', endpoint: '챔피언 단델', accent: '#d84b89', starters: [810, 813, 816], fossils: [], notes: ['어니언·멜론이 등장하며, DLC 포켓몬은 본편 엔딩 파티에 필수로 추천하지 않습니다.'] },
  { id: 'brilliant-diamond', familyId: 'sinnoh8', endpoint: '챔피언 난천', accent: '#5c8eba', starters: [387, 390, 393], fossils: [[408, 410]], notes: ['비전기술은 포켓치의 야생 포켓몬 호출로 사용하며 파티 기술칸을 차지하지 않습니다.'] },
  { id: 'shining-pearl', familyId: 'sinnoh8', endpoint: '챔피언 난천', accent: '#c9799d', starters: [387, 390, 393], fossils: [[408, 410]], notes: ['비전기술은 포켓치의 야생 포켓몬 호출로 사용하며 파티 기술칸을 차지하지 않습니다.'] },
  { id: 'legends-arceus', familyId: 'hisui8', endpoint: '신오신전 오리진폼 결전', accent: '#547b73', starters: [722, 155, 501], fossils: [], notes: ['조사 지역·라이드·왕/여왕 진정 순서를 사용하며 체육관이나 HM을 만들지 않습니다.', '도감 과제·대량발생·시공의 뒤틀림·기술 숙달은 완전성 게이트가 닫혀 있어 추천에 사용하지 않습니다.'] },
  { id: 'scarlet', familyId: 'paldea9', endpoint: '낙원방어프로토콜', accent: '#c9483d', starters: [906, 909, 912], fossils: [], notes: ['권장 레벨에 따른 18개 배지 순서를 사용하며, 토진의 주인은 위대한엄니입니다.', 'DLC 지역은 본편 엔딩 타이밍과 분리합니다.'] },
  { id: 'violet', familyId: 'paldea9', endpoint: '낙원방어프로토콜', accent: '#7657ad', starters: [906, 909, 912], fossils: [], notes: ['권장 레벨에 따른 18개 배지 순서를 사용하며, 토진의 주인은 무쇠바퀴입니다.', 'DLC 지역은 본편 엔딩 타이밍과 분리합니다.'] },
]

export const modernGames: ModernGameConfig[] = modernGameDefinitions.map((game) => {
  const catalog = getCatalogGame(game.id)
  if (!catalog) throw new Error(`레지스트리에 없는 현대 스토리 게임입니다: ${game.id}`)
  return { ...game, catalog }
})

export function getModernGame(id: ModernPlannerGameId): ModernGameConfig {
  const game = modernGames.find((entry) => entry.id === id)
  if (!game) throw new Error(`현대 스토리 게임이 아닙니다: ${id}`)
  return game
}

export const modernBossOverrides: Partial<Record<ModernPlannerGameId, PlannerBoss[]>> = {
  sun: alolaBosses.map((entry) =>
    entry.id === 'ilima-trial'
      ? { ...entry, name: '주인 형사구스' }
      : entry),
  moon: alolaBosses.map((entry) =>
    entry.id === 'ilima-trial'
      ? { ...entry, name: '주인 레트라(알로라의 모습)', types: ['normal', 'dark'] }
      : entry),
  'ultra-sun': ultraBosses.map((entry) => {
    if (entry.id === 'ilima-trial-usum') return { ...entry, name: '주인 형사구스' }
    if (entry.id === 'lana-trial-usum') return { ...entry, name: '주인 깨비물거미' }
    if (entry.id === 'kiawe-trial-usum') return { ...entry, name: '주인 텅구리(알로라의 모습)' }
    return entry
  }),
  'ultra-moon': ultraBosses.map((entry) => {
    if (entry.id === 'ilima-trial-usum') return { ...entry, name: '주인 레트라(알로라의 모습)', types: ['normal', 'dark'] }
    if (entry.id === 'lana-trial-usum') return { ...entry, name: '주인 깨비물거미' }
    if (entry.id === 'kiawe-trial-usum') return { ...entry, name: '주인 텅구리(알로라의 모습)' }
    return entry
  }),
  'omega-ruby': [
    ...orasBosses.slice(0, 7),
    boss('maxie-or', '마적', '마그마단 리더 최종전', 8, ['ground', 'dark'], 'Lv.41–43'),
    ...orasBosses.slice(7),
  ],
  'alpha-sapphire': [
    ...orasBosses.slice(0, 7),
    boss('archie-as', '아강', '아쿠아단 리더 최종전', 8, ['water', 'dark'], 'Lv.41–43'),
    ...orasBosses.slice(7),
  ],
  sword: galarBosses.filter((entry) => !entry.gameIds || entry.gameIds.includes('sword')),
  shield: galarBosses.filter((entry) => !entry.gameIds || entry.gameIds.includes('shield')),
  scarlet: paldeaBosses.map((entry) =>
    entry.id === 'quaking-earth-titan'
      ? { ...entry, name: '위대한엄니', types: ['ground', 'fighting'] }
      : entry),
  violet: paldeaBosses.map((entry) =>
    entry.id === 'quaking-earth-titan'
      ? { ...entry, name: '무쇠바퀴', types: ['ground', 'steel'] }
      : entry),
}

const alolaLocationChapterOverrides = {
  'berry-fields': 1,
  'route-3': 1,
  'ten-carat-hill': 1,
  'dividing-peak-tunnel': 2,
  'kalae-bay': 2,
  'melemele-sea': 2,
  'poke-pelago': 2,
  'route-6': 2,
  'seaward-cave': 2,
  'akala-outskirts': 3,
  'digletts-tunnel': 3,
  'hano-beach': 3,
  'route-9': 3,
  'haina-desert': 4,
  'route-13': 4,
  'route-16': 4,
  'route-17': 4,
  'ruins-of-abundance': 4,
  'thrifty-megamart': 4,
  'ulaula-beach': 4,
  'ulaula-meadow': 4,
  'poni-breaker-coast': 6,
  'sandy-cave': 6,
}

const locationChapterOverrides: Partial<Record<ModernFamilyId, Record<string, number>>> = {
  kalos6: {
    'random-kalos-hotel': 2,
    'route-22': 1,
    'route-9': 2,
    'route-16': 7,
    'route-20': 9,
    'terminus-cave': 9,
  },
  hoenn6: {
    'ancient-tomb': 9,
    'crescent-isle': 9,
    'desert-ruins': 9,
    'fabled-cave': 9,
    'gnarled-den': 9,
    'island-cave': 9,
    'nameless-cavern': 9,
    'pathless-plain': 9,
    'soaring-in-the-sky': 9,
    'southern-island': 6,
    'trackless-forest': 9,
    mirage: 9,
    'route-115': 5,
    'sea-mauville': 5,
    'sealed-chamber': 8,
  },
  alola7: alolaLocationChapterOverrides,
  'alola7-ultra': alolaLocationChapterOverrides,
  letsgo7: {},
  galar8: {
    'west-lake-axewell': 1,
    'axews-eye': 7,
    'south-lake-miloch': 1,
    'giants-seat': 1,
    'north-lake-miloch': 1,
    'motostoke-riverbank': 5,
    'bridge-field': 5,
    'stony-wilderness': 5,
    'dusty-bowl': 5,
    'giants-mirror': 5,
    'hammerlocke-hills': 5,
    'giants-cap': 5,
    'lake-of-outrage': 7,
  },
  sinnoh8: {
    'grand-underground': 2,
    'route-219': 1,
    'route-220': 5,
    'route-221': 5,
    'floaroma-meadow': 2,
    'fuego-ironworks': 5,
    'maniac-tunnel': 4,
    'mount-coronet': 3,
    'old-chateau': 2,
    'oreburgh-mine': 1,
    'ravaged-path': 2,
    'ruin-maniac-cave': 4,
    'solaceon-ruins': 3,
    'sunyshore-city': 8,
    'trophy-garden': 4,
  },
  hisui8: {},
  paldea9: {
    'inlet-grotto': 1,
    'south-province-area-four': 2,
    'south-province-area-five': 4,
    'south-paldean-sea': 3,
    'west-province-area-two': 5,
    'west-paldean-sea': 3,
    'east-paldean-sea': 3,
    'north-paldean-sea': 3,
    'north-province-area-one': 8,
    'alfornada-cavern': 8,
    'casseroya-lake': 9,
    'dalizapa-passage': 7,
    'socarrat-trail': 9,
    'area-zero': 14,
  },
}

const postgameLocationTokens: Partial<Record<ModernFamilyId, string[]>> = {
  hoenn6: ['battle-resort', 'sky-pillar'],
  alola7: [
    'poni-coast', 'poni-gauntlet', 'poni-grove', 'poni-meadow', 'poni-plains', 'resolution-cave',
  ],
  'alola7-ultra': [
    'poni-coast', 'poni-gauntlet', 'poni-grove', 'poni-meadow', 'poni-plains', 'resolution-cave',
  ],
  letsgo7: [],
  galar8: [],
  sinnoh8: [
    'route-224', 'route-225', 'route-226', 'route-227', 'route-228', 'route-229', 'route-230',
    'resort-area', 'sendoff-spring', 'snowpoint-temple', 'stark-mountain', 'turnback-cave',
  ],
  hisui8: [],
  paldea9: [],
}

function tokenMatches(location: string, token: string): boolean {
  return location === token || location.startsWith(`${token}-`) || location.endsWith(`-${token}`)
}

export function getModernBosses(gameId: ModernPlannerGameId): PlannerBoss[] {
  const game = modernGames.find((entry) => entry.id === gameId)
  if (!game) throw new Error(`현대 스토리 게임이 아닙니다: ${gameId}`)
  return modernBossOverrides[gameId] ?? modernFamilies[game.familyId].bosses
}

export function modernEncounterChapter(
  familyId: ModernFamilyId,
  location: string,
  conditions: string[] = [],
  method = '',
  minLevel = 1,
): number | null {
  const family = modernFamilies[familyId]
  const mainStoryChapterCount = family.mainStoryChapterCount ?? family.chapters.length
  if (conditions.includes('postgame')) return mainStoryChapterCount + 1
  if ((postgameLocationTokens[familyId] ?? []).some((token) => tokenMatches(location, token))) {
    return mainStoryChapterCount + 1
  }
  const override = Object.entries(locationChapterOverrides[familyId] ?? {})
    .find(([token]) => tokenMatches(location, token))
  const methodUnlocks: Partial<Record<ModernFamilyId, Record<string, number>>> = {
    kalos6: { 'old-rod': 2, 'good-rod': 4, 'super-rod': 7, surf: 3, 'rock-smash': 2, 'friend-safari': 10 },
    hoenn6: { 'old-rod': 2, 'good-rod': 5, 'super-rod': 8, surf: 5, 'rock-smash': 3 },
    letsgo7: {},
    galar8: { surf: 7 },
    sinnoh8: { 'old-rod': 1, 'good-rod': 3, 'super-rod': 9, surf: 5, 'rock-smash': 1 },
    hisui8: {},
  }
  let prerequisiteChapter = methodUnlocks[familyId]?.[method] ?? 1
  if (familyId === 'hoenn6') {
    if (conditions.includes('story-progress-go-goggles')) prerequisiteChapter = Math.max(prerequisiteChapter, 4)
    if (conditions.includes('story-progress-eon-gift')) prerequisiteChapter = Math.max(prerequisiteChapter, 6)
    if (conditions.includes('story-progress-primal-defeated')) prerequisiteChapter = Math.max(prerequisiteChapter, 9)
  }
  if (familyId === 'galar8') {
    const isDlcArea = conditions.includes('isle-of-armor') || conditions.includes('crown-tundra')
    if (conditions.includes('ultra-beast-clue-complete')) return 18
    if (method === 'dynamax-adventure') return 1
    const weatherConditions = conditions.filter((condition) => condition.startsWith('weather-'))
    if (!isDlcArea && weatherConditions.length === 1 && weatherConditions[0] === 'weather-heavy-fog') {
      return mainStoryChapterCount + 1
    }
    const catchLevelChapter = minLevel <= 20 ? 1
      : minLevel <= 25 ? 3
        : minLevel <= 30 ? 4
          : minLevel <= 35 ? 5
            : minLevel <= 40 ? 6
              : minLevel <= 45 ? 7
                : minLevel <= 50 ? 8
                  : minLevel <= 55 ? 9
                    : 10
    prerequisiteChapter = Math.max(prerequisiteChapter, catchLevelChapter)
    if (!isDlcArea && conditions.some((condition) =>
      condition === 'weather-sandstorm' || condition === 'weather-snowstorm')) {
      prerequisiteChapter = Math.max(prerequisiteChapter, 5)
    }
    if (conditions.includes('water-bike')) prerequisiteChapter = Math.max(prerequisiteChapter, 7)
    if (tokenMatches(location, 'slumbering-weald') && minLevel >= 20) {
      prerequisiteChapter = Math.max(prerequisiteChapter, 10)
    }
    const badgeCount = conditions
      .map((condition) => /^badge-count-(\d+)$/.exec(condition)?.[1])
      .find((value) => value !== undefined)
    const badgeChapter: Record<string, number> = { '0': 1, '1': 3, '3': 5, '6': 8, '8': 10 }
    if (badgeCount) prerequisiteChapter = Math.max(prerequisiteChapter, badgeChapter[badgeCount] ?? 1)
    if (conditions.includes('isle-of-armor')) return prerequisiteChapter
    if (conditions.includes('crown-tundra')) return Math.max(prerequisiteChapter, 10)
  }
  if (override) return Math.max(override[1], prerequisiteChapter)
  for (const [index, story] of family.chapters.entries()) {
    if (story.locationTokens.some((token) => tokenMatches(location, token))) {
      return Math.max(index + 1, prerequisiteChapter)
    }
  }
  return null
}

export const modernStoryProvenance = {
  reviewedAt: '2026-09-11',
  sources: [
    { games: ['x', 'y'], revision: '4315929', url: 'https://bulbapedia.bulbagarden.net/w/index.php?title=Walkthrough:Pok%C3%A9mon_X_and_Y&oldid=4315929' },
    { games: ['omega-ruby', 'alpha-sapphire'], revision: '4247537', url: 'https://bulbapedia.bulbagarden.net/w/index.php?title=Walkthrough:Pok%C3%A9mon_Omega_Ruby_and_Alpha_Sapphire&oldid=4247537' },
    { games: ['sun', 'moon'], url: 'https://bulbapedia.bulbagarden.net/wiki/Walkthrough:Pok%C3%A9mon_Sun_and_Moon' },
    { games: ['ultra-sun', 'ultra-moon'], url: 'https://bulbapedia.bulbagarden.net/wiki/Walkthrough:Pok%C3%A9mon_Ultra_Sun_and_Ultra_Moon' },
    { games: ['lets-go-pikachu', 'lets-go-eevee'], revision: '4247959', url: 'https://bulbapedia.bulbagarden.net/w/index.php?title=Walkthrough:Pok%C3%A9mon:_Let%27s_Go,_Pikachu!_and_Let%27s_Go,_Eevee!&oldid=4247959' },
    { games: ['sword', 'shield'], revision: '4489916', url: 'https://bulbapedia.bulbagarden.net/w/index.php?title=Walkthrough:Pok%C3%A9mon_Sword_and_Shield&oldid=4489916' },
    { games: ['brilliant-diamond', 'shining-pearl'], revision: '4577633', url: 'https://bulbapedia.bulbagarden.net/w/index.php?title=Walkthrough:Pok%C3%A9mon_Brilliant_Diamond_and_Shining_Pearl&oldid=4577633' },
    { games: ['legends-arceus'], revision: '4315902', url: 'https://bulbapedia.bulbagarden.net/w/index.php?title=Walkthrough:Pok%C3%A9mon_Legends:_Arceus&oldid=4315902' },
    { games: ['scarlet', 'violet'], url: 'https://bulbapedia.bulbagarden.net/wiki/Walkthrough:Pok%C3%A9mon_Scarlet_and_Violet' },
  ],
} as const
