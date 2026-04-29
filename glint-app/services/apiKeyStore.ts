// User-supplied Gemini API key, persisted in WebView localStorage.
// Open-source build: no key is ever baked into the bundle.

const STORAGE_KEY = 'glint.gemini_api_key';

export function getApiKey(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(STORAGE_KEY) ?? '';
}

export function setApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = key.trim();
  if (trimmed) {
    window.localStorage.setItem(STORAGE_KEY, trimmed);
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function clearApiKey(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function hasApiKey(): boolean {
  return getApiKey().length > 0;
}
