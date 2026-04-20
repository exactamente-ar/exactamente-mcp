import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import {
  exactamenteApiClient,
  readOnlyAnnotations,
  toToolError,
} from "../lib/toolShared";

export const schema = {
  subjectId: z.string().min(1).describe("Subject UUID"),
};

export const metadata: ToolMetadata = {
  name: "get-subject",
  description: "Get detailed information for one subject",
  annotations: {
    ...readOnlyAnnotations,
    title: "Get subject details",
  },
};

export default async function getSubject({ subjectId }: InferSchema<typeof schema>) {
  try {
    const response = await exactamenteApiClient.getSubject(subjectId);

    const s = response.subject;
    const details = `${s.id} — ${s.title}
Año: ${s.year}, Cuatrimestre: ${s.quadmester}
Slug: ${s.slug}
Descripción: ${s.description?.slice(0, 200) || "(sin descripción)"}...`;

    return {
      content: [
        {
          type: "text",
          text: details,
        },
      ],
      structuredContent: response,
    };
  } catch (error) {
    throw toToolError(error);
  }
}
