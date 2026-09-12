import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import './App.css'
import { guides } from './data'
import { getPlan as getCuratedPlan } from './data/integrity'
import {
  catalogCoverage,
  catalogSource,
  evolutionText,
  getAvailability,
  loadCatalog,
  modernEncounterProvenance,
  searchSpecies,
  speciesByDex,
  speciesCatalog,
} from './planner/catalog'
import {
  challengeCandidateCount,
  challengeTypeOrder,
  generateParty,
  speciesDisplayName,
  speciesIcon,
  speciesTypes,
  typeKo,
  validateRequired,
} from './planner/engine'
import { families, games, getBosses, getFamily, getGame } from './planner/games'
import {
  getModernBosses,
  getModernGame,
  modernEncounterChapter,
  modernFamilies,
  modernGames,
  modernStoryProvenance,
  type ModernPlannerGameId,
} from './planner/modernGames'
import { gameCatalog, type AccuracyGateId } from './planner/versionRegistry'
import { composeRoadmap } from './planner/roadmap'
import { learnsetSource } from './planner/learnsets'
import { createAccount, getActiveAccount, login, logout } from './planner/auth'
import { activeStorageScope } from './planner/auth'
import {
  cloudLogout,
  getCachedCloudAccount,
  initializeCloudAuth,
  isCloudConfigured,
  sendCloudMagicLink,
  subscribeCloudSync,
  type CloudSyncStatus,
} from './planner/cloud'
import {
  clearPlanSession,
  loadBuilderState,
  loadPlanSession,
  loadPlanProgress,
  loadPlanProgressWithLegacy,
  loadClearRecords,
  mergePlanProgress,
  reconcilePlanProgress,
  saveBuilderState,
  saveClearRecord,
  savePlanSession,
  savePlanProgress,
} from './planner/storage'
import type {
  GeneratedPlan,
  PlannerGameId,
  PlannerPreferences,
} from './planner/types'

type TabId = 'party' | 'roadmap' | 'hm' | 'bosses' | 'postgame'

interface BuilderState {
  gameId: PlannerGameId
  requiredDexes: number[]
  formSelections: Record<number, string>
  preferences: PlannerPreferences
  challengeType: string | null
}

const defaultState: BuilderState = {
  gameId: 'emerald',
  requiredDexes: [],
  formSelections: {},
  challengeType: null,
  preferences: {
    noTrade: true,
    hmConvenience: true,
    allowLegendary: false,
    allowPostgame: false,
    favoriteWeight: 50,
  },
}

const tabs: { id: TabId; name: string; icon: string }[] = [
  { id: 'party', name: '추천 파티', icon: '◉' },
  { id: 'roadmap', name: '동적 로드맵', icon: '✓' },
  { id: 'hm', name: '필드기', icon: '▦' },
  { id: 'bosses', name: '보스 전략', icon: '⚔' },
  { id: 'postgame', name: '엔딩 후', icon: '★' },
]

const qualityLabel = { verified: '검증', inferred: '시점 추론' }
const accuracyGateKo: Record<AccuracyGateId, string> = {
  availability: '버전별 입수·최초 장',
  forms: '폼 정체성',
  learnsets: '기술 합법성·획득 시점',
  evolutions: '진화 조건·최초 장',
  story: '의무 스토리·보스',
  mechanics: '이동 메커니즘',
  integration: '플래너·저장 통합',
}
const modernPreviewGameIds = new Set<string>(modernGames.map((entry) => entry.id))
const gen67AccuracyGateIds = new Set([
  'x', 'y', 'omega-ruby', 'alpha-sapphire',
  'sun', 'moon', 'ultra-sun', 'ultra-moon',
])
const gen8AccuracyGateIds = new Set([
  'lets-go-pikachu', 'lets-go-eevee',
  'sword', 'shield',
  'brilliant-diamond', 'shining-pearl',
  'legends-arceus',
])
const gen67AccuracyEntries = gameCatalog.filter((entry) => gen67AccuracyGateIds.has(entry.id))
const gen8AccuracyEntries = gameCatalog.filter((entry) => gen8AccuracyGateIds.has(entry.id))
const promotedGen67Count = gen67AccuracyEntries.filter((entry) => entry.plannerSupport.status === 'full').length
const promotedGen8Count = gen8AccuracyEntries.filter((entry) => entry.plannerSupport.status === 'full').length
const fullSupportCount = gameCatalog.filter((entry) => entry.plannerSupport.status === 'full').length
const catalogOnlyCount = gameCatalog.length - fullSupportCount
const mechanicsFamilyKo = {
  classic: '클래식 본편',
  'galar-wild-area': '가라르 와일드에리어·DLC',
  'sinnoh-underground': '신오 포켓치·지하대동굴',
  'lets-go': '레츠고 전용',
  legends: 'LEGENDS 전용',
} as const
const modernMethodKo: Record<string, string> = {
  walk: '일반 조우',
  grass: '풀숲',
  surf: '파도타기',
  'old-rod': '낡은낚싯대',
  'good-rod': '좋은낚싯대',
  'super-rod': '대단한낚싯대',
  'rock-smash': '바위깨기',
  horde: '무리배틀',
  'friend-safari': '프렌드사파리',
  'wild-unspecified': '일반 야생(세부 방식 미분리)',
  sos: '난입배틀(SOS)',
  overworld: '오버월드',
  hidden: '숨은 조우',
  fishing: '낚시',
  raid: '레이드',
  static: '고정 심볼',
  gift: '선물',
  egg: '알',
  fossil: '화석 복원',
  trade: '게임 내 교환',
  'honey-tree': '꿀나무',
  'grand-underground': '지하대동굴 심볼 조우',
}
const modernConditionKo: Record<string, string> = {
  'max-raid': '맥스 레이드',
  'water-bike': '수상 자전거',
  postgame: '엔딩 후',
  'form-region-dependent': '지역에 따라 폼 결정',
  'form-random': '폼 무작위',
  'time-morning': '아침',
  'time-day': '낮',
  'time-evening': '저녁',
  'time-night': '밤',
  'weather-normal': '맑음',
  'weather-overcast': '흐림',
  'weather-rain': '비',
  'weather-thunderstorm': '뇌우',
  'weather-intense-sun': '강한 햇빛',
  'weather-snow': '눈',
  'weather-snowstorm': '눈보라',
  'weather-sandstorm': '모래바람',
  'weather-heavy-fog': '짙은 안개',
  'weather-mist': '안개',
  'grand-underground': '지하대동굴',
  'explorer-kit': '탐험세트',
  'defog': '안개제거',
  'strength': '괴력',
  'icicle-badge': '글레이셔배지',
  'waterfall': '폭포오르기',
  'national-dex': '전국도감 이후',
  'elite-four-defeated': '사천왕 격파 이후',
  'daily-swarm': '오늘의 대량발생',
  'poke-radar': '포켓트레',
  'daily-trophy-garden': '자랑의 뒤뜰 일일 풀',
  'daily-great-marsh-binoculars': '대습초원 망원경 일일 풀',
  'friday-only': '금요일 한정',
  'night-only': '밤 한정',
}

function modernConditionLabel(condition: string): string {
  const badge = /^badge-count-(\d+)$/.exec(condition)
  if (badge) return `배지 ${badge[1]}개`
  const stars = /^raid-stars-(\d+)-(\d+)$/.exec(condition)
  if (stars) return `레이드 ${stars[1]}–${stars[2]}성`
  return modernConditionKo[condition] ?? condition
}

function loadCurrentPlanProgress(gameId: PlannerGameId, plan: GeneratedPlan): Set<string> {
  const saved = loadPlanProgressWithLegacy(gameId, plan.id, plan.legacyId)
  const actionIds = composeRoadmap(getGame(gameId), plan)
    .flatMap((chapter) => chapter.actions.map((action) => action.id))
  return reconcilePlanProgress(saved, actionIds)
}

function Toggle({
  checked,
  title,
  description,
  disabled = false,
  onChange,
}: {
  checked: boolean
  title: string
  description: string
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className={`toggle-row${disabled ? ' disabled' : ''}`}>
      <span><strong>{title}</strong><small>{description}</small></span>
      <span className="toggle">
        <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
        <span aria-hidden="true" />
      </span>
    </label>
  )
}

function App() {
  const loadedInitial = loadBuilderState(defaultState)
  const initial = { ...loadedInitial, formSelections: loadedInitial.formSelections ?? {} }
  const [builder, setBuilder] = useState<BuilderState>(initial)
  const initialBuilderRef = useRef(initial)
  const [query, setQuery] = useState('')
  const [plan, setPlan] = useState<GeneratedPlan | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('party')
  const [message, setMessage] = useState('')
  const [variant, setVariant] = useState(0)
  const [replaceTarget, setReplaceTarget] = useState<number | null>(null)
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [roadmapQuery, setRoadmapQuery] = useState('')
  const [catalogReady, setCatalogReady] = useState(false)
  const [localAccount] = useState(getActiveAccount)
  const [cloudAccount, setCloudAccount] = useState(getCachedCloudAccount)
  const [accountOpen, setAccountOpen] = useState(false)
  const [accountMethod, setAccountMethod] = useState<'cloud' | 'local'>(isCloudConfigured() ? 'cloud' : 'local')
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authName, setAuthName] = useState('')
  const [authPin, setAuthPin] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [clearRecords, setClearRecords] = useState(loadClearRecords)
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>(isCloudConfigured() ? 'idle' : 'local')
  const [previewGameId, setPreviewGameId] = useState<ModernPlannerGameId>('sword')
  const [previewChapter, setPreviewChapter] = useState(1)
  const accountButtonRef = useRef<HTMLButtonElement>(null)
  const accountDialogRef = useRef<HTMLElement>(null)
  const pokemonSearchRef = useRef<HTMLInputElement>(null)
  const previewTabsRef = useRef<HTMLDivElement>(null)

  const account = cloudAccount ?? localAccount
  const game = getGame(builder.gameId)
  const family = getFamily(game)
  const bosses = getBosses(game)
  const validation = validateRequired(
    builder.requiredDexes,
    game,
    builder.preferences,
    builder.challengeType,
    builder.formSelections,
  )
  const roadmap = plan ? composeRoadmap(game, plan) : []
  const roadmapActions = roadmap.flatMap((chapter) => chapter.actions)
  const progress = roadmapActions.length ? Math.round(completed.size / roadmapActions.length * 100) : 0
  const previewGame = getModernGame(previewGameId)
  const previewFamily = modernFamilies[previewGame.familyId]
  const previewStory = previewFamily.chapters[previewChapter - 1]
  const previewBosses = getModernBosses(previewGameId).filter((entry) => entry.chapter === previewChapter)
  const previewStorySource = modernStoryProvenance.sources.find((source) =>
    source.games.some((gameId) => gameId === previewGameId),
  )
  const encounterPreviewGameIds = useMemo<Set<string>>(() => new Set(
    catalogReady
      ? modernGames
          .filter((entry) => speciesCatalog.some((species) =>
            species.encounters[String(entry.catalog.versionId)]?.some((encounter) => encounter.source === 'pkhex'),
          ))
          .map((entry) => entry.id)
      : [],
  ), [catalogReady])
  const previewHasEncounterSnapshot = encounterPreviewGameIds.has(previewGameId)
  const previewAccuracyGates = previewGame.catalog.plannerSupport.status === 'catalog-only'
    ? previewGame.catalog.plannerSupport.accuracyGates
    : undefined
  const previewEncounters = useMemo(() => {
    if (!catalogReady) return []
    return speciesCatalog.flatMap((species) =>
      (species.encounters[String(previewGame.catalog.versionId)] ?? [])
        .filter((encounter) =>
          encounter.source === 'pkhex'
          && modernEncounterChapter(
            previewGame.familyId,
            encounter.location,
            encounter.conditions,
            encounter.method,
            encounter.minLevel,
          ) === previewChapter)
        .map((encounter) => ({ species, encounter })))
      .sort((left, right) =>
        left.encounter.location.localeCompare(right.encounter.location)
        || left.species.dex - right.species.dex
        || (left.encounter.form ?? 0) - (right.encounter.form ?? 0))
  }, [catalogReady, previewChapter, previewGame])

  useEffect(() => {
    saveBuilderState(builder)
  }, [builder])

  useEffect(() => subscribeCloudSync(setCloudSyncStatus), [])

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      const target = event.target
      if (
        accountOpen
        ||
        event.key !== '/'
        || event.ctrlKey
        || event.metaKey
        || event.altKey
        || (target instanceof HTMLElement && (
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
        ))
      ) return
      event.preventDefault()
      pokemonSearchRef.current?.focus()
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [accountOpen])

  useEffect(() => {
    if (!accountOpen) return
    const dialog = accountDialogRef.current
    if (!dialog) return
    const trigger = accountButtonRef.current
    const focusableElements = () => [...dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )]
    focusableElements()[0]?.focus()
    const handleDialogKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setAccountOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const focusable = focusableElements()
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    dialog.addEventListener('keydown', handleDialogKey)
    return () => {
      dialog.removeEventListener('keydown', handleDialogKey)
      trigger?.focus()
    }
  }, [accountOpen])

  useEffect(() => {
    if (!isCloudConfigured()) return
    const sourceScope = activeStorageScope()
    const hadCloudAccount = Boolean(getCachedCloudAccount())
    void initializeCloudAuth(sourceScope)
      .then((value) => {
        if (value && !hadCloudAccount) {
          window.location.reload()
          return
        }
        setCloudAccount(value)
      })
      .catch((error: unknown) => {
        console.error(error)
        setAuthMessage(error instanceof Error ? error.message : '온라인 로그인 상태를 확인하지 못했습니다.')
        setCloudSyncStatus('error')
      })
  }, [])

  useEffect(() => {
    void loadCatalog().then(() => {
      setCatalogReady(true)
      const saved = loadPlanSession()
      const initialBuilder = initialBuilderRef.current
      if (
        !saved
        || saved.gameId !== initialBuilder.gameId
        || (saved.challengeType ?? null) !== initialBuilder.challengeType
        || (initialBuilder.requiredDexes.length === 0 && !initialBuilder.challengeType)
      ) return
      try {
        const restoredFormSelections = saved.formSelections ?? initialBuilder.formSelections
        const restored = generateParty(getGame(initialBuilder.gameId), initialBuilder.preferences, {
          requiredDexes: initialBuilder.requiredDexes,
          lockedDexes: saved.lockedDexes,
          previousMembers: saved.memberDexes,
          variant: saved.variant,
          challengeType: initialBuilder.challengeType,
          formSelections: restoredFormSelections,
        })
        setBuilder((current) => ({ ...current, formSelections: { ...restoredFormSelections } }))
        setPlan(restored)
        setVariant(saved.variant)
        setCompleted(loadCurrentPlanProgress(initialBuilder.gameId, restored))
      } catch {
        clearPlanSession()
      }
    })
  }, [])

  useEffect(() => {
    if (!plan) return
    savePlanSession({
      gameId: plan.gameId,
      challengeType: plan.challengeType,
      memberDexes: plan.members.map((member) => member.species.dex),
      lockedDexes: plan.members.filter((member) => member.locked).map((member) => member.species.dex),
      variant,
      formSelections: plan.formSelections,
    })
  }, [plan, variant])

  const updatePreferences = (patch: Partial<PlannerPreferences>) => {
    setBuilder((current) => ({ ...current, preferences: { ...current.preferences, ...patch } }))
  }

  const selectGame = (gameId: PlannerGameId) => {
    setBuilder((current) => ({ ...current, gameId, requiredDexes: [], formSelections: {}, challengeType: null }))
    setPlan(null)
    setQuery('')
    setMessage('')
    setCompleted(new Set())
    clearPlanSession()
  }

  const selectSpecies = (dex: number) => {
    const species = speciesByDex.get(dex)
    if (!species) return
    if (builder.requiredDexes.includes(dex)) {
      setBuilder((current) => {
        const formSelections = { ...current.formSelections }
        delete formSelections[dex]
        return {
          ...current,
          requiredDexes: current.requiredDexes.filter((entry) => entry !== dex),
          formSelections,
        }
      })
      setMessage('')
      return
    }
    const availability = getAvailability(species, game)
    const matchingForm = availability.formChoices?.find((choice) =>
      !builder.challengeType || choice.types.includes(builder.challengeType))
    const availableTypes = availability.formChoices?.length
      ? [...new Set(availability.formChoices.flatMap((choice) => choice.types))]
      : speciesTypes(species, game.generation, game)
    const selectingChallengeStarter = Boolean(builder.challengeType && builder.requiredDexes.length === 0)
    if (builder.challengeType && !availableTypes.includes(builder.challengeType)) {
      setMessage(`${species.name}은(는) ${typeKo[builder.challengeType]} 타입을 공유하지 않아 현재 챌린지에 참가할 수 없습니다.`)
      return
    }
    if (selectingChallengeStarter && species.generation > game.generation) {
      setMessage(`${species.name}은(는) ${game.generation}세대에 존재하지 않아 개조 스타팅으로 선택할 수 없습니다.`)
      return
    }
    if (!selectingChallengeStarter && !availability.obtainable) {
      setMessage(`${species.name}: ${availability.reason}`)
      return
    }
    if (!selectingChallengeStarter && builder.preferences.noTrade && availability.tradeRequired) {
      setMessage(`${species.name}은(는) 통신교환 진화가 필요합니다. 무교환 설정을 끄세요.`)
      return
    }
    if (!selectingChallengeStarter && !builder.preferences.allowPostgame && availability.postgameOnly) {
      setMessage(`${species.name}은(는) 엔딩 후 입수입니다. 엔딩 후 포켓몬 허용을 켜세요.`)
      return
    }
    if (!builder.preferences.allowLegendary && (species.legendary || species.mythical)) {
      setMessage(`${species.name}은(는) 전설/환상 분류입니다. 전설 포켓몬 허용을 켜세요.`)
      return
    }
    if (builder.requiredDexes.length >= 6) {
      setMessage('필수 포켓몬은 최대 6마리까지 선택할 수 있습니다.')
      return
    }
    if (
      builder.challengeType
      && !selectingChallengeStarter
      && availability.mutuallyExclusiveGroup === 'starter'
      && species.chainId !== speciesByDex.get(builder.requiredDexes[0])?.chainId
    ) {
      setMessage(`원래 스타터 이벤트는 ${speciesByDex.get(builder.requiredDexes[0])?.name} 개조 스타팅으로 교체되어 ${species.name}을(를) 추가 입수할 수 없습니다.`)
      return
    }
    if (availability.mutuallyExclusiveGroup) {
      const conflict = builder.requiredDexes
        .map((entry) => speciesByDex.get(entry))
        .find((entry) => entry && getAvailability(entry, game).mutuallyExclusiveGroup === availability.mutuallyExclusiveGroup)
      if (conflict) {
        setMessage(`${conflict.name}과(와) ${species.name}은(는) 같은 플레이에서 동시에 선택할 수 없는 스타터/화석입니다.`)
        return
      }
    }
    setBuilder((current) => ({
      ...current,
      requiredDexes: [...current.requiredDexes, dex],
      formSelections: matchingForm
        ? { ...current.formSelections, [dex]: matchingForm.formIdentifier }
        : current.formSelections,
    }))
    setMessage('')
  }

  const createPlan = (nextVariant = 0, previous = plan) => {
    try {
      const generated = generateParty(game, builder.preferences, {
        requiredDexes: builder.requiredDexes,
        lockedDexes: previous?.members.filter((member) => member.locked).map((member) => member.species.dex),
        previousMembers: previous?.members.map((member) => member.species.dex),
        variant: nextVariant,
        challengeType: builder.challengeType,
        formSelections: builder.formSelections,
      })
      setPlan(generated)
      setVariant(nextVariant)
      setCompleted(loadCurrentPlanProgress(game.id, generated))
      setMessage('')
      setActiveTab('party')
      setReplaceTarget(null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '파티를 생성하지 못했습니다.')
    }
  }

  const applyCurated = () => {
    if (!game.curatedGuideId) return
    const guide = guides.find((entry) => entry.id === game.curatedGuideId)
    if (!guide) return
    const curated = getCuratedPlan(guide, guide.defaultPlanId)
    const dexes = curated.members.map((member) =>
      speciesCatalog.find((species) => species.name === member.name)?.dex,
    ).filter((dex): dex is number => Boolean(dex))
    const preferences = {
      ...builder.preferences,
      allowLegendary: curated.legendary,
      noTrade: true,
      allowPostgame: false,
    }
    setBuilder((current) => ({
      ...current,
      requiredDexes: dexes,
      formSelections: {},
      preferences,
      challengeType: null,
    }))
    try {
      const generated = generateParty(game, preferences, { requiredDexes: dexes, challengeType: null })
      setPlan(generated)
      setVariant(0)
      setCompleted(loadCurrentPlanProgress(game.id, generated))
      setActiveTab('party')
      setMessage('기존 검수 프리셋 6마리를 필수 멤버로 불러왔습니다.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '프리셋을 불러오지 못했습니다.')
    }
  }

  const toggleLock = (dex: number) => {
    if (!plan) return
    setPlan({
      ...plan,
      members: plan.members.map((member) =>
        member.species.dex === dex && !member.required ? { ...member, locked: !member.locked } : member,
      ),
    })
  }

  const replaceMember = (alternativeDex: number) => {
    if (!plan || replaceTarget === null) return
    const kept = plan.members.filter((member) => member.species.dex !== replaceTarget && member.locked).map((member) => member.species.dex)
    try {
      const generated = generateParty(game, builder.preferences, {
        requiredDexes: builder.requiredDexes,
        lockedDexes: [...kept, alternativeDex],
        previousMembers: [...kept, alternativeDex],
        challengeType: builder.challengeType,
        formSelections: builder.formSelections,
      })
      setPlan(generated)
      setVariant(0)
      setCompleted(loadCurrentPlanProgress(game.id, generated))
      setReplaceTarget(null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '멤버를 교체하지 못했습니다.')
    }
  }

  const toggleProgress = (id: string) => {
    if (!plan) return
    setCompleted((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      const saved = loadPlanProgress(game.id, plan.id)
      savePlanProgress(game.id, plan.id, mergePlanProgress(saved, roadmapActions.map((action) => action.id), next))
      if (roadmapActions.length > 0 && roadmapActions.every((action) => next.has(action.id))) {
        setClearRecords(saveClearRecord({
          id: `${game.id}:${plan.id}`,
          gameId: game.id,
          gameName: game.name,
          planId: plan.id,
          challengeType: plan.challengeType,
          memberNames: plan.members.map((member) => member.species.name),
          completedAt: new Date().toISOString(),
          totalActions: roadmapActions.length,
        }))
      }
      return next
    })
  }

  const resetProgress = () => {
    if (!plan || !window.confirm('현재 파티 플랜의 진행률만 초기화할까요?')) return
    const next = new Set<string>()
    setCompleted(next)
    savePlanProgress(game.id, plan.id, next)
  }

  const setChallengeType = (challengeType: string | null) => {
    setBuilder((current) => {
      const formSelections = { ...current.formSelections }
      for (const dex of current.requiredDexes) {
        const species = speciesByDex.get(dex)
        const choices = species ? getAvailability(species, game).formChoices : undefined
        if (!choices?.length) continue
        const currentChoice = choices.find((choice) => choice.formIdentifier === formSelections[dex])
        const nextChoice = choices.find((choice) => !challengeType || choice.types.includes(challengeType))
        if (!currentChoice || (challengeType && !currentChoice.types.includes(challengeType))) {
          if (nextChoice) formSelections[dex] = nextChoice.formIdentifier
        }
      }
      return { ...current, challengeType, formSelections }
    })
    setPlan(null)
    setCompleted(new Set())
    setMessage('')
    clearPlanSession()
  }

  const selectForm = (dex: number, formIdentifier: string) => {
    const species = speciesByDex.get(dex)
    const choice = species
      ? getAvailability(species, game).formChoices?.find((entry) => entry.formIdentifier === formIdentifier)
      : undefined
    if (!choice) return
    setBuilder((current) => ({
      ...current,
      formSelections: { ...current.formSelections, [dex]: formIdentifier },
    }))
    setPlan(null)
    setCompleted(new Set())
    setMessage('')
    clearPlanSession()
  }

  const handlePreviewTabKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    const count = previewFamily.chapters.length + 1
    let nextIndex = currentIndex
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % count
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + count) % count
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = count - 1
    else return
    event.preventDefault()
    setPreviewChapter(nextIndex + 1)
    previewTabsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus()
  }

  const generationChallengeTypes = challengeTypeOrder.filter((type) =>
    game.generation >= 2 || (type !== 'dark' && type !== 'steel'),
  )
  const results = (query.trim() || !builder.challengeType ? searchSpecies(query) : speciesCatalog)
    .map((species) => ({ species, availability: getAvailability(species, game) }))
    .filter(({ species }) =>
      query.trim()
      || !builder.challengeType
      || speciesTypes(species, game.generation, game).includes(builder.challengeType),
    )
    .sort((a, b) =>
      Number(
        !builder.challengeType || speciesTypes(b.species, game.generation, game).includes(builder.challengeType),
      ) - Number(
        !builder.challengeType || speciesTypes(a.species, game.generation, game).includes(builder.challengeType),
      )
      ||
      Number(b.availability.obtainable) - Number(a.availability.obtainable)
      || a.availability.chapter - b.availability.chapter
      || a.species.dex - b.species.dex,
    )
    .slice(0, query.trim() ? 48 : 24)

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthBusy(true)
    setAuthMessage('')
    try {
      if (authMode === 'register') await createAccount(authName, authPin)
      else await login(authName, authPin)
      window.location.reload()
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : '계정 처리를 완료하지 못했습니다.')
      setAuthBusy(false)
    }
  }

  const submitCloudAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthBusy(true)
    setAuthMessage('')
    try {
      await sendCloudMagicLink(authEmail)
      setAuthMessage('로그인 링크를 이메일로 보냈습니다. 링크를 열면 이 화면으로 돌아와 자동 복원됩니다.')
      setAuthBusy(false)
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : '온라인 로그인을 완료하지 못했습니다.')
      setAuthBusy(false)
    }
  }

  const signOut = async () => {
    try {
      if (cloudAccount) await cloudLogout()
      else logout()
      window.location.reload()
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : '로그아웃하지 못했습니다.')
    }
  }

  return (
    <div className="app planner-app" style={{ '--accent': game.accent, '--accent-soft': `${game.accent}18` } as CSSProperties}>
      <header className="planner-hero">
        <nav className="topbar">
          <a className="brand" href="#top"><span className="brand-mark"><i /></span><span>POKÉ <b>ROUTE</b></span></a>
          <div className="topbar-actions">
            <span className="offline-badge"><i /> 정적 오프라인 엔진</span>
            <button
              ref={accountButtonRef}
              className="account-button"
              onClick={() => setAccountOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={accountOpen}
            >
              <span>{account ? '●' : '○'}</span>
              <b>{account?.name ?? '로그인'}</b>
              {account && <small>{cloudAccount
                ? cloudSyncStatus === 'syncing' ? '동기화 중'
                  : cloudSyncStatus === 'error' ? '동기화 오류'
                    : '온라인 저장'
                : `${clearRecords.length}회 클리어`}</small>}
            </button>
          </div>
        </nav>
        <div className="builder-intro" id="top">
          <div>
            <span className="kicker">GENERATION I–VIII · {games.length} VERSIONS</span>
            <h1>좋아하는 포켓몬으로<br /><em>끝까지 가는 길.</em></h1>
            <p>좋아하는 멤버나 단일 타입 챌린지를 고르면 획득 시점, 보스 상성과 필드기를 계산해<br className="desktop-only" /> 맞춤 파티와 전용 스토리 로드맵을 만듭니다.</p>
          </div>
          <div className="hero-stat-grid">
            <span><b>{catalogCoverage?.nationalDex.count ?? 1025}</b><small>전국도감 데이터</small></span>
            <span><b>{games.length}</b><small>완전 지원 버전</small></span>
            <span><b>{Object.keys(families).length}</b><small>스토리 패밀리</small></span>
            <span><b>0</b><small>런타임 API</small></span>
          </div>
        </div>
      </header>

      {accountOpen && (
        <div className="account-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setAccountOpen(false)
        }}>
          <section ref={accountDialogRef} className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title">
            <button className="dialog-close" onClick={() => setAccountOpen(false)} aria-label="계정 창 닫기">×</button>
            {account ? (
              <>
                <div className="account-heading">
                  <span className="eyebrow">{cloudAccount ? 'CLOUD TRAINER PROFILE' : 'LOCAL TRAINER PROFILE'}</span>
                  <h2 id="account-title">{account.name} 트레이너</h2>
                  <p>{cloudAccount
                    ? '파티, 진행률과 클리어 기록을 암호화된 로그인 세션으로 온라인에 동기화합니다.'
                    : '이 브라우저에서 파티, 진행률과 클리어 기록을 계정별로 저장합니다.'}</p>
                </div>
                <div className="account-summary">
                  <span><b>{clearRecords.length}</b><small>클리어</small></span>
                  <span><b>{plan ? `${progress}%` : '—'}</b><small>현재 진행</small></span>
                </div>
                <div className="clear-history">
                  <div className="clear-history-title"><h3>클리어 목록</h3><small>CLEAR ARCHIVE</small></div>
                  {clearRecords.length ? clearRecords.map((record) => (
                    <article key={record.id}>
                      <span className="clear-medal">★</span>
                      <div>
                        <strong>{record.gameName}</strong>
                        <small>{record.challengeType ? `${typeKo[record.challengeType]} 타입 챌린지` : '밸런스 파티'} · {new Date(record.completedAt).toLocaleDateString('ko-KR')}</small>
                        <p>{record.memberNames.join(' · ')}</p>
                      </div>
                    </article>
                  )) : <p className="empty-history">로드맵의 모든 파티 액션을 완료하면 여기에 기록됩니다.</p>}
                </div>
                <button className="logout-button" onClick={() => void signOut()}>로그아웃하고 게스트로 전환</button>
                <p className="local-account-note">{cloudAccount
                  ? `Supabase에 마지막으로 ${cloudSyncStatus === 'saved' ? '저장됨' : cloudSyncStatus === 'syncing' ? '저장 중' : cloudSyncStatus === 'error' ? '저장 오류 발생' : '연결됨'}. 다른 브라우저에서도 같은 이메일로 로그인하면 복원됩니다.`
                  : '로컬 계정은 서버로 전송되지 않으며 이 브라우저에만 존재합니다. 다른 기기와 자동 동기화되지는 않습니다.'}</p>
              </>
            ) : (
              <>
                <div className="account-heading">
                  <span className="eyebrow">{accountMethod === 'cloud' ? 'CLOUD ACCOUNT' : 'OFFLINE ACCOUNT'}</span>
                  <h2 id="account-title">트레이너 로그인</h2>
                  <p>{accountMethod === 'cloud'
                    ? '이메일 매직 링크로 로그인하면 브라우저 데이터를 지워도 진행 기록을 복원할 수 있습니다.'
                    : '닉네임과 PIN으로 이 브라우저 안에서 진행 기록을 분리하세요.'}</p>
                </div>
                {isCloudConfigured() && (
                  <div className="account-method-tabs">
                    <button className={accountMethod === 'cloud' ? 'selected' : ''} onClick={() => { setAccountMethod('cloud'); setAuthMessage('') }}>온라인 동기화</button>
                    <button className={accountMethod === 'local' ? 'selected' : ''} onClick={() => { setAccountMethod('local'); setAuthMessage('') }}>로컬 PIN</button>
                  </div>
                )}
                {accountMethod === 'cloud' ? (
                  <form className="auth-form cloud-auth-form" onSubmit={submitCloudAuth}>
                    <label><span>이메일</span><input value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} type="email" autoComplete="email" required /></label>
                    {authMessage && <p className={authMessage.includes('보냈습니다') ? 'auth-info' : 'auth-error'} role="status">{authMessage}</p>}
                    <button type="submit" disabled={authBusy}>{authBusy ? '전송 중…' : '로그인 링크 받기'}</button>
                  </form>
                ) : (
                  <>
                    <div className="auth-tabs">
                      <button className={authMode === 'login' ? 'selected' : ''} onClick={() => { setAuthMode('login'); setAuthMessage('') }}>로그인</button>
                      <button className={authMode === 'register' ? 'selected' : ''} onClick={() => { setAuthMode('register'); setAuthMessage('') }}>새 계정</button>
                    </div>
                    <form className="auth-form" onSubmit={submitAuth}>
                      <label><span>닉네임</span><input value={authName} onChange={(event) => setAuthName(event.target.value)} minLength={2} maxLength={16} autoComplete="username" required /></label>
                      <label><span>PIN</span><input value={authPin} onChange={(event) => setAuthPin(event.target.value)} inputMode="numeric" pattern="[0-9]{4,12}" minLength={4} maxLength={12} type="password" autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} required /></label>
                      {authMessage && <p className="auth-error" role="alert">{authMessage}</p>}
                      <button type="submit" disabled={authBusy}>{authBusy ? '처리 중…' : authMode === 'register' ? '계정 만들기' : '로그인'}</button>
                    </form>
                  </>
                )}
                <p className="local-account-note">{accountMethod === 'cloud'
                  ? '인증 세션은 이 기기에 안전하게 저장됩니다. 이메일 주소는 로그인 식별자로만 사용합니다.'
                  : '처음 계정을 만들면 현재 게스트의 파티와 진행률을 가져옵니다. PIN은 PBKDF2로 해시되어 저장됩니다.'}</p>
              </>
            )}
          </section>
        </div>
      )}

      <main>
        <section className="builder-section">
          <div className="builder-step">
            <span className="step-number">01</span>
            <div><small>GAME</small><h2>게임 선택</h2></div>
          </div>
          <div className="game-selector">
            <label>
              <span>플레이 버전</span>
              <select value={game.id} onChange={(event) => selectGame(event.target.value as PlannerGameId)}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((generation) => (
                  <optgroup key={generation} label={`${generation}세대`}>
                    {gameCatalog.filter((entry) => entry.generation === generation).map((entry) => (
                      <option
                        key={entry.id}
                        value={entry.id}
                        disabled={entry.plannerSupport.status !== 'full'}
                      >
                        {entry.name}{entry.plannerSupport.status === 'catalog-only' ? ' · 데이터 준비 중' : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <div className="selected-game-mark">
              <span style={{ background: game.accent }}>{game.generation}</span>
              <div><strong>{game.name}</strong><small>{game.region} · {game.endpoint}</small></div>
            </div>
            <div className="game-count">{family.chapters.length}<small>CHAPTERS</small></div>
            <div className="game-count">{bosses.length}<small>BOSSES</small></div>
          </div>
          <p className="data-note">ⓘ 6–9세대의 검수된 스토리·입수 데이터는 아래에서 미리볼 수 있습니다. 스토리·입수·버전별 기술 데이터가 모두 완비되기 전에는 파티 로드맵 생성을 열지 않습니다.</p>
          <p className="generation-promotion-summary">
            Gen 6–7 정확성 승격 <strong>{promotedGen67Count}/{gen67AccuracyEntries.length}</strong>
          </p>
          <p className="generation-promotion-summary">
            Gen 8 계열 정확성 승격 <strong>{promotedGen8Count}/{gen8AccuracyEntries.length}</strong>
          </p>
          {game.notes?.map((note) => <p className="data-note" key={note}>ⓘ {note}</p>)}
          <details className="version-catalog">
            <summary>
              <span>전 버전 지원 상태 보기</span>
              <small>{gameCatalog.length}개 버전 · 완전 지원 {fullSupportCount} · 카탈로그 전용 {catalogOnlyCount}</small>
            </summary>
            <div className="version-catalog-grid">
              {gameCatalog.map((entry) => {
                const full = entry.plannerSupport.status === 'full'
                const accuracyGates = entry.plannerSupport.status === 'catalog-only'
                  ? entry.plannerSupport.accuracyGates
                  : undefined
                const storyPreviewAvailable = modernPreviewGameIds.has(entry.id)
                const encounterPreviewAvailable = encounterPreviewGameIds.has(entry.id)
                return (
                  <article key={entry.id}>
                    <span>{entry.generation}세대 · {entry.region} · {mechanicsFamilyKo[entry.mechanicsFamily]}</span>
                    <strong>{entry.shortName}</strong>
                    <b className={full ? 'support-full' : 'support-catalog'}>
                      {full ? '파티·로드맵 지원' : '카탈로그 전용'}
                    </b>
                    <p>{full
                      ? '버전별 입수·기술·보스 데이터를 사용해 전체 로드맵을 생성합니다.'
                      : entry.plannerSupport.status === 'catalog-only' && entry.plannerSupport.reason}</p>
                    {!full && <small>{
                      !storyPreviewAvailable
                        ? '전용 진행 모델 미지원'
                        : !catalogReady
                          ? '스토리 미리보기 · 입수 데이터 확인 중'
                          : encounterPreviewAvailable
                            ? '스토리·입수 미리보기 제공'
                            : '스토리·보스 미리보기 제공 · 정확한 입수 스냅샷 없음'
                    }</small>}
                    {accuracyGates && (
                      <small>
                        정확성 게이트 {Object.values(accuracyGates).filter((gate) => gate.complete).length}/
                        {Object.keys(accuracyGates).length} 통과
                      </small>
                    )}
                  </article>
                )
              })}
            </div>
          </details>
        </section>

        <section className="builder-section modern-preview">
          <div className="builder-step">
            <span className="step-number">◎</span>
            <div><small>REVIEWED PREVIEW</small><h2>6–9세대 스토리·입수 미리보기</h2></div>
          </div>
          <div className="modern-preview-controls">
            <label>
              <span>미리보기 버전</span>
              <select
                value={previewGameId}
                onChange={(event) => {
                  setPreviewGameId(event.target.value as ModernPlannerGameId)
                  setPreviewChapter(1)
                }}
              >
                {modernGames.map((entry) => <option key={entry.id} value={entry.id}>{entry.catalog.name}</option>)}
              </select>
            </label>
            <div>
              <div className="preview-capabilities" aria-label="미리보기 지원 범위">
                <span className="available">{mechanicsFamilyKo[previewGame.catalog.mechanicsFamily]}</span>
                <span className={previewHasEncounterSnapshot ? 'available' : 'unavailable'}>
                  {previewHasEncounterSnapshot
                    ? previewGame.catalog.plannerSupport.status === 'full' ? '완전 입수 스냅샷' : '부분 입수 스냅샷'
                    : '정확한 입수 스냅샷 없음'}
                </span>
                <span className={previewGame.catalog.plannerSupport.status === 'full' ? 'available' : 'unavailable'}>
                  {previewGame.catalog.plannerSupport.status === 'full' ? '파티 로드맵 완전 지원' : '파티 로드맵 생성 미지원'}
                </span>
              </div>
              <p>{previewGame.catalog.plannerSupport.status === 'catalog-only' && previewGame.catalog.plannerSupport.reason}</p>
              {previewAccuracyGates && (
                <details className="accuracy-gates">
                  <summary>
                    정확성 게이트 {Object.values(previewAccuracyGates).filter((gate) => gate.complete).length}/
                    {Object.keys(previewAccuracyGates).length} 통과
                  </summary>
                  <ul>
                    {Object.entries(previewAccuracyGates).map(([gateId, gate]) => (
                      <li key={gateId}>
                        <strong>{gate.complete ? '통과' : '차단'} · {accuracyGateKo[gateId as AccuracyGateId]}</strong>
                        <span>{gate.evidence}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {previewStorySource && (
                <p className="preview-provenance">
                  스토리 검수 {modernStoryProvenance.reviewedAt} · <a href={previewStorySource.url} target="_blank" rel="noreferrer">워크스루 출처</a>
                </p>
              )}
            </div>
          </div>
          <div ref={previewTabsRef} className="preview-chapters" role="tablist" aria-label="스토리 장">
            {previewFamily.chapters.map((entry, index) => (
              <button
                key={entry.id}
                id={`preview-tab-${index + 1}`}
                role="tab"
                aria-controls="preview-panel"
                aria-selected={previewChapter === index + 1}
                tabIndex={previewChapter === index + 1 ? 0 : -1}
                className={previewChapter === index + 1 ? 'selected' : ''}
                onClick={() => setPreviewChapter(index + 1)}
                onKeyDown={(event) => handlePreviewTabKeyDown(event, index)}
              >
                {index + 1}장
              </button>
            ))}
            <button
              id="preview-tab-postgame"
              role="tab"
              aria-controls="preview-panel"
              aria-selected={previewChapter === previewFamily.chapters.length + 1}
              tabIndex={previewChapter === previewFamily.chapters.length + 1 ? 0 : -1}
              className={previewChapter === previewFamily.chapters.length + 1 ? 'selected' : ''}
              onClick={() => setPreviewChapter(previewFamily.chapters.length + 1)}
              onKeyDown={(event) => handlePreviewTabKeyDown(event, previewFamily.chapters.length)}
            >
              엔딩 후
            </button>
          </div>
          {previewStory ? (
            <div
              id="preview-panel"
              className="preview-story"
              role="tabpanel"
              aria-labelledby={`preview-tab-${previewChapter}`}
            >
              <div>
                <small>{previewStory.level}</small>
                <h3>{previewStory.title}</h3>
                <p>{previewStory.subtitle}</p>
              </div>
              <ul>{previewStory.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul>
              {previewStory.unlocks && previewStory.unlocks.length > 0 && <p><strong>해금</strong> · {previewStory.unlocks.join(' · ')}</p>}
            </div>
          ) : (
            <div
              id="preview-panel"
              className="preview-story"
              role="tabpanel"
              aria-labelledby="preview-tab-postgame"
            >
              <div><small>POSTGAME</small><h3>엔딩 후 주요 콘텐츠</h3></div>
              <ul>{previewFamily.postgame.map((entry) => <li key={entry}>{entry}</li>)}</ul>
            </div>
          )}
          {previewBosses.length > 0 && (
            <div className="preview-bosses">
              {previewBosses.map((entry) => (
                <span key={entry.id}><strong>{entry.name}</strong><small>{entry.title} · {entry.level}</small></span>
              ))}
            </div>
          )}
          <div className="preview-encounter-heading">
            <h3>이 장의 출현·입수 데이터</h3>
            <span>{previewEncounters.length}건</span>
          </div>
          {previewEncounters.length > 0 ? (
            <>
              <div className="preview-encounters">
                {previewEncounters.slice(0, 60).map(({ species, encounter }, index) => (
                  <article key={`${species.dex}:${encounter.form ?? 0}:${encounter.location}:${encounter.area}:${encounter.method}:${index}`}>
                    <strong>#{species.dex} {species.name}{encounter.form ? ` · 폼 ${encounter.form}` : ''}</strong>
                    <span>{encounter.location}{encounter.area !== encounter.location ? ` / ${encounter.area}` : ''}</span>
                    <small>
                      {modernMethodKo[encounter.method] ?? encounter.method} · Lv.{encounter.minLevel}
                      {encounter.maxLevel !== encounter.minLevel ? `–${encounter.maxLevel}` : ''}
                      {encounter.conditions.length ? ` · ${encounter.conditions.map(modernConditionLabel).join(' · ')}` : ''}
                    </small>
                  </article>
                ))}
              </div>
              {previewEncounters.length > 60 && <p className="data-note">ⓘ 화면에는 첫 60건을 표시합니다. 정적 스냅샷에는 이 장의 {previewEncounters.length}건이 모두 보존됩니다.</p>}
            </>
          ) : (
            <p className="data-note">ⓘ 이 버전·구간은 현재 고정 리비전에서 정확한 로컬 입수 데이터를 제공하지 않으므로 임의로 채우지 않았습니다.</p>
          )}
        </section>

        <section className="builder-section">
          <div className="builder-step">
            <span className="step-number">02</span>
            <div><small>CHALLENGE</small><h2>플레이 방식</h2></div>
          </div>
          <div className="challenge-picker">
            <button
              className={!builder.challengeType ? 'selected' : ''}
              aria-pressed={!builder.challengeType}
              onClick={() => setChallengeType(null)}
            >
              <span>◎</span><strong>밸런스 파티</strong><small>타입 제한 없이 1–6마리 필수 선택</small>
            </button>
            {generationChallengeTypes.map((type) => {
              const count = catalogReady ? challengeCandidateCount(game, builder.preferences, type) : 0
              return (
                <button
                  key={type}
                  className={builder.challengeType === type ? 'selected' : ''}
                  aria-pressed={builder.challengeType === type}
                  onClick={() => setChallengeType(type)}
                >
                  <span>{type === 'normal' ? '◯' : typeKo[type].slice(0, 1)}</span>
                  <strong>{typeKo[type]}</strong>
                  <small>{count}개 진화 계열</small>
                </button>
              )
            })}
          </div>
          <p className="challenge-rule">
            {builder.challengeType
              ? `첫 번째 필수 선택을 Lv.5 개조 스타팅으로 배정합니다. 이후 멤버는 ${typeKo[builder.challengeType]} 타입과 실제 입수 조건을 모두 지킵니다.`
              : '기존 밸런스 추천입니다. 필수 포켓몬을 1마리 이상 선택하세요.'}
          </p>
        </section>

        <section className="builder-section">
          <div className="builder-step">
            <span className="step-number">03</span>
            <div><small>FAVORITES</small><h2>필수 포켓몬 선택 <em>{builder.requiredDexes.length}/6</em></h2></div>
            {game.curatedGuideId && <button className="curated-button" disabled={!catalogReady} onClick={applyCurated}>검수 프리셋 불러오기</button>}
          </div>
          <div className="required-tray">
            {builder.requiredDexes.length ? builder.requiredDexes.map((dex, index) => {
              const species = speciesByDex.get(dex)
              const availability = species ? getAvailability(species, game) : undefined
              return species && (
                <div className="required-choice" key={dex}>
                  <button onClick={() => selectSpecies(dex)} title={`${species.name} 필수 선택 해제`}>
                    <span>{speciesIcon(species, game.generation, game, builder.formSelections[dex])}</span>
                    <b>{speciesDisplayName(species, game, builder.formSelections[dex])}{builder.challengeType && index === 0 ? ' · 개조 스타팅' : ''}</b>
                    <small>×</small>
                  </button>
                  {availability?.formChoices?.length && (
                    <label>
                      <span>{species.name} 폼</span>
                      <select
                        aria-label={`${species.name} 폼 선택`}
                        value={builder.formSelections[dex] ?? ''}
                        onChange={(event) => selectForm(dex, event.target.value)}
                      >
                        {availability.formChoices.map((choice) => (
                          <option
                            key={choice.formIdentifier}
                            value={choice.formIdentifier}
                            disabled={Boolean(builder.challengeType && !choice.types.includes(builder.challengeType))}
                          >
                            {choice.formName ?? choice.formIdentifier} · {choice.types.map((type) => typeKo[type]).join('/')}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              )
            }) : <p>{builder.challengeType ? `${typeKo[builder.challengeType]} 타입에서 개조 스타팅으로 쓸 포켓몬을 먼저 선택하세요.` : '1–6마리를 선택하세요. 나머지는 엔진이 균형 있게 채웁니다.'}</p>}
          </div>
          <label className="pokemon-search">
            <span>⌕</span>
            <input ref={pokemonSearchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름, 영문명 또는 전국도감 번호 검색" aria-label="포켓몬 검색" />
            <kbd>/</kbd>
          </label>
          <div className="picker-grid" aria-busy={!catalogReady}>
            {!catalogReady && <p className="catalog-loading">전국도감 정적 데이터를 불러오는 중입니다…</p>}
            {results.map(({ species, availability }) => {
              const availableTypes = availability.formChoices?.length
                ? [...new Set(availability.formChoices.flatMap((choice) => choice.types))]
                : speciesTypes(species, game.generation, game)
              const challengeMismatch = Boolean(builder.challengeType && !availableTypes.includes(builder.challengeType))
              const selectingChallengeStarter = Boolean(builder.challengeType && builder.requiredDexes.length === 0)
              const futureGeneration = species.generation > game.generation
              const selected = builder.requiredDexes.includes(species.dex)
              const blocked = !selected && (challengeMismatch
                || futureGeneration
                || (!selectingChallengeStarter && !availability.obtainable)
                || (!selectingChallengeStarter && builder.preferences.noTrade && availability.tradeRequired)
                || (!selectingChallengeStarter && !builder.preferences.allowPostgame && availability.postgameOnly)
                || (!builder.preferences.allowLegendary && (species.legendary || species.mythical)))
              return (
                <button
                  key={species.dex}
                  className={`${selected ? 'selected' : ''} ${blocked ? 'blocked' : ''}`}
                  onClick={() => selectSpecies(species.dex)}
                  aria-pressed={selected}
                  title={blocked
                    ? challengeMismatch
                      ? `${typeKo[builder.challengeType!]} 타입 챌린지 조건과 맞지 않습니다.`
                      : futureGeneration
                        ? `${game.generation}세대에는 아직 존재하지 않습니다.`
                      : availability.reason ?? '현재 설정에서 선택할 수 없습니다.'
                    : `${species.name} 선택`}
                >
                  <span className="picker-icon">{speciesIcon(species, game.generation)}</span>
                  <span className="picker-name"><small>#{String(species.dex).padStart(3, '0')}</small><strong>{speciesDisplayName(species, game)}</strong><i>{availability.formChoices?.length
                    ? availability.formChoices.map((choice) => choice.types.map((type) => typeKo[type]).join(' · ')).join(' / ')
                    : speciesTypes(species, game.generation, game).map((type) => typeKo[type]).join(' · ')}</i></span>
                  <span className="picker-badges">
                    {selectingChallengeStarter && !challengeMismatch && !futureGeneration
                      ? <b className="modified-starter">Lv.5 개조 스타팅</b>
                      : availability.obtainable && <b>{availability.postgameOnly ? '엔딩 후' : availability.finalChapter > availability.chapter ? `${availability.chapter}장 합류 · 최종 ${availability.finalChapter}장` : `${availability.chapter}장`}</b>}
                    {!selectingChallengeStarter && availability.tradeRequired && <b className="trade">교환</b>}
                    {(species.legendary || species.mythical) && <b className="legendary">전설</b>}
                    {availability.sourceKind === 'starter' && <b>스타터</b>}
                    {availability.sourceKind === 'fossil' && <b>화석</b>}
                    {availability.sourceKind === 'gift' && <b>선물</b>}
                    {availability.versionExclusive && <b>버전 한정</b>}
                    {!selectingChallengeStarter && !availability.obtainable && <b className="unavailable">입수 불가</b>}
                  </span>
                  {blocked && <span className="blocked-reason">{
                    challengeMismatch
                      ? `${typeKo[builder.challengeType!]} 타입 조건 불일치`
                      : futureGeneration
                        ? `${game.generation}세대 미등장`
                      : availability.reason ?? '현재 선호 설정과 충돌'
                  }</span>}
                </button>
              )
            })}
          </div>
        </section>

        <section className="builder-section">
          <div className="builder-step"><span className="step-number">04</span><div><small>PREFERENCES</small><h2>추천 기준</h2></div></div>
          <div className="preference-layout">
            <div className="settings-card">
              <Toggle checked={builder.preferences.noTrade} title="통신교환 없이" description="교환진화가 필요한 최종 형태를 추천에서 제외합니다." onChange={(noTrade) => updatePreferences({ noTrade })} />
              <Toggle
                checked={game.familyId === 'sinnoh8' || builder.preferences.hmConvenience}
                disabled={game.familyId === 'sinnoh8'}
                title={game.familyId === 'sinnoh8' ? '포켓치 비전기술 자동 사용' : '필드기 편의성 우선'}
                description={game.familyId === 'sinnoh8'
                  ? 'BDSP 비전기술은 스토리 진행으로 해금되며 파티 기술칸이나 전용 요원이 필요하지 않습니다.'
                  : '해당 버전의 실제 HM/필드기 목록을 점수에 반영합니다.'}
                onChange={(hmConvenience) => updatePreferences({ hmConvenience })}
              />
            </div>
            <div className="settings-card">
              <Toggle checked={builder.preferences.allowLegendary} title="전설 포켓몬 허용" description="스토리 완료 전에 잡을 수 있는 전설만 후보에 포함합니다." onChange={(allowLegendary) => updatePreferences({ allowLegendary })} />
              <Toggle checked={builder.preferences.allowPostgame} title="엔딩 후 포켓몬 허용" description="챔피언 이후 입수 멤버를 포함하며 로드맵에 공백을 표시합니다." onChange={(allowPostgame) => updatePreferences({ allowPostgame })} />
            </div>
            <label className="balance-card">
              <span><strong>추천 성향</strong><small>필수 멤버는 어떤 값에서도 제거되지 않습니다.</small></span>
              <input type="range" min="0" max="100" value={builder.preferences.favoriteWeight} onChange={(event) => updatePreferences({ favoriteWeight: Number(event.target.value) })} />
              <div><span>스토리 효율</span><span>선호 보완</span></div>
            </label>
          </div>
          {(message || validation.errors.length > 0 || validation.warnings.length > 0) && (
            <div className="validation-box" role="alert">
              {[message, ...validation.errors, ...validation.warnings].filter(Boolean).map((entry) => <p key={entry}>{entry}</p>)}
            </div>
          )}
          <button className="generate-button" disabled={!catalogReady || validation.errors.length > 0} onClick={() => createPlan(0, null)}>
            <span>파티와 로드맵 생성</span><small>동일 조건은 항상 동일한 결과를 만듭니다</small>
          </button>
        </section>

        {plan && (
          <section className="guide-shell generated-shell">
            <div className="generated-banner">
              <div><span className="eyebrow">DETERMINISTIC PLAN</span><h2>{game.shortName} · {plan.challengeType ? `${typeKo[plan.challengeType]} 타입 챌린지` : '맞춤 파티'}</h2><p>플랜 ID {plan.id}</p></div>
              <div className="coverage-chips">
                <span><b>{plan.coverage.bossCoverage}%</b> 보스 상성</span>
                <span><b>{plan.coverage.offensiveTypes.length}</b> 공격 타입</span>
                <span><b>{plan.coverage.fieldMovesCovered.length}/{family.fieldMoves.length}</b> {game.familyId === 'sinnoh8' ? '포켓치 비전기술' : '필드기'}</span>
              </div>
            </div>
            <div className="progress-strip">
              <div className="progress-copy"><strong>{progress}%</strong><span>이 플랜의 진행도<small>{completed.size} / {roadmapActions.length} 항목</small></span></div>
              <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
            </div>
            <div className="tabs" role="tablist">
              {tabs.map((tab) => <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}><span>{tab.icon}</span>{game.familyId === 'sinnoh8' && tab.id === 'hm' ? '비전기술' : tab.name}</button>)}
            </div>

            <div className="tab-panel">
              {activeTab === 'party' && (
                <>
                  <div className="panel-heading">
                    <div><span className="eyebrow">YOUR SIX</span><h2>생성된 파티</h2><p>필수 멤버는 고정되며 추천 멤버는 잠금·교체할 수 있습니다.</p></div>
                    <button className="alternative-button" onClick={() => createPlan(variant + 1)}>잠금 외 대안 생성 ↻</button>
                  </div>
                  <div className="generated-party-grid">
                    {plan.members.map((member) => (
                      <article className="generated-member" key={member.species.dex}>
                        <div className="member-top">
                          <span className="member-icon">{speciesIcon(member.species, game.generation, game, member.availability.formIdentifier)}</span>
                          <div><small>#{String(member.species.dex).padStart(3, '0')}</small><h3>{speciesDisplayName(member.species, game, member.availability.formIdentifier)}</h3><p>{
                            (member.availability.formTypes ?? speciesTypes(member.species, game.generation, game))
                              .map((type) => typeKo[type]).join(' · ')
                          }</p></div>
                          <button onClick={() => toggleLock(member.species.dex)} disabled={member.required} title={member.required ? '필수 멤버는 항상 잠김' : '추천 멤버 잠금 전환'}>{member.locked ? '🔒' : '🔓'}</button>
                        </div>
                        <div className="member-flags"><span>{member.challengeStarter ? 'Lv.5 개조 스타팅' : member.required ? '필수 선택' : '자동 추천'}</span><b>{member.role}</b><i>점수 {Math.round(member.score)}</i></div>
                        <p className="recommend-reason"><strong>추천 이유</strong>{member.reason}</p>
                        <dl>
                          <div><dt>합류</dt><dd>{member.availability.chapter}장 · {member.availability.location}{member.availability.method ? ` · ${member.availability.method}` : ''} {member.availability.level}{member.availability.sourceSpeciesName ? ` · ${member.availability.sourceSpeciesName}부터 육성` : ''}</dd></div>
                          <div><dt>진화</dt><dd>{evolutionText(member.species, game, member.availability.formIdentifier)}</dd></div>
                        </dl>
                        <div className="generated-moves">
                          {member.moves.map((move) => <span key={move.name}><b>{move.name}</b><small>{typeKo[move.type]} · {move.category}</small><em>{move.source}</em>{move.quality === 'inferred' && <i>시점 추론</i>}</span>)}
                        </div>
                        {!member.required && <button className="replace-button" onClick={() => setReplaceTarget(replaceTarget === member.species.dex ? null : member.species.dex)}>이 멤버 교체</button>}
                        {replaceTarget === member.species.dex && (
                          <div className="replacement-list">
                            {plan.alternatives.slice(0, 6).map((alternative) => (
                              <button key={alternative.species.dex} onClick={() => replaceMember(alternative.species.dex)}>{speciesIcon(alternative.species, game.generation)} {alternative.species.name}<small>{Math.round(alternative.score)}점</small></button>
                            ))}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                  {plan.warnings.length > 0 && <div className="plan-warnings">{plan.warnings.map((warning) => <p key={warning}>⚠ {warning}</p>)}</div>}
                </>
              )}

              {activeTab === 'roadmap' && (
                <>
                  <div className="panel-heading roadmap-tools">
                    <div><span className="eyebrow">PARTY-SPECIFIC ROUTE</span><h2>파티 전용 스토리 로드맵</h2><p>포획·진화·기술·보스 대응을 선택 파티 기준으로 다시 합성했습니다.</p></div>
                    <div className="tool-row"><label className="search-box"><span>⌕</span><input value={roadmapQuery} onChange={(event) => setRoadmapQuery(event.target.value)} placeholder="로드맵 검색" /></label><button className="reset-button" onClick={resetProgress}>현재 플랜 초기화</button></div>
                  </div>
                  <div className="dynamic-roadmap">
                    {roadmap.filter((chapter) => !roadmapQuery.trim() || `${chapter.title} ${chapter.subtitle} ${chapter.objectives.join(' ')} ${chapter.actions.map((action) => action.text).join(' ')}`.toLocaleLowerCase('ko').includes(roadmapQuery.toLocaleLowerCase('ko'))).map((chapter, index) => (
                      <details key={chapter.id} open={index === 0}>
                        <summary><b>{String(index + 1).padStart(2, '0')}</b><span><small>{chapter.subtitle}</small><strong>{chapter.title}</strong></span><i>{chapter.level}</i></summary>
                        <div className="dynamic-chapter-body">
                          <div className="base-objectives"><span className="eyebrow">STORY</span>{chapter.objectives.map((objective) => <p key={objective}>□ {objective}</p>)}</div>
                          <div className="dynamic-actions"><span className="eyebrow">YOUR PARTY ACTIONS</span>{chapter.actions.map((action) => (
                            <label key={action.id} data-action-id={action.id} className={`${action.kind} ${completed.has(action.id) ? 'done' : ''}`}>
                              <input type="checkbox" checked={completed.has(action.id)} onChange={() => toggleProgress(action.id)} />
                              <span className="action-kind">{action.kind === 'capture' ? '포획' : action.kind === 'evolution' ? '진화' : action.kind === 'move' ? '기술' : action.kind === 'boss' ? '보스' : '주의'}</span>
                              <span>{action.text}</span>
                              <small className={`quality ${action.quality}`}>{qualityLabel[action.quality]}</small>
                            </label>
                          ))}</div>
                        </div>
                      </details>
                    ))}
                  </div>
                </>
              )}

              {activeTab === 'hm' && (
                <>
                  {game.familyId === 'sinnoh8' ? (
                    <>
                      <div className="panel-heading"><div><span className="eyebrow">POKÉTCH HIDDEN MOVES</span><h2>포켓치 비전기술 해금</h2><p>야생 포켓몬을 호출하므로 파티 멤버의 기술칸이나 호환성에 의존하지 않습니다.</p></div></div>
                      <div className="hm-table-wrap"><table className="hm-table"><thead><tr><th>비전기술</th><th>최초 해금</th><th>진행 필수</th><th>사용 방식</th></tr></thead><tbody>
                        {family.fieldMoves.map((move) => <tr key={move.id}><th>{move.name}</th><td>{move.unlockChapter}장</td><td>{move.required ? '필수' : '선택'}</td><td><span className="hm-check">✓</span> 포켓치 앱</td></tr>)}
                      </tbody></table></div>
                      <p className="matrix-note">비전기술 해금은 동적 로드맵에 별도 행동으로 표시되며 파티 기술칸을 차지하지 않습니다.</p>
                    </>
                  ) : (
                    <>
                      <div className="panel-heading"><div><span className="eyebrow">FIELD MOVE MATRIX</span><h2>{game.generation}세대 필드기 배치</h2><p>버전별 실제 HM 목록과 해당 버전의 포켓몬별 호환 데이터를 사용합니다.</p></div></div>
                      <div className="hm-table-wrap"><table className="hm-table"><thead><tr><th>필드기</th>{plan.members.map((member) => <th key={member.species.dex}>{member.species.name}</th>)}<th>진행 필수</th></tr></thead><tbody>
                        {family.fieldMoves.map((move) => <tr key={move.id}><th>{move.name}</th>{plan.members.map((member) => <td key={member.species.dex}>{member.fieldMoves.includes(move.id) ? <span className="hm-check">✓</span> : '·'}</td>)}<td>{move.required ? '필수' : '선택'}</td></tr>)}
                      </tbody></table></div>
                      <p className="matrix-note">알려진 예외를 반영합니다: 지그제구리는 괴력을 배울 수 없고 직구리부터 가능합니다. “필드기 편의성” 점수는 원작 HM 목록을 세대별로 분리합니다.</p>
                    </>
                  )}
                </>
              )}

              {activeTab === 'bosses' && (
                <>
                  <div className="panel-heading"><div><span className="eyebrow">LIVE MATCHUPS</span><h2>현재 파티의 보스 대응</h2><p>해당 장까지 실제 합류·진화·기술 가능 여부를 반영합니다.</p></div></div>
                  <div className="boss-grid">
                    {roadmap.flatMap((chapter) => chapter.actions.filter((action) => action.kind === 'boss').map((action) => ({ chapter, action }))).map(({ chapter, action }) => (
                      <article className="boss-card" key={action.id}><span className="boss-index">{String(family.chapters.indexOf(chapter) + 1).padStart(2, '0')}</span><div><small>{chapter.title}</small><h3>{action.text.split(' — ')[0]}</h3></div><p>{action.text.split(' — ')[1]}</p><span className={`quality ${action.quality}`}>{qualityLabel[action.quality]}</span></article>
                    ))}
                  </div>
                </>
              )}

              {activeTab === 'postgame' && (
                <>
                  <div className="panel-heading"><div><span className="eyebrow">AFTER THE CREDITS</span><h2>{game.shortName} 엔딩 후</h2><p>스토리 완료 뒤 열리는 대표 목표입니다.</p></div></div>
                  <div className="postgame-grid">{family.postgame.map((item, index) => <article className="postgame-card" key={item}><span className="postgame-icon">{['✦', '⌁', '♜'][index % 3]}</span><small>POSTGAME {index + 1}</small><h3>{item}</h3><p>엔딩 후 탐험·수집·재대결 콘텐츠입니다. 버전별 세부 조건은 게임 내 진행을 확인하세요.</p></article>)}</div>
                </>
              )}
            </div>
          </section>
        )}

        <details className="methodology">
          <summary>데이터 및 추천 방법론 <span>DATA / METHODOLOGY</span></summary>
          <div>
            <section><h3>정적 데이터 출처</h3><p>{catalogSource}. {learnsetSource()}. 전국도감 #001–{catalogCoverage?.nationalDex.max ?? 1025}의 종·진화와 조우 장소·세부 구역·방식·조건, 버전별 자력기·TM/HM·기술가르침 호환 데이터를 빌드 전에 정규화했습니다. 브라우저는 외부 API를 호출하지 않습니다.</p></section>
            <section><h3>현대 미리보기 출처</h3><p><a href={modernEncounterProvenance?.repository} target="_blank" rel="noreferrer">PKHeX</a> 고정 리비전 {modernEncounterProvenance?.revision.slice(0, 8) ?? '로딩 중'}의 폼 보존 입수 자료와 버전별 공개 워크스루를 사용합니다. 카탈로그 전용 게임의 미리보기는 출처가 확보된 범위만 표시합니다.</p></section>
            <section><h3>결정론 점수</h3><p>스토리 합류 시점, 남은 관장·사천왕 상성, 새 공격 타입, 종족값·역할, 공통 약점 감점, 버전별 필드기 기여를 합산합니다. 단일 타입 모드는 해당 타입을 공유하는 진화 계열 안에서만 같은 점수를 적용합니다.</p></section>
            <section><h3>한계와 품질 표시</h3><p>낚싯대·파도타기·바위깨기·박치기와 엔딩 후 조건은 실제 조우 방식의 해금 시점보다 앞당기지 않습니다. 시간대·계절·대량발생·포켓트레·라디오 같은 조건도 입수 안내에 표시합니다. 특수 심볼의 세부 이벤트나 일반 TM·기술가르침의 지도상 획득 시점을 완전히 확정할 수 없는 경우에는 “시점 추론”으로 구분합니다.</p></section>
          </div>
        </details>
      </main>

      <footer>
        <div className="brand footer-brand"><span className="brand-mark"><i /></span><span>POKÉ <b>ROUTE</b></span></div>
        <p>팬이 만든 비공식 공략 콘텐츠입니다. Nintendo, Game Freak, Pokémon Company와 제휴하거나 승인을 받지 않았습니다.</p>
        <span>
          {isCloudConfigured() ? '온라인 로그인 시 설정과 진행률이 계정에 동기화됩니다.' : '계정, 설정과 진행률은 이 브라우저에만 저장됩니다.'}
          {' · '}<a href="./THIRD_PARTY_NOTICES.md">오픈소스 고지</a>
        </span>
      </footer>
    </div>
  )
}

export default App
