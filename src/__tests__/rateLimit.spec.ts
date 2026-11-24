import { describe, expect, it, vi } from 'vitest';
import { RATE_LIMIT_PERIOD_SECONDS, enforceRateLimit, type RateLimiter } from '../lib/rateLimit';

function fakeLimiter(success: boolean) {
  const limit = vi.fn(async (_options: { key: string }) => ({ success }));
  return { limiter: { limit } satisfies RateLimiter, limit };
}

function mcpRequest(path = '/mcp', ip: string | null = '203.0.113.7'): Request {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (ip) headers.set('CF-Connecting-IP', ip);
  return new Request(`https://mcp.exactamente.com.ar${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  });
}

describe('enforceRateLimit', () => {
  it('is a no-op when the binding is absent (local dev, tests)', async () => {
    await expect(enforceRateLimit(mcpRequest(), undefined)).resolves.toBeNull();
  });

  it('keys the limiter by CF-Connecting-IP and lets allowed requests through', async () => {
    const { limiter, limit } = fakeLimiter(true);

    await expect(enforceRateLimit(mcpRequest(), limiter)).resolves.toBeNull();
    expect(limit).toHaveBeenCalledWith({ key: '203.0.113.7' });
  });

  it('only applies to the /mcp endpoint', async () => {
    const { limiter, limit } = fakeLimiter(false);

    await expect(
      enforceRateLimit(mcpRequest('/.well-known/openai-apps-challenge'), limiter),
    ).resolves.toBeNull();
    await expect(enforceRateLimit(mcpRequest('/'), limiter)).resolves.toBeNull();
    expect(limit).not.toHaveBeenCalled();
  });

  it('skips limiting when the client IP is unknown instead of sharing one bucket', async () => {
    const { limiter, limit } = fakeLimiter(false);

    await expect(enforceRateLimit(mcpRequest('/mcp', null), limiter)).resolves.toBeNull();
    expect(limit).not.toHaveBeenCalled();
  });

  it('returns HTTP 429 with Retry-After and a JSON-RPC error when over the limit', async () => {
    const { limiter } = fakeLimiter(false);

    const response = await enforceRateLimit(mcpRequest(), limiter);

    expect(response?.status).toBe(429);
    expect(response?.headers.get('Retry-After')).toBe(String(RATE_LIMIT_PERIOD_SECONDS));
    expect(response?.headers.get('Content-Type')).toContain('application/json');
    const body = (await response?.json()) as {
      jsonrpc: string;
      id: unknown;
      error: { code: number; message: string; data: { retryAfterSeconds: number } };
    };
    expect(body.jsonrpc).toBe('2.0');
    expect(body.id).toBeNull();
    expect(body.error.code).toBe(-32029);
    expect(body.error.message).toContain('rate_limited');
    expect(body.error.data.retryAfterSeconds).toBe(RATE_LIMIT_PERIOD_SECONDS);
  });

  it('fails open when the limiter itself throws', async () => {
    const limiter: RateLimiter = {
      limit: vi.fn(async () => {
        throw new Error('binding unavailable');
      }),
    };
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(enforceRateLimit(mcpRequest(), limiter)).resolves.toBeNull();
  });
});
