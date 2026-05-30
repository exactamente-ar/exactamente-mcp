/// <reference types="@cloudflare/workers-types" />
import xmcpWorker from "../worker.js";

interface Env {
  OPENAI_APPS_VERIFICATION_TOKEN?: string;
  EXACTAMENTE_API_BASE_URL?: string;
  [key: string]: unknown;
}

const CSP = "default-src 'none'; connect-src https://api.exactamente.com.ar";

function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", CSP);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (
      url.pathname === "/.well-known/openai-apps-challenge" &&
      request.method === "GET"
    ) {
      const token = env.OPENAI_APPS_VERIFICATION_TOKEN;
      if (token) {
        return new Response(token, {
          status: 200,
          headers: {
            "Content-Type": "text/plain",
            "Content-Security-Policy": CSP,
          },
        });
      }
      return new Response("Not configured", { status: 404 });
    }

    const response = await xmcpWorker.fetch(request, env, ctx);
    return addSecurityHeaders(response);
  },
};
