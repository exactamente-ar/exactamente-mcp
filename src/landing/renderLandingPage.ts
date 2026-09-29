import { clientCards } from './clients';

const STYLE = `
:root {
  color-scheme: dark;
  --bg: #0f172a;
  --surface: #1e293b;
  --text: #f8fafc;
  --muted: #94a3b8;
  --line: rgba(255, 255, 255, 0.12);
  --blue: #60a5fa;
  --orange: #ff9800;
  --shadow: 0 18px 40px rgba(2, 6, 23, 0.35);
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  min-height: 100vh;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  background:
    radial-gradient(900px 520px at 100% -10%, rgba(30, 64, 175, 0.45), transparent 60%),
    radial-gradient(700px 420px at -10% 110%, rgba(255, 152, 0, 0.16), transparent 55%),
    var(--bg);
  color: var(--text);
  line-height: 1.5;
}
a { color: var(--blue); }
a:focus-visible, button:focus-visible {
  outline: 2px solid var(--orange);
  outline-offset: 3px;
}
.wrap { width: min(1080px, calc(100% - 32px)); margin: 0 auto; }
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 0;
}
.brand { color: var(--text); font-weight: 750; letter-spacing: -0.03em; text-decoration: none; font-size: 1.15rem; }
.brand span { color: var(--orange); }
.hero { padding: 28px 0 12px; }
.kicker {
  display: inline-block;
  margin: 0 0 14px;
  padding: 4px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--muted);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
h1 {
  margin: 0 0 12px;
  max-width: 16ch;
  font-size: clamp(2.1rem, 5vw, 3.5rem);
  line-height: 1.05;
  letter-spacing: -0.045em;
}
.lede { max-width: 62ch; margin: 0; color: var(--muted); font-size: 1.08rem; }
.section { padding: 36px 0 72px; }
h2 { margin: 0 0 8px; font-size: clamp(1.5rem, 3vw, 2rem); letter-spacing: -0.03em; }
.section p { margin: 0 0 22px; color: var(--muted); }
.cards { display: grid; grid-template-columns: 1fr; gap: 16px; }
.client-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  width: 100%;
  margin: 0;
  padding: 18px;
  text-align: left;
  color: inherit;
  background: rgba(30, 41, 59, 0.92);
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: var(--shadow);
  transition: transform 0.2s ease, border-color 0.2s ease;
}
.client-card:hover { transform: translateY(-3px); border-color: rgba(96, 165, 250, 0.55); }
.client-card[data-copied="true"] { border-color: var(--orange); }
.client-card[data-copied="false"] { border-color: #f87171; }
.client-name { font-size: 1.15rem; font-weight: 700; }
.client-path { color: var(--muted); font-size: 0.84rem; }
pre {
  margin: 8px 0 0;
  padding: 12px;
  overflow: auto;
  border-radius: 12px;
  background: #0b1220;
  color: #e2e8f0;
  font-size: 0.78rem;
  line-height: 1.45;
}
code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.copy-button {
  align-self: flex-start;
  margin: 0;
  padding: 6px 12px;
  color: var(--blue);
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 999px;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 650;
  cursor: pointer;
}
.client-card[data-copied="true"] .copy-button { color: var(--orange); }
.client-card[data-copied="false"] .copy-button { color: #f87171; }
footer { padding: 0 0 40px; color: var(--muted); font-size: 0.9rem; }
@media (min-width: 720px) {
  .cards { grid-template-columns: 1fr 1fr; }
  h1 { max-width: 18ch; }
}
@media (min-width: 1080px) {
  .cards { grid-template-columns: 1fr 1fr 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .client-card { transition: none; }
}
`.trim();

const SCRIPT = `
document.querySelectorAll(".client-card").forEach(function (card) {
  var code = card.querySelector("code");
  var button = card.querySelector(".copy-button");
  if (!code || !button) return;
  var initial = button.textContent;
  var timer;
  function show(ok, text) {
    button.textContent = text;
    card.setAttribute("data-copied", ok ? "true" : "false");
    window.clearTimeout(timer);
    timer = window.setTimeout(function () {
      button.textContent = initial;
      card.removeAttribute("data-copied");
    }, ok ? 1600 : 4000);
  }
  function fail() {
    var selection = window.getSelection();
    if (selection) selection.selectAllChildren(code);
    show(false, "No se pudo copiar: el texto quedó seleccionado");
  }
  button.addEventListener("click", function () {
    if (!navigator.clipboard || !navigator.clipboard.writeText) return fail();
    navigator.clipboard.writeText(code.textContent || "").then(function () {
      show(true, "Copiado");
    }, fail);
  });
});
`.trim();

export function resolveMcpEndpoint(requestUrl: string): string {
  const url = new URL(requestUrl);
  url.pathname = '/mcp';
  url.search = '';
  url.hash = '';
  return url.toString();
}

export async function renderLandingPage(
  mcpEndpoint: string,
): Promise<{ html: string; contentSecurityPolicy: string }> {
  const cards = clientCards
    .map((client) => {
      const snippet = escapeHtml(client.snippet(mcpEndpoint));
      return `<article class="client-card">
<span class="client-name">${escapeHtml(client.name)}</span>
<span class="client-path">${escapeHtml(client.path)}</span>
<pre><code>${snippet}</code></pre>
<button type="button" class="copy-button" aria-live="polite">Copiar configuración</button>
</article>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Exactamente MCP — Conectá un cliente</title>
<meta name="description" content="Servidor MCP de solo lectura para consultar universidades, facultades, carreras, materias y recursos publicados.">
<style>${STYLE}</style>
</head>
<body>
<div class="wrap">
<header>
<a class="brand" href="https://exactamente.com.ar">exacta<span>mente</span></a>
<a href="#conectar">Conectá un cliente</a>
</header>
<section class="hero">
<p class="kicker">MCP</p>
<h1>Datos académicos en el cliente que ya usás</h1>
<p class="lede">El servidor MCP de Exactamente expone, en solo lectura, universidades, facultades, carreras, materias y recursos publicados.</p>
</section>
<section class="section" id="conectar">
<h2>Conectá un cliente</h2>
<p>Copiá la configuración de tu cliente. Pegala en el archivo de tu cliente y reconectá. El transporte HTTP queda en <code>/mcp</code>.</p>
<div class="cards">
${cards}
</div>
</section>
<footer>Esta página se sirve solo cuando el navegador pide HTML. Las llamadas del protocolo MCP no cambian.</footer>
</div>
<script>${SCRIPT}</script>
</body>
</html>`;

  const contentSecurityPolicy = [
    "default-src 'none'",
    `style-src 'sha256-${await sha256Base64(STYLE)}'`,
    `script-src 'sha256-${await sha256Base64(SCRIPT)}'`,
    'connect-src https://api.exactamente.com.ar',
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');

  return { html, contentSecurityPolicy };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sha256Base64(source: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  let binary = '';
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return btoa(binary);
}
