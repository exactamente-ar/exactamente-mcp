import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import {
  clampLimit,
  exactamenteApiClient,
  readOnlyAnnotations,
  toToolError,
} from "../lib/toolShared";

export const schema = {
  subjectId: z.string().optional().describe("Optional subject UUID filter"),
  type: z
    .enum(["resumen", "parcial", "final"])
    .optional()
    .describe("Optional resource type filter"),
  page: z.number().int().min(1).optional().describe("Page number (starts at 1)"),
  limit: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Items per page (capped by server configuration)"),
};

export const metadata: ToolMetadata = {
  name: "list-resources",
  description: "List published resources, optionally filtered by subject or type",
  annotations: {
    ...readOnlyAnnotations,
    title: "List resources",
  },
};

export default async function listResources(args: InferSchema<typeof schema>) {
  try {
    const response = await exactamenteApiClient.listResources({
      ...args,
      limit: clampLimit(args.limit),
    });

    const resourceList = response.data
      .map((r) => `${r.id} — ${r.title}`)
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Found ${response.total ?? response.data.length} resources:\n${resourceList}`,
        },
      ],
      structuredContent: response,
    };
  } catch (error) {
    throw toToolError(error);
  }
}
