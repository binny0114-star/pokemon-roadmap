import type { FamilyConfig, GameConfig, PlannerBoss, StoryChapter } from './types'

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
  chapter('kan-3', '갈색시티', '상트앙느호와 풀베기', 'Lv.22–26', ['route-5', 'route-6', 'route-11', 'vermilion', 'diglett'], ['상트앙느호 선장에게 풀베기 획득', '마티스 격파'], ['풀베기']),
  chapter('kan-4', '돌산터널 → 무지개시티', '로켓단 게임코너', 'Lv.26–32', ['route-7', 'route-8', 'route-9', 'route-10', 'rock-tunnel', 'lavender', 'celadon'], ['돌산터널 통과', '민화 격파', '로켓단 아지트 소탕'], ['공중날기', '플래시']),
  chapter('kan-5', '포켓몬타워 → 연분홍시티', '피리와 사파리존', 'Lv.30–38', ['pokemon-tower', 'route-12', 'route-13', 'route-14', 'route-15', 'route-16', 'route-17', 'route-18', 'fuchsia', 'safari'], ['포켓몬타워 구출', '독수 격파', '사파리존에서 파도타기·괴력 획득'], ['파도타기', '괴력']),
  chapter('kan-6', '노랑시티', '실프주식회사와 초련', 'Lv.35–43', ['saffron', 'silph'], ['실프주식회사 로켓단 격퇴', '초련 격파']),
  chapter('kan-7', '쌍둥이섬 → 홍련섬', '포켓몬저택과 강연', 'Lv.40–47', ['route-19', 'route-20', 'route-21', 'seafoam', 'cinnabar', 'pokemon-mansion'], ['홍련체육관 열쇠 획득', '강연 격파']),
  chapter('kan-8', '상록시티 → 포켓몬리그', '마지막 배지와 챔피언', 'Lv.45–60', ['route-23', 'victory-road', 'indigo', 'viridian'], ['비주기 격파', '챔피언로드 돌파', '사천왕과 챔피언 격파']),
]

const johtoChapters = [
  chapter('joh-1', '연두마을 → 도라지시티', '첫 배지와 모다피의탑', 'Lv.5–12', ['new-bark', 'route-29', 'route-30', 'route-31', 'violet', 'sprout'], ['스타터 선택', '비상 격파'], ['플래시']),
  chapter('joh-2', '연결동굴 → 고동마을', '야돈우물과 너도밤나무숲', 'Lv.12–18', ['route-32', 'union-cave', 'azalea', 'slowpoke', 'ilex'], ['호일 격파', '풀베기 획득'], ['풀베기']),
  chapter('joh-3', '금빛시티', '꼭두와 자연공원', 'Lv.18–24', ['route-34', 'goldenrod', 'route-35', 'national-park', 'route-36'], ['꼭두 격파', '꼬부기물뿌리개 획득']),
  chapter('joh-4', '인주시티', '불탄탑과 유빈', 'Lv.22–28', ['route-37', 'ecruteak', 'burned-tower', 'bell-tower'], ['전설의 포켓몬 해방', '유빈 격파', '파도타기 획득'], ['파도타기']),
  chapter('joh-5', '담청·진청시티', '등대와 비전신약', 'Lv.27–34', ['route-38', 'route-39', 'olivine', 'route-40', 'route-41', 'cianwood'], ['사도 격파', '암페어 치료', '규리 격파'], ['공중날기', '괴력']),
  chapter('joh-6', '분노의호수 → 라디오타워', '로켓단 최종 소탕', 'Lv.30–38', ['route-42', 'mahogany', 'lake-of-rage', 'route-43', 'rocket-hideout', 'radio-tower'], ['붉은 갸라도스 조사', '류옹 격파', '라디오타워 탈환'], ['소용돌이']),
  chapter('joh-7', '얼음샛길 → 검은먹시티', '드래곤 배지', 'Lv.36–42', ['route-44', 'ice-path', 'blackthorn', 'dragons-den'], ['이향 격파', '용의굴 시험'], ['폭포오르기']),
  chapter('joh-8', '동성폭포 → 성도리그', '사천왕과 목호', 'Lv.40–50', ['route-26', 'route-27', 'tohjo', 'victory-road', 'indigo'], ['챔피언로드 돌파', '사천왕과 목호 격파']),
]

const hoennChapters = [
  chapter('hoe-1', '미로마을 → 금탄시티', '첫 파트너와 데봉 사건', 'Lv.5–15', ['littleroot', 'route-101', 'route-102', 'route-104', 'petalburg-woods', 'rustboro'], ['스타터 선택', '원규 격파', '데봉화물 회수'], ['풀베기']),
  chapter('hoe-2', '무로마을 → 잿빛시티', '바위동굴과 해양박물관', 'Lv.15–20', ['dewford', 'granite-cave', 'route-109', 'slateport'], ['철구 격파', '성호에게 편지 전달'], ['플래시']),
  chapter('hoe-3', '보라시티', '라이벌과 전기 배지', 'Lv.20–25', ['route-110', 'mauville', 'new-mauville'], ['암페어 격파'], ['바위깨기']),
  chapter('hoe-4', '유성폭포 → 용암마을', '굴뚝산 사건', 'Lv.24–30', ['route-111', 'route-112', 'fiery-path', 'meteor-falls', 'mt-chimney', 'jagged-pass', 'lavaridge'], ['악당 조직의 운석 계획 저지', '연돌 격파']),
  chapter('hoe-5', '등화시티', '아버지와의 체육관전', 'Lv.28–33', ['petalburg', 'rusturf-tunnel'], ['종길 격파', '파도타기 획득', '시다케터널 개통'], ['파도타기', '괴력']),
  chapter('hoe-6', '119번도로 → 검방울시티', '날씨연구소와 공중날기', 'Lv.30–36', ['route-118', 'route-119', 'weather-institute', 'fortree', 'route-120'], ['날씨연구소 구출', '은송 격파'], ['공중날기']),
  chapter('hoe-7', '송화산 → 해안시티', '악당 조직 아지트', 'Lv.34–40', ['route-121', 'safari-zone', 'mt-pyre', 'lilycove', 'magma-hideout', 'aqua-hideout'], ['송화산 사건 해결', '아지트 돌파']),
  chapter('hoe-8', '이끼시티 → 해저동굴', '더블 배지와 다이빙', 'Lv.38–45', ['mossdeep', 'route-124', 'route-125', 'seafloor-cavern'], ['풍과 란 격파', '해저동굴 추격'], ['다이빙']),
  chapter('hoe-9', '루네시티', '초고대 포켓몬과 마지막 배지', 'Lv.42–47', ['sootopolis', 'cave-of-origin', 'sky-pillar'], ['초고대 포켓몬 사건 해결', '8번째 관장 격파'], ['폭포오르기']),
  chapter('hoe-10', '챔피언로드 → 호연리그', '사천왕과 챔피언', 'Lv.46–58', ['ever-grande', 'victory-road', 'pokemon-league'], ['챔피언로드 돌파', '사천왕과 챔피언 격파']),
]

const sinnohChapters = [
  chapter('sin-1', '떡잎마을 → 무쇠시티', '첫 파트너와 석탄 배지', 'Lv.5–15', ['twinleaf', 'route-201', 'route-202', 'oreburgh'], ['스타터 선택', '강석 격파'], ['바위깨기']),
  chapter('sin-2', '꽃향기마을 → 영원시티', '갤럭시단과 숲의 배지', 'Lv.15–24', ['floaroma', 'eterna-forest', 'eterna'], ['갤럭시단 발전소 사건', '유채 격파'], ['풀베기']),
  chapter('sin-3', '연고시티 → 장막시티', '콘테스트 도시와 격투 배지', 'Lv.22–32', ['hearthome', 'solaceon', 'veilstone'], ['멜리사/자두 진행', '갤럭시단 창고 조사'], ['공중날기']),
  chapter('sin-4', '들판시티', '대습초원과 물 배지', 'Lv.28–36', ['pastoria', 'great-marsh', 'route-212'], ['맥실러 격파', '갤럭시단 조무래기 추격'], ['안개제거']),
  chapter('sin-5', '봉신마을 → 운하시티', '고대 벽화와 강철 배지', 'Lv.34–41', ['celestic', 'canalave', 'iron-island'], ['봉신마을 유적 조사', '동관 격파'], ['파도타기', '괴력']),
  chapter('sin-6', '선단시티', '눈길과 얼음 배지', 'Lv.38–45', ['route-216', 'route-217', 'snowpoint'], ['무청 격파'], ['락클라임']),
  chapter('sin-7', '갤럭시단 본부 → 창기둥', '전설의 포켓몬 사건', 'Lv.42–49', ['veilstone', 'mt-coronet', 'spear-pillar', 'distortion-world'], ['갤럭시단 본부 돌파', '창기둥 사건 해결'], ['폭포오르기']),
  chapter('sin-8', '물가시티 → 신오리그', '마지막 배지와 챔피언', 'Lv.46–62', ['sunnyshore', 'route-223', 'victory-road', 'pokemon-league'], ['전진 격파', '챔피언로드 돌파', '사천왕과 난천 격파']),
]

const unovaChapters = [
  chapter('uno-1', '마름꽃마을 → 성신시티', '첫 파트너와 타입 수업', 'Lv.5–15', ['nuvema', 'route-1', 'striaton', 'dreamyard'], ['스타터 선택', '성신체육관 격파'], ['풀베기']),
  chapter('uno-2', '칠보시티', '박물관과 플라스마단', 'Lv.15–22', ['route-3', 'wellspring', 'nacrene'], ['알로에 격파', '드래곤 뼈 회수']),
  chapter('uno-3', '구름시티', '사막과 벌레 배지', 'Lv.20–28', ['pinwheel', 'castelia', 'desert-resort'], ['플라스마단 추적', '아티 격파']),
  chapter('uno-4', '뇌문시티', '배틀서브웨이와 전기 배지', 'Lv.26–34', ['route-4', 'nimbasa', 'lostlorn'], ['카밀레 격파'], ['공중날기']),
  chapter('uno-5', '물풍경시티 → 궐수시티', '냉동창고와 공항', 'Lv.31–40', ['driftveil', 'cold-storage', 'chargestone', 'mistralton'], ['야콘 격파', '풍란 격파'], ['파도타기']),
  chapter('uno-6', '태엽산 → 설화시티', '용의 나선탑', 'Lv.38–44', ['twist-mountain', 'icirrus', 'dragonspiral'], ['담죽 격파', '전설의 포켓몬 사건']),
  chapter('uno-7', '쌍용시티', '마지막 드래곤 배지', 'Lv.41–48', ['route-8', 'opelucid'], ['아이리스/사간 격파']),
  chapter('uno-8', '챔피언로드 → N의 성', '사천왕과 최종 결전', 'Lv.45–55', ['route-10', 'victory-road', 'pokemon-league', 'n-castle'], ['사천왕 돌파', 'N과 게치스 격파'], ['괴력', '폭포오르기', '다이빙']),
]

const unova2Chapters = [
  chapter('un2-1', '부채시티 → 모란만시티', '체렌과 보미카', 'Lv.5–18', ['asperita', 'floccesy', 'virbank'], ['스타터 선택', '체렌·보미카 격파'], ['풀베기']),
  chapter('un2-2', '구름시티', '포켓우드와 하수도', 'Lv.18–26', ['castelia', 'castelia-sewers'], ['아티 격파', '플라스마단 추적']),
  chapter('un2-3', '뇌문시티', '전기 배지', 'Lv.25–33', ['route-4', 'nimbasa'], ['카밀레 격파'], ['공중날기']),
  chapter('un2-4', '물풍경시티', 'PWT와 플라스마단', 'Lv.31–38', ['driftveil', 'pokemon-world-tournament'], ['야콘 격파', 'PWT 참가'], ['파도타기']),
  chapter('un2-5', '궐수시티 → 산로마을', '공항과 리버스마운틴', 'Lv.36–43', ['mistralton', 'reversal-mountain', 'lentimas'], ['풍란 격파', '플라스마단 추적']),
  chapter('un2-6', '쌍용시티', '드래곤 배지와 DNA 스플라이서', 'Lv.40–48', ['opelucid', 'marine-tube'], ['사간 격파', '플라스마 프리깃 추적'], ['괴력']),
  chapter('un2-7', '기하시티 → 자이언트홀', '마지막 배지와 큐레무', 'Lv.45–53', ['humilau', 'seaside-cave', 'giant-chasm'], ['시즈 격파', '큐레무 사건 해결'], ['폭포오르기', '다이빙']),
  chapter('un2-8', '챔피언로드 → 하나리그', '사천왕과 아이리스', 'Lv.50–60', ['route-23', 'victory-road', 'pokemon-league'], ['챔피언로드 돌파', '사천왕과 아이리스 격파']),
]

const kantoBosses = [
  boss('brock', '웅', '회색 체육관', 1, ['rock'], 'Lv.12–14'), boss('misty', '이슬', '블루 체육관', 2, ['water'], 'Lv.18–21'),
  boss('surge', '마티스', '갈색 체육관', 3, ['electric'], 'Lv.21–24'), boss('erika', '민화', '무지개 체육관', 4, ['grass'], 'Lv.24–29'),
  boss('koga', '독수', '연분홍 체육관', 5, ['poison'], 'Lv.37–43'), boss('sabrina', '초련', '노랑 체육관', 6, ['psychic'], 'Lv.37–43'),
  boss('blaine', '강연', '홍련 체육관', 7, ['fire'], 'Lv.42–47'), boss('giovanni', '비주기', '상록 체육관', 8, ['ground'], 'Lv.42–50'),
  boss('lorelei', '칸나', '사천왕', 8, ['ice', 'water'], 'Lv.51–54'), boss('bruno-k', '시바', '사천왕', 8, ['fighting', 'rock'], 'Lv.51–56'),
  boss('agatha', '국화', '사천왕', 8, ['ghost', 'poison'], 'Lv.53–58'), boss('lance-k', '목호', '사천왕', 8, ['dragon', 'flying'], 'Lv.54–60'),
  boss('champion-k', '라이벌', '챔피언', 8, ['normal'], 'Lv.59–65'),
]

const johtoBosses = [
  boss('falkner', '비상', '도라지 체육관', 1, ['flying'], 'Lv.7–13'), boss('bugsy', '호일', '고동 체육관', 2, ['bug'], 'Lv.14–17'),
  boss('whitney', '꼭두', '금빛 체육관', 3, ['normal'], 'Lv.18–20'), boss('morty', '유빈', '인주 체육관', 4, ['ghost'], 'Lv.21–25'),
  boss('chuck', '사도', '진청 체육관', 5, ['fighting'], 'Lv.27–31'), boss('jasmine', '규리', '담청 체육관', 5, ['steel'], 'Lv.30–35'),
  boss('pryce', '류옹', '황토 체육관', 6, ['ice'], 'Lv.27–34'), boss('clair', '이향', '검은먹 체육관', 7, ['dragon'], 'Lv.37–41'),
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
  boss('roark', '강석', '무쇠 체육관', 1, ['rock'], 'Lv.12–14'), boss('gardenia', '유채', '영원 체육관', 2, ['grass'], 'Lv.19–22'),
  boss('maylene', '자두', '장막 체육관', 3, ['fighting'], 'Lv.27–30'), boss('wake', '맥실러', '들판 체육관', 4, ['water'], 'Lv.27–37'),
  boss('fantina', '멜리사', '연고 체육관', 3, ['ghost'], 'Lv.24–36'), boss('byron', '동관', '운하 체육관', 5, ['steel'], 'Lv.36–41'),
  boss('candice', '무청', '선단 체육관', 6, ['ice'], 'Lv.38–44'), boss('volkner', '전진', '물가 체육관', 8, ['electric'], 'Lv.46–50'),
  boss('aaron', '충호', '사천왕', 8, ['bug'], 'Lv.49–53'), boss('bertha', '들국화', '사천왕', 8, ['ground'], 'Lv.50–55'),
  boss('flint', '대엽', '사천왕', 8, ['fire'], 'Lv.52–57'), boss('lucian', '오엽', '사천왕', 8, ['psychic'], 'Lv.53–59'),
  boss('cynthia', '난천', '챔피언', 8, ['dragon'], 'Lv.58–62'),
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
    { id: 'rock-smash', name: '바위깨기', type: 'fighting', unlockChapter: 8, required: false },
    { id: 'waterfall', name: '폭포오르기', type: 'water', unlockChapter: 8, required: false },
  ],
  sinnoh: [
    { id: 'cut', name: '풀베기', type: 'normal', unlockChapter: 2, required: true }, { id: 'fly', name: '공중날기', type: 'flying', unlockChapter: 3, required: false },
    { id: 'surf', name: '파도타기', type: 'water', unlockChapter: 5, required: true }, { id: 'strength', name: '괴력', type: 'normal', unlockChapter: 5, required: true },
    { id: 'defog', name: '안개제거', type: 'flying', unlockChapter: 4, required: false }, { id: 'rock-smash', name: '바위깨기', type: 'fighting', unlockChapter: 1, required: true },
    { id: 'waterfall', name: '폭포오르기', type: 'water', unlockChapter: 7, required: true }, { id: 'rock-climb', name: '락클라임', type: 'normal', unlockChapter: 6, required: true },
  ],
  hgss: [
    { id: 'cut', name: '풀베기', type: 'normal', unlockChapter: 2, required: true }, { id: 'fly', name: '공중날기', type: 'flying', unlockChapter: 5, required: false },
    { id: 'surf', name: '파도타기', type: 'water', unlockChapter: 4, required: true }, { id: 'strength', name: '괴력', type: 'normal', unlockChapter: 5, required: true },
    { id: 'whirlpool', name: '소용돌이', type: 'water', unlockChapter: 6, required: true }, { id: 'rock-smash', name: '바위깨기', type: 'fighting', unlockChapter: 3, required: false },
    { id: 'waterfall', name: '폭포오르기', type: 'water', unlockChapter: 7, required: true }, { id: 'rock-climb', name: '락클라임', type: 'normal', unlockChapter: 8, required: false },
  ],
  unova: [
    { id: 'cut', name: '풀베기', type: 'normal', unlockChapter: 1, required: true }, { id: 'fly', name: '공중날기', type: 'flying', unlockChapter: 4, required: false },
    { id: 'surf', name: '파도타기', type: 'water', unlockChapter: 5, required: false }, { id: 'strength', name: '괴력', type: 'normal', unlockChapter: 8, required: false },
    { id: 'waterfall', name: '폭포오르기', type: 'water', unlockChapter: 8, required: false }, { id: 'dive', name: '다이빙', type: 'water', unlockChapter: 8, required: false },
  ],
}

export const families: Record<string, FamilyConfig> = {
  kanto1: { id: 'kanto1', generation: 1, region: '관동', chapters: kantoChapters, bosses: kantoBosses, fieldMoves: fields.gen1, postgame: ['뮤츠가 기다리는 블루시티동굴', '도감 완성', '버전 교환 수집'] },
  johto2: { id: 'johto2', generation: 2, region: '성도·관동', chapters: johtoChapters, bosses: johtoBosses, fieldMoves: fields.gen2, postgame: ['관동 8개 배지', '은빛산 레드', '배회 전설 포켓몬'] },
  hoenn3: { id: 'hoenn3', generation: 3, region: '호연', chapters: hoennChapters, bosses: hoennBosses, fieldMoves: fields.hoenn, postgame: ['배틀타워/배틀프런티어', '레지 삼형제', '하늘기둥 레쿠쟈'] },
  kanto3: { id: 'kanto3', generation: 3, region: '관동·일곱섬', chapters: kantoChapters, bosses: kantoBosses, fieldMoves: fields.frlg, postgame: ['일곱섬 네트워크 머신', '강화 사천왕', '블루시티동굴 뮤츠'] },
  sinnoh4: { id: 'sinnoh4', generation: 4, region: '신오', chapters: sinnohChapters, bosses: sinnohBosses, fieldMoves: fields.sinnoh, postgame: ['전국도감과 파이트에리어', '배틀타워/프런티어', '하드마운틴·전설 포켓몬'] },
  johto4: { id: 'johto4', generation: 4, region: '성도·관동', chapters: johtoChapters, bosses: johtoBosses, fieldMoves: fields.hgss, postgame: ['관동 8개 배지', '은빛산 레드', '배틀프런티어'] },
  unova5: { id: 'unova5', generation: 5, region: '하나', chapters: unovaChapters, bosses: unovaBosses, fieldMoves: fields.unova, postgame: ['칠보시티 이후 동쪽 하나', '챔피언 노간주', '블랙시티/화이트포리스트'] },
  'unova5-2': { id: 'unova5-2', generation: 5, region: '하나', chapters: unova2Chapters, bosses: unova2Bosses, fieldMoves: fields.unova, postgame: ['포켓몬 월드 토너먼트', '검은마천루/하얀수동', 'N·아크로마 재대결'] },
}

const game = (
  id: GameConfig['id'], name: string, shortName: string, familyId: GameConfig['familyId'], versionId: number,
  generation: number, region: string, endpoint: string, accent: string, starters: number[], fossils: number[][],
  extra: Partial<GameConfig> = {},
): GameConfig => ({
  id,
  name,
  shortName,
  familyId,
  versionId,
  versionGroupId: ({
    1: 1, 2: 1, 3: 2, 4: 3, 5: 3, 6: 4, 7: 5, 8: 5, 9: 6, 10: 7, 11: 7,
    12: 8, 13: 8, 14: 9, 15: 10, 16: 10, 17: 11, 18: 11, 21: 14, 22: 14,
  } as Record<number, number>)[versionId],
  generation,
  region,
  endpoint,
  accent,
  starters,
  fossils,
  ...extra,
})

export const games: GameConfig[] = [
  game('red', '포켓몬스터 레드', '레드', 'kanto1', 1, 1, '관동', '챔피언 라이벌', '#df4b45', [1, 4, 7], [[138, 140]], { notes: ['1세대 원작은 공식 한국어 카트리지판이 없어 커뮤니티 통용 표기를 사용합니다.'] }),
  game('green', '포켓몬스터 그린', '그린', 'kanto1', 2, 1, '관동', '챔피언 라이벌', '#439b66', [1, 4, 7], [[138, 140]], { notes: ['그린 조우 데이터는 원작 일본 그린과 계보가 가까운 PokéAPI Blue 스냅샷을 사용합니다.'] }),
  game('blue', '포켓몬스터 블루', '블루', 'kanto1', 2, 1, '관동', '챔피언 라이벌', '#447ed1', [1, 4, 7], [[138, 140]], { notes: ['1세대 원작은 공식 한국어 카트리지판이 없어 커뮤니티 통용 표기를 사용합니다.'] }),
  game('yellow', '포켓몬스터 피카츄', '피카츄', 'kanto1', 3, 1, '관동', '챔피언 라이벌', '#d5aa24', [25], [], { notes: ['1세대 원작은 공식 한국어 카트리지판이 없어 커뮤니티 통용 표기를 사용합니다.'] }),
  game('gold', '포켓몬스터 금', '금', 'johto2', 4, 2, '성도·관동', '챔피언 목호', '#c99c2e', [152, 155, 158], []),
  game('silver', '포켓몬스터 은', '은', 'johto2', 5, 2, '성도·관동', '챔피언 목호', '#8da1b5', [152, 155, 158], [], { curatedGuideId: 'silver' }),
  game('crystal', '포켓몬스터 크리스탈', '크리스탈', 'johto2', 6, 2, '성도·관동', '챔피언 목호', '#25a8c7', [152, 155, 158], [], { curatedGuideId: 'crystal' }),
  game('ruby', '포켓몬스터 루비', '루비', 'hoenn3', 7, 3, '호연', '챔피언 성호', '#cf4050', [252, 255, 258], [[345, 347]]),
  game('sapphire', '포켓몬스터 사파이어', '사파이어', 'hoenn3', 8, 3, '호연', '챔피언 성호', '#3268d5', [252, 255, 258], [[345, 347]], { curatedGuideId: 'sapphire' }),
  game('emerald', '포켓몬스터 에메랄드', '에메랄드', 'hoenn3', 9, 3, '호연', '챔피언 윤진', '#15976d', [252, 255, 258], [[345, 347]], { curatedGuideId: 'emerald' }),
  game('firered', '포켓몬스터 파이어레드', '파이어레드', 'kanto3', 10, 3, '관동', '챔피언 라이벌', '#e55c3b', [1, 4, 7], [[138, 140]]),
  game('leafgreen', '포켓몬스터 리프그린', '리프그린', 'kanto3', 11, 3, '관동', '챔피언 라이벌', '#65a951', [1, 4, 7], [[138, 140]]),
  game('diamond', '포켓몬스터 디아루가', '디아루가', 'sinnoh4', 12, 4, '신오', '챔피언 난천', '#5e96ba', [387, 390, 393], [[408, 410]]),
  game('pearl', '포켓몬스터 펄기아', '펄기아', 'sinnoh4', 13, 4, '신오', '챔피언 난천', '#c27f9e', [387, 390, 393], [[408, 410]]),
  game('platinum', '포켓몬스터 기라티나', '기라티나', 'sinnoh4', 14, 4, '신오', '챔피언 난천', '#6f747e', [387, 390, 393], [[408, 410]]),
  game('heartgold', '포켓몬스터 하트골드', '하트골드', 'johto4', 15, 4, '성도·관동', '챔피언 목호', '#c99c2e', [152, 155, 158], []),
  game('soulsilver', '포켓몬스터 소울실버', '소울실버', 'johto4', 16, 4, '성도·관동', '챔피언 목호', '#8da1b5', [152, 155, 158], []),
  game('black', '포켓몬스터 블랙', '블랙', 'unova5', 17, 5, '하나', 'N·게치스', '#343a3d', [495, 498, 501], [[564, 566]]),
  game('white', '포켓몬스터 화이트', '화이트', 'unova5', 18, 5, '하나', 'N·게치스', '#9ca5a9', [495, 498, 501], [[564, 566]]),
  game('black-2', '포켓몬스터 블랙 2', '블랙 2', 'unova5-2', 21, 5, '하나', '챔피언 아이리스', '#343a3d', [495, 498, 501], [[564, 566]]),
  game('white-2', '포켓몬스터 화이트 2', '화이트 2', 'unova5-2', 22, 5, '하나', '챔피언 아이리스', '#9ca5a9', [495, 498, 501], [[564, 566]]),
]

export function getGame(id: string): GameConfig {
  return games.find((entry) => entry.id === id) ?? games[0]
}

export function getFamily(game: GameConfig): FamilyConfig {
  return families[game.familyId]
}

export function getBosses(game: GameConfig): PlannerBoss[] {
  const base = getFamily(game).bosses
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
