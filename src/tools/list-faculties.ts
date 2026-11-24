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
  universityId: z
    .string()
    .optional()
    .describe('Only faculties of this university (university id from list-universities).'),
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
  name: 'list-faculties',
  description:
    'List the faculties (facultades) on Exactamente, optionally only those of one university. Use it to resolve a faculty name into a facultyId for list-careers or search-subjects. Paginated (page, limit up to 50); returns each faculty with its id, name and short name.',
  annotations: {
    ...readOnlyAnnotations,
    title: 'List faculties',
  },
};

export default async function listFaculties(
  args: InferSchema<typeof schema> = {
    universityId: undefined,
    page: undefined,
    limit: undefined,
  },
) {
  try {
    const response = await exactamenteApiClient.listFaculties({
      universityId: args.universityId,
      page: args.page,
      limit: clampLimit(args.limit),
    });

    const nextActions = response.data.flatMap((f) => [
      {
        tool: 'list-careers',
        args: { facultyId: f.id },
        reason: `List careers for ${f.shortName ?? f.name}.`,
      },
      {
        tool: 'search-subjects',
        args: { facultyId: f.id },
        reason: `Search subjects from ${f.shortName ?? f.name}.`,
      },
    ]);
    const pagination = createPaginationHints(
      'list-faculties',
      {
        universityId: args.universityId,
        page: args.page,
        limit: clampLimit(args.limit),
      },
      response.page,
      response.totalPages,
    );
    const list = response.data
      .map((f) => `${f.id} — ${f.shortName ?? f.name} (${f.name})`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${response.total ?? response.data.length} faculties:\n${list}${formatPaginationSuffix(response.page, response.totalPages)}`,
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
