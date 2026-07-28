# Contributing to exactamente-mcp

Thanks for wanting to help. This document explains how to contribute in an orderly way.

## Before you start

- Check [open issues](https://github.com/exactamente-ar/exactamente-mcp/issues) to see if there's already a discussion about what you want to do.
- For larger changes (new tools, transport changes, API surface), open an issue first to align before coding.
- For small bugs or improvements, you can go straight to a PR.

## Local setup

Requirements:

- Node.js >= 20
- Access to the Exactamente backend (defaults to `https://api.exactamente.com.ar`)

```bash
git clone https://github.com/<your-username>/exactamente-mcp.git
cd exactamente-mcp
npm install
cp .env.example .env
```

Adjust `.env` if you want to point at a local backend (`EXACTAMENTE_API_BASE_URL=http://localhost:3000`).

Run the dev server:

```bash
npm run dev          # local stdio + HTTP transport
npm run dev:cf       # Cloudflare Workers local dev
```

## Workflow

1. Fork the repository
2. Create a branch from `master`:
   ```bash
   git checkout -b feat/short-description
   git checkout -b fix/bug-description
   ```
3. Make your changes
4. Verify everything passes:
   ```bash
   npm run typecheck
   npm run test
   ```
5. Commit and push
6. Open a Pull Request against `master`

## Code conventions

### Structure

```
src/
├── tools/          # MCP tools (one file per tool)
├── prompts/        # MCP prompts (agent guides)
├── resources/      # MCP resources (read-only payloads)
├── client/         # Exactamente API client (shared retries/timeouts)
├── lib/            # Shared tool helpers
├── types/          # Shared TypeScript types
├── config.ts       # Env parsing and runtime config
├── middleware.ts   # HTTP middleware for the worker
└── worker.ts       # Cloudflare Workers wrapper (CSP, verification routes)
```

### Key rules

- **All tools are read-only and idempotent.** This server never mutates backend state — that's the whole contract. No `POST`/`PATCH`/`DELETE` calls to the backend.
- **Never log to stdout in stdio mode.** It breaks the MCP protocol. Use `console.error` for diagnostics; respect `silent: true` in `xmcp.config.ts`.
- **Validate tool inputs with Zod.** No untyped arguments.
- **Return `structuredContent` whenever possible**, with `agentHints.nextActions` so agents can chain calls without parsing prose.
- **Use the API client in `src/client/`** — don't `fetch` directly from tool handlers. Centralized retries/timeouts live there.
- **Respect `EXACTAMENTE_MAX_PAGE_LIMIT`** — clamp `limit` instead of forwarding raw user input to the backend.
- **Bilingual responses are OK**: tool names and code in English, user-facing prompt text in Spanish (matching backend domain language).

### Naming

| Element    | Convention           | Example                                  |
| ---------- | -------------------- | ---------------------------------------- |
| Tool names | kebab-case           | `list-universities`, `download-resource` |
| Files      | kebab-case           | `list-universities.ts`                   |
| Functions  | camelCase            | `fetchSubjectBySlug`                     |
| Types      | PascalCase           | `SubjectWithCareers`                     |
| Constants  | SCREAMING_SNAKE_CASE | `DEFAULT_PAGE_LIMIT`                     |

## Adding a new tool

1. Create `src/tools/<tool-name>.ts` exporting a default xmcp tool definition.
2. Add a Zod schema for the inputs.
3. Use the API client from `src/client/` to call the backend.
4. Return `structuredContent` with the data and `agentHints.nextActions` when there's a natural follow-up call.
5. Add a test under the same name pattern (e.g. `<tool-name>.test.ts`).
6. Document the tool in `README.md` under "Exposed tools".

## Critical files — do not modify without review

| File                           | Why                                                           |
| ------------------------------ | ------------------------------------------------------------- |
| `xmcp.config.ts`               | Transport configuration (stdio/HTTP), server metadata         |
| `src/worker.ts`                | CSP headers, OpenAI Apps verification route, security headers |
| `wrangler.jsonc`               | Cloudflare Workers deployment config                          |
| `src/client/exactamenteApi.ts` | Shared retries/timeouts — changes affect every tool           |

If you need to touch any of these, explain why in the PR.

## Pull Requests

- Clear title: `feat: add list-career-plans tool`, `fix: clamp page limit in list-resources`
- Describe what changes and why
- If you're adding/changing a tool, include an example invocation in the PR body
- `npm run typecheck` and `npm run test` must pass before requesting review

## Reporting a bug

Open an issue with:

- Tool name and arguments used
- Expected vs. actual response
- Backend version/URL if relevant
- MCP client used (Claude Desktop, ChatGPT Apps, custom)

## Reporting a vulnerability

If you find a security issue **do not open a public issue**. Reach out to the team by email or DM.

## Questions

If you're unsure about architecture or approach, open an issue with the `question` label before starting.
