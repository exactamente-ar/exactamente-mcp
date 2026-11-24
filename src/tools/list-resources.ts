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
  subjectId: z
    .string()
    .optional()
    .describe(
      'Only resources of this subject (subject id from search-subjects or find-subject-materials). Strongly recommended: without it the whole catalogue is listed.',
    ),
  type: z
    .enum(['resumen', 'parcial', 'final'])
    .optional()
    .describe('Resource type: resumen (summary), parcial (midterm exam) or final (final exam).'),
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
  name: 'list-resources',
  description:
    'List the published study resources of a subject: resúmenes (summaries), parciales (midterm exams) and finales (final exams), newest first. Use it to see or page through every resource of a known subject; to find materials by subject name in one step use find-subject-materials. Paginated (page, limit up to 50); returns each resource with its id, subjectId, title, type, exam date and topic, ready for download-resource.',
  annotations: {
    ...readOnlyAnnotations,
    title: 'List resources',
  },
};

export default async function listResources(args: InferSchema<typeof schema>) {
  try {
    const limit = clampLimit(args.limit);
    const response = await exactamenteApiClient.listResources({
      ...args,
      limit,
    });

    const nextActions = response.data.map((r) => ({
      tool: 'download-resource',
      args: { resourceId: r.id, subjectId: r.subjectId },
      reason: `Download ${r.title}.`,
    }));
    const pagination = createPaginationHints(
      'list-resources',
      { ...args, limit },
      response.page,
      response.totalPages,
    );
    const resourceList = response.data
      .map((r) => {
        const date = r.examYear ? ` ${r.examMonth ? `${r.examMonth}/` : ''}${r.examYear}` : '';
        const topic = r.topic ? ` tema ${r.topic}` : '';
        return `${r.id} — ${r.title} [subject ${r.subjectId}; ${r.subtype ?? r.type}${date}${topic}]`;
      })
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${response.total ?? response.data.length} resources:\n${resourceList}${formatPaginationSuffix(response.page, response.totalPages)}`,
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
