const ACCOUNTS_KEY = 'pokemon-roadmap:v3:accounts'
const ACTIVE_ACCOUNT_KEY = 'pokemon-roadmap:v3:active-account'
const HASH_ITERATIONS = 120_000

export interface LocalAccount {
  id: string
  name: string
  salt: string
  pinHash: string
  createdAt: string
}

function readAccounts(): LocalAccount[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const value = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]')
    return Array.isArray(value)
      ? value.filter((account): account is LocalAccount =>
          typeof account?.id === 'string'
          && typeof account?.name === 'string'
          && typeof account?.salt === 'string'
          && typeof account?.pinHash === 'string',
        )
      : []
  } catch {
    return []
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let value = ''
  for (const byte of bytes) value += String.fromCharCode(byte)
  return btoa(value)
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const decoded = atob(value)
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0))
}

async function hashPin(pin: string, salt: Uint8Array<ArrayBuffer>): Promise<string> {
  const source = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const result = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: HASH_ITERATIONS },
    source,
    256,
  )
  return bytesToBase64(new Uint8Array(result))
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

function validateCredentials(name: string, pin: string): void {
  if (name.length < 2 || name.length > 16) throw new Error('닉네임은 2–16자로 입력해 주세요.')
  if (!/^\d{4,12}$/.test(pin)) throw new Error('PIN은 숫자 4–12자리로 입력해 주세요.')
}

function copyGuestData(accountId: string): void {
  const destinations = new Map<string, string>()
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key) continue
    if (key.startsWith('pokemon-roadmap:v3:guest:')) {
      destinations.set(key, key.replace('pokemon-roadmap:v3:guest:', `pokemon-roadmap:v3:${accountId}:`))
    } else if (key === 'pokemon-roadmap:v2:builder') {
      destinations.set(key, `pokemon-roadmap:v3:${accountId}:builder`)
    } else if (key === 'pokemon-roadmap:v2:current-plan') {
      destinations.set(key, `pokemon-roadmap:v3:${accountId}:current-plan`)
    } else if (key.startsWith('pokemon-roadmap:v2:progress:')) {
      destinations.set(key, `pokemon-roadmap:v3:${accountId}:progress:${key.slice('pokemon-roadmap:v2:progress:'.length)}`)
    }
  }
  for (const [source, destination] of destinations) {
    const value = localStorage.getItem(source)
    if (value !== null && localStorage.getItem(destination) === null) localStorage.setItem(destination, value)
  }
}

export function listAccounts(): LocalAccount[] {
  return readAccounts().map((account) => ({ ...account, pinHash: '' }))
}

export function getActiveAccount(): LocalAccount | null {
  if (typeof localStorage === 'undefined') return null
  const activeId = localStorage.getItem(ACTIVE_ACCOUNT_KEY)
  if (!activeId) return null
  const account = readAccounts().find((entry) => entry.id === activeId)
  return account ? { ...account, pinHash: '' } : null
}

export function activeStorageScope(): string {
  try {
    const cloudAccount = JSON.parse(localStorage.getItem('pokemon-roadmap:v4:cloud-account') ?? 'null')
    if (cloudAccount?.kind === 'cloud' && typeof cloudAccount.id === 'string') return `cloud-${cloudAccount.id}`
  } catch {
    // Ignore malformed cached metadata and continue with a local account.
  }
  return getActiveAccount()?.id ?? 'guest'
}

export async function createAccount(nameInput: string, pin: string): Promise<LocalAccount> {
  const name = normalizeName(nameInput)
  validateCredentials(name, pin)
  const accounts = readAccounts()
  if (accounts.some((account) => account.name.toLocaleLowerCase('ko') === name.toLocaleLowerCase('ko'))) {
    throw new Error('이미 사용 중인 닉네임입니다.')
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const account: LocalAccount = {
    id: crypto.randomUUID(),
    name,
    salt: bytesToBase64(salt),
    pinHash: await hashPin(pin, salt),
    createdAt: new Date().toISOString(),
  }
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, account]))
  if (accounts.length === 0) copyGuestData(account.id)
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, account.id)
  return { ...account, pinHash: '' }
}

export async function login(nameInput: string, pin: string): Promise<LocalAccount> {
  const name = normalizeName(nameInput)
  validateCredentials(name, pin)
  const account = readAccounts().find(
    (entry) => entry.name.toLocaleLowerCase('ko') === name.toLocaleLowerCase('ko'),
  )
  if (!account || await hashPin(pin, base64ToBytes(account.salt)) !== account.pinHash) {
    throw new Error('닉네임 또는 PIN이 올바르지 않습니다.')
  }
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, account.id)
  return { ...account, pinHash: '' }
}

export function logout(): void {
  localStorage.removeItem(ACTIVE_ACCOUNT_KEY)
}
