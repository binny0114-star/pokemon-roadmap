import type { FamilyConfig, FieldMove, GameConfig, PlannerBoss, StoryChapter } from './types'
import { getPlannerCatalogGame } from './versionRegistry'
import { getModernBosses, modernFamilies, type ModernPlannerGameId } from './modernGames'

const chapter = (
  id: string,
  title: string,
  subtitle: string,
  level: string,
  locationTokens: string[],
  objectives: string[],
  unlocks: string[] = [],
): StoryChapter => ({ id, title, subtitle, level, locationTokens, objectives, unlocks })

const boss = (id: string, name: string, title: string, chapterIndex: number, types: string[], level: string): PlannerBoss =>
  ({ id, name, title, chapter: chapterIndex, types, level })

const kantoChapters = [
  chapter('kan-1', '태초마을 → 회색시티', '첫 파트너와 바위 배지', 'Lv.5–14', ['pallet', 'route-1', 'route-2', 'route-22', 'viridian-forest', 'pewter'], ['스타터 선택', '상록숲 통과', '웅 격파']),
  chapter('kan-2', '달맞이산 → 블루시티', '화석 선택과 이슬', 'Lv.15–22', ['route-3', 'mt-moon', 'route-4', 'route-24', 'route-25', 'cerulean'], ['달맞이산에서 화석 하나 선택', '이슬 격파']),
  chapter('kan-3', '갈색시티', '상트앙느호와 풀베기', 'Lv.22–26', ['route-5', 'route-6', 'route-11', 'vermilion', 'diglett'], ['상트앙느호 선장에게 풀베기 획득', '마티스 격파']),
  chapter('kan-4', '돌산터널 → 무지개시티', '로켓단 게임코너', 'Lv.26–32', ['route-7', 'route-8', 'route-9', 'route-10', 'rock-tunnel', 'lavender', 'celadon'], ['돌산터널 통과', '민화 격파', '로켓단 아지트 소탕']),
  chapter('kan-5', '포켓몬타워 → 연분홍시티', '피리와 사파리존', 'Lv.30–38', ['pokemon-tower', 'route-12', 'route-13', 'route-14', 'route-15', 'route-16', 'route-17', 'route-18', 'fuchsia', 'safari'], ['포켓몬타워 구출', '독수 격파', '사파리존에서 파도타기 획득', '사파리존 원장에게 금틀니를 돌려주고 괴력 획득']),
  chapter('kan-6', '노랑시티', '실프주식회사와 초련', 'Lv.35–43', ['saffron', 'silph'], ['실프주식회사 로켓단 격퇴', '초련 격파']),
  chapter('kan-7', '쌍둥이섬 → 홍련섬', '포켓몬저택과 강연', 'Lv.40–47', ['route-19', 'route-20', 'route-21', 'seafoam', 'cinnabar', 'pokemon-mansion', 'one-island', 'two-island', 'three-island'], ['홍련체육관 열쇠 획득', '강연 격파']),
  chapter('kan-8', '상록시티 → 포켓몬리그', '마지막 배지와 챔피언', 'Lv.45–60', ['route-23', 'victory-road', 'indigo', 'viridian'], ['비주기 격파', '챔피언로드 돌파', '사천왕과 챔피언 격파']),
]

const johtoChapters = [
  chapter('joh-1', '연두마을 → 도라지시티', '첫 배지와 모다피의탑', 'Lv.5–12', ['new-bark', 'route-29', 'route-30', 'route-31', 'route-46', 'violet', 'sprout'], ['스타터 선택', '비상 격파']),
  chapter('joh-2', '연결동굴 → 고동마을', '야돈우물과 너도밤나무숲', 'Lv.12–18', ['route-32', 'route-33', 'union-cave', 'azalea', 'slowpoke', 'ilex'], ['호일 격파', '풀베기 획득']),
  chapter('joh-3', '금빛시티', '꼭두와 자연공원', 'Lv.18–24', ['route-34', 'goldenrod', 'route-35', 'national-park', 'route-36'], ['꼭두 격파', '꼬부기물뿌리개 획득']),
  chapter('joh-4', '인주시티', '불탄탑과 유빈', 'Lv.22–28', ['route-37', 'ecruteak', 'burned-tower', 'bell-tower'], ['전설의 포켓몬 해방', '유빈 격파', '파도타기 획득']),
  chapter('joh-5', '담청·진청시티', '등대와 비전신약', 'Lv.27–34', ['route-38', 'route-39', 'olivine', 'route-40', 'route-41', 'cianwood'], ['사도 격파', '빛나리 치료', '규리 격파']),
  chapter('joh-6', '분노의호수 → 라디오타워', '로켓단 최종 소탕', 'Lv.30–38', ['route-42', 'mahogany', 'lake-of-rage', 'route-43', 'rocket-hideout', 'radio-tower'], ['붉은 갸라도스 조사', '류옹 격파', '라디오타워 탈환']),
  chapter('joh-7', '얼음샛길 → 검은먹시티', '드래곤 배지', 'Lv.36–42', ['route-44', 'route-45', 'ice-path', 'blackthorn', 'dragons-den'], ['이향 격파', '용의굴 시험']),
  chapter('joh-8', '동성폭포 → 성도리그', '사천왕과 목호', 'Lv.40–50', ['route-26', 'route-27', 'tohjo', 'victory-road', 'indigo'], ['챔피언로드 돌파', '사천왕과 목호 격파']),
]

const hoennChapters = [
  chapter('hoe-1', '미로마을 → 금탄시티', '첫 파트너와 데봉 사건', 'Lv.5–15', ['littleroot', 'route-101', 'route-102', 'route-103', 'route-104', 'petalburg', 'petalburg-woods', 'route-116', 'rusturf-tunnel', 'rustboro'], ['스타터 선택', '원규 격파', '데봉화물 회수']),
  chapter('hoe-2', '무로마을 → 잿빛시티', '바위동굴과 해양박물관', 'Lv.15–20', ['route-105', 'route-106', 'dewford', 'granite-cave', 'route-107', 'route-108', 'route-109', 'slateport'], ['철구 격파', '성호에게 편지 전달']),
  chapter('hoe-3', '보라시티', '라이벌과 전기 배지', 'Lv.20–25', ['route-110', 'mauville', 'route-117', 'verdanturf', 'new-mauville'], ['암페어 격파']),
  chapter('hoe-4', '유성폭포 → 용암마을', '굴뚝산 사건', 'Lv.24–30', ['route-111', 'route-112', 'route-113', 'route-114', 'route-115', 'fiery-path', 'meteor-falls', 'fallarbor', 'mt-chimney', 'jagged-pass', 'lavaridge'], ['악당 조직의 운석 계획 저지', '연돌 격파']),
  chapter('hoe-5', '등화시티', '아버지와의 체육관전', 'Lv.28–33', ['petalburg', 'rusturf-tunnel'], ['종길 격파', '파도타기 획득', '금잔터널 개통']),
  chapter('hoe-6', '119번도로 → 검방울시티', '날씨연구소와 공중날기', 'Lv.30–36', ['route-118', 'route-119', 'weather-institute', 'fortree', 'route-120'], ['날씨연구소 구출', '은송 격파']),
  chapter('hoe-7', '송화산 → 해안시티', '악당 조직 아지트', 'Lv.34–40', ['route-121', 'route-122', 'route-123', 'safari-zone', 'mt-pyre', 'lilycove', 'magma-hideout', 'aqua-hideout'], ['송화산 사건 해결', '아지트 돌파']),
  chapter('hoe-8', '이끼시티 → 해저동굴', '더블 배지와 다이빙', 'Lv.38–45', ['mossdeep', 'route-124', 'route-125', 'route-126', 'route-127', 'route-128', 'shoal-cave', 'seafloor-cavern'], ['풍과 란 격파', '해저동굴 추격']),
  chapter('hoe-9', '루네시티', '초고대 포켓몬과 마지막 배지', 'Lv.42–47', ['route-129', 'route-130', 'route-131', 'pacifidlog', 'sootopolis', 'cave-of-origin', 'sky-pillar'], ['초고대 포켓몬 사건 해결', '8번째 관장 격파']),
  chapter('hoe-10', '챔피언로드 → 호연리그', '사천왕과 챔피언', 'Lv.46–58', ['ever-grande', 'victory-road', 'pokemon-league'], ['챔피언로드 돌파', '사천왕과 챔피언 격파']),
]

const sinnohChapters = [
  chapter('sin-1', '떡잎마을 → 무쇠시티', '첫 파트너와 석탄 배지', 'Lv.5–15', ['twinleaf', 'route-201', 'route-202', 'route-203', 'jubilife', 'oreburgh-gate', 'oreburgh'], ['스타터 선택', '강석 격파']),
  chapter('sin-2', '꽃향기마을 → 영원시티', '갤럭시단과 숲의 배지', 'Lv.15–24', ['route-204', 'floaroma', 'valley-windworks', 'route-205', 'eterna-forest', 'eterna', 'old-chateau'], ['갤럭시단 발전소 사건', '유채 격파']),
  chapter('sin-3', '연고시티 → 장막시티', '콘테스트 도시와 격투 배지', 'Lv.22–32', ['route-206', 'wayward-cave', 'route-207', 'mt-coronet', 'route-208', 'hearthome', 'route-209', 'solaceon', 'route-210', 'route-215', 'veilstone', 'route-214'], ['멜리사/자두 진행', '갤럭시단 창고 조사']),
  chapter('sin-4', '들판시티', '대습초원과 물 배지', 'Lv.28–36', ['route-212', 'pastoria', 'great-marsh', 'route-213', 'valor-lakefront'], ['맥실러 격파', '갤럭시단 조무래기 추격']),
  chapter('sin-5', '봉신마을 → 운하시티', '고대 벽화와 강철 배지', 'Lv.34–41', ['celestic', 'route-211', 'route-218', 'canalave', 'iron-island', 'fuego-ironworks'], ['봉신마을 유적 조사', '동관 격파']),
  chapter('sin-6', '선단시티', '눈길과 얼음 배지', 'Lv.38–45', ['route-216', 'route-217', 'acuity-lakefront', 'snowpoint'], ['무청 격파']),
  chapter('sin-7', '갤럭시단 본부 → 창기둥', '전설의 포켓몬 사건', 'Lv.42–49', ['veilstone', 'mt-coronet', 'spear-pillar', 'distortion-world'], ['갤럭시단 본부 돌파', '창기둥 사건 해결']),
  chapter('sin-8', '물가시티 → 신오리그', '마지막 배지와 챔피언', 'Lv.46–62', ['route-222', 'sunnyshore', 'route-223', 'victory-road', 'pokemon-league'], ['전진 격파', '챔피언로드 돌파', '사천왕과 난천 격파']),
]

const unovaChapters = [
  chapter('uno-1', '마름꽃마을 → 성신시티', '첫 파트너와 타입 수업', 'Lv.5–15', ['nuvema', 'route-1', 'accumula', 'route-2', 'striaton', 'dreamyard'], ['스타터 선택', '성신체육관 격파']),
  chapter('uno-2', '칠보시티', '박물관과 플라스마단', 'Lv.15–22', ['route-3', 'wellspring', 'nacrene'], ['알로에 격파', '드래곤 뼈 회수']),
  chapter('uno-3', '구름시티', '사막과 벌레 배지', 'Lv.20–28', ['pinwheel', 'castelia', 'desert-resort'], ['플라스마단 추적', '아티 격파']),
  chapter('uno-4', '뇌문시티', '배틀서브웨이와 전기 배지', 'Lv.26–34', ['route-4', 'nimbasa', 'route-5', 'route-16', 'lostlorn'], ['카밀레 격파']),
  chapter('uno-5', '물풍경시티 → 궐수시티', '냉동창고와 공항', 'Lv.31–40', ['driftveil', 'cold-storage', 'route-6', 'chargestone', 'mistralton', 'celestial-tower'], ['야콘 격파', '풍란 격파']),
  chapter('uno-6', '태엽산 → 설화시티', '용의 나선탑', 'Lv.38–44', ['route-7', 'twist-mountain', 'icirrus', 'dragonspiral'], ['담죽 격파', '전설의 포켓몬 사건']),
  chapter('uno-7', '쌍용시티', '마지막 드래곤 배지', 'Lv.41–48', ['route-8', 'moor-of-icirrus', 'route-9', 'shopping-mall', 'opelucid'], ['아이리스/사간 격파']),
  chapter('uno-8', '챔피언로드 → N의 성', '사천왕과 최종 결전', 'Lv.45–55', ['route-10', 'victory-road', 'pokemon-league', 'n-castle'], ['사천왕 돌파', 'N과 게치스 격파']),
]

const unova2Chapters = [
  chapter('un2-1', '부채시티 → 모란만시티', '체렌과 보미카', 'Lv.5–18', ['asperita', 'route-19', 'floccesy', 'route-20', 'virbank', 'virbank-complex'], ['스타터 선택', '체렌·보미카 격파']),
  chapter('un2-2', '구름시티', '포켓우드와 하수도', 'Lv.18–26', ['castelia', 'castelia-sewers', 'relic-passage'], ['아티 격파', '플라스마단 추적']),
  chapter('un2-3', '뇌문시티', '전기 배지', 'Lv.25–33', ['route-4', 'desert-resort', 'nimbasa', 'route-5', 'route-16', 'lostlorn'], ['카밀레 격파']),
  chapter('un2-4', '물풍경시티', 'PWT와 플라스마단', 'Lv.31–38', ['driftveil', 'route-6', 'chargestone', 'pokemon-world-tournament'], ['야콘 격파', 'PWT 참가']),
  chapter('un2-5', '궐수시티 → 산로마을', '공항과 리버스마운틴', 'Lv.36–43', ['route-7', 'celestial-tower', 'mistralton', 'reversal-mountain', 'lentimas', 'strange-house', 'undella'], ['풍란 격파', '플라스마단 추적']),
  chapter('un2-6', '쌍용시티', '드래곤 배지와 DNA 스플라이서', 'Lv.40–48', ['route-11', 'village-bridge', 'route-12', 'lacunosa', 'route-13', 'route-14', 'route-9', 'opelucid', 'marine-tube'], ['사간 격파', '플라스마 프리깃 추적']),
  chapter('un2-7', '기하시티 → 자이언트홀', '마지막 배지와 큐레무', 'Lv.45–53', ['humilau', 'route-21', 'seaside-cave', 'route-22', 'giant-chasm', 'plasma-frigate'], ['시즈 격파', '큐레무 사건 해결']),
  chapter('un2-8', '챔피언로드 → 하나리그', '사천왕과 아이리스', 'Lv.50–60', ['route-23', 'victory-road', 'pokemon-league'], ['챔피언로드 돌파', '사천왕과 아이리스 격파']),
]

const kantoBosses = [
  boss('brock', '웅', '회색 체육관', 1, ['rock'], 'Lv.12–14'), boss('misty', '이슬', '블루 체육관', 2, ['water'], 'Lv.18–21'),
  boss('surge', '마티스', '갈색 체육관', 3, ['electric'], 'Lv.18–24'), boss('erika', '민화', '무지개 체육관', 4, ['grass'], 'Lv.24–29'),
  boss('koga', '독수', '연분홍 체육관', 5, ['poison'], 'Lv.37–43'), boss('sabrina', '초련', '노랑 체육관', 6, ['psychic'], 'Lv.37–43'),
  boss('blaine', '강연', '홍련 체육관', 7, ['fire'], 'Lv.40–47'), boss('giovanni', '비주기', '상록 체육관', 8, ['ground'], 'Lv.42–50'),
  boss('lorelei', '칸나', '사천왕', 8, ['ice', 'water'], 'Lv.53–56'), boss('bruno-k', '시바', '사천왕', 8, ['fighting', 'rock'], 'Lv.53–58'),
  boss('agatha', '국화', '사천왕', 8, ['ghost', 'poison'], 'Lv.55–60'), boss('lance-k', '목호', '사천왕', 8, ['dragon', 'flying'], 'Lv.56–62'),
  boss('champion-k', '라이벌', '챔피언', 8, ['normal'], 'Lv.59–65'),
]

const johtoBosses = [
  boss('falkner', '비상', '도라지 체육관', 1, ['flying'], 'Lv.7–9'), boss('bugsy', '호일', '고동 체육관', 2, ['bug'], 'Lv.14–16'),
  boss('whitney', '꼭두', '금빛 체육관', 3, ['normal'], 'Lv.18–20'), boss('morty', '유빈', '인주 체육관', 4, ['ghost'], 'Lv.21–25'),
  boss('chuck', '사도', '진청 체육관', 5, ['fighting'], 'Lv.27–30'), boss('jasmine', '규리', '담청 체육관', 5, ['steel'], 'Lv.30–35'),
  boss('pryce', '류옹', '황토 체육관', 6, ['ice'], 'Lv.27–31'), boss('clair', '이향', '검은먹 체육관', 7, ['dragon'], 'Lv.37–40'),
  boss('will', '일목', '사천왕', 8, ['psychic'], 'Lv.40–42'), boss('koga-j', '독수', '사천왕', 8, ['poison'], 'Lv.40–44'),
  boss('bruno-j', '시바', '사천왕', 8, ['fighting'], 'Lv.42–46'), boss('karen', '카렌', '사천왕', 8, ['dark'], 'Lv.42–47'),
  boss('lance-j', '목호', '챔피언', 8, ['dragon', 'flying'], 'Lv.44–50'),
]

const hoennBosses = [
  boss('roxanne', '원규', '금탄 체육관', 1, ['rock'], 'Lv.12–15'), boss('brawly', '철구', '무로 체육관', 2, ['fighting'], 'Lv.16–19'),
  boss('wattson', '암페어', '보라 체육관', 3, ['electric'], 'Lv.20–24'), boss('flannery', '연돌', '용암 체육관', 4, ['fire'], 'Lv.24–29'),
  boss('norman', '종길', '등화 체육관', 5, ['normal'], 'Lv.27–31'), boss('winona', '은송', '검방울 체육관', 6, ['flying'], 'Lv.29–33'),
  boss('tate-liza', '풍과 란', '이끼 체육관', 8, ['psychic'], 'Lv.41–42'), boss('wallace-gym', '윤진', '루네 체육관', 9, ['water'], 'Lv.40–43'),
  boss('sidney', '혁진', '사천왕', 10, ['dark'], 'Lv.46–49'), boss('phoebe', '회연', '사천왕', 10, ['ghost'], 'Lv.48–51'),
  boss('glacia', '미혜', '사천왕', 10, ['ice'], 'Lv.50–53'), boss('drake', '권수', '사천왕', 10, ['dragon'], 'Lv.52–55'),
  boss('steven', '성호', '챔피언', 10, ['steel', 'rock'], 'Lv.55–58'),
]

const sinnohBosses = [
  boss('roark', '강석', '무쇠 체육관', 1, ['rock'], 'Lv.12–14'), boss('gardenia', '유채', '영원 체육관', 2, ['grass'], 'Lv.20–22'),
  boss('fantina', '멜리사', '연고 체육관', 3, ['ghost'], 'Lv.24–26'), boss('maylene', '자두', '장막 체육관', 3, ['fighting'], 'Lv.28–32'),
  boss('wake', '맥실러', '들판 체육관', 4, ['water'], 'Lv.33–37'), boss('byron', '동관', '운하 체육관', 5, ['steel'], 'Lv.37–41'),
  boss('candice', '무청', '선단 체육관', 6, ['ice'], 'Lv.40–44'), boss('volkner', '전진', '물가 체육관', 8, ['electric'], 'Lv.46–50'),
  boss('aaron', '충호', '사천왕', 8, ['bug'], 'Lv.49–53'), boss('bertha', '들국화', '사천왕', 8, ['ground'], 'Lv.50–55'),
  boss('flint', '대엽', '사천왕', 8, ['fire'], 'Lv.52–57'), boss('lucian', '오엽', '사천왕', 8, ['psychic'], 'Lv.53–59'),
  boss('cynthia', '난천', '챔피언', 8, ['dragon'], 'Lv.58–62'),
]

const diamondPearlBosses = [
  boss('roark', '강석', '무쇠 체육관', 1, ['rock'], 'Lv.12–14'), boss('gardenia', '유채', '영원 체육관', 2, ['grass'], 'Lv.19–22'),
  boss('maylene', '자두', '장막 체육관', 3, ['fighting'], 'Lv.27–30'), boss('wake', '맥실러', '들판 체육관', 4, ['water'], 'Lv.27–30'),
  boss('fantina', '멜리사', '연고 체육관', 4, ['ghost'], 'Lv.32–36'), boss('byron', '동관', '운하 체육관', 5, ['steel'], 'Lv.36–39'),
  boss('candice', '무청', '선단 체육관', 6, ['ice'], 'Lv.38–42'), boss('volkner', '전진', '물가 체육관', 8, ['electric'], 'Lv.46–49'),
  boss('aaron', '충호', '사천왕', 8, ['bug'], 'Lv.53–57'), boss('bertha', '들국화', '사천왕', 8, ['ground'], 'Lv.55–59'),
  boss('flint', '대엽', '사천왕', 8, ['fire'], 'Lv.57–61'), boss('lucian', '오엽', '사천왕', 8, ['psychic'], 'Lv.59–63'),
  boss('cynthia', '난천', '챔피언', 8, ['dragon'], 'Lv.60–66'),
]

const unovaBosses = [
  boss('striaton', '덴트·팟·콘', '성신 체육관', 1, ['grass', 'fire', 'water'], 'Lv.12–14'), boss('lenora', '알로에', '칠보 체육관', 2, ['normal'], 'Lv.18–20'),
  boss('burgh', '아티', '구름 체육관', 3, ['bug'], 'Lv.21–23'), boss('elesa', '카밀레', '뇌문 체육관', 4, ['electric'], 'Lv.25–27'),
  boss('clay', '야콘', '물풍경 체육관', 5, ['ground'], 'Lv.29–31'), boss('skyla', '풍란', '궐수 체육관', 5, ['flying'], 'Lv.33–35'),
  boss('brycen', '담죽', '설화 체육관', 6, ['ice'], 'Lv.37–39'), boss('drayden-iris', '사간·아이리스', '쌍용 체육관', 7, ['dragon'], 'Lv.41–43'),
  boss('shauntal', '망초', '사천왕', 8, ['ghost'], 'Lv.48–50'), boss('marshal', '연무', '사천왕', 8, ['fighting'], 'Lv.48–50'),
  boss('grimsley', '블래리', '사천왕', 8, ['dark'], 'Lv.48–50'), boss('caitlin', '카틀레야', '사천왕', 8, ['psychic'], 'Lv.48–50'),
  boss('n', 'N', 'N의 성', 8, ['dragon'], 'Lv.50–52'), boss('ghetsis', '게치스', '최종 결전', 8, ['dark', 'dragon'], 'Lv.52–54'),
]

const unova2Bosses = [
  boss('cheren', '체렌', '부채 체육관', 1, ['normal'], 'Lv.11–13'), boss('roxie', '보미카', '모란만 체육관', 1, ['poison'], 'Lv.16–18'),
  boss('burgh2', '아티', '구름 체육관', 2, ['bug'], 'Lv.22–24'), boss('elesa2', '카밀레', '뇌문 체육관', 3, ['electric'], 'Lv.28–30'),
  boss('clay2', '야콘', '물풍경 체육관', 4, ['ground'], 'Lv.31–33'), boss('skyla2', '풍란', '궐수 체육관', 5, ['flying'], 'Lv.37–39'),
  boss('drayden2', '사간', '쌍용 체육관', 6, ['dragon'], 'Lv.46–48'), boss('marlon', '시즈', '기하 체육관', 7, ['water'], 'Lv.49–51'),
  boss('shauntal2', '망초', '사천왕', 8, ['ghost'], 'Lv.56–58'), boss('marshal2', '연무', '사천왕', 8, ['fighting'], 'Lv.56–58'),
  boss('grimsley2', '블래리', '사천왕', 8, ['dark'], 'Lv.56–58'), boss('caitlin2', '카틀레야', '사천왕', 8, ['psychic'], 'Lv.56–58'),
  boss('iris-champion', '아이리스', '챔피언', 8, ['dragon'], 'Lv.57–59'),
]

const fields = {
  gen1: [
    { id: 'cut', name: '풀베기', type: 'normal', unlockChapter: 3, required: true },
    { id: 'fly', name: '공중날기', type: 'flying', unlockChapter: 4, required: false },
    { id: 'surf', name: '파도타기', type: 'water', unlockChapter: 5, required: true },
    { id: 'strength', name: '괴력', type: 'normal', unlockChapter: 5, required: true },
    { id: 'flash', name: '플래시', type: 'electric', unlockChapter: 4, required: false },
  ],
  gen2: [
    { id: 'cut', name: '풀베기', type: 'normal', unlockChapter: 2, required: true },
    { id: 'fly', name: '공중날기', type: 'flying', unlockChapter: 5, required: false },
    { id: 'surf', name: '파도타기', type: 'water', unlockChapter: 4, required: true },
    { id: 'strength', name: '괴력', type: 'normal', unlockChapter: 5, required: true },
    { id: 'flash', name: '플래시', type: 'electric', unlockChapter: 1, required: false },
    { id: 'whirlpool', name: '소용돌이', type: 'water', unlockChapter: 6, required: true },
    { id: 'waterfall', name: '폭포오르기', type: 'water', unlockChapter: 7, required: true },
  ],
  hoenn: [
    { id: 'cut', name: '풀베기', type: 'normal', unlockChapter: 1, required: false },
    { id: 'fly', name: '공중날기', type: 'flying', unlockChapter: 6, required: false },
    { id: 'surf', name: '파도타기', type: 'water', unlockChapter: 5, required: true },
    { id: 'strength', name: '괴력', type: 'normal', unlockChapter: 5, required: true },
    { id: 'flash', name: '플래시', type: 'electric', unlockChapter: 2, required: false },
    { id: 'rock-smash', name: '바위깨기', type: 'fighting', unlockChapter: 3, required: true },
    { id: 'waterfall', name: '폭포오르기', type: 'water', unlockChapter: 9, required: true },
    { id: 'dive', name: '다이빙', type: 'water', unlockChapter: 8, required: true },
  ],
  frlg: [
    { id: 'cut', name: '풀베기', type: 'normal', unlockChapter: 3, required: true },
    { id: 'fly', name: '공중날기', type: 'flying', unlockChapter: 4, required: false },
    { id: 'surf', name: '파도타기', type: 'water', unlockChapter: 5, required: true },
    { id: 'strength', name: '괴력', type: 'normal', unlockChapter: 5, required: true },
    { id: 'flash', name: '플래시', type: 'electric', unlockChapter: 4, required: false },
    { id: 'rock-smash', name: '바위깨기', type: 'fighting', unlockChapter: 7, required: false },
  ],
  sinnoh: [
    { id: 'cut', name: '풀베기', type: 'normal', unlockChapter: 2, required: true }, { id: 'fly', name: '공중날기', type: 'flying', unlockChapter: 3, required: false },
    { id: 'surf', name: '파도타기', type: 'water', unlockChapter: 5, required: true }, { id: 'strength', name: '괴력', type: 'normal', unlockChapter: 5, required: true },
    { id: 'defog', name: '안개제거', type: 'flying', unlockChapter: 4, required: false }, { id: 'rock-smash', name: '바위깨기', type: 'fighting', unlockChapter: 1, required: true },
    { id: 'waterfall', name: '폭포오르기', type: 'water', unlockChapter: 8, required: true }, { id: 'rock-climb', name: '락클라임', type: 'normal', unlockChapter: 6, required: true },
  ],
  hgss: [
    { id: 'cut', name: '풀베기', type: 'normal', unlockChapter: 2, required: true }, { id: 'fly', name: '공중날기', type: 'flying', unlockChapter: 5, required: false },
    { id: 'surf', name: '파도타기', type: 'water', unlockChapter: 4, required: true }, { id: 'strength', name: '괴력', type: 'normal', unlockChapter: 6, required: true },
    { id: 'whirlpool', name: '소용돌이', type: 'water', unlockChapter: 6, required: true }, { id: 'rock-smash', name: '바위깨기', type: 'fighting', unlockChapter: 3, required: false },
    { id: 'waterfall', name: '폭포오르기', type: 'water', unlockChapter: 7, required: true },
  ],
  unova: [
    { id: 'cut', name: '풀베기', type: 'normal', unlockChapter: 1, required: true }, { id: 'fly', name: '공중날기', type: 'flying', unlockChapter: 5, required: false },
    { id: 'surf', name: '파도타기', type: 'water', unlockChapter: 6, required: false }, { id: 'strength', name: '괴력', type: 'normal', unlockChapter: 4, required: false },
    { id: 'waterfall', name: '폭포오르기', type: 'water', unlockChapter: 8, required: false },
  ],
  unova2: [
    { id: 'cut', name: '풀베기', type: 'normal', unlockChapter: 1, required: true }, { id: 'fly', name: '공중날기', type: 'flying', unlockChapter: 3, required: false },
    { id: 'surf', name: '파도타기', type: 'water', unlockChapter: 4, required: false }, { id: 'strength', name: '괴력', type: 'normal', unlockChapter: 2, required: false },
    { id: 'waterfall', name: '폭포오르기', type: 'water', unlockChapter: 8, required: false }, { id: 'dive', name: '다이빙', type: 'water', unlockChapter: 5, required: false },
  ],
}

// 1–5세대 장의 해금 표시는 필드기 표에서 만들어 필드기 입수 시점과 어긋나지 않게 합니다.
const withFieldMoveUnlocks = (chapters: StoryChapter[], fieldMoves: FieldMove[]): StoryChapter[] =>
  chapters.map((entry, index) => ({
    ...entry,
    unlocks: fieldMoves.filter((move) => move.unlockChapter === index + 1).map((move) => move.name),
  }))

export const families: Record<string, FamilyConfig> = {
  kanto1: { id: 'kanto1', generation: 1, region: '관동', chapters: withFieldMoveUnlocks(kantoChapters, fields.gen1), bosses: kantoBosses, fieldMoves: fields.gen1, postgame: ['뮤츠가 기다리는 블루시티동굴', '도감 완성', '버전 교환 수집'] },
  johto2: { id: 'johto2', generation: 2, region: '성도·관동', chapters: withFieldMoveUnlocks(johtoChapters, fields.gen2), bosses: johtoBosses, fieldMoves: fields.gen2, postgame: ['관동 8개 배지', '은빛산 레드', '배회 전설 포켓몬'] },
  hoenn3: { id: 'hoenn3', generation: 3, region: '호연', chapters: withFieldMoveUnlocks(hoennChapters, fields.hoenn), bosses: hoennBosses, fieldMoves: fields.hoenn, moveReminder: { chapter: 4, location: '단풍마을', cost: '하트비늘 1개' }, postgame: ['배틀타워/배틀프런티어', '레지 삼형제', '하늘기둥 레쿠쟈'] },
  kanto3: { id: 'kanto3', generation: 3, region: '관동·일곱섬', chapters: withFieldMoveUnlocks(kantoChapters, fields.frlg), bosses: kantoBosses, fieldMoves: fields.frlg, moveReminder: { chapter: 7, location: '2섬', cost: '작은버섯 2개 또는 큰버섯 1개' }, postgame: ['일곱섬 네트워크 머신', '강화 사천왕', '블루시티동굴 뮤츠'] },
  sinnoh4: { id: 'sinnoh4', generation: 4, region: '신오', chapters: withFieldMoveUnlocks(sinnohChapters, fields.sinnoh), bosses: sinnohBosses, fieldMoves: fields.sinnoh, moveReminder: { chapter: 4, location: '들판시티', cost: '하트비늘 1개' }, postgame: ['전국도감과 파이트에리어', '배틀타워/프런티어', '하드마운틴·전설 포켓몬'] },
  johto4: { id: 'johto4', generation: 4, region: '성도·관동', chapters: withFieldMoveUnlocks(johtoChapters, fields.hgss), bosses: johtoBosses, fieldMoves: fields.hgss, moveReminder: { chapter: 7, location: '검은먹시티', cost: '하트비늘 1개' }, postgame: ['관동 8개 배지', '은빛산 레드', '배틀프런티어'] },
  unova5: { id: 'unova5', generation: 5, region: '하나', chapters: withFieldMoveUnlocks(unovaChapters, fields.unova), bosses: unovaBosses, fieldMoves: fields.unova, moveReminder: { chapter: 5, location: '궐수시티', cost: '하트비늘 1개' }, postgame: ['쌍용시티 동쪽 11–15번도로와 산로마을', '챔피언 노간주', '블랙시티/화이트포리스트'] },
  'unova5-2': { id: 'unova5-2', generation: 5, region: '하나', chapters: withFieldMoveUnlocks(unova2Chapters, fields.unova2), bosses: unova2Bosses, fieldMoves: fields.unova2, moveReminder: { chapter: 4, location: '포켓몬 월드 토너먼트', cost: '하트비늘 1개' }, postgame: ['포켓몬 월드 토너먼트', '검은마천루/하얀수동', 'N·아크로마 재대결'] },
  kalos6: { ...modernFamilies.kalos6, id: 'kalos6' },
  hoenn6: { ...modernFamilies.hoenn6, id: 'hoenn6' },
  alola7: { ...modernFamilies.alola7, id: 'alola7' },
  'alola7-ultra': { ...modernFamilies['alola7-ultra'], id: 'alola7-ultra' },
  letsgo7: { ...modernFamilies.letsgo7, id: 'letsgo7' },
  galar8: { ...modernFamilies.galar8, id: 'galar8' },
  sinnoh8: { ...modernFamilies.sinnoh8, id: 'sinnoh8' },
}

const game = (
  id: GameConfig['id'], endpoint: string, accent: string, starters: number[], fossils: number[][],
  extra: Partial<GameConfig> = {},
): GameConfig => {
  const registry = getPlannerCatalogGame(id)
  return {
    id,
    name: registry.name,
    shortName: registry.shortName,
    familyId: registry.plannerFamilyId ?? extra.familyId!,
    versionId: registry.versionId,
    versionGroupId: registry.versionGroupId,
    generation: registry.generation,
    region: registry.region,
    endpoint,
    accent,
    starters,
    fossils,
    ...extra,
  }
}

export const games: GameConfig[] = [
  game('red', '챔피언 라이벌', '#df4b45', [1, 4, 7], [[138, 140]], { notes: ['1세대 원작은 공식 한국어 카트리지판이 없어 커뮤니티 통용 표기를 사용합니다.'] }),
  game('green', '챔피언 라이벌', '#439b66', [1, 4, 7], [[138, 140]], { notes: ['그린 조우 데이터는 기존 저장 데이터와 추천 결과를 보존하기 위해 PokéAPI Blue 스냅샷을 사용합니다.'] }),
  game('blue', '챔피언 라이벌', '#447ed1', [1, 4, 7], [[138, 140]], { notes: ['1세대 원작은 공식 한국어 카트리지판이 없어 커뮤니티 통용 표기를 사용합니다.'] }),
  game('yellow', '챔피언 라이벌', '#d5aa24', [25], [[138, 140]], { notes: ['1세대 원작은 공식 한국어 카트리지판이 없어 커뮤니티 통용 표기를 사용합니다.'] }),
  game('gold', '챔피언 목호', '#c99c2e', [152, 155, 158], []),
  game('silver', '챔피언 목호', '#8da1b5', [152, 155, 158], [], { curatedGuideId: 'silver' }),
  game('crystal', '챔피언 목호', '#25a8c7', [152, 155, 158], [], { curatedGuideId: 'crystal' }),
  game('ruby', '챔피언 성호', '#cf4050', [252, 255, 258], [[345, 347]]),
  game('sapphire', '챔피언 성호', '#3268d5', [252, 255, 258], [[345, 347]], { curatedGuideId: 'sapphire' }),
  game('emerald', '챔피언 윤진', '#15976d', [252, 255, 258], [[345, 347]], { curatedGuideId: 'emerald' }),
  game('firered', '챔피언 라이벌', '#e55c3b', [1, 4, 7], [[138, 140]]),
  game('leafgreen', '챔피언 라이벌', '#65a951', [1, 4, 7], [[138, 140]]),
  game('diamond', '챔피언 난천', '#5e96ba', [387, 390, 393], [[408, 410]]),
  game('pearl', '챔피언 난천', '#c27f9e', [387, 390, 393], [[408, 410]]),
  game('platinum', '챔피언 난천', '#6f747e', [387, 390, 393], [[408, 410]]),
  game('heartgold', '챔피언 목호', '#c99c2e', [152, 155, 158], []),
  game('soulsilver', '챔피언 목호', '#8da1b5', [152, 155, 158], []),
  game('black', 'N·게치스', '#343a3d', [495, 498, 501], [[564, 566]]),
  game('white', 'N·게치스', '#9ca5a9', [495, 498, 501], [[564, 566]]),
  game('black-2', '챔피언 아이리스', '#343a3d', [495, 498, 501], [[564, 566]]),
  game('white-2', '챔피언 아이리스', '#9ca5a9', [495, 498, 501], [[564, 566]]),
  game('x', '챔피언 카르네', '#4267b2', [650, 653, 656], [[696, 698]], { familyId: 'kalos6', notes: ['미르시티에서 받는 관동 스타터와 빛나는동굴 화석은 각각 하나만 고를 수 있습니다.', '기술머신은 재사용할 수 있지만 입수 장소는 시점 추론으로 표시합니다.'] }),
  game('y', '챔피언 카르네', '#b3313c', [650, 653, 656], [[696, 698]], { familyId: 'kalos6', notes: ['미르시티에서 받는 관동 스타터와 빛나는동굴 화석은 각각 하나만 고를 수 있습니다.', '기술머신은 재사용할 수 있지만 입수 장소는 시점 추론으로 표시합니다.'] }),
  game('omega-ruby', '챔피언 성호', '#c53b48', [252, 255, 258], [[345, 347]], { familyId: 'hoenn6', notes: ['마그마단·원시 그란돈 경로를 따르며 뿌리·발톱화석은 하나만 고를 수 있습니다.', '도감내비 전용 칸은 전국도감 이후, 환상의 장소는 원시회귀 사건 이후로 분리합니다.'] }),
  game('alpha-sapphire', '챔피언 성호', '#345fbd', [252, 255, 258], [[345, 347]], { familyId: 'hoenn6', notes: ['아쿠아단·원시 가이오가 경로를 따르며 뿌리·발톱화석은 하나만 고를 수 있습니다.', '도감내비 전용 칸은 전국도감 이후, 환상의 장소는 원시회귀 사건 이후로 분리합니다.'] }),
  game('sun', '챔피언 결정전 쿠쿠이', '#df7126', [722, 725, 728], [], { familyId: 'alola7', notes: ['포켓라이드가 이동을 맡으므로 파티에 비전기술 담당이 필요하지 않습니다.', '아일랜드 스캔·포켓리조트 방문·조건 미확인 고정 심볼과 교환은 추천하지 않습니다.'] }),
  game('moon', '챔피언 결정전 쿠쿠이', '#4e5da8', [722, 725, 728], [], { familyId: 'alola7', notes: ['포켓라이드가 이동을 맡으므로 파티에 비전기술 담당이 필요하지 않습니다.', '아일랜드 스캔·포켓리조트 방문·조건 미확인 고정 심볼과 교환은 추천하지 않습니다.'] }),
  game('ultra-sun', '챔피언 결정전 하우', '#e6792b', [722, 725, 728], [], { familyId: 'alola7-ultra', notes: ['포켓라이드가 이동을 맡으므로 파티에 비전기술 담당이 필요하지 않습니다.', '아일랜드 스캔·포켓리조트 방문·조건 미확인 고정 심볼과 교환은 추천하지 않습니다.'] }),
  game('ultra-moon', '챔피언 결정전 하우', '#5964b7', [722, 725, 728], [], { familyId: 'alola7-ultra', notes: ['포켓라이드가 이동을 맡으므로 파티에 비전기술 담당이 필요하지 않습니다.', '아일랜드 스캔·포켓리조트 방문·조건 미확인 고정 심볼과 교환은 추천하지 않습니다.'] }),
  game('lets-go-pikachu', '챔피언 결정전 라이벌', '#f4c430', [25], [[138, 140]], { familyId: 'letsgo7', notes: ['파트너 피카츄의 비전기술이 이동을 맡으므로 파티에 비전기술 담당이 필요하지 않습니다. 파트너는 진화하지 않습니다.', '하늘 출현(리자몽·망나뇽·전설의 새)은 챔피언 이후에만 쓰고, 희귀 출현은 조건부 경로로 표시합니다.', '기술머신은 재사용할 수 있지만 입수 장소는 시점 추론으로 표시합니다.'] }),
  game('lets-go-eevee', '챔피언 결정전 라이벌', '#9b6b43', [133], [[138, 140]], { familyId: 'letsgo7', notes: ['파트너 이브이의 비전기술이 이동을 맡으므로 파티에 비전기술 담당이 필요하지 않습니다. 파트너는 진화하지 않습니다.', '하늘 출현(리자몽·망나뇽·전설의 새)은 챔피언 이후에만 쓰고, 희귀 출현은 조건부 경로로 표시합니다.', '기술머신은 재사용할 수 있지만 입수 장소는 시점 추론으로 표시합니다.'] }),
  game('sword', '챔피언 단델', '#39a7d7', [810, 813, 816], [], { familyId: 'galar8', notes: ['갑옷섬 1.2.0과 왕관설원 1.3.0 범위를 별도 조건으로 표시합니다.'] }),
  game('shield', '챔피언 단델', '#d84b89', [810, 813, 816], [], { familyId: 'galar8', notes: ['갑옷섬 1.2.0과 왕관설원 1.3.0 범위를 별도 조건으로 표시합니다.'] }),
  game('brilliant-diamond', '챔피언 난천', '#5c8eba', [387, 390, 393], [[408]], { familyId: 'sinnoh8', notes: ['포켓치 비전기술은 파티 기술칸을 차지하지 않으며 지하대동굴 풀은 진행 플래그에 따라 확장됩니다.'] }),
  game('shining-pearl', '챔피언 난천', '#c9799d', [387, 390, 393], [[410]], { familyId: 'sinnoh8', notes: ['포켓치 비전기술은 파티 기술칸을 차지하지 않으며 지하대동굴 풀은 진행 플래그에 따라 확장됩니다.'] }),
]

export function getGame(id: string): GameConfig {
  return games.find((entry) => entry.id === id) ?? games[0]
}

// 같은 스토리 패밀리를 쓰더라도 해당 버전에서 할 수 없는 목표는 버전별로 바꿉니다.
const chapterObjectivePatches: Partial<Record<GameConfig['id'], Record<string, string[]>>> = {
  yellow: { 'kan-1': ['오박사에게 피카츄 받기', '상록숲 통과', '웅 격파'] },
}
const familyVariants = new Map<GameConfig['id'], FamilyConfig>()

export function getFamily(game: GameConfig): FamilyConfig {
  const patches = chapterObjectivePatches[game.id]
  if (!patches) return families[game.familyId]
  const cached = familyVariants.get(game.id)
  if (cached) return cached
  const base = families[game.familyId]
  const variant = {
    ...base,
    chapters: base.chapters.map((entry) => patches[entry.id] ? { ...entry, objectives: patches[entry.id] } : entry),
  }
  familyVariants.set(game.id, variant)
  return variant
}

export function getMainStoryChapterCount(game: GameConfig): number {
  const family = getFamily(game)
  return family.mainStoryChapterCount ?? family.chapters.length
}

type BossPatch = Partial<Pick<PlannerBoss, 'level' | 'types'>>

// 6세대 이후 버전은 modernGames.ts의 버전별 보스표를 그대로 씁니다.
const modernPlannerGameIds = new Set<GameConfig['id']>([
  'x', 'y', 'omega-ruby', 'alpha-sapphire', 'sun', 'moon', 'ultra-sun', 'ultra-moon',
  'lets-go-pikachu', 'lets-go-eevee', 'sword', 'shield', 'brilliant-diamond', 'shining-pearl',
])

const frlgBossPatches: Record<string, BossPatch> = {
  lorelei: { level: 'Lv.51–54' }, 'bruno-k': { level: 'Lv.51–56' }, agatha: { level: 'Lv.53–58' },
  'lance-k': { level: 'Lv.54–60' }, 'champion-k': { level: 'Lv.57–63' },
}
const hgssBossPatches: Record<string, BossPatch> = {
  falkner: { level: 'Lv.9–13' }, bugsy: { level: 'Lv.15–17' }, whitney: { level: 'Lv.17–19' },
  chuck: { level: 'Lv.29–31' }, pryce: { level: 'Lv.30–34' }, clair: { level: 'Lv.38–41' }, 'lance-j': { level: 'Lv.46–50' },
}
const rubySapphireBossPatches: Record<string, BossPatch> = {
  roxanne: { level: 'Lv.14–15' }, brawly: { level: 'Lv.17–18' }, wattson: { level: 'Lv.20–23' },
  flannery: { level: 'Lv.26–28' }, norman: { level: 'Lv.28–31' }, winona: { level: 'Lv.30–33' }, 'tate-liza': { level: 'Lv.42' },
}

// 같은 스토리 패밀리라도 버전마다 트레이너 파티가 다르므로, 원작 트레이너 데이터와 다른 레벨·타입만 버전별로 덮어씁니다.
const bossPatches: Partial<Record<GameConfig['id'], Record<string, BossPatch>>> = {
  yellow: {
    brock: { level: 'Lv.10–12' }, surge: { level: 'Lv.28' }, erika: { level: 'Lv.30–32' },
    koga: { level: 'Lv.44–50', types: ['bug', 'poison'] }, sabrina: { level: 'Lv.50' },
    blaine: { level: 'Lv.48–54' }, giovanni: { level: 'Lv.50–55' },
  },
  firered: frlgBossPatches,
  leafgreen: frlgBossPatches,
  heartgold: hgssBossPatches,
  soulsilver: hgssBossPatches,
  ruby: rubySapphireBossPatches,
  sapphire: rubySapphireBossPatches,
}

export function getBosses(game: GameConfig): PlannerBoss[] {
  if (modernPlannerGameIds.has(game.id)) {
    return getModernBosses(game.id as ModernPlannerGameId).filter((entry) => !entry.gameIds || entry.gameIds.includes(game.id))
  }
  const patches = bossPatches[game.id]
  const base = patches
    ? getFamily(game).bosses.map((entry) => patches[entry.id] ? { ...entry, ...patches[entry.id] } : entry)
    : getFamily(game).bosses
  if (game.id === 'diamond' || game.id === 'pearl') return diamondPearlBosses
  if (game.id === 'emerald') {
    return base.map((entry) => {
      if (entry.id === 'wallace-gym') return boss('juan', '아단', '루네 체육관', 9, ['water'], 'Lv.41–46')
      if (entry.id === 'steven') return boss('wallace-champion', '윤진', '챔피언', 10, ['water'], 'Lv.55–58')
      return entry
    })
  }
  if (game.id === 'black') {
    return base.map((entry) => entry.id === 'drayden-iris' ? boss('drayden', '사간', '쌍용 체육관', 7, ['dragon'], 'Lv.41–43') : entry)
  }
  if (game.id === 'white') {
    return base.map((entry) => entry.id === 'drayden-iris' ? boss('iris-gym', '아이리스', '쌍용 체육관', 7, ['dragon'], 'Lv.41–43') : entry)
  }
  return base
}
