import { type XmcpConfig } from "xmcp";

const config: XmcpConfig = {
  http: {
    host: process.env.XMCP_HTTP_HOST ?? "127.0.0.1",
    port: Number(process.env.XMCP_HTTP_PORT ?? 3001),
    endpoint: process.env.XMCP_HTTP_ENDPOINT ?? "/mcp",
    cors: {
      origin: process.env.XMCP_HTTP_CORS_ORIGIN ?? "*",
      methods: ["GET", "POST"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "mcp-session-id",
        "mcp-protocol-version",
      ],
      exposedHeaders: ["Content-Type", "Authorization", "mcp-session-id"],
      credentials: false,
      maxAge: 86400,
    },
  },
  stdio: {
    silent: true,
    debug: false,
  },
  paths: {
    tools: "src/tools",
    prompts: "src/prompts",
    resources: "src/resources",
  },
};

export default config;
