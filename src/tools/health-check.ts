import { type ToolMetadata } from "xmcp";
import {
  exactamenteApiClient,
  readOnlyAnnotations,
  toToolError,
} from "../lib/toolShared";

export const metadata: ToolMetadata = {
  name: "health-check",
  description: "Check Exactamente backend health status",
  annotations: {
    ...readOnlyAnnotations,
    title: "Health check",
  },
};

export default async function healthCheck() {
  try {
    const health = await exactamenteApiClient.health();
    return {
      content: [{ type: "text", text: `Backend status: ${health.status}` }],
      structuredContent: {
        status: health.status,
        timestamp: health.timestamp,
        agentHints: {
          nextActions: [
            {
              tool: "list-universities",
              args: { limit: 5 },
              reason: "Verify the API can return public academic data.",
            },
          ],
        },
      },
    };
  } catch (error) {
    throw toToolError(error);
  }
}
