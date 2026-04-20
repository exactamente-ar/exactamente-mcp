import { type ToolMetadata } from "xmcp";
import { exactamenteApiClient, ApiClientError } from "../client/exactamenteApi";
import { config } from "../config";

export const readOnlyAnnotations: ToolMetadata["annotations"] = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

export function clampLimit(limit: number | undefined): number | undefined {
  if (limit === undefined) return undefined;
  return Math.min(Math.max(1, limit), config.maxPageLimit);
}

export function toToolError(error: unknown): Error {
  if (error instanceof ApiClientError) {
    return new Error(`[${error.code}] ${error.message}`);
  }

  if (error instanceof Error) {
    return new Error(`[upstream_error] ${error.message}`);
  }

  return new Error("[upstream_error] Unknown error");
}

export { exactamenteApiClient };
