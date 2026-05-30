# ChatGPT Apps Submission — Exactamente MCP

## Prerequisites Checklist

- [ ] Organization verification completed (individual or business) in [OpenAI Dashboard](https://platform.openai.com/settings/organization/general)
- [ ] `api.apps.write` and `api.apps.read` permissions granted
- [ ] MCP server deployed to Cloudflare Workers (public URL)
- [ ] `OPENAI_APPS_VERIFICATION_TOKEN` set as Wrangler secret
- [ ] Privacy policy published at a public URL

---

## Deployment Steps

```bash
# 1. Build the Cloudflare Worker
npm run build:cf

# 2. Deploy to Cloudflare
npx wrangler deploy

# 3. Set the OpenAI verification token (get from OpenAI Dashboard)
npm run deploy:secret
# Paste the token when prompted
```

Your MCP server URL will be: `https://exactamente-mcp.<your-subdomain>.workers.dev/mcp`

---

## Submission Form Fields

### Basic Information

| Field | Value |
|---|---|
| **App Name** | Exactamente |
| **Description** | Search and download academic materials — exams, summaries, and finals from Argentine universities. |
| **Company Name** | _(your name or business name — must match verified org)_ |
| **Company URL** | _(your website URL)_ |
| **Privacy Policy URL** | _(required — must disclose academic data returned by tools)_ |

### MCP Server Configuration

| Field | Value |
|---|---|
| **MCP Server URL** | `https://exactamente-mcp.<your-subdomain>.workers.dev/mcp` |
| **Authentication** | None (public API) |
| **Template MCP Server URL** | _(leave blank — universal endpoint)_ |

### Tool Information

| Tool | Description | readOnlyHint | destructiveHint | openWorldHint |
|---|---|---|---|---|
| `health-check` | Check backend health status | `true` | `false` | `false` |
| `list-universities` | List available universities | `true` | `false` | `false` |
| `list-faculties` | List faculties, optionally by university | `true` | `false` | `false` |
| `list-careers` | List careers, optionally by faculty | `true` | `false` | `false` |
| `search-subjects` | Search and filter subjects | `true` | `false` | `false` |
| `get-subject` | Get detailed subject information | `true` | `false` | `false` |
| `list-resources` | List published study resources | `true` | `false` | `false` |
| `find-subject-materials` | Combined subject + resource search | `true` | `false` | `false` |
| `download-resource` | Get download URL for a resource file | `true` | `false` | `false` |

### Test Prompts & Expected Responses

Provide at least 3 test cases. Each must pass on both ChatGPT web and mobile.

#### Test 1: Explore universities

**Prompt:**
> Listá las universidades disponibles

**Expected behavior:**
- Calls `list-universities`
- Returns a list of universities with names and IDs
- Suggests next action: explore faculties of a university

#### Test 2: Search for exam materials

**Prompt:**
> Buscá parciales de Análisis Matemático

**Expected behavior:**
- Calls `search-subjects` with search="Análisis Matemático"
- Calls `list-resources` or `find-subject-materials` with type="parcial"
- Returns matching exam resources with titles, years, and download URLs

#### Test 3: Download a specific resource

**Prompt:**
> Descargá el final de Álgebra de 2024

**Expected behavior:**
- Calls `search-subjects` with search="Álgebra"
- Calls `list-resources` with type="final"
- Calls `download-resource` with the matching resource ID
- Returns the download URL for the file

#### Test 4: Navigate career structure

**Prompt:**
> Mostrame las materias de primer año de Ingeniería en Sistemas

**Expected behavior:**
- Calls `list-universities` → `list-faculties` → `list-careers` to find the career
- Calls `search-subjects` with careerId and year=1
- Returns a list of first-year subjects for that career

#### Test 5: Health check

**Prompt:**
> Verificá la conexión con Exactamente

**Expected behavior:**
- Calls `health-check`
- Returns status "ok" with timestamp
- Confirms the backend is reachable

### Screenshots

Capture screenshots showing the app working correctly on:

- [ ] ChatGPT **web** — a conversation using the tools
- [ ] ChatGPT **mobile** — same or similar conversation
- [ ] Tool output with structured content visible
- [ ] Error handling (e.g., resource not found)

### Localization

| Field | Value |
|---|---|
| **Primary Language** | Spanish (es) |
| **Supported Countries** | Argentina (AR) — add others as needed |

---

## Privacy Policy Requirements

Your privacy policy **must** disclose:

1. **Data collected:** Academic metadata (university names, faculty names, career names, subject titles, resource titles/types/years). No personal user data is collected by the MCP server.
2. **Data returned to users:** The same academic metadata plus download URLs for publicly available PDF resources.
3. **No PII:** The server does not collect, store, or return personal identifiers, session IDs, auth tokens, or internal IDs beyond resource/subject UUIDs.
4. **Third-party services:** The MCP server connects to `https://api.exactamente.com.ar` to fetch data.
5. **Data retention:** No data is retained by the MCP server; all requests are stateless.

---

## Content Security Policy

The server declares the following CSP:

```
default-src 'none'; connect-src https://api.exactamente.com.ar
```

This declares that the server only makes outbound connections to the Exactly API.

---

## Post-Submission

- Monitor email for Case ID and review status updates
- Do **not** contact support to request expedited review
- If rejected, review feedback carefully and resubmit with fixes
- After approval, click **Publish** in the [Dashboard](https://platform.openai.com/apps-manage)
