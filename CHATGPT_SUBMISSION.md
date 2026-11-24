# ChatGPT Apps Submission — Exactamente MCP

The server is already deployed. This document holds the values for the OpenAI submission form and the test cases reviewers run. The Claude directory equivalent is [DIRECTORY_SUBMISSION.md](./DIRECTORY_SUBMISSION.md).

## Prerequisites Checklist

- [ ] Organization verification completed (individual or business) in [OpenAI Dashboard](https://platform.openai.com/settings/organization/general)
- [ ] `api.apps.write` and `api.apps.read` permissions granted
- [x] MCP server deployed and public: `https://mcp.exactamente.com.ar/mcp`
- [ ] `OPENAI_APPS_VERIFICATION_TOKEN` set as Wrangler secret (`pnpm deploy:secret`), then check `https://mcp.exactamente.com.ar/.well-known/openai-apps-challenge` returns the token
- [x] Privacy policy published: https://www.exactamente.com.ar/privacy
- [x] Terms of service published: https://www.exactamente.com.ar/terms
- [ ] App icon/logo (PNG, square) — still missing; `xmcp.svg` is the framework placeholder

Deploys happen from GitHub Actions after CI passes on `main`. Do not run `wrangler deploy` by hand.

---

## Submission Form Fields

### Basic Information

| Field                  | Value                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| **App Name**           | Exactamente                                                                                          |
| **Description**        | Buscá parciales, finales y resúmenes de materias de universidades argentinas, con links de descarga. |
| **Company Name**       | _(must match the verified OpenAI organization)_                                                      |
| **Company URL**        | https://www.exactamente.com.ar                                                                       |
| **Privacy Policy URL** | https://www.exactamente.com.ar/privacy                                                               |
| **Terms of Service**   | https://www.exactamente.com.ar/terms                                                                 |

### MCP Server Configuration

| Field                       | Value                                |
| --------------------------- | ------------------------------------ |
| **MCP Server URL**          | `https://mcp.exactamente.com.ar/mcp` |
| **Transport**               | Streamable HTTP                      |
| **Authentication**          | None (public, read-only data)        |
| **Template MCP Server URL** | _(leave blank — universal endpoint)_ |

The endpoint is rate limited to 300 requests per minute per IP (HTTP 429 + `Retry-After`). See the README if review traffic gets throttled.

### Tool Information

All tools are read-only: `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false` (they only query Exactamente's own catalogue; nothing is posted or changed anywhere).

| Tool                     | What it does                                                             |
| ------------------------ | ------------------------------------------------------------------------ |
| `find-subject-materials` | Search subjects by name and return their materials in one call (max 10)  |
| `search-subjects`        | Search/filter subjects by text, career, faculty, year and cuatrimestre   |
| `get-subject`            | Details of one subject and the careers/plans it belongs to               |
| `list-resources`         | Page through the published resources of a subject                        |
| `download-resource`      | Public download URL of one resource (needs `resourceId` and `subjectId`) |
| `list-universities`      | List universities                                                        |
| `list-faculties`         | List faculties, optionally of one university                             |
| `list-careers`           | List careers, optionally of one faculty                                  |
| `health-check`           | Diagnose backend availability                                            |

### Test Prompts & Expected Responses

Each must pass on both ChatGPT web and mobile. The subjects used below have published materials today (UNICEN).

#### Test 1: Find exams of a subject

**Prompt:**

> Buscá parciales de Cálculo 1

**Expected behavior:**

- Calls `find-subject-materials` with `search: "Cálculo 1"`, `type: "parcial"`
- Returns the subject with a list of parciales (titles, years)

#### Test 2: Download a specific resource

**Prompt:**

> Pasame el link de descarga de un final de Introducción a la Programación 1

**Expected behavior:**

- Calls `find-subject-materials` (or `search-subjects` + `list-resources`) with `type: "final"`
- Calls `download-resource` with the chosen `resourceId` and its `subjectId`
- Returns a `downloadUrl` pointing to the PDF

#### Test 3: Browse a career

**Prompt:**

> Mostrame las materias de primer año de Ingeniería en Sistemas en la UNICEN

**Expected behavior:**

- Calls `list-careers` (optionally `list-universities` → `list-faculties` first) to get the `careerId`
- Calls `search-subjects` with `careerId` and `year: 1`
- Returns the first-year subjects with their resource counts

#### Test 4: Compare available material

**Prompt:**

> ¿Qué materias de TUDAI tienen más finales resueltos?

**Expected behavior:**

- Calls `list-careers` to find TUDAI, then `search-subjects` with its `careerId`
- Uses `resourceCounts.final` to rank subjects

#### Test 5: Subject details

**Prompt:**

> ¿En qué año y cuatrimestre se cursa Análisis y Diseño de Algoritmos 1 y a qué carreras pertenece?

**Expected behavior:**

- Calls `search-subjects` with `search`, then `get-subject` with the subject id
- Returns year, cuatrimestre and the associated careers

### Screenshots

- [ ] ChatGPT **web** — a conversation using the tools
- [ ] ChatGPT **mobile** — same or similar conversation
- [ ] Tool output with structured content visible
- [ ] Error handling (e.g., resource not found)

### Localization

| Field                   | Value          |
| ----------------------- | -------------- |
| **Primary Language**    | Spanish (es)   |
| **Supported Countries** | Argentina (AR) |

---

## Privacy notes (check the published policy covers them before submitting)

1. **Data returned:** public academic metadata (universities, faculties, careers, subjects, resource titles/types/dates) and public download URLs of PDF resources.
2. **No PII:** the MCP server does not ask for, store or return personal data, accounts or auth tokens.
3. **Third parties:** the server only calls `https://api.exactamente.com.ar`.
4. **Retention:** the server is stateless. Cloudflare keeps standard request logs (IP used for rate limiting).

## Content Security Policy

```
default-src 'none'; connect-src https://api.exactamente.com.ar
```

## Post-Submission

- Monitor email for Case ID and review status updates
- Do **not** contact support to request expedited review
- If rejected, review feedback carefully and resubmit with fixes
- After approval, click **Publish** in the [Dashboard](https://platform.openai.com/apps-manage)
