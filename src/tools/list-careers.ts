import { z } from 'zod';
import { type InferSchema, type ToolMetadata } from 'xmcp';
import { exactamenteApiClient, readOnlyAnnotations, toToolError } from '../lib/toolShared';

export const schema = {
  facultyId: z
    .string()
    .optional()
    .describe(
      'Only careers of this faculty (faculty id from list-faculties). Omit to list all careers.',
    ),
};

export const metadata: ToolMetadata = {
  name: 'list-careers',
  description:
    'List the careers (degree programs, e.g. Ingeniería en Sistemas) available on Exactamente, optionally only those of one faculty. Use it to resolve a career name into a careerId for search-subjects. Not paginated; returns each career with its id, name and short name.',
  annotations: {
    ...readOnlyAnnotations,
    title: 'List careers',
  },
};

export default async function listCareers({ facultyId }: InferSchema<typeof schema>) {
  try {
    const response = await exactamenteApiClient.listCareers(facultyId);

    const nextActions = response.data.map((c) => ({
      tool: 'search-subjects',
      args: { careerId: c.id },
      reason: `Search subjects for ${c.shortName ?? c.name}.`,
    }));
    const list = response.data
      .map((c) => `${c.id} — ${c.shortName ?? c.name} (${c.name})`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${response.data.length} careers:\n${list}`,
        },
      ],
      structuredContent: {
        ...response,
        agentHints: {
          nextActions,
        },
      },
    };
  } catch (error) {
    throw toToolError(error);
  }
}
