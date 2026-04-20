import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import {
  exactamenteApiClient,
  readOnlyAnnotations,
  toToolError,
} from "../lib/toolShared";

export const schema = {
  universityId: z
    .string()
    .optional()
    .describe("Optional university UUID to filter faculties"),
};

export const metadata: ToolMetadata = {
  name: "list-faculties",
  description: "List faculties, optionally filtered by university",
  annotations: {
    ...readOnlyAnnotations,
    title: "List faculties",
  },
};

export default async function listFaculties({
  universityId,
}: InferSchema<typeof schema>) {
  try {
    const response = await exactamenteApiClient.listFaculties(universityId);

    const list = response.data.map((f) => `${f.id} — ${f.name}`).join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Found ${response.data.length} faculties:\n${list}`,
        },
      ],
      structuredContent: response,
    };
  } catch (error) {
    throw toToolError(error);
  }
}
