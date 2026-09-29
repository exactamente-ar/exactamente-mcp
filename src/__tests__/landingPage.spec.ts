import { describe, expect, it, vi } from 'vitest';
import { acceptsHtml } from '../landing/acceptsHtml';
import { renderLandingPage, resolveMcpEndpoint } from '../landing/renderLandingPage';
import { MCP_RESPONSE_CSP, handleFetch, type WorkerEnv } from '../handleFetch';

const ctx = {
  waitUntil() {},
  passThroughOnException() {},
};

function request(url: string, init?: RequestInit): Request {
  return new Request(url, init);
}

describe('acceptsHtml', () => {
  it('treats a browser Accept header as HTML navigation', () => {
    expect(acceptsHtml('text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8')).toBe(
      true,
    );
    expect(acceptsHtml('text/html')).toBe(true);
    expect(acceptsHtml('Text/HTML; charset=utf-8')).toBe(true);
  });

  it('ignores missing, JSON, and explicitly rejected HTML', () => {
    expect(acceptsHtml(null)).toBe(false);
    expect(acceptsHtml('application/json')).toBe(false);
    expect(acceptsHtml('*/*')).toBe(false);
    expect(acceptsHtml('application/json, text/html;q=0')).toBe(false);
  });
});

describe('renderLandingPage', () => {
  it('builds a responsive getting-started page whose inline assets match its CSP', async () => {
    const endpoint = 'https://mcp.exactamente.com.ar/mcp';
    const { html, contentSecurityPolicy } = await renderLandingPage(endpoint);

    expect(html).toContain('<meta name="viewport"');
    expect(html).toContain('@media');
    expect(html).toContain('solo lectura');
    expect(html).toContain('universidades');
    expect(html).toContain('facultades');
    expect(html).toContain('carreras');
    expect(html).toContain('materias');
    expect(html).toContain('recursos');

    const cards = html.match(/<button type="button" class="client-card"/g) ?? [];
    expect(cards).toHaveLength(6);
    for (const name of [
      'Cursor',
      'Claude Code',
      'Claude Desktop',
      'Windsurf',
      'Gemini CLI',
      'Codex',
    ]) {
      expect(html).toContain(name);
    }

    expect(html).toContain('"type": "http"');
    expect(html).toContain('mcp-remote');
    expect(html).toContain('serverUrl');
    expect(html).toContain('httpUrl');
    expect(html).toContain('[mcp_servers.exactamente]');
    expect(html.match(/https:\/\/mcp\.exactamente\.com\.ar\/mcp/g)?.length).toBeGreaterThanOrEqual(
      6,
    );
    expect(html).toContain('navigator.clipboard.writeText');

    expect(contentSecurityPolicy).toContain("default-src 'none'");
    expect(contentSecurityPolicy).toContain('connect-src https://api.exactamente.com.ar');
    expect(contentSecurityPolicy).toContain(`'sha256-${await sourceHash(extract(html, 'style'))}'`);
    expect(contentSecurityPolicy).toContain(
      `'sha256-${await sourceHash(extract(html, 'script'))}'`,
    );
  });

  it('points the copied endpoint at the host that served the page', () => {
    expect(resolveMcpEndpoint('https://mcp.exactamente.com.ar/')).toBe(
      'https://mcp.exactamente.com.ar/mcp',
    );
    expect(resolveMcpEndpoint('http://127.0.0.1:8787/docs?x=1')).toBe('http://127.0.0.1:8787/mcp');
  });
});

describe('handleFetch landing route', () => {
  const env: WorkerEnv = {};

  it('returns the landing page for GET / when the client accepts HTML', async () => {
    const upstream = vi.fn(async () => new Response('mcp', { status: 200 }));

    const response = await handleFetch(
      request('https://mcp.exactamente.com.ar/', {
        headers: { accept: 'text/html' },
      }),
      env,
      ctx,
      upstream,
    );

    expect(upstream).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    const html = await response.text();
    expect(html).toContain('client-card');
    expect(html).toContain('https://mcp.exactamente.com.ar/mcp');
  });

  it('leaves MCP transport requests on the existing worker', async () => {
    const upstream = vi.fn(
      async () =>
        new Response('{"jsonrpc":"2.0"}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );

    const cases = [
      request('https://mcp.exactamente.com.ar/mcp', { headers: { accept: 'text/html' } }),
      request('https://mcp.exactamente.com.ar/', { headers: { accept: 'application/json' } }),
      request('https://mcp.exactamente.com.ar/'),
      request('https://mcp.exactamente.com.ar/', {
        method: 'POST',
        headers: { accept: 'text/html' },
      }),
    ];

    for (const incoming of cases) {
      const response = await handleFetch(incoming, env, ctx, upstream);
      expect(response.headers.get('content-security-policy')).toBe(MCP_RESPONSE_CSP);
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      expect(await response.text()).toBe('{"jsonrpc":"2.0"}');
    }

    expect(upstream).toHaveBeenCalledTimes(cases.length);
  });

  it('keeps the OpenAI domain challenge in front of the landing page', async () => {
    const upstream = vi.fn(async () => new Response('nope', { status: 500 }));

    const missing = await handleFetch(
      request('https://mcp.exactamente.com.ar/.well-known/openai-apps-challenge'),
      env,
      ctx,
      upstream,
    );
    expect(missing.status).toBe(404);
    expect(await missing.text()).toBe('Not configured');

    const configured = await handleFetch(
      request('https://mcp.exactamente.com.ar/.well-known/openai-apps-challenge'),
      { OPENAI_APPS_VERIFICATION_TOKEN: 'token-123' },
      ctx,
      upstream,
    );
    expect(configured.status).toBe(200);
    expect(configured.headers.get('content-type')).toContain('text/plain');
    expect(configured.headers.get('content-security-policy')).toBe(MCP_RESPONSE_CSP);
    expect(await configured.text()).toBe('token-123');
    expect(upstream).not.toHaveBeenCalled();
  });
});

function extract(html: string, tag: 'style' | 'script'): string {
  const match = html.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  if (!match?.[1]) {
    throw new Error(`missing <${tag}>`);
  }
  return match[1];
}

async function sourceHash(source: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  const bytes = new Uint8Array(digest);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
