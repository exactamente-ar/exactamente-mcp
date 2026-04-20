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
      },
    };
  } catch (error) {
    throw toToolError(error);
  }
}
