import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { exactamenteApiClient, toToolError } from "../lib/toolShared";

export const schema = {
  resourceId: z
    .string()
    .min(1)
    .describe("The resource UUID to download. Use the id returned by list-resources."),
  subjectId: z
    .string()
    .optional()
    .describe("Optional subject UUID hint from list-resources. When provided, lookup is faster."),
};

export const metadata: ToolMetadata = {
  name: "download-resource",
  description: "Get the download URL for a published resource file by its UUID",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    title: "Get resource download URL",
  },
};

export default async function downloadResource(args: InferSchema<typeof schema>) {
  try {
    const resourceIdInput = args.resourceId as unknown;
    let resourceId: string;

    if (typeof resourceIdInput === "string") {
      resourceId = resourceIdInput;
    } else if (resourceIdInput && typeof resourceIdInput === "object") {
      const obj = resourceIdInput as { id?: string };
      if (obj.id) {
        resourceId = obj.id;
      } else {
        resourceId = JSON.stringify(resourceIdInput);
      }
    } else {
      resourceId = String(resourceIdInput);
    }

    if (!resourceId) {
      throw new Error("Missing resourceId parameter");
    }

    const baseResourceFilters = args.subjectId
      ? { subjectId: args.subjectId, limit: 100 }
      : { limit: 100 };
    const resources = await exactamenteApiClient.listResources(baseResourceFilters);
    let resource = resources.data.find((r) => r.id === resourceId);

    if (!resource && resources.totalPages && resources.totalPages > 1) {
      for (let page = 2; page <= resources.totalPages; page += 1) {
        const more = await exactamenteApiClient.listResources({
          ...baseResourceFilters,
          page,
        });
        resource = more.data.find((r) => r.id === resourceId);
        if (resource) break;
      }
    }

    if (!resource) {
      throw new Error(`Resource not found: ${resourceId}`);
    }

    if (!resource.fileUrl) {
      throw new Error(`No file URL available for resource: ${resource.title}`);
    }

    return {
      content: [
        {
          type: "text",
          text: `Resource: ${resource.title}\nType: ${resource.type}\nDownload URL: ${resource.fileUrl}`,
        },
      ],
      structuredContent: {
        resourceId: resource.id,
        subjectId: resource.subjectId,
        title: resource.title,
        type: resource.type,
        downloadUrl: resource.fileUrl,
      },
    };
  } catch (error) {
    throw toToolError(error);
  }
}
