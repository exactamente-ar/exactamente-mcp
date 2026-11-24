import { z } from 'zod';
import { type InferSchema, type ToolMetadata } from 'xmcp';
import {
  ApiClientError,
  hasResourceCounts,
  type AnySubject,
  type Resource,
} from '../client/exactamenteApi';
import {
  clampLimit,
  exactamenteApiClient,
  readOnlyAnnotations,
  toToolError,
  type ToolNextAction,
} from '../lib/toolShared';

const DEFAULT_LIMIT = 5;
/**
 * Tope de materias por llamada: cada una dispara un `GET /resources` al
 * backend. Sin tope, `limit: 50` eran 51 requests por invocación.
 */
export const MAX_SUBJECT_FANOUT = 10;

export const schema = {
  subjectId: z
    .string()
    .optional()
    .describe(
      'Subject id from search-subjects. When given, the other subject filters are ignored and only that subject is returned.',
    ),
  search: z
    .string()
    .min(1)
    .optional()
    .describe('Free-text search over subject titles, e.g. "algebra" or "análisis matemático".'),
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
  type: z
    .enum(['resumen', 'parcial', 'final'])
    .optional()
    .describe('Resource type: resumen (summary), parcial (midterm exam) or final (final exam).'),
  limit: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      `Max resources returned per subject (default ${DEFAULT_LIMIT}, capped at 50). Also caps how many subjects are inspected, never more than ${MAX_SUBJECT_FANOUT}.`,
    ),
};

export const metadata: ToolMetadata = {
  name: 'find-subject-materials',
  description:
    'Search subjects and fetch their published study materials (parciales, finales, resúmenes) in a single call. This is the recommended starting point when the user asks for materials of a subject by name; use list-resources instead to page through every resource of one known subject. Requires at least one of subjectId, search, careerId or facultyId, and inspects at most 10 subjects. Returns each matching subject with its resources and resource counts.',
  annotations: {
    ...readOnlyAnnotations,
    title: 'Find subject materials',
  },
};

interface SubjectMaterials {
  // Puede venir del listado (con resourceCounts) o del detalle (sin él), según
  // se haya filtrado por subjectId o no. Ver la nota en exactamenteApi.ts.
  subject: AnySubject;
  resources: Resource[];
  resourceTotal?: number;
  resourcePage?: number;
  resourceTotalPages?: number;
}

function validateSearchInput(args: InferSchema<typeof schema>) {
  if (args.subjectId || args.search || args.careerId || args.facultyId) return;

  throw new ApiClientError(
    'validation_error',
    'Provide at least one of subjectId, search, careerId or facultyId.',
  );
}

function buildNextActions(results: SubjectMaterials[]): ToolNextAction[] {
  return results.flatMap((result) => {
    const subjectActions: ToolNextAction[] = [
      {
        tool: 'get-subject',
        args: { subjectId: result.subject.id },
        reason: `Get detailed information for ${result.subject.title}.`,
      },
      {
        tool: 'list-resources',
        args: { subjectId: result.subject.id },
        reason: `List all published resources for ${result.subject.title}.`,
      },
    ];

    const downloadActions = result.resources.slice(0, 5).map((resource) => ({
      tool: 'download-resource',
      args: { resourceId: resource.id, subjectId: resource.subjectId },
      reason: `Download ${resource.title}.`,
    }));

    return [...subjectActions, ...downloadActions];
  });
}

function formatSubjectLine(result: SubjectMaterials): string {
  const counts = hasResourceCounts(result.subject)
    ? `known counts: resumen ${result.subject.resourceCounts.resumen}, parcial ${result.subject.resourceCounts.parcial}, final ${result.subject.resourceCounts.final}`
    : 'known counts: unavailable';
  const resources = result.resources.length
    ? result.resources
        .map((resource) => `${resource.id} ${resource.title} [${resource.type}]`)
        .join('; ')
    : 'no matching resources';

  return `${result.subject.id} — ${result.subject.title} (${result.subject.year}A${result.subject.quadmester}; ${counts})\nResources: ${resources}`;
}

export default async function findSubjectMaterials(args: InferSchema<typeof schema>) {
  try {
    validateSearchInput(args);

    const limit = clampLimit(args.limit) ?? DEFAULT_LIMIT;
    const subjectLimit = Math.min(limit, MAX_SUBJECT_FANOUT);
    const subjects = args.subjectId
      ? [await exactamenteApiClient.getSubject(args.subjectId).then((r) => r.subject)]
      : (
          await exactamenteApiClient.listSubjects({
            search: args.search,
            careerId: args.careerId,
            facultyId: args.facultyId,
            year: args.year,
            quadmester: args.quadmester,
            limit: subjectLimit,
          })
        ).data.slice(0, subjectLimit);

    const results = await Promise.all(
      subjects.map(async (subject) => {
        const resources = await exactamenteApiClient.listResources({
          subjectId: subject.id,
          type: args.type,
          limit,
        });

        return {
          subject,
          resources: resources.data,
          resourceTotal: resources.total,
          resourcePage: resources.page,
          resourceTotalPages: resources.totalPages,
        };
      }),
    );

    const totalResources = results.reduce((total, result) => total + result.resources.length, 0);
    const text = results.length
      ? results.map(formatSubjectLine).join('\n\n')
      : 'No subjects matched the provided filters.';

    return {
      content: [
        {
          type: 'text',
          text: `Found ${results.length} subject candidates and ${totalResources} matching resources.\n${text}`,
        },
      ],
      structuredContent: {
        data: results,
        totalSubjects: results.length,
        resourceType: args.type,
        limit,
        agentHints: {
          nextActions: buildNextActions(results),
        },
      },
    };
  } catch (error) {
    throw toToolError(error);
  }
}
