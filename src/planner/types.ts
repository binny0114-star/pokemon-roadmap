export type FamilyId = 'kanto1' | 'johto2' | 'hoenn3' | 'kanto3' | 'sinnoh4' | 'johto4' | 'unova5' | 'unova5-2'
export type PlannerGameId =
  | 'red' | 'green' | 'blue' | 'yellow'
  | 'gold' | 'silver' | 'crystal'
  | 'ruby' | 'sapphire' | 'emerald' | 'firered' | 'leafgreen'
  | 'diamond' | 'pearl' | 'platinum' | 'heartgold' | 'soulsilver'
  | 'black' | 'white' | 'black-2' | 'white-2'

export interface CatalogEncounter {
  location: string
  minLevel: number
  maxLevel: number
}

export interface CatalogEvolution {
  trigger: string
  minLevel: number | null
  minHappiness: number | null
  item: string | null
  heldItemId: number | null
  time: string | null
  tradeSpeciesId: number | null
}

export interface CatalogSpecies {
  dex: number
  id: string
  name: string
  generation: number
  types: string[]
  typeNames: string[]
  stats: Record<string, number>
  evolvesFrom: number | null
  chainId: number
  legendary: boolean
  mythical: boolean
  evolution: CatalogEvolution | null
  encounters: Record<string, CatalogEncounter[]>
}

export interface StoryChapter {
  id: string
  title: string
  subtitle: string
  level: string
  locationTokens: string[]
  objectives: string[]
  unlocks?: string[]
}

export interface PlannerBoss {
  id: string
  name: string
  title: string
  chapter: number
  types: string[]
  level: string
}

export interface FieldMove {
  id: string
  name: string
  type: string
  unlockChapter: number
  required: boolean
}

export interface FamilyConfig {
  id: FamilyId
  generation: number
  region: string
  chapters: StoryChapter[]
  bosses: PlannerBoss[]
  fieldMoves: FieldMove[]
  postgame: string[]
}

export interface GameConfig {
  id: PlannerGameId
  name: string
  shortName: string
  familyId: FamilyId
  versionId: number
  versionGroupId: number
  generation: number
  region: string
  endpoint: string
  accent: string
  starters: number[]
  fossils: number[][]
  curatedGuideId?: 'silver' | 'crystal' | 'sapphire' | 'emerald'
  notes?: string[]
}

export type DataQuality = 'verified' | 'inferred'

export interface Availability {
  obtainable: boolean
  preChampion: boolean
  chapter: number
  storyOrder: number
  location: string
  level: string
  tradeRequired: boolean
  postgameOnly: boolean
  versionExclusive: boolean
  sourceKind: 'wild' | 'starter' | 'fossil' | 'static' | 'evolution' | 'unknown'
  mutuallyExclusiveGroup?: string
  reason?: string
  quality: DataQuality
}

export interface PlannerPreferences {
  noTrade: boolean
  hmConvenience: boolean
  allowLegendary: boolean
  allowPostgame: boolean
  favoriteWeight: number
}

export interface GeneratedMove {
  id: string
  name: string
  type: string
  category: '물리' | '특수' | '변화'
  source: string
  availableChapter: number
  quality: DataQuality
}

export interface GeneratedMember {
  species: CatalogSpecies
  availability: Availability
  required: boolean
  locked: boolean
  challengeStarter: boolean
  score: number
  reason: string
  role: string
  moves: GeneratedMove[]
  fieldMoves: string[]
}

export interface CoverageSummary {
  offensiveTypes: string[]
  weaknesses: Record<string, number>
  bossCoverage: number
  fieldMovesCovered: string[]
  fieldMovesMissing: string[]
}

export interface GeneratedPlan {
  id: string
  gameId: PlannerGameId
  challengeType: string | null
  challengeStarterDex: number | null
  members: GeneratedMember[]
  alternatives: GeneratedMember[]
  coverage: CoverageSummary
  warnings: string[]
}

export interface DynamicRoadmapAction {
  id: string
  kind: 'capture' | 'evolution' | 'move' | 'boss' | 'warning'
  text: string
  memberDex?: number
  quality: DataQuality
}

export interface DynamicRoadmapChapter extends StoryChapter {
  actions: DynamicRoadmapAction[]
}
