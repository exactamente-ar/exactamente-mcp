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
  careerId: z.string().optional().describe("Optional career UUID filter"),
  facultyId: z.string().optional().describe("Optional faculty UUID filter"),
  year: z.number().int().min(1).max(5).optional().describe("Academic year (1-5)"),
  quadmester: z
    .number()
    .int()
    .min(1)
    .max(2)
    .optional()
    .describe("Academic quadmester (1-2)"),
  search: z
    .string()
    .min(1)
    .optional()
    .describe("Free text search over subject title"),
  page: z.number().int().min(1).optional().describe("Page number (starts at 1)"),
  limit: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Items per page (capped by server configuration)"),
};

export const metadata: ToolMetadata = {
  name: "search-subjects",
  description: "Search and filter subjects by career, faculty, year and text",
  annotations: {
    ...readOnlyAnnotations,
    title: "Search subjects",
  },
};

export default async function searchSubjects(args: InferSchema<typeof schema>) {
  try {
    const limit = clampLimit(args.limit);
    const response = await exactamenteApiClient.listSubjects({
      ...args,
      limit,
    });

    const nextActions = response.data.flatMap((s) => [
      {
        tool: "get-subject",
        args: { subjectId: s.id },
        reason: `Get detailed information for ${s.title}.`,
      },
      {
        tool: "list-resources",
        args: { subjectId: s.id },
        reason: `List published resources for ${s.title}.`,
      },
      {
        tool: "find-subject-materials",
        args: { subjectId: s.id },
        reason: `Get ${s.title} with its resources in one response.`,
      },
    ]);
    const pagination = createPaginationHints(
      "search-subjects",
      { ...args, limit },
      response.page,
      response.totalPages
    );
    const subjectList = response.data
      .map((s) => {
        const counts = s.resourceCounts
          ? ` resources: resumen ${s.resourceCounts.resumen}, parcial ${s.resourceCounts.parcial}, final ${s.resourceCounts.final}`
          : " resources: unknown";
        const careerNames = s.careers?.length
          ? `; careers: ${s.careers.map((c) => c.careerName).join(", ")}`
          : "";
        return `${s.id} — ${s.title} (${s.year}A${s.quadmester}; faculty ${s.facultyId};${counts}${careerNames})`;
      })
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Found ${response.total ?? response.data.length} subjects:\n${subjectList}${formatPaginationSuffix(response.page, response.totalPages)}`,
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
