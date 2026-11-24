import { afterEach, describe, expect, it, vi } from 'vitest';
import meta from '../resources/(exactamente)/meta';
import buscarMateriales, {
  metadata as buscarMaterialesMetadata,
  schema as buscarMaterialesSchema,
} from '../prompts/buscar-materiales-de-materia';
import descargarParcial, {
  metadata as descargarParcialMetadata,
  schema as descargarParcialSchema,
} from '../prompts/descargar-parcial';
import diagnosticarConexion, {
  metadata as diagnosticarConexionMetadata,
  schema as diagnosticarConexionSchema,
} from '../prompts/diagnosticar-conexion';
import explorarCarrera, {
  metadata as explorarCarreraMetadata,
  schema as explorarCarreraSchema,
} from '../prompts/explorar-carrera';
import findSubjectMaterials, { MAX_SUBJECT_FANOUT } from '../tools/find-subject-materials';
import searchSubjects from '../tools/search-subjects';
import * as downloadResourceTool from '../tools/download-resource';
import * as findSubjectMaterialsTool from '../tools/find-subject-materials';
import * as getSubjectTool from '../tools/get-subject';
import * as healthCheckTool from '../tools/health-check';
import * as listCareersTool from '../tools/list-careers';
import * as listFacultiesTool from '../tools/list-faculties';
import * as listResourcesTool from '../tools/list-resources';
import * as listUniversitiesTool from '../tools/list-universities';
import * as searchSubjectsTool from '../tools/search-subjects';

const allTools = [
  downloadResourceTool,
  findSubjectMaterialsTool,
  getSubjectTool,
  healthCheckTool,
  listCareersTool,
  listFacultiesTool,
  listResourcesTool,
  listUniversitiesTool,
  searchSubjectsTool,
];

const emptyFindSubjectMaterialsArgs = {
  subjectId: undefined,
  search: undefined,
  careerId: undefined,
  facultyId: undefined,
  year: undefined,
  quadmester: undefined,
  type: undefined,
  limit: undefined,
};

describe('exactamente meta resource', () => {
  it('describes the real agent-facing API surface', () => {
    const data = JSON.parse(meta()) as {
      tools: string[];
      prompts: string[];
      canonicalWorkflows: Array<{ name: string }>;
      domainModel: Record<string, string>;
      limitations: string[];
    };

    expect(data.tools).toContain('find-subject-materials');
    expect(data.tools).toContain('download-resource');
    expect(data.tools).not.toContain('list-career-plans');
    expect(data.prompts).toContain('buscar-materiales-de-materia');
    expect(data.canonicalWorkflows.length).toBeGreaterThan(0);
    expect(data.domainModel.subject).toContain('subjectId');
    expect(data.limitations.join(' ')).not.toContain('download-resource writes');
    expect(data.limitations.join(' ')).toContain('download-resource requires subjectId');
  });
});

describe('tool descriptions', () => {
  it.each(allTools.map((tool) => [tool.metadata.name, tool] as const))(
    '%s has a directory-quality description',
    (_name, tool) => {
      const description = tool.metadata.description ?? '';
      // Qué hace + cuándo usarla + qué devuelve: una línea no alcanza.
      expect(description.length).toBeGreaterThanOrEqual(150);
      expect(description.length).toBeLessThanOrEqual(600);
      expect(description).toMatch(/returns/i);
    },
  );

  it.each(allTools.map((tool) => [tool.metadata.name, tool] as const))(
    '%s documents every parameter',
    (_name, tool) => {
      const schema = ('schema' in tool ? tool.schema : {}) as Record<
        string,
        { description?: string }
      >;
      for (const [param, field] of Object.entries(schema)) {
        expect(field.description, `${param} needs a description`).toBeTruthy();
        expect(field.description!.length, `${param} description too short`).toBeGreaterThan(20);
      }
    },
  );
});

describe('agent prompts', () => {
  it('exposes workflow metadata and schemas', () => {
    expect(buscarMaterialesMetadata.name).toBe('buscar-materiales-de-materia');
    expect(descargarParcialMetadata.name).toBe('descargar-parcial');
    expect(explorarCarreraMetadata.name).toBe('explorar-carrera');
    expect(diagnosticarConexionMetadata.name).toBe('diagnosticar-conexion');

    expect(buscarMaterialesSchema.materia).toBeDefined();
    expect(descargarParcialSchema.materia).toBeDefined();
    expect(explorarCarreraSchema.carrera).toBeDefined();
    expect(diagnosticarConexionSchema).toEqual({});
  });

  it('guides agents toward the right tools and ids', () => {
    expect(
      buscarMateriales({
        materia: 'Algoritmos',
        carrera: undefined,
        tipo: 'parcial',
      }),
    ).toContain('find-subject-materials');
    expect(descargarParcial({ materia: 'A2C1M2', anio: '2024', tema: undefined })).toContain(
      'download-resource',
    );
    expect(
      explorarCarrera({
        universidad: undefined,
        facultad: undefined,
        carrera: 'C1',
      }),
    ).toContain('search-subjects');
    expect(diagnosticarConexion()).toContain('health-check');
  });
});

describe('find-subject-materials', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requires at least one subject discovery input', async () => {
    await expect(findSubjectMaterials(emptyFindSubjectMaterialsArgs)).rejects.toThrow(
      '[validation_error] Provide at least one',
    );
  });

  it('returns subject candidates with resources and next actions', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes('/api/v1/subjects')) {
        return new Response(
          JSON.stringify({
            data: [
              {
                id: 'A2C1M2',
                facultyId: 'FACET',
                title: 'Análisis y Diseño de Algoritmos 1',
                slug: 'analisis-y-diseno-de-algoritmos-1',
                year: 2,
                quadmester: 1,
                createdAt: 'now',
                updatedAt: 'now',
                resourceCounts: { resumen: 1, parcial: 1, final: 0 },
              },
            ],
            total: 1,
            page: 1,
            totalPages: 1,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.includes('/api/v1/resources')) {
        expect(url).toContain('subjectId=A2C1M2');
        expect(url).toContain('type=parcial');
        return new Response(
          JSON.stringify({
            data: [
              {
                id: 'r1',
                subjectId: 'A2C1M2',
                title: 'Parcial 2024',
                type: 'parcial',
                subtype: 'parcial',
                status: 'published',
                examYear: 2024,
                examMonth: null,
                topic: 1,
                createdAt: 'now',
                fileUrl: 'https://files.test/r1.pdf',
              },
            ],
            total: 1,
            page: 1,
            totalPages: 1,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await findSubjectMaterials({
      ...emptyFindSubjectMaterialsArgs,
      search: 'algoritmos',
      type: 'parcial',
      limit: 2,
    });
    const structured = result.structuredContent as {
      data: Array<{ subject: { id: string }; resources: Array<{ id: string }> }>;
      agentHints: { nextActions: Array<{ tool: string; args: Record<string, unknown> }> };
    };

    expect(structured.data[0]?.subject.id).toBe('A2C1M2');
    expect(structured.data[0]?.resources[0]?.id).toBe('r1');
    expect(structured.agentHints.nextActions).toContainEqual({
      tool: 'download-resource',
      args: { resourceId: 'r1', subjectId: 'A2C1M2' },
      reason: 'Download Parcial 2024.',
    });
  });
});

describe('find-subject-materials fan-out', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('never fetches resources for more than MAX_SUBJECT_FANOUT subjects', async () => {
    const subjects = Array.from({ length: 20 }, (_, i) => ({
      id: `S${i}`,
      facultyId: 'FACET',
      title: `Materia ${i}`,
      slug: `materia-${i}`,
      year: 1,
      quadmester: 1,
      createdAt: 'now',
      updatedAt: 'now',
      resourceCounts: { resumen: 0, parcial: 0, final: 0 },
    }));
    const subjectUrls: string[] = [];
    let resourceCalls = 0;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/v1/subjects')) {
        subjectUrls.push(url);
        return new Response(JSON.stringify({ data: subjects, total: 20, page: 1, totalPages: 1 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      resourceCalls += 1;
      return new Response(JSON.stringify({ data: [], total: 0, page: 1, totalPages: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const result = await findSubjectMaterials({
      ...emptyFindSubjectMaterialsArgs,
      search: 'materia',
      limit: 50,
    });

    expect(resourceCalls).toBe(MAX_SUBJECT_FANOUT);
    expect(subjectUrls[0]).toContain(`limit=${MAX_SUBJECT_FANOUT}`);
    expect((result.structuredContent as { totalSubjects: number }).totalSubjects).toBe(
      MAX_SUBJECT_FANOUT,
    );
  });
});

describe('search-subjects', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns resource counts and agent next actions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: 'A2C1M2',
              facultyId: 'FACET',
              title: 'Análisis y Diseño de Algoritmos 1',
              slug: 'analisis-y-diseno-de-algoritmos-1',
              year: 2,
              quadmester: 1,
              createdAt: 'now',
              updatedAt: 'now',
              careers: [{ careerName: 'Ing. en Sistemas' }],
              resourceCounts: { resumen: 5, parcial: 27, final: 39 },
            },
          ],
          total: 1,
          page: 1,
          totalPages: 1,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await searchSubjects({
      careerId: undefined,
      facultyId: undefined,
      year: undefined,
      quadmester: undefined,
      search: 'algoritmos',
      page: undefined,
      limit: 1,
    });
    const structured = result.structuredContent as {
      agentHints: { nextActions: Array<{ tool: string; args: Record<string, unknown> }> };
    };

    expect(result.content[0]?.text).toContain('parcial 27');
    expect(structured.agentHints.nextActions).toContainEqual({
      tool: 'list-resources',
      args: { subjectId: 'A2C1M2' },
      reason: 'List published resources for Análisis y Diseño de Algoritmos 1.',
    });
  });
});
