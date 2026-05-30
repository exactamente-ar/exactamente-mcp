import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import {
  clampLimit,
  exactamenteApiClient,
  readOnlyAnnotations,
  toToolError,
} from "../lib/toolShared";

export const schema = {
  universityId: z
    .string()
    .optional()
    .describe("Optional university UUID to filter faculties"),
  page: z.number().int().min(1).optional().describe("Page number (starts at 1)"),
  limit: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Items per page (capped by server configuration)"),
};

export const metadata: ToolMetadata = {
  name: "list-faculties",
  description: "List faculties, optionally filtered by university",
  annotations: {
    ...readOnlyAnnotations,
    title: "List faculties",
  },
};

export default async function listFaculties(
  args: InferSchema<typeof schema> = {
    universityId: undefined,
    page: undefined,
    limit: undefined,
  }
) {
  try {
    const response = await exactamenteApiClient.listFaculties({
      universityId: args.universityId,
      page: args.page,
      limit: clampLimit(args.limit),
    });

    const list = response.data
      .map((f) => `${f.id} — ${f.shortName ?? f.name} (${f.name})`)
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Found ${response.total ?? response.data.length} faculties:\n${list}`,
        },
      ],
      structuredContent: response,
    };
  } catch (error) {
    throw toToolError(error);
  }
}
