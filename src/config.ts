const DEFAULT_API_BASE_URL = "https://api.exactamente.com.ar";
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_RETRY_COUNT = 1;
const DEFAULT_RETRY_DELAY_MS = 200;
const DEFAULT_MAX_PAGE_LIMIT = 50;

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim();
  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1).trim()
      : trimmed;

  const url = new URL(unquoted);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("EXACTAMENTE_API_BASE_URL must use http or https");
  }

  return url.toString().replace(/\/$/, "");
}

const rawBaseUrl = process.env.EXACTAMENTE_API_BASE_URL ?? DEFAULT_API_BASE_URL;

export const config = {
  apiBaseUrl: normalizeApiBaseUrl(rawBaseUrl),
  timeoutMs: parseNumber(process.env.EXACTAMENTE_API_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
  retryCount: parseNumber(
    process.env.EXACTAMENTE_API_RETRY_COUNT,
    DEFAULT_RETRY_COUNT
  ),
  retryDelayMs: parseNumber(
    process.env.EXACTAMENTE_API_RETRY_DELAY_MS,
    DEFAULT_RETRY_DELAY_MS
  ),
  maxPageLimit: parseNumber(
    process.env.EXACTAMENTE_MAX_PAGE_LIMIT,
    DEFAULT_MAX_PAGE_LIMIT
  ),
};
