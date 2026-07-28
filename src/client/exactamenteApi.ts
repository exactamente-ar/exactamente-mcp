import { config } from '../config';

export type ApiErrorCode =
  | 'validation_error'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'upstream_error';

export class ApiClientError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;

  constructor(code: ApiErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
  }
}

import type { components } from '../types/api';

/**
 * Los tipos del contrato vienen GENERADOS del OpenAPI del backend
 * (`pnpm gen:api`). No se escriben a mano: si el backend cambia un campo,
 * este repo deja de compilar hasta regenerar, que es exactamente la idea.
 *
 * Antes eran interfaces propias con casi todo opcional — la forma de escribir
 * tipos cuando no confiás en el contrato. A `Resource`, por ejemplo, le
 * faltaba `examDay`.
 */
type Schemas = components['schemas'];

export type University = Schemas['University'];
export type Faculty = Schemas['Faculty'];
export type Career = Schemas['Career'];
export type Resource = Schemas['Resource'];

/**
 * ⚠️ Dos formas distintas de materia, según de dónde venga:
 *
 *   GET /subjects      → Subject        · incluye `resourceCounts`
 *   GET /subjects/:id  → SubjectDetail  · NO lo incluye
 *
 * No es un capricho del tipado: el backend devuelve cosas distintas. Antes esto
 * era una sola interface con `resourceCounts?` opcional, y por eso nadie notó
 * que `get-subject` leía un campo que ese endpoint nunca manda.
 */
export type Subject = Schemas['SubjectWithCareers'];
export type SubjectDetail = Schemas['SubjectDetail'];
export type AnySubject = Subject | SubjectDetail;

export type SubjectDetailsResponse = { subject: SubjectDetail };

/** Narrowing para el código que acepta cualquiera de las dos formas. */
export function hasResourceCounts(subject: AnySubject): subject is Subject {
  return 'resourceCounts' in subject;
}

/**
 * Envoltorio de las listas. `total`, `page` y `totalPages` son opcionales
 * porque `GET /careers` no pagina y devuelve `{ data }` a secas — ver la nota
 * en los schemas del backend.
 */
interface ListResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  totalPages?: number;
}

export interface PaginationFilters {
  page?: number;
  limit?: number;
}

export interface SubjectsFilters {
  careerId?: string;
  facultyId?: string;
  year?: number;
  quadmester?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ResourcesFilters {
  subjectId?: string;
  type?: 'resumen' | 'parcial' | 'final';
  page?: number;
  limit?: number;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildUrl(path: string, query?: object): string {
  const url = new URL(path, config.apiBaseUrl);
  if (query) {
    for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
      if (
        value !== undefined &&
        (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
      ) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function mapHttpError(status: number, message: string): ApiClientError {
  if (status === 400) return new ApiClientError('validation_error', message, status);
  if (status === 401) return new ApiClientError('unauthorized', message, status);
  if (status === 403) return new ApiClientError('forbidden', message, status);
  if (status === 404) return new ApiClientError('not_found', message, status);
  if (status === 429) return new ApiClientError('rate_limited', message, status);
  return new ApiClientError('upstream_error', message, status);
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string; message?: string };
    return data.error ?? data.message ?? `Upstream returned HTTP ${response.status}`;
  } catch {
    return `Upstream returned HTTP ${response.status}`;
  }
}

export class ExactamenteApiClient {
  private async request<T>(path: string, query?: object): Promise<T> {
    const url = buildUrl(path, query);
    const attempts = Math.max(1, config.retryCount + 1);
    let latestError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          const message = await parseErrorMessage(response);
          throw mapHttpError(response.status, message);
        }

        return (await response.json()) as T;
      } catch (error) {
        latestError = error;
        const shouldRetry =
          attempt < attempts &&
          (!(error instanceof ApiClientError) || error.code === 'upstream_error');

        if (!shouldRetry) break;
        await wait(config.retryDelayMs);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (latestError instanceof ApiClientError) throw latestError;

    const reason = latestError instanceof Error ? latestError.message : 'Unknown upstream failure';
    throw new ApiClientError('upstream_error', `Failed to call Exactamente API: ${reason}`);
  }

  health() {
    return this.request<{ status: string; timestamp: string }>('/health');
  }

  listUniversities(filters?: PaginationFilters) {
    return this.request<ListResponse<University>>('/api/v1/universities', filters);
  }

  listFaculties(filters?: PaginationFilters & { universityId?: string }) {
    return this.request<ListResponse<Faculty>>('/api/v1/faculties', filters);
  }

  listCareers(facultyId?: string) {
    return this.request<ListResponse<Career>>('/api/v1/careers', { facultyId });
  }

  listSubjects(filters: SubjectsFilters) {
    return this.request<ListResponse<Subject>>('/api/v1/subjects', filters);
  }

  getSubject(subjectId: string) {
    return this.request<SubjectDetailsResponse>(`/api/v1/subjects/${subjectId}`);
  }

  listResources(filters: ResourcesFilters) {
    return this.request<ListResponse<Resource>>('/api/v1/resources', filters);
  }
}

export const exactamenteApiClient = new ExactamenteApiClient();
