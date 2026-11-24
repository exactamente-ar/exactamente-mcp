import { z } from 'zod';
import { type InferSchema, type ToolMetadata } from 'xmcp';
import { ApiClientError, type Resource } from '../client/exactamenteApi';
import { exactamenteApiClient, toToolError } from '../lib/toolShared';

/**
 * El backend no tiene `GET /resources/:id` (solo `/:id/download`, que cuenta
 * la descarga y redirige). El recurso se busca paginando los de su materia,
 * por eso `subjectId` es obligatorio: sin él había que recorrer el catálogo
 * entero, una llamada al backend por cada 100 recursos.
 *
 * Con `MAX_LOOKUP_PAGES` páginas de `LOOKUP_PAGE_SIZE` se cubren 500 recursos
 * por materia, bastante más que la materia más cargada hoy.
 */
export const MAX_LOOKUP_PAGES = 5;
const LOOKUP_PAGE_SIZE = 100;

export const schema = {
  resourceId: z
    .string()
    .min(1)
    .describe(
      'Resource id (UUID) to download, taken from a list-resources or find-subject-materials result. Never pass a subject id here.',
    ),
  subjectId: z
    .string()
    .min(1)
    .describe(
      'Id of the subject the resource belongs to (the resource subjectId field in list-resources or find-subject-materials results). Required.',
    ),
};

export const metadata: ToolMetadata = {
  name: 'download-resource',
  description:
    'Get the public download URL of one published study resource (PDF of a parcial, final or resumen). Use it after list-resources or find-subject-materials, passing both the resource id and its subjectId from that result. Returns the resource title, type and a direct downloadUrl; it does not download or store anything itself.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    title: 'Get resource download URL',
  },
};

export default async function downloadResource(args: InferSchema<typeof schema>) {
  try {
    const resourceIdInput = args.resourceId as unknown;
    let resourceId: string;

    if (typeof resourceIdInput === 'string') {
      resourceId = resourceIdInput;
    } else if (resourceIdInput && typeof resourceIdInput === 'object') {
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
      throw new ApiClientError('validation_error', 'Missing resourceId parameter.');
    }

    // xmcp ya valida el schema; esto cubre llamadas directas al handler.
    if (!args.subjectId) {
      throw new ApiClientError(
        'validation_error',
        'Missing subjectId. Pass the subjectId returned with the resource by list-resources or find-subject-materials.',
      );
    }

    const filters = { subjectId: args.subjectId, limit: LOOKUP_PAGE_SIZE };
    let resource: Resource | undefined;

    for (let page = 1; page <= MAX_LOOKUP_PAGES; page += 1) {
      const response = await exactamenteApiClient.listResources({ ...filters, page });
      resource = response.data.find((r) => r.id === resourceId);
      if (resource || !response.totalPages || page >= response.totalPages) break;
    }

    if (!resource) {
      throw new ApiClientError(
        'not_found',
        `Resource ${resourceId} not found among the published resources of subject ${args.subjectId}.`,
      );
    }

    if (!resource.fileUrl) {
      throw new Error(`No file URL available for resource: ${resource.title}`);
    }

    return {
      content: [
        {
          type: 'text',
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
