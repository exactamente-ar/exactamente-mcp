import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import {
  clampLimit,
  exactamenteApiClient,
  readOnlyAnnotations,
  toToolError,
} from "../lib/toolShared";

export const schema = {
  page: z.number().int().min(1).optional().describe("Page number (starts at 1)"),
  limit: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Items per page (capped by server configuration)"),
};

export const metadata: ToolMetadata = {
  name: "list-universities",
  description: "List available universities from Exactamente",
  annotations: {
    ...readOnlyAnnotations,
    title: "List universities",
  },
};

export default async function listUniversities(
  args: InferSchema<typeof schema> = { page: undefined, limit: undefined }
) {
  try {
    const response = await exactamenteApiClient.listUniversities({
      ...args,
      limit: clampLimit(args.limit),
    });

    const list = response.data
      .map((u) => `${u.id} — ${u.shortName ?? u.name} (${u.name})`)
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Found ${response.total ?? response.data.length} universities:\n${list}`,
        },
      ],
      structuredContent: response,
    };
  } catch (error) {
    throw toToolError(error);
  }
}
