// AI provider configuration. The API key lives only in sessionStorage (cleared
// when the tab closes) and is sent directly from the browser to the chosen
// provider — never to any server of ours. This is the standard BYOK pattern for
// a client-only app; for a production deployment you would proxy through a
// backend so the key is never exposed.

export type Provider = "groq" | "anthropic" | "openai";

const KEY_STORE = "trendlens.llm.key";
const PROVIDER_STORE = "trendlens.llm.provider";
const MODEL_STORE = "trendlens.llm.model";

export const DEFAULT_MODEL: Record<Provider, string> = {
  groq: "llama-3.3-70b-versatile",
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o-mini",
};

export const PROVIDER_LABEL: Record<Provider, string> = {
  groq: "Groq",
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI",
};

export const KEY_PREFIX: Record<Provider, string> = {
  groq: "gsk_…",
  anthropic: "sk-ant-…",
  openai: "sk-…",
};

export function getProvider(): Provider {
  return (sessionStorage.getItem(PROVIDER_STORE) as Provider) || "groq";
}
export function setProvider(p: Provider) {
  sessionStorage.setItem(PROVIDER_STORE, p);
}

export function getApiKey(): string {
  return sessionStorage.getItem(KEY_STORE) || "";
}
export function setApiKey(k: string) {
  if (k) sessionStorage.setItem(KEY_STORE, k);
  else sessionStorage.removeItem(KEY_STORE);
}

export function getModel(): string {
  return sessionStorage.getItem(MODEL_STORE) || DEFAULT_MODEL[getProvider()];
}
export function setModel(m: string) {
  sessionStorage.setItem(MODEL_STORE, m);
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}
