import type { SupabaseClient } from '@supabase/supabase-js'

const CLOUD_ACCOUNT_KEY = 'pokemon-roadmap:v4:cloud-account'
const CLOUD_PREFIX = 'pokemon-roadmap:v3:'
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const supabaseKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim()

export interface CloudAccount {
  id: string
  name: string
  email: string
  kind: 'cloud'
}

export type CloudSyncStatus = 'local' | 'idle' | 'syncing' | 'saved' | 'error'

let clientPromise: Promise<SupabaseClient> | null = null
let syncTimer: ReturnType<typeof setTimeout> | null = null
let syncStatus: CloudSyncStatus = 'idle'
const listeners = new Set<(status: CloudSyncStatus) => void>()

export function isCloudConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseKey)
}

async function getClient(): Promise<SupabaseClient> {
  if (!isCloudConfigured()) throw new Error('온라인 저장소가 아직 구성되지 않았습니다.')
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }),
  )
  return clientPromise
}

function setSyncStatus(status: CloudSyncStatus): void {
  syncStatus = status
  for (const listener of listeners) listener(status)
}

function accountFromUser(user: { id: string; email?: string }): CloudAccount {
  const email = user.email ?? ''
  return {
    id: user.id,
    email,
    name: email.split('@')[0] || '온라인 트레이너',
    kind: 'cloud',
  }
}

function saveCloudAccount(account: CloudAccount): void {
  localStorage.setItem(CLOUD_ACCOUNT_KEY, JSON.stringify(account))
}

export function getCachedCloudAccount(): CloudAccount | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const account = JSON.parse(localStorage.getItem(CLOUD_ACCOUNT_KEY) ?? 'null')
    return account?.kind === 'cloud'
      && typeof account.id === 'string'
      && typeof account.email === 'string'
      ? account
      : null
  } catch {
    return null
  }
}

export function cloudStorageScope(userId: string): string {
  return `cloud-${userId}`
}

export function readScopeSnapshot(scope: string): Record<string, string> {
  const prefix = `${CLOUD_PREFIX}${scope}:`
  const snapshot: Record<string, string> = {}
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key?.startsWith(prefix)) {
      const value = localStorage.getItem(key)
      if (value !== null) snapshot[key.slice(prefix.length)] = value
    }
  }
  return snapshot
}

export function writeScopeSnapshot(scope: string, snapshot: Record<string, string>): void {
  const prefix = `${CLOUD_PREFIX}${scope}:`
  const keysToRemove: string[] = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key?.startsWith(prefix)) keysToRemove.push(key)
  }
  for (const key of keysToRemove) localStorage.removeItem(key)
  for (const [key, value] of Object.entries(snapshot)) {
    if (typeof value === 'string') localStorage.setItem(`${prefix}${key}`, value)
  }
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return Boolean(
    value
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.values(value).every((entry) => typeof entry === 'string'),
  )
}

async function uploadCloudState(account: CloudAccount): Promise<void> {
  const state = readScopeSnapshot(cloudStorageScope(account.id))
  const { error } = await (await getClient())
    .from('planner_state')
    .upsert({
      user_id: account.id,
      state,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  if (error) throw new Error(`온라인 저장 실패: ${error.message}`)
}

export async function hydrateCloudState(account: CloudAccount, sourceScope: string): Promise<void> {
  const { data, error } = await (await getClient())
    .from('planner_state')
    .select('state')
    .eq('user_id', account.id)
    .maybeSingle()
  if (error) throw new Error(`온라인 데이터 복원 실패: ${error.message}`)

  const targetScope = cloudStorageScope(account.id)
  if (data && isStringRecord(data.state)) {
    writeScopeSnapshot(targetScope, data.state)
    return
  }

  writeScopeSnapshot(targetScope, readScopeSnapshot(sourceScope))
  await uploadCloudState(account)
}

export async function initializeCloudAuth(): Promise<CloudAccount | null> {
  if (!isCloudConfigured()) {
    setSyncStatus('local')
    return null
  }
  const { data, error } = await (await getClient()).auth.getUser()
  if (error) {
    if (error.name === 'AuthSessionMissingError') {
      localStorage.removeItem(CLOUD_ACCOUNT_KEY)
      return null
    }
    throw new Error(`온라인 로그인 확인 실패: ${error.message}`)
  }
  const account = accountFromUser(data.user)
  saveCloudAccount(account)
  return account
}

export async function sendCloudOtp(email: string): Promise<void> {
  const normalized = email.trim().toLocaleLowerCase('en')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('올바른 이메일 주소를 입력해 주세요.')
  const { error } = await (await getClient()).auth.signInWithOtp({
    email: normalized,
    options: { shouldCreateUser: true },
  })
  if (error) throw new Error(`인증코드 전송 실패: ${error.message}`)
}

export async function verifyCloudOtp(email: string, token: string, sourceScope: string): Promise<CloudAccount> {
  if (!/^\d{6}$/.test(token)) throw new Error('이메일로 받은 숫자 6자리를 입력해 주세요.')
  const { data, error } = await (await getClient()).auth.verifyOtp({
    email: email.trim().toLocaleLowerCase('en'),
    token,
    type: 'email',
  })
  if (error || !data.user) throw new Error(`인증 실패: ${error?.message ?? '사용자 정보를 받지 못했습니다.'}`)
  const account = accountFromUser(data.user)
  await hydrateCloudState(account, sourceScope)
  saveCloudAccount(account)
  setSyncStatus('saved')
  return account
}

export async function cloudLogout(): Promise<void> {
  const { error } = await (await getClient()).auth.signOut()
  if (error) throw new Error(`온라인 로그아웃 실패: ${error.message}`)
  localStorage.removeItem(CLOUD_ACCOUNT_KEY)
  setSyncStatus('idle')
}

export function queueCloudSync(): void {
  if (!isCloudConfigured() || !getCachedCloudAccount()) return
  if (syncTimer) clearTimeout(syncTimer)
  setSyncStatus('syncing')
  syncTimer = setTimeout(() => {
    syncTimer = null
    const account = getCachedCloudAccount()
    if (!account) return
    void uploadCloudState(account)
      .then(() => setSyncStatus('saved'))
      .catch((error: unknown) => {
        console.error(error)
        setSyncStatus('error')
      })
  }, 700)
}

export function subscribeCloudSync(listener: (status: CloudSyncStatus) => void): () => void {
  listener(isCloudConfigured() ? syncStatus : 'local')
  listeners.add(listener)
  return () => listeners.delete(listener)
}
