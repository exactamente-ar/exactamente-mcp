import { type ToolMetadata } from "xmcp";
import { exactamenteApiClient, ApiClientError } from "../client/exactamenteApi";
import { config } from "../config";

export const readOnlyAnnotations: ToolMetadata["annotations"] = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

export interface ToolNextAction {
  tool: string;
  args: Record<string, unknown>;
  reason: string;
}

export interface AgentHints {
  nextActions: ToolNextAction[];
  pagination?: {
    page?: number;
    totalPages?: number;
    nextPageAction?: ToolNextAction;
  };
}

export function clampLimit(limit: number | undefined): number | undefined {
  if (limit === undefined) return undefined;
  return Math.min(Math.max(1, limit), config.maxPageLimit);
}

export function createPaginationHints(
  tool: string,
  args: Record<string, unknown>,
  page?: number,
  totalPages?: number
): AgentHints["pagination"] | undefined {
  if (!page || !totalPages || page >= totalPages) return undefined;

  return {
    page,
    totalPages,
    nextPageAction: {
      tool,
      args: {
        ...args,
        page: page + 1,
      },
      reason: "Fetch the next page of results.",
    },
  };
}

export function formatPaginationSuffix(page?: number, totalPages?: number): string {
  if (!page || !totalPages || totalPages <= 1) return "";
  return `\nPage ${page} of ${totalPages}.`;
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
