import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import {
  clampLimit,
  createPaginationHints,
  formatPaginationSuffix,
  exactamenteApiClient,
  readOnlyAnnotations,
  toToolError,
} from "../lib/toolShared";

export const schema = {
  subjectId: z
    .string()
    .optional()
    .describe("Optional subject UUID filter. Use the subject id returned by search-subjects or get-subject."),
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
    const limit = clampLimit(args.limit);
    const response = await exactamenteApiClient.listResources({
      ...args,
      limit,
    });

    const nextActions = response.data.map((r) => ({
      tool: "download-resource",
      args: { resourceId: r.id, subjectId: r.subjectId },
      reason: `Download ${r.title}.`,
    }));
    const pagination = createPaginationHints(
      "list-resources",
      { ...args, limit },
      response.page,
      response.totalPages
    );
    const resourceList = response.data
      .map((r) => {
        const date = r.examYear
          ? ` ${r.examMonth ? `${r.examMonth}/` : ""}${r.examYear}`
          : "";
        const topic = r.topic ? ` tema ${r.topic}` : "";
        return `${r.id} — ${r.title} [subject ${r.subjectId}; ${r.subtype ?? r.type}${date}${topic}]`;
      })
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Found ${response.total ?? response.data.length} resources:\n${resourceList}${formatPaginationSuffix(response.page, response.totalPages)}`,
        },
      ],
      structuredContent: {
        ...response,
        agentHints: {
          nextActions,
          ...(pagination ? { pagination } : {}),
        },
      },
    };
  } catch (error) {
    throw toToolError(error);
  }
}
