const PREFIX = "whoareyou:"

/**
 * localStorage with the sharp edges filed off: private windows, disabled
 * site data and quota errors all degrade to the fallback instead of throwing.
 */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage unavailable - the session simply won't persist.
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key)
  } catch {
    // no-op
  }
}
