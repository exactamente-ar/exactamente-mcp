import { z } from "zod";
import { type InferSchema, type PromptMetadata } from "xmcp";

export const schema = {
  materia: z.string().optional().describe("Nombre o parte del nombre de la materia"),
  carrera: z.string().optional().describe("Nombre o id de carrera si el usuario lo da"),
  tipo: z
    .string()
    .optional()
    .describe("Tipo de recurso pedido: resumen, parcial o final"),
};

export const metadata: PromptMetadata = {
  name: "buscar-materiales-de-materia",
  title: "Buscar materiales de materia",
  description:
    "Guia al agente para encontrar recursos publicados de una materia de Exactamente.",
  role: "user",
};

export default function buscarMaterialesDeMateria(
  params: InferSchema<typeof schema>
) {
  const materia = params.materia ?? "<materia>";
  const tipo = params.tipo ?? "<resumen|parcial|final opcional>";

  return `Objetivo: encontrar materiales publicados para una materia de Exactamente.

Contexto del usuario:
- Materia: ${materia}
- Carrera: ${params.carrera ?? "no especificada"}
- Tipo de recurso: ${tipo}

Workflow recomendado:
1. Llama exactamente://meta si necesitas recordar el mapa de herramientas e IDs.
2. Si tienes subjectId, llama find-subject-materials con { subjectId, type? }.
3. Si solo tienes nombre de materia, llama find-subject-materials con { search: "${materia}", type?, limit: 5 }.
4. Si hay varias materias candidatas, usa careers, year, quadmester y resourceCounts para elegir; si sigue ambiguo, muestra las opciones al usuario.
5. Para ver todos los recursos de una materia, llama list-resources con { subjectId, type? }.
6. Para descargar, llama download-resource con { resourceId, subjectId }.

Regla de IDs: subjectId viene de search-subjects/find-subject-materials; resourceId viene de list-resources/find-subject-materials.`;
}
