const DEFAULT_API_BASE_URL = "http://localhost:3000";
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_RETRY_COUNT = 1;
const DEFAULT_RETRY_DELAY_MS = 200;
const DEFAULT_MAX_PAGE_LIMIT = 50;
const DEFAULT_DOWNLOADS_DIR = "./downloads";

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

const rawBaseUrl = process.env.EXACTAMENTE_API_BASE_URL ?? DEFAULT_API_BASE_URL;
const rawDownloadsDir = process.env.EXACTAMENTE_DOWNLOADS_DIR ?? DEFAULT_DOWNLOADS_DIR;

export const config = {
  apiBaseUrl: rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl,
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
  downloadsDir: rawDownloadsDir,
};
