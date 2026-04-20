import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import {
  exactamenteApiClient,
  readOnlyAnnotations,
  toToolError,
} from "../lib/toolShared";

export const schema = {
  facultyId: z
    .string()
    .optional()
    .describe("Optional faculty UUID to filter careers"),
};

export const metadata: ToolMetadata = {
  name: "list-careers",
  description: "List careers, optionally filtered by faculty",
  annotations: {
    ...readOnlyAnnotations,
    title: "List careers",
  },
};

export default async function listCareers({ facultyId }: InferSchema<typeof schema>) {
  try {
    const response = await exactamenteApiClient.listCareers(facultyId);

    const list = response.data.map((c) => `${c.id} — ${c.name}`).join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Found ${response.data.length} careers:\n${list}`,
        },
      ],
      structuredContent: response,
    };
  } catch (error) {
    throw toToolError(error);
  }
}
