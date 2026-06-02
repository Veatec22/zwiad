const openRouterApiKeyStorageKey = 'sailor.openrouter.apiKey'
const openRouterPkceVerifierStorageKey = 'sailor.openrouter.pkceVerifier'

export function getOpenRouterApiKey() {
  return localStorage.getItem(openRouterApiKeyStorageKey)?.trim() ?? ''
}

export function hasOpenRouterApiKey() {
  return getOpenRouterApiKey().length > 0
}

export function storeOpenRouterApiKey(apiKey: string) {
  const trimmed = apiKey.trim()

  if (!trimmed) {
    throw new Error('OpenRouter API key is empty')
  }

  localStorage.setItem(openRouterApiKeyStorageKey, trimmed)
}

export function forgetOpenRouterApiKey() {
  localStorage.removeItem(openRouterApiKeyStorageKey)
}

export async function startOpenRouterPkceAuth() {
  const codeVerifier = createCodeVerifier()
  const codeChallenge = await createCodeChallenge(codeVerifier)

  localStorage.setItem(openRouterPkceVerifierStorageKey, codeVerifier)

  const callbackUrl = new URL(window.location.href)
  callbackUrl.searchParams.delete('code')

  const authUrl = new URL('https://openrouter.ai/auth')
  authUrl.searchParams.set('callback_url', callbackUrl.toString())
  authUrl.searchParams.set('http_referer', window.location.origin)
  authUrl.searchParams.set('x_open_router_title', 'Sailor')
  authUrl.searchParams.set('key_label', 'Sailor browser key')
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')

  window.location.assign(authUrl.toString())
}

export async function completeOpenRouterPkceAuthFromUrl() {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')

  if (!code) return false

  const codeVerifier = localStorage.getItem(openRouterPkceVerifierStorageKey)

  if (!codeVerifier) {
    throw new Error('Missing OpenRouter PKCE verifier')
  }

  const response = await fetch('https://openrouter.ai/api/v1/auth/keys', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      code_verifier: codeVerifier,
      code_challenge_method: 'S256',
    }),
  })

  if (!response.ok) {
    throw new Error(await readOpenRouterError(response))
  }

  const payload = await response.json()
  const key = payload?.key

  if (typeof key !== 'string' || key.length === 0) {
    throw new Error('OpenRouter did not return an API key')
  }

  storeOpenRouterApiKey(key)
  localStorage.removeItem(openRouterPkceVerifierStorageKey)
  url.searchParams.delete('code')
  window.history.replaceState({}, '', url.toString())

  return true
}

async function readOpenRouterError(response: Response) {
  const text = await response.text().catch(() => 'OpenRouter request failed')

  try {
    const payload = JSON.parse(text)
    const message = payload?.error?.message ?? payload?.error

    if (typeof message === 'string' && message.length > 0) {
      return message
    }
  } catch {
    // Fall through to the raw response text.
  }

  return text
}

function createCodeVerifier() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)

  return base64UrlEncode(bytes)
}

async function createCodeChallenge(codeVerifier: string) {
  const data = new TextEncoder().encode(codeVerifier)
  const hash = await crypto.subtle.digest('SHA-256', data)

  return base64UrlEncode(new Uint8Array(hash))
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}
