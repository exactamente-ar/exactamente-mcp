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
  careerId: z
    .string()
    .optional()
    .describe('Only subjects of this career (career id from list-careers).'),
  facultyId: z
    .string()
    .optional()
    .describe('Only subjects of this faculty (faculty id from list-faculties).'),
  year: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .describe('Year of the degree plan the subject belongs to, from 1 to 5.'),
  quadmester: z
    .number()
    .int()
    .min(1)
    .max(2)
    .optional()
    .describe('Cuatrimestre (half-year term) within that year: 1 or 2.'),
  search: z
    .string()
    .min(1)
    .optional()
    .describe('Free-text search over subject titles, e.g. "algebra" or "análisis matemático".'),
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
  name: 'search-subjects',
  description:
    'Search subjects (materias) by title text and/or filter them by career, faculty, year and cuatrimestre. Use it to find a subject id or to list the subjects of a career; to get a subject together with its materials in one call use find-subject-materials. All filters are optional and combinable; paginated (page, limit up to 50). Returns each subject with its id, year, careers and counts of resúmenes, parciales and finales.',
  annotations: {
    ...readOnlyAnnotations,
    title: 'Search subjects',
  },
};

export default async function searchSubjects(args: InferSchema<typeof schema>) {
  try {
    const limit = clampLimit(args.limit);
    const response = await exactamenteApiClient.listSubjects({
      ...args,
      limit,
    });

    const nextActions = response.data.flatMap((s) => [
      {
        tool: 'get-subject',
        args: { subjectId: s.id },
        reason: `Get detailed information for ${s.title}.`,
      },
      {
        tool: 'list-resources',
        args: { subjectId: s.id },
        reason: `List published resources for ${s.title}.`,
      },
      {
        tool: 'find-subject-materials',
        args: { subjectId: s.id },
        reason: `Get ${s.title} with its resources in one response.`,
      },
    ]);
    const pagination = createPaginationHints(
      'search-subjects',
      { ...args, limit },
      response.page,
      response.totalPages,
    );
    const subjectList = response.data
      .map((s) => {
        const counts = s.resourceCounts
          ? ` resources: resumen ${s.resourceCounts.resumen}, parcial ${s.resourceCounts.parcial}, final ${s.resourceCounts.final}`
          : ' resources: unknown';
        const careerNames = s.careers?.length
          ? `; careers: ${s.careers.map((c) => c.careerName).join(', ')}`
          : '';
        return `${s.id} — ${s.title} (${s.year}A${s.quadmester}; faculty ${s.facultyId};${counts}${careerNames})`;
      })
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${response.total ?? response.data.length} subjects:\n${subjectList}${formatPaginationSuffix(response.page, response.totalPages)}`,
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
