import { acceptsHtml } from './landing/acceptsHtml';
import { renderLandingPage, resolveMcpEndpoint } from './landing/renderLandingPage';

export const MCP_RESPONSE_CSP = "default-src 'none'; connect-src https://api.exactamente.com.ar";

export interface WorkerEnv {
  OPENAI_APPS_VERIFICATION_TOKEN?: string;
  [key: string]: unknown;
}

type Upstream = (request: Request, env: WorkerEnv, ctx: unknown) => Promise<Response>;

export function withSecurityHeaders(response: Response, csp = MCP_RESPONSE_CSP): Response {
  const headers = new Headers(response.headers);
  headers.set('Content-Security-Policy', csp);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function handleFetch(
  request: Request,
  env: WorkerEnv,
  ctx: unknown,
  upstream: Upstream,
): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === '/.well-known/openai-apps-challenge' && request.method === 'GET') {
    const token = env.OPENAI_APPS_VERIFICATION_TOKEN;
    if (token) {
      return new Response(token, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Content-Security-Policy': MCP_RESPONSE_CSP,
        },
      });
    }
    return new Response('Not configured', { status: 404 });
  }

  if (
    request.method === 'GET' &&
    url.pathname === '/' &&
    acceptsHtml(request.headers.get('accept'))
  ) {
    const page = await renderLandingPage(resolveMcpEndpoint(request.url));
    return withSecurityHeaders(
      new Response(page.html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }),
      page.contentSecurityPolicy,
    );
  }

  return withSecurityHeaders(await upstream(request, env, ctx));
}
