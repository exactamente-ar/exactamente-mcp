import { config } from "../config";

export type ApiErrorCode =
  | "validation_error"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "upstream_error";

export class ApiClientError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;

  constructor(code: ApiErrorCode, message: string, status?: number) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

interface ListResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  totalPages?: number;
}

export interface University {
  id: string;
  name: string;
  shortName?: string | null;
  slug: string;
  createdAt: string;
}

export interface Faculty {
  id: string;
  universityId: string;
  name: string;
  shortName?: string | null;
  slug: string;
  createdAt: string;
}

export interface Career {
  id: string;
  facultyId: string;
  name: string;
  shortName?: string | null;
  slug: string;
  createdAt: string;
}

export interface Subject {
  id: string;
  facultyId: string;
  title: string;
  slug: string;
  description?: string | null;
  urlMoodle?: string | null;
  urlPrograma?: string | null;
  year: number;
  quadmester: number;
  createdAt: string;
  updatedAt: string;
  careers?: Array<{
    careerId: string;
    careerName: string;
    facultyId: string;
    facultyName: string;
    universityId: string;
    universityName: string;
    planId: string;
    year: number;
    quadmester: number;
  }>;
}

export interface SubjectDetailsResponse {
  subject: Subject;
}

export interface Resource {
  id: string;
  subjectId: string;
  title: string;
  type: "resumen" | "parcial" | "final";
  subtype?: "parcial" | "recuperatorio" | "prefinal" | "parcialito" | null;
  status?: string;
  examYear?: number | null;
  examMonth?: number | null;
  topic?: number | null;
  notes?: string | null;
  downloadCount?: number;
  publishedAt?: string | null;
  createdAt: string;
  fileUrl?: string | null;
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
  type?: "resumen" | "parcial" | "final";
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
        (typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean")
      ) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function mapHttpError(status: number, message: string): ApiClientError {
  if (status === 400) return new ApiClientError("validation_error", message, status);
  if (status === 401) return new ApiClientError("unauthorized", message, status);
  if (status === 403) return new ApiClientError("forbidden", message, status);
  if (status === 404) return new ApiClientError("not_found", message, status);
  if (status === 429) return new ApiClientError("rate_limited", message, status);
  return new ApiClientError("upstream_error", message, status);
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
  private async request<T>(
    path: string,
    query?: object
  ): Promise<T> {
    const url = buildUrl(path, query);
    const attempts = Math.max(1, config.retryCount + 1);
    let latestError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
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
          (!(error instanceof ApiClientError) || error.code === "upstream_error");

        if (!shouldRetry) break;
        await wait(config.retryDelayMs);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (latestError instanceof ApiClientError) throw latestError;

    const reason =
      latestError instanceof Error ? latestError.message : "Unknown upstream failure";
    throw new ApiClientError("upstream_error", `Failed to call Exactamente API: ${reason}`);
  }

  health() {
    return this.request<{ status: string; timestamp: string }>("/health");
  }

  listUniversities(filters?: PaginationFilters) {
    return this.request<ListResponse<University>>("/api/v1/universities", filters);
  }

  listFaculties(filters?: PaginationFilters & { universityId?: string }) {
    return this.request<ListResponse<Faculty>>("/api/v1/faculties", filters);
  }

  listCareers(facultyId?: string) {
    return this.request<ListResponse<Career>>("/api/v1/careers", { facultyId });
  }

  listSubjects(filters: SubjectsFilters) {
    return this.request<ListResponse<Subject>>("/api/v1/subjects", filters);
  }

  getSubject(subjectId: string) {
    return this.request<SubjectDetailsResponse>(`/api/v1/subjects/${subjectId}`);
  }

  listResources(filters: ResourcesFilters) {
    return this.request<ListResponse<Resource>>("/api/v1/resources", filters);
  }
}

export const exactamenteApiClient = new ExactamenteApiClient();
