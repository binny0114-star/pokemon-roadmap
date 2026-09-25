export type FamilyId =
  | 'kanto1' | 'johto2' | 'hoenn3' | 'kanto3' | 'sinnoh4' | 'johto4' | 'unova5' | 'unova5-2'
  | 'kalos6' | 'hoenn6' | 'alola7' | 'alola7-ultra' | 'letsgo7' | 'galar8' | 'sinnoh8'
export type PlannerGameId =
  | 'red' | 'green' | 'blue' | 'yellow'
  | 'gold' | 'silver' | 'crystal'
  | 'ruby' | 'sapphire' | 'emerald' | 'firered' | 'leafgreen'
  | 'diamond' | 'pearl' | 'platinum' | 'heartgold' | 'soulsilver'
  | 'black' | 'white' | 'black-2' | 'white-2'
  | 'x' | 'y' | 'omega-ruby' | 'alpha-sapphire'
  | 'sun' | 'moon' | 'ultra-sun' | 'ultra-moon' | 'lets-go-pikachu' | 'lets-go-eevee'
  | 'sword' | 'shield' | 'brilliant-diamond' | 'shining-pearl'

export interface CatalogEncounter {
  form?: number
  source?: 'pokeapi' | 'pkhex'
  location: string
  area: string
  regionId: number | null
  minLevel: number
  maxLevel: number
  method: string
  chance: number | null
  slot: number | null
  conditions: string[]
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

export interface CatalogEvolutionMethod extends CatalogEvolution {
  versionGroupId: number | null
  generation: number | null
  default: boolean
  locationId: number | null
  regionId: number | null
  genderId: number | null
  minBeauty: number | null
  minAffection: number | null
  relativePhysicalStats: number | null
  knownMoveId: number | null
  knownMoveTypeId: number | null
  partySpeciesId: number | null
  partyTypeId: number | null
  needsOverworldRain: boolean
  turnUpsideDown: boolean
  needsMultiplayer: boolean
  nearSpecialRock: boolean
  baseFormId: number | null
  evolvedFormId: number | null
  usedMoveId: number | null
  minMoveCount: number | null
  minSteps: number | null
  minDamageTaken: number | null
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
  evolutionMethods: CatalogEvolutionMethod[]
  evolutionDataStatus: 'available' | 'missing-source' | 'not-applicable'
  formDataStatus: 'default-form-only'
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
  sequence?: number
  gameIds?: GameConfig['id'][]
  branchGroup?: string
  winRequired?: boolean
  warning?: string
}

export interface FieldMove {
  id: string
  name: string
  type: string
  unlockChapter: number
  required: boolean
}

export interface MoveReminder {
  chapter: number
  location: string
  cost: string
}

export interface FamilyConfig {
  id: FamilyId
  generation: number
  region: string
  chapters: StoryChapter[]
  bosses: PlannerBoss[]
  fieldMoves: FieldMove[]
  moveReminder?: MoveReminder
  mainStoryChapterCount?: number
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
  finalChapter: number
  storyOrder: number
  location: string
  level: string
  tradeRequired: boolean
  postgameOnly: boolean
  versionExclusive: boolean
  sourceKind: 'wild' | 'starter' | 'fossil' | 'gift' | 'static' | 'evolution' | 'unknown'
  method?: string
  methodId?: string
  sourceSpeciesName?: string
  conditions?: string[]
  mutuallyExclusiveGroup?: string
  requiredStarterDex?: number
  dlcMilestone?: string
  dlcChapter?: number
  dlcFinalChapter?: number
  evolutionDlcMilestone?: string
  evolutionDlcChapter?: number
  evolutionDlcFinalChapter?: number
  formIndex?: number
  formIdentifier?: string
  formName?: string
  formTypes?: string[]
  formStats?: Record<string, number>
  formChoices?: {
    formIndex: number
    formIdentifier: string
    formName?: string
    types: string[]
    evolutionTrigger: string
  }[]
  sourceSpeciesDex?: number
  sourceFormIndex?: number
  sourceFormIdentifier?: string
  sourceFormName?: string
  gigantamaxCapable?: boolean
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
  dlcMilestone?: string
  dlcChapter?: number
  resourceId?: string
  reusable?: boolean
  repeatable?: boolean
  guaranteedCopies?: number
  repeatableChapter?: number
  unitCost?: number
  currency?: string
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
  legacyId?: string
  gameId: PlannerGameId
  challengeType: string | null
  challengeStarterDex: number | null
  formSelections: Record<number, string>
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
