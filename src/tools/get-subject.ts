import { z } from 'zod';
import { type InferSchema, type ToolMetadata } from 'xmcp';
import { exactamenteApiClient, readOnlyAnnotations, toToolError } from '../lib/toolShared';

export const schema = {
  subjectId: z.string().min(1).describe('Subject UUID'),
};

export const metadata: ToolMetadata = {
  name: 'get-subject',
  description: 'Get detailed information for one subject',
  annotations: {
    ...readOnlyAnnotations,
    title: 'Get subject details',
  },
};

export default async function getSubject({ subjectId }: InferSchema<typeof schema>) {
  try {
    const response = await exactamenteApiClient.getSubject(subjectId);

    const s = response.subject;
    const nextActions = [
      {
        tool: 'list-resources',
        args: { subjectId: s.id },
        reason: `List published resources for ${s.title}.`,
      },
    ];
    const careers = s.careers?.length
      ? s.careers
          .map((c) => `${c.careerName}, plan ${c.planId} (${c.year}A${c.quadmester})`)
          .join('; ')
      : '(sin carreras asociadas)';
    // `GET /subjects/:id` no devuelve `resourceCounts` — solo lo hace el
    // listado. Esto era un ternario sobre `s.resourceCounts` que SIEMPRE caía
    // en la rama de "desconocido"; el tipo lo tenía opcional y nadie lo notó
    // hasta que los tipos pasaron a generarse del contrato real.
    //
    // Se preserva la salida tal cual estaba. Para dar los conteros de verdad
    // hay que agregarlos al endpoint de detalle en el backend, o pedirlos con
    // list-resources.
    const resources = 'Recursos: desconocido (usá list-resources para contarlos)';
    const details = `${s.id} — ${s.title}
Año: ${s.year}, Cuatrimestre: ${s.quadmester}
Slug: ${s.slug}
Carreras: ${careers}
${resources}
Descripción: ${s.description?.slice(0, 200) || '(sin descripción)'}...`;

    return {
      content: [
        {
          type: 'text',
          text: details,
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
