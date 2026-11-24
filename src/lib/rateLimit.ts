/**
 * Rate limiting por IP para el endpoint público `/mcp`.
 *
 * Usa el binding de Workers Rate Limiting (`ratelimits` en wrangler.jsonc). Los
 * valores de `limit`/`period` viven en la config de wrangler, no acá: esta
 * constante solo alimenta el `Retry-After` y tiene que coincidir con `period`.
 *
 * Caveats del binding (docs de Cloudflare):
 * - El conteo es por location de Cloudflare y eventualmente consistente: es un
 *   freno contra abuso, no una cuota exacta.
 * - Clientes detrás de la misma IP (p. ej. los backends de Claude o ChatGPT que
 *   llaman al conector en nombre de muchos usuarios) comparten el bucket.
 */
export const RATE_LIMIT_PERIOD_SECONDS = 60;

/** JSON-RPC: -32000..-32099 es el rango reservado para errores del servidor. */
export const RATE_LIMIT_JSONRPC_CODE = -32029;

const RATE_LIMITED_PATH = '/mcp';

/**
 * Forma mínima del binding `RateLimit` de @cloudflare/workers-types. Se declara
 * estructural para no arrastrar los tipos de Workers a los tests de Node.
 */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

function rateLimitedResponse(): Response {
  const body = {
    jsonrpc: '2.0',
    id: null,
    error: {
      code: RATE_LIMIT_JSONRPC_CODE,
      message: `[rate_limited] Too many requests. Retry after ${RATE_LIMIT_PERIOD_SECONDS} seconds.`,
      data: { retryAfterSeconds: RATE_LIMIT_PERIOD_SECONDS },
    },
  };

  return new Response(JSON.stringify(body), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(RATE_LIMIT_PERIOD_SECONDS),
      // Igual que la config CORS de xmcp: sin esto un cliente de browser ve un
      // error de CORS en vez del 429.
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Retry-After',
    },
  });
}

/**
 * Devuelve una respuesta 429 si el request se pasó del límite, o `null` si hay
 * que dejarlo seguir.
 *
 * Es no-op cuando: no hay binding (dev local, tests), el path no es `/mcp`, o
 * no hay `CF-Connecting-IP` — sin IP, todos caerían en el mismo bucket y un
 * solo cliente podría bloquear al resto. Si el binding falla, se deja pasar:
 * un limitador roto no puede tirar el servicio.
 */
export async function enforceRateLimit(
  request: Request,
  limiter: RateLimiter | undefined,
): Promise<Response | null> {
  if (!limiter) return null;
  // Los preflight CORS no llegan a xmcp como llamadas MCP: no gastan cupo.
  if (request.method === 'OPTIONS') return null;

  const { pathname } = new URL(request.url);
  if (pathname !== RATE_LIMITED_PATH && !pathname.startsWith(`${RATE_LIMITED_PATH}/`)) return null;

  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return null;

  try {
    const { success } = await limiter.limit({ key: ip });
    return success ? null : rateLimitedResponse();
  } catch (error) {
    console.error('[rate-limit] limiter failed, allowing request', error);
    return null;
  }
}
