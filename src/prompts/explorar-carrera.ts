import { z } from "zod";
import { type InferSchema, type PromptMetadata } from "xmcp";

export const schema = {
  universidad: z.string().optional().describe("Nombre o id de universidad"),
  facultad: z.string().optional().describe("Nombre o id de facultad"),
  carrera: z.string().optional().describe("Nombre o id de carrera"),
};

export const metadata: PromptMetadata = {
  name: "explorar-carrera",
  title: "Explorar carrera",
  description:
    "Guia al agente para navegar universidad, facultad, carrera y materias.",
  role: "user",
};

export default function explorarCarrera(params: InferSchema<typeof schema>) {
  return `Objetivo: explorar una carrera y sus materias en Exactamente.

Datos del usuario:
- Universidad: ${params.universidad ?? "no especificada"}
- Facultad: ${params.facultad ?? "no especificada"}
- Carrera: ${params.carrera ?? "no especificada"}

Workflow recomendado:
1. Llama list-universities para obtener universityId si no lo tienes.
2. Llama list-faculties con { universityId } para obtener facultyId.
3. Llama list-careers con { facultyId } para obtener careerId.
4. Llama search-subjects con { careerId } y, si corresponde, year o quadmester.
5. Para materiales de una materia concreta, usa find-subject-materials o list-resources con subjectId.

Usa agentHints.nextActions de cada respuesta para encadenar el siguiente paso.`;
}
