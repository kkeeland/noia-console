// Noia Console Configuration Manager
// Stores gateway URL + token in localStorage with basic obfuscation

export interface NoiaConfig {
  gatewayUrl: string
  gatewayToken: string
  userName?: string
}

const STORAGE_KEY = 'noia-config'
const DEFAULT_URL = 'http://localhost:18789'

// Simple obfuscation (base64 + reverse) — not encryption, just keeps tokens
// from being immediately visible in localStorage
function obfuscate(value: string): string {
  const reversed = value.split('').reverse().join('')
  return btoa(reversed)
}

function deobfuscate(value: string): string {
  try {
    const decoded = atob(value)
    return decoded.split('').reverse().join('')
  } catch {
    return value // fallback for unobfuscated values
  }
}

function serializeConfig(config: NoiaConfig): string {
  const payload = {
    u: obfuscate(config.gatewayUrl),
    t: obfuscate(config.gatewayToken),
    n: config.userName || '',
  }
  return obfuscate(JSON.stringify(payload))
}

function deserializeConfig(raw: string): NoiaConfig {
  const json = deobfuscate(raw)
  const payload = JSON.parse(json)
  return {
    gatewayUrl: deobfuscate(payload.u),
    gatewayToken: deobfuscate(payload.t),
    userName: payload.n || undefined,
  }
}

export function getConfig(): NoiaConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return deserializeConfig(raw)
    }
  } catch {
    // Corrupted config — clear it
    localStorage.removeItem(STORAGE_KEY)
  }

  // Fall back to env vars (backward compat)
  return {
    gatewayUrl: import.meta.env.VITE_GATEWAY_URL || DEFAULT_URL,
    gatewayToken: import.meta.env.VITE_GATEWAY_TOKEN || '',
  }
}

export function setConfig(config: NoiaConfig): void {
  localStorage.setItem(STORAGE_KEY, serializeConfig(config))
}

export function clearConfig(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function isConfigured(): boolean {
  // Check localStorage first
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const config = deserializeConfig(raw)
      return !!config.gatewayToken
    }
  } catch {
    // fall through
  }
  // Fall back to env var
  return !!import.meta.env.VITE_GATEWAY_TOKEN
}

export function getGatewayUrl(): string {
  const config = getConfig()
  // In dev mode with default localhost, use proxy
  if (!import.meta.env.PROD && config.gatewayUrl === DEFAULT_URL) {
    return '/api'
  }
  return config.gatewayUrl
}

export function getGatewayToken(): string {
  return getConfig().gatewayToken
}
