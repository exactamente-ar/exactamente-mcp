import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import {
  clampLimit,
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
    const response = await exactamenteApiClient.listSubjects({
      ...args,
      limit: clampLimit(args.limit),
    });

    const subjectList = response.data
      .map((s) => `${s.id} — ${s.title} (${s.year}A${s.quadmester})`)
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Found ${response.total ?? response.data.length} subjects:\n${subjectList}`,
        },
      ],
      structuredContent: response,
    };
  } catch (error) {
    throw toToolError(error);
  }
}
