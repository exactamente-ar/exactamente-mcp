import { type ResourceMetadata } from "xmcp";
import { config } from "../../config";

export const metadata: ResourceMetadata = {
  name: "exactamente-meta",
  title: "Exactamente MCP metadata",
  description: "Server metadata and public API surface exposed through this MCP",
  mimeType: "application/json",
};

export default function meta() {
  return JSON.stringify(
    {
      apiBaseUrl: config.apiBaseUrl,
      purpose:
        "Read-only MCP for public Exactamente academic data. Guia para agentes: usar estas herramientas para explorar universidades, facultades, carreras, materias y recursos publicados.",
      domainModel: {
        university:
          "Institution. Its id is used as universityId in list-faculties.",
        faculty:
          "Academic unit. Its id is used as facultyId in list-careers and search-subjects.",
        career:
          "Degree/program. Its id is used as careerId in search-subjects.",
        subject:
          "Course/materia. Its id is used as subjectId in get-subject, list-resources, find-subject-materials and download-resource.",
        resource:
          "Published material. Its id is used as resourceId in download-resource.",
      },
      tools: [
        "health-check",
        "list-universities",
        "list-faculties",
        "list-careers",
        "search-subjects",
        "get-subject",
        "list-resources",
        "find-subject-materials",
        "download-resource",
      ],
      prompts: [
        "buscar-materiales-de-materia",
        "descargar-parcial",
        "explorar-carrera",
        "diagnosticar-conexion",
      ],
      canonicalWorkflows: [
        {
          name: "Buscar materiales de una materia",
          steps: [
            {
              tool: "search-subjects",
              args: { search: "algoritmos", limit: 5 },
              produces: "subject.id",
            },
            {
              tool: "list-resources",
              args: { subjectId: "<subject.id>", type: "parcial" },
              produces: "resource.id",
            },
            {
              tool: "download-resource",
              args: {
                resourceId: "<resource.id>",
                subjectId: "<subject.id>",
              },
              produces: "local file path",
            },
          ],
        },
        {
          name: "Workflow compacto para agentes",
          steps: [
            {
              tool: "find-subject-materials",
              args: { search: "analisis", type: "parcial", limit: 5 },
              produces: "subjects with matching resources and nextActions",
            },
          ],
        },
        {
          name: "Explorar una carrera",
          steps: [
            { tool: "list-universities", args: { limit: 10 } },
            {
              tool: "list-faculties",
              args: { universityId: "<university.id>" },
            },
            { tool: "list-careers", args: { facultyId: "<faculty.id>" } },
            { tool: "search-subjects", args: { careerId: "<career.id>" } },
          ],
        },
      ],
      pagination:
        "List tools accept page and limit. If totalPages is greater than page, call the same tool with page + 1. Limits are capped by server configuration.",
      limitations: [
        "This MCP does not mutate upstream Exactamente data.",
        "download-resource writes a file to the local downloads directory, so it is not read-only.",
        "There is no direct backend endpoint for get-resource; download-resource looks up resources through list-resources.",
      ],
      notes:
        "Prefer structuredContent and agentHints.nextActions over parsing human-readable text.",
    },
    null,
    2
  );
}
