# Directory Submission — Claude connectors & MCP Registry

Values for the Claude connectors directory form and the steps to publish `server.json` to the official MCP Registry. ChatGPT Apps has its own document: [CHATGPT_SUBMISSION.md](./CHATGPT_SUBMISSION.md).

## Claude connectors directory

### Listing

| Field                 | Value                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------ |
| **Name**              | Exactamente                                                                                |
| **Short description** | Parciales, finales y resúmenes de materias de universidades argentinas.                    |
| **Server URL**        | `https://mcp.exactamente.com.ar/mcp`                                                       |
| **Transport**         | Streamable HTTP                                                                            |
| **Authentication**    | None (public, read-only data)                                                              |
| **Website**           | https://www.exactamente.com.ar                                                             |
| **Privacy policy**    | https://www.exactamente.com.ar/privacy                                                     |
| **Terms of service**  | https://www.exactamente.com.ar/terms                                                       |
| **Support**           | https://github.com/exactamente-ar/exactamente-mcp/issues                                   |
| **Source code**       | https://github.com/exactamente-ar/exactamente-mcp (MIT)                                    |
| **Primary language**  | Spanish (es), Argentina                                                                    |
| **Logo**              | _Missing — needs a square PNG/SVG of the Exactamente brand (`xmcp.svg` is a placeholder)._ |

### Long description

> Exactamente es un repositorio colaborativo de material de estudio de universidades argentinas: parciales, finales y resúmenes subidos por estudiantes y moderados antes de publicarse. Este conector le permite a Claude buscar materias por nombre, carrera o año, listar el material disponible de cada una y devolver el link de descarga del PDF. Es de solo lectura y no requiere cuenta: no pide datos personales ni modifica nada.

English version, if the form asks for one:

> Exactamente is a collaborative repository of study materials from Argentine universities: midterm exams (parciales), final exams (finales) and summaries (resúmenes) uploaded by students and moderated before publication. This connector lets Claude search subjects by name, career or year, list the materials available for each one, and return the PDF download link. It is read-only and needs no account: it asks for no personal data and changes nothing.

### Example prompts

1. Buscá parciales de Cálculo 1.
2. Pasame el link de descarga de un final de Introducción a la Programación 1.
3. Mostrame las materias de primer año de Ingeniería en Sistemas en la UNICEN.
4. ¿Qué materias de TUDAI tienen más finales disponibles?
5. ¿En qué año y cuatrimestre se cursa Análisis y Diseño de Algoritmos 1 y a qué carreras pertenece?

All five use subjects and careers with published material today.

### Tools

All tools are read-only (`readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false`) and each one has a title annotation.

| Tool                     | Title                     | What it does                                                             |
| ------------------------ | ------------------------- | ------------------------------------------------------------------------ |
| `find-subject-materials` | Find subject materials    | Search subjects by name and return their materials in one call (max 10)  |
| `search-subjects`        | Search subjects           | Search/filter subjects by text, career, faculty, year and cuatrimestre   |
| `get-subject`            | Get subject details       | Details of one subject and the careers/plans it belongs to               |
| `list-resources`         | List resources            | Page through the published resources of a subject                        |
| `download-resource`      | Get resource download URL | Public download URL of one resource (needs `resourceId` and `subjectId`) |
| `list-universities`      | List universities         | List universities                                                        |
| `list-faculties`         | List faculties            | List faculties, optionally of one university                             |
| `list-careers`           | List careers              | List careers, optionally of one faculty                                  |
| `health-check`           | Health check              | Diagnose backend availability                                            |

The server also exposes 4 prompts (`buscar-materiales-de-materia`, `descargar-parcial`, `explorar-carrera`, `diagnosticar-conexion`) and the resources `exactamente://meta` and `subjects://{subjectId}/details`.

### Operational notes for reviewers

- `/mcp` is rate limited to 300 requests per minute per client IP. Over the limit it returns HTTP 429 with `Retry-After: 60` and a JSON-RPC error. Remote connectors call from shared egress IPs, so watch for 429s in Workers Logs once listed and raise the limit in `wrangler.jsonc` if needed.
- The server is stateless and only calls `https://api.exactamente.com.ar`.

### Pre-submission checklist

- [ ] Logo ready
- [ ] Privacy policy mentions the MCP connector (data returned, no PII, Cloudflare request logs)
- [ ] Test the five prompts in Claude (web and desktop) as a custom connector with the URL above
- [ ] Run [MCP Inspector](https://github.com/modelcontextprotocol/inspector) against the URL: `initialize`, `tools/list`, one `tools/call`

---

## Official MCP Registry

`server.json` at the repo root describes the remote server. Its `version` is bumped by release-please (`extra-files` in `release-please-config.json`), so it stays in sync with `package.json`.

The name `ar.com.exactamente/mcp` uses the domain namespace, so the registry needs proof that we control `exactamente.com.ar`. One-time setup:

1. Install the publisher CLI: `brew install mcp-publisher` (or a release binary from https://github.com/modelcontextprotocol/registry/releases).
2. Generate an Ed25519 key pair and its proof record (see the registry docs, "Authentication"). The record looks like:

   ```
   v=MCPv1; k=ed25519; p=<public key in base64>
   ```

3. Prove the domain, one of:
   - **DNS:** add that value as a TXT record at the apex `exactamente.com.ar` (not a subdomain), then `mcp-publisher login dns --domain exactamente.com.ar` with the private key in `MCP_PRIVATE_KEY`.
   - **HTTP:** serve it as plain text with `200 OK` (no redirects) at `https://exactamente.com.ar/.well-known/mcp-registry-auth`, then `mcp-publisher login http --domain exactamente.com.ar`.
4. Publish from the repo root: `mcp-publisher publish`.
5. Check the listing: `curl "https://registry.modelcontextprotocol.io/v0/servers?search=ar.com.exactamente"`.

Keep the private key out of the repo (password manager or CI secret). On each release, re-run `mcp-publisher publish` after release-please bumps `server.json`.
