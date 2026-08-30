import { useEffect, useRef, useState, type CSSProperties } from 'react'
import './App.css'
import { guides } from './data'
import { getPlan as getCuratedPlan } from './data/integrity'
import { catalogSource, getAvailability, loadCatalog, searchSpecies, speciesByDex, speciesCatalog } from './planner/catalog'
import {
  challengeCandidateCount,
  challengeTypeOrder,
  generateParty,
  speciesIcon,
  speciesTypes,
  typeKo,
  validateRequired,
} from './planner/engine'
import { games, getBosses, getFamily, getGame } from './planner/games'
import { composeRoadmap } from './planner/roadmap'
import { learnsetSource } from './planner/learnsets'
import {
  clearPlanSession,
  loadBuilderState,
  loadPlanSession,
  loadPlanProgress,
  saveBuilderState,
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
  preferences: PlannerPreferences
  challengeType: string | null
}

const defaultState: BuilderState = {
  gameId: 'emerald',
  requiredDexes: [],
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

function Toggle({
  checked,
  title,
  description,
  onChange,
}: {
  checked: boolean
  title: string
  description: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="toggle-row">
      <span><strong>{title}</strong><small>{description}</small></span>
      <span className="toggle">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span aria-hidden="true" />
      </span>
    </label>
  )
}

function App() {
  const initial = loadBuilderState(defaultState)
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

  const game = getGame(builder.gameId)
  const family = getFamily(game)
  const bosses = getBosses(game)
  const validation = validateRequired(builder.requiredDexes, game, builder.preferences, builder.challengeType)
  const roadmap = plan ? composeRoadmap(game, plan) : []
  const roadmapActions = roadmap.flatMap((chapter) => chapter.actions)
  const progress = roadmapActions.length ? Math.round(completed.size / roadmapActions.length * 100) : 0

  useEffect(() => {
    saveBuilderState(builder)
  }, [builder])

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
        const restored = generateParty(getGame(initialBuilder.gameId), initialBuilder.preferences, {
          requiredDexes: initialBuilder.requiredDexes,
          lockedDexes: saved.lockedDexes,
          previousMembers: saved.memberDexes,
          variant: saved.variant,
          challengeType: initialBuilder.challengeType,
        })
        setPlan(restored)
        setVariant(saved.variant)
        setCompleted(loadPlanProgress(initialBuilder.gameId, restored.id))
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
    })
  }, [plan, variant])

  const updatePreferences = (patch: Partial<PlannerPreferences>) => {
    setBuilder((current) => ({ ...current, preferences: { ...current.preferences, ...patch } }))
  }

  const selectGame = (gameId: PlannerGameId) => {
    setBuilder((current) => ({ ...current, gameId, requiredDexes: [], challengeType: null }))
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
      setBuilder((current) => ({ ...current, requiredDexes: current.requiredDexes.filter((entry) => entry !== dex) }))
      setMessage('')
      return
    }
    const availability = getAvailability(species, game)
    const selectingChallengeStarter = Boolean(builder.challengeType && builder.requiredDexes.length === 0)
    if (builder.challengeType && !speciesTypes(species, game.generation).includes(builder.challengeType)) {
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
    setBuilder((current) => ({ ...current, requiredDexes: [...current.requiredDexes, dex] }))
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
      })
      setPlan(generated)
      setVariant(nextVariant)
      setCompleted(loadPlanProgress(game.id, generated.id))
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
    setBuilder((current) => ({ ...current, requiredDexes: dexes, preferences, challengeType: null }))
    try {
      const generated = generateParty(game, preferences, { requiredDexes: dexes, challengeType: null })
      setPlan(generated)
      setVariant(0)
      setCompleted(loadPlanProgress(game.id, generated.id))
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
      })
      setPlan(generated)
      setVariant(0)
      setCompleted(loadPlanProgress(game.id, generated.id))
      setReplaceTarget(null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '멤버를 교체하지 못했습니다.')
    }
  }

  const toggleProgress = (id: string) => {
    if (!plan) return
    const next = new Set(completed)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setCompleted(next)
    savePlanProgress(game.id, plan.id, next)
  }

  const resetProgress = () => {
    if (!plan || !window.confirm('현재 파티 플랜의 진행률만 초기화할까요?')) return
    const next = new Set<string>()
    setCompleted(next)
    savePlanProgress(game.id, plan.id, next)
  }

  const setChallengeType = (challengeType: string | null) => {
    setBuilder((current) => ({ ...current, challengeType }))
    setPlan(null)
    setCompleted(new Set())
    setMessage('')
    clearPlanSession()
  }

  const generationChallengeTypes = challengeTypeOrder.filter((type) =>
    game.generation >= 2 || (type !== 'dark' && type !== 'steel'),
  )
  const results = (query.trim() || !builder.challengeType ? searchSpecies(query) : speciesCatalog)
    .map((species) => ({ species, availability: getAvailability(species, game) }))
    .filter(({ species }) =>
      query.trim()
      || !builder.challengeType
      || speciesTypes(species, game.generation).includes(builder.challengeType),
    )
    .sort((a, b) =>
      Number(
        !builder.challengeType || speciesTypes(b.species, game.generation).includes(builder.challengeType),
      ) - Number(
        !builder.challengeType || speciesTypes(a.species, game.generation).includes(builder.challengeType),
      )
      ||
      Number(b.availability.obtainable) - Number(a.availability.obtainable)
      || a.availability.chapter - b.availability.chapter
      || a.species.dex - b.species.dex,
    )
    .slice(0, query.trim() ? 48 : 24)

  return (
    <div className="app planner-app" style={{ '--accent': game.accent, '--accent-soft': `${game.accent}18` } as CSSProperties}>
      <header className="planner-hero">
        <nav className="topbar">
          <a className="brand" href="#top"><span className="brand-mark"><i /></span><span>POKÉ <b>ROUTE</b></span></a>
          <span className="offline-badge"><i /> 정적 오프라인 엔진</span>
        </nav>
        <div className="builder-intro" id="top">
          <div>
            <span className="kicker">GENERATION I–V · 21 VERSIONS</span>
            <h1>좋아하는 포켓몬으로<br /><em>끝까지 가는 길.</em></h1>
            <p>좋아하는 멤버나 단일 타입 챌린지를 고르면 획득 시점, 보스 상성과 필드기를 계산해<br className="desktop-only" /> 맞춤 파티와 전용 스토리 로드맵을 만듭니다.</p>
          </div>
          <div className="hero-stat-grid">
            <span><b>649</b><small>전국도감 데이터</small></span>
            <span><b>21</b><small>원작 버전</small></span>
            <span><b>8</b><small>스토리 패밀리</small></span>
            <span><b>0</b><small>런타임 API</small></span>
          </div>
        </div>
      </header>

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
                {[1, 2, 3, 4, 5].map((generation) => (
                  <optgroup key={generation} label={`${generation}세대`}>
                    {games.filter((entry) => entry.generation === generation).map((entry) => (
                      <option key={entry.id} value={entry.id}>{entry.name}</option>
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
          {game.notes?.map((note) => <p className="data-note" key={note}>ⓘ {note}</p>)}
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
              return species && (
                <button key={dex} onClick={() => selectSpecies(dex)} title={`${species.name} 필수 선택 해제`}>
                  <span>{speciesIcon(species, game.generation)}</span><b>{species.name}{builder.challengeType && index === 0 ? ' · 개조 스타팅' : ''}</b><small>×</small>
                </button>
              )
            }) : <p>{builder.challengeType ? `${typeKo[builder.challengeType]} 타입에서 개조 스타팅으로 쓸 포켓몬을 먼저 선택하세요.` : '1–6마리를 선택하세요. 나머지는 엔진이 균형 있게 채웁니다.'}</p>}
          </div>
          <label className="pokemon-search">
            <span>⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름, 영문명 또는 전국도감 번호 검색" aria-label="포켓몬 검색" />
            <kbd>/</kbd>
          </label>
          <div className="picker-grid" aria-busy={!catalogReady}>
            {!catalogReady && <p className="catalog-loading">전국도감 정적 데이터를 불러오는 중입니다…</p>}
            {results.map(({ species, availability }) => {
              const challengeMismatch = Boolean(builder.challengeType && !speciesTypes(species, game.generation).includes(builder.challengeType))
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
                  <span className="picker-name"><small>#{String(species.dex).padStart(3, '0')}</small><strong>{species.name}</strong><i>{speciesTypes(species, game.generation).map((type) => typeKo[type]).join(' · ')}</i></span>
                  <span className="picker-badges">
                    {selectingChallengeStarter && !challengeMismatch && !futureGeneration
                      ? <b className="modified-starter">Lv.5 개조 스타팅</b>
                      : availability.obtainable && <b>{availability.postgameOnly ? '엔딩 후' : `${availability.chapter}장`}</b>}
                    {!selectingChallengeStarter && availability.tradeRequired && <b className="trade">교환</b>}
                    {(species.legendary || species.mythical) && <b className="legendary">전설</b>}
                    {availability.sourceKind === 'starter' && <b>스타터</b>}
                    {availability.sourceKind === 'fossil' && <b>화석</b>}
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
              <Toggle checked={builder.preferences.hmConvenience} title="필드기 편의성 우선" description="해당 버전의 실제 HM/필드기 목록을 점수에 반영합니다." onChange={(hmConvenience) => updatePreferences({ hmConvenience })} />
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
                <span><b>{plan.coverage.fieldMovesCovered.length}/{family.fieldMoves.length}</b> 필드기</span>
              </div>
            </div>
            <div className="progress-strip">
              <div className="progress-copy"><strong>{progress}%</strong><span>이 플랜의 진행도<small>{completed.size} / {roadmapActions.length} 항목</small></span></div>
              <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
            </div>
            <div className="tabs" role="tablist">
              {tabs.map((tab) => <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}><span>{tab.icon}</span>{tab.name}</button>)}
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
                          <span className="member-icon">{speciesIcon(member.species, game.generation)}</span>
                          <div><small>#{String(member.species.dex).padStart(3, '0')}</small><h3>{member.species.name}</h3><p>{speciesTypes(member.species, game.generation).map((type) => typeKo[type]).join(' · ')}</p></div>
                          <button onClick={() => toggleLock(member.species.dex)} disabled={member.required} title={member.required ? '필수 멤버는 항상 잠김' : '추천 멤버 잠금 전환'}>{member.locked ? '🔒' : '🔓'}</button>
                        </div>
                        <div className="member-flags"><span>{member.challengeStarter ? 'Lv.5 개조 스타팅' : member.required ? '필수 선택' : '자동 추천'}</span><b>{member.role}</b><i>점수 {Math.round(member.score)}</i></div>
                        <p className="recommend-reason"><strong>추천 이유</strong>{member.reason}</p>
                        <dl>
                          <div><dt>합류</dt><dd>{member.availability.chapter}장 · {member.availability.location} {member.availability.level}</dd></div>
                          <div><dt>진화</dt><dd>{member.species.evolution ? member.species.evolution.trigger === 'trade' ? '통신교환 필요' : member.species.evolution.minLevel ? `Lv.${member.species.evolution.minLevel}` : '특수 조건' : '진화 정보 없음'}</dd></div>
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
                            <label key={action.id} className={`${action.kind} ${completed.has(action.id) ? 'done' : ''}`}>
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
                  <div className="panel-heading"><div><span className="eyebrow">FIELD MOVE MATRIX</span><h2>{game.generation}세대 필드기 배치</h2><p>버전별 목록만 사용하며, 호환성은 타입·예외 규칙 기반 추정입니다.</p></div></div>
                  <div className="hm-table-wrap"><table className="hm-table"><thead><tr><th>필드기</th>{plan.members.map((member) => <th key={member.species.dex}>{member.species.name}</th>)}<th>진행 필수</th></tr></thead><tbody>
                    {family.fieldMoves.map((move) => <tr key={move.id}><th>{move.name}</th>{plan.members.map((member) => <td key={member.species.dex}>{member.fieldMoves.includes(move.id) ? <span className="hm-check">✓</span> : '·'}</td>)}<td>{move.required ? '필수' : '선택'}</td></tr>)}
                  </tbody></table></div>
                  <p className="matrix-note">알려진 예외를 반영합니다: 지그제구리는 괴력을 배울 수 없고 직구리부터 가능합니다. “필드기 편의성” 점수는 원작 HM 목록을 세대별로 분리합니다.</p>
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
            <section><h3>정적 데이터 출처</h3><p>{catalogSource}. {learnsetSource()}. 전국도감 #001–649의 종·진화·조우와 버전별 자력기·TM/HM·기술가르침 호환 데이터를 빌드 전에 정규화했습니다. 브라우저는 외부 API를 호출하지 않습니다.</p></section>
            <section><h3>결정론 점수</h3><p>스토리 합류 시점, 남은 관장·사천왕 상성, 새 공격 타입, 종족값·역할, 공통 약점 감점, 버전별 필드기 기여를 합산합니다. 단일 타입 모드는 해당 타입을 공유하는 진화 계열 안에서만 같은 점수를 적용합니다.</p></section>
            <section><h3>한계와 품질 표시</h3><p>자력기 레벨과 TM/HM·가르침 호환은 버전별 정적 원본으로 검증됩니다. 자력기는 로드맵 권장 레벨 구간에 정확히 배치합니다. 일반 TM과 가르침 기술은 정확한 호환은 검증되지만 개별 입수 장소 데이터가 없으므로 보수적인 장에 “시점 추론”으로 표시합니다.</p></section>
          </div>
        </details>
      </main>

      <footer>
        <div className="brand footer-brand"><span className="brand-mark"><i /></span><span>POKÉ <b>ROUTE</b></span></div>
        <p>팬이 만든 비공식 공략 콘텐츠입니다. Nintendo, Game Freak, Pokémon Company와 제휴하거나 승인을 받지 않았습니다.</p>
        <span>모든 설정과 진행률은 이 브라우저에만 저장됩니다.</span>
      </footer>
    </div>
  )
}

export default App
