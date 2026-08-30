export type GameId = 'silver' | 'crystal' | 'sapphire' | 'emerald'

export type PokemonType =
  | '노말'
  | '불꽃'
  | '물'
  | '전기'
  | '풀'
  | '얼음'
  | '격투'
  | '독'
  | '땅'
  | '비행'
  | '에스퍼'
  | '벌레'
  | '바위'
  | '고스트'
  | '드래곤'
  | '악'
  | '강철'

export type HmName =
  | '풀베기'
  | '공중날기'
  | '파도타기'
  | '괴력'
  | '플래시'
  | '바위깨기'
  | '폭포오르기'
  | '다이빙'
  | '소용돌이'

export interface Move {
  name: string
  source: string
  hm?: HmName
}

export interface PartyMember {
  id: string
  name: string
  icon: string
  types: PokemonType[]
  role: string
  acquisition: string
  evolution: string
  moves: Move[]
  note?: string
}

export interface PartyPlan {
  id: string
  label: string
  description: string
  legendary: boolean
  members: PartyMember[]
}

export interface ChecklistItem {
  id: string
  text: string
}

export interface RoadmapChapter {
  id: string
  number: string
  title: string
  subtitle: string
  level: string
  objectives: ChecklistItem[]
  actions: string[]
  moves: string[]
  bossIds: string[]
  warning?: string
}

export interface Boss {
  id: string
  name: string
  title: string
  specialty: string
  level: string
  recommendedMemberIds: string[]
  plan: string
  caution?: string
}

export interface PostgameSection {
  id: string
  title: string
  summary: string
  items: string[]
}

export interface GameGuide {
  id: GameId
  name: string
  englishName: string
  generation: string
  region: string
  starter: string
  endpoint: string
  accent: string
  accentSoft: string
  icon: string
  tagline: string
  plans: PartyPlan[]
  defaultPlanId: string
  requiredHms: HmName[]
  hmConveniencePromised: boolean
  preferenceNotes: {
    noTrade: string
    hmOn: string
    hmOff: string
    legendary: string
  }
  chapters: RoadmapChapter[]
  bosses: Boss[]
  postgame: PostgameSection[]
}
