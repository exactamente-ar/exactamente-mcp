import { type ToolMetadata } from "xmcp";
import {
  exactamenteApiClient,
  readOnlyAnnotations,
  toToolError,
} from "../lib/toolShared";

export const metadata: ToolMetadata = {
  name: "list-universities",
  description: "List available universities from Exactamente",
  annotations: {
    ...readOnlyAnnotations,
    title: "List universities",
  },
};

export default async function listUniversities() {
  try {
    const response = await exactamenteApiClient.listUniversities();

    const list = response.data.map((u) => `${u.id} — ${u.name}`).join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Found ${response.data.length} universities:\n${list}`,
        },
      ],
      structuredContent: response,
    };
  } catch (error) {
    throw toToolError(error);
  }
}
