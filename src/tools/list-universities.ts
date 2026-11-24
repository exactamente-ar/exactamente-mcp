import { z } from 'zod';
import { type InferSchema, type ToolMetadata } from 'xmcp';
import {
  clampLimit,
  createPaginationHints,
  formatPaginationSuffix,
  exactamenteApiClient,
  readOnlyAnnotations,
  toToolError,
} from '../lib/toolShared';

export const schema = {
  page: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      'Page number, starting at 1. Use agentHints.pagination.nextPageAction to get the next page.',
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Items per page, from 1 to 50 (larger values are capped at 50).'),
};

export const metadata: ToolMetadata = {
  name: 'list-universities',
  description:
    'List the Argentine universities that have materials on Exactamente. Use it as the first step when browsing by institution, to get a universityId for list-faculties. Paginated (page, limit up to 50); returns each university with its id, name and short name.',
  annotations: {
    ...readOnlyAnnotations,
    title: 'List universities',
  },
};

export default async function listUniversities(
  args: InferSchema<typeof schema> = { page: undefined, limit: undefined },
) {
  try {
    const response = await exactamenteApiClient.listUniversities({
      ...args,
      limit: clampLimit(args.limit),
    });

    const nextActions = response.data.map((u) => ({
      tool: 'list-faculties',
      args: { universityId: u.id },
      reason: `List faculties for ${u.shortName ?? u.name}.`,
    }));
    const pagination = createPaginationHints(
      'list-universities',
      { ...args, limit: clampLimit(args.limit) },
      response.page,
      response.totalPages,
    );
    const list = response.data
      .map((u) => `${u.id} — ${u.shortName ?? u.name} (${u.name})`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${response.total ?? response.data.length} universities:\n${list}${formatPaginationSuffix(response.page, response.totalPages)}`,
        },
      ],
      structuredContent: {
        ...response,
        agentHints: {
          nextActions,
          ...(pagination ? { pagination } : {}),
        },
      },
    };
  } catch (error) {
    throw toToolError(error);
  }
}
