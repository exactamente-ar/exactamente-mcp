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
    const careers = s.careers?.length
      ? s.careers
          .map((c) => `${c.careerName}, plan ${c.planId} (${c.year}A${c.quadmester})`)
          .join("; ")
      : "(sin carreras asociadas)";
    const details = `${s.id} — ${s.title}
Año: ${s.year}, Cuatrimestre: ${s.quadmester}
Slug: ${s.slug}
Carreras: ${careers}
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
