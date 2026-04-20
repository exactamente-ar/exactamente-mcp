import { z } from "zod";
import { type InferSchema, type ResourceMetadata } from "xmcp";
import { exactamenteApiClient, toToolError } from "../../../lib/toolShared";

export const schema = {
  subjectId: z.string().min(1).describe("Subject UUID"),
};

export const metadata: ResourceMetadata = {
  name: "subject-details",
  title: "Subject details",
  description: "Read-only subject details with prerequisites and correlatives",
  mimeType: "application/json",
};

export default async function details({ subjectId }: InferSchema<typeof schema>) {
  try {
    const response = await exactamenteApiClient.getSubject(subjectId);
    return JSON.stringify(response, null, 2);
  } catch (error) {
    throw toToolError(error);
  }
}
