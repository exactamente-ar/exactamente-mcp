import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import path from "node:path";
import fs from "node:fs/promises";
import { exactamenteApiClient, toToolError } from "../lib/toolShared";
import { config } from "../config";

export const schema = {
  resourceId: z.string().min(1).describe("The resource UUID to download"),
};

export const metadata: ToolMetadata = {
  name: "download-resource",
  description: "Download a published resource file by its UUID",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    title: "Download resource",
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

    const resources = await exactamenteApiClient.listResources({ limit: 100 });
    let resource = resources.data.find((r) => r.id === resourceId);

    if (!resource && resources.totalPages && resources.totalPages > 1) {
      for (let page = 2; page <= resources.totalPages; page += 1) {
        const more = await exactamenteApiClient.listResources({ limit: 100, page });
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

    const response = await fetch(resource.fileUrl);

    if (!response.ok) {
      throw new Error(`Failed to download resource file: HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "application/octet-stream";

    const extensionMap: Record<string, string> = {
      "application/pdf": ".pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
      "application/msword": ".doc",
      "application/vnd.ms-excel": ".xls",
      "application/zip": ".zip",
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
      "text/plain": ".txt",
      "text/html": ".html",
    };
    const extension = extensionMap[contentType] || "";
    
    let filename = resource.title.replace(/[<>:"/\\|?*]/g, "_");
    if (extension && !filename.endsWith(extension)) {
      filename += extension;
    }

    const downloadsDir = path.resolve(config.downloadsDir);
    await fs.mkdir(downloadsDir, { recursive: true });

    const filePath = path.join(downloadsDir, filename);
    await fs.writeFile(filePath, buffer);

    return {
      content: [
        {
          type: "text",
          text: `Resource downloaded successfully\n\nTitle: ${resource.title}\nSize: ${arrayBuffer.byteLength} bytes\nFile path: ${filePath}\n\nThe file has been saved to your local filesystem at the path shown above.`,
        },
      ],
      structuredContent: {
        resourceId: resource.id,
        title: resource.title,
        type: resource.type,
        size: arrayBuffer.byteLength,
        contentType,
        filePath,
        filename,
        absolutePath: filePath,
      },
    };
  } catch (error) {
    throw toToolError(error);
  }
}
