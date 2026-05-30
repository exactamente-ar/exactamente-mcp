import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import {
  exactamenteApiClient,
  readOnlyAnnotations,
  toToolError,
} from "../lib/toolShared";

export const schema = {
  careerId: z.string().min(1).describe("Career UUID"),
};

export const metadata: ToolMetadata = {
  name: "list-career-plans",
  description: "List available study plans for a career",
  annotations: {
    ...readOnlyAnnotations,
    title: "List career plans",
  },
};

export default async function listCareerPlans({
  careerId,
}: InferSchema<typeof schema>) {
  try {
    const response = await exactamenteApiClient.listCareerPlans(careerId);

    const list = response.data
      .map((plan) => `${plan.id} — ${plan.name} (${plan.year})`)
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Found ${response.data.length} career plans:\n${list}`,
        },
      ],
      structuredContent: response,
    };
  } catch (error) {
    throw toToolError(error);
  }
}
