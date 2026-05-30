import { z } from "zod";
import { type InferSchema, type PromptMetadata } from "xmcp";

export const schema = {
  materia: z.string().optional().describe("Nombre, subjectId o pista de materia"),
  anio: z.string().optional().describe("Año del parcial si el usuario lo da"),
  tema: z.string().optional().describe("Tema del parcial si el usuario lo da"),
};

export const metadata: PromptMetadata = {
  name: "descargar-parcial",
  title: "Descargar parcial",
  description:
    "Guia al agente para encontrar y descargar un parcial publicado.",
  role: "user",
};

export default function descargarParcial(params: InferSchema<typeof schema>) {
  return `Objetivo: descargar un parcial publicado de Exactamente.

Datos del usuario:
- Materia o subjectId: ${params.materia ?? "no especificado"}
- Año: ${params.anio ?? "no especificado"}
- Tema: ${params.tema ?? "no especificado"}

Workflow recomendado:
1. Si no tienes subjectId, usa find-subject-materials con search de la materia y type "parcial".
2. Si ya tienes subjectId, usa list-resources con { subjectId, type: "parcial" }.
3. Filtra por examYear, topic, title o notes cuando el usuario haya pedido año/tema.
4. Descarga con download-resource usando { resourceId, subjectId }.
5. Informa al usuario el title, filePath, size y si alreadyExisted era true.

No uses subjectId como resourceId. resourceId siempre es el id del recurso listado.`;
}
