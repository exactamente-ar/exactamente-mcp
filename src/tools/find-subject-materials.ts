import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { ApiClientError, type Resource, type Subject } from "../client/exactamenteApi";
import {
  clampLimit,
  exactamenteApiClient,
  readOnlyAnnotations,
  toToolError,
  type ToolNextAction,
} from "../lib/toolShared";

const DEFAULT_LIMIT = 5;

export const schema = {
  subjectId: z
    .string()
    .optional()
    .describe("Optional subject UUID. Use the subject id returned by search-subjects."),
  search: z
    .string()
    .min(1)
    .optional()
    .describe("Optional free text search over subject title."),
  careerId: z
    .string()
    .optional()
    .describe("Optional career UUID filter from list-careers."),
  facultyId: z
    .string()
    .optional()
    .describe("Optional faculty UUID filter from list-faculties."),
  year: z.number().int().min(1).max(5).optional().describe("Academic year (1-5)"),
  quadmester: z
    .number()
    .int()
    .min(1)
    .max(2)
    .optional()
    .describe("Academic quadmester (1-2)"),
  type: z
    .enum(["resumen", "parcial", "final"])
    .optional()
    .describe("Optional resource type filter."),
  limit: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Maximum subjects to inspect and maximum resources per subject."),
};

export const metadata: ToolMetadata = {
  name: "find-subject-materials",
  description:
    "Find subject candidates and their published resources in one read-only workflow",
  annotations: {
    ...readOnlyAnnotations,
    title: "Find subject materials",
  },
};

interface SubjectMaterials {
  subject: Subject;
  resources: Resource[];
  resourceTotal?: number;
  resourcePage?: number;
  resourceTotalPages?: number;
}

function validateSearchInput(args: InferSchema<typeof schema>) {
  if (args.subjectId || args.search || args.careerId || args.facultyId) return;

  throw new ApiClientError(
    "validation_error",
    "Provide at least one of subjectId, search, careerId or facultyId."
  );
}

function buildNextActions(results: SubjectMaterials[]): ToolNextAction[] {
  return results.flatMap((result) => {
    const subjectActions: ToolNextAction[] = [
      {
        tool: "get-subject",
        args: { subjectId: result.subject.id },
        reason: `Get detailed information for ${result.subject.title}.`,
      },
      {
        tool: "list-resources",
        args: { subjectId: result.subject.id },
        reason: `List all published resources for ${result.subject.title}.`,
      },
    ];

    const downloadActions = result.resources.slice(0, 5).map((resource) => ({
      tool: "download-resource",
      args: { resourceId: resource.id, subjectId: resource.subjectId },
      reason: `Download ${resource.title}.`,
    }));

    return [...subjectActions, ...downloadActions];
  });
}

function formatSubjectLine(result: SubjectMaterials): string {
  const counts = result.subject.resourceCounts
    ? `known counts: resumen ${result.subject.resourceCounts.resumen}, parcial ${result.subject.resourceCounts.parcial}, final ${result.subject.resourceCounts.final}`
    : "known counts: unavailable";
  const resources = result.resources.length
    ? result.resources
        .map((resource) => `${resource.id} ${resource.title} [${resource.type}]`)
        .join("; ")
    : "no matching resources";

  return `${result.subject.id} — ${result.subject.title} (${result.subject.year}A${result.subject.quadmester}; ${counts})\nResources: ${resources}`;
}

export default async function findSubjectMaterials(args: InferSchema<typeof schema>) {
  try {
    validateSearchInput(args);

    const limit = clampLimit(args.limit) ?? DEFAULT_LIMIT;
    const subjects = args.subjectId
      ? [await exactamenteApiClient.getSubject(args.subjectId).then((r) => r.subject)]
      : (
          await exactamenteApiClient.listSubjects({
            search: args.search,
            careerId: args.careerId,
            facultyId: args.facultyId,
            year: args.year,
            quadmester: args.quadmester,
            limit,
          })
        ).data;

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
      })
    );

    const totalResources = results.reduce(
      (total, result) => total + result.resources.length,
      0
    );
    const text = results.length
      ? results.map(formatSubjectLine).join("\n\n")
      : "No subjects matched the provided filters.";

    return {
      content: [
        {
          type: "text",
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
