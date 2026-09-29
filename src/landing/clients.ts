export interface ClientCard {
  name: string;
  path: string;
  snippet: (endpoint: string) => string;
}

export const clientCards: ClientCard[] = [
  {
    name: 'Cursor',
    path: '~/.cursor/mcp.json',
    snippet: (endpoint) =>
      JSON.stringify({ mcpServers: { exactamente: { url: endpoint } } }, null, 2),
  },
  {
    name: 'Claude Code',
    path: '.mcp.json',
    snippet: (endpoint) =>
      JSON.stringify({ mcpServers: { exactamente: { type: 'http', url: endpoint } } }, null, 2),
  },
  {
    name: 'Claude Desktop',
    path: 'claude_desktop_config.json',
    snippet: (endpoint) =>
      JSON.stringify(
        {
          mcpServers: {
            exactamente: { command: 'npx', args: ['-y', 'mcp-remote', endpoint] },
          },
        },
        null,
        2,
      ),
  },
  {
    name: 'Windsurf',
    path: '~/.codeium/windsurf/mcp_config.json',
    snippet: (endpoint) =>
      JSON.stringify({ mcpServers: { exactamente: { serverUrl: endpoint } } }, null, 2),
  },
  {
    name: 'Gemini CLI',
    path: '~/.gemini/settings.json',
    snippet: (endpoint) =>
      JSON.stringify({ mcpServers: { exactamente: { httpUrl: endpoint } } }, null, 2),
  },
  {
    name: 'Codex',
    path: '~/.codex/config.toml',
    snippet: (endpoint) => `[mcp_servers.exactamente]\nurl = "${endpoint}"\n`,
  },
];
