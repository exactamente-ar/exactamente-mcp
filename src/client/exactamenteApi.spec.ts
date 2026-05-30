import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, ExactamenteApiClient } from "./exactamenteApi";

describe("ExactamenteApiClient", () => {
  const client = new ExactamenteApiClient();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns universities list on success", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [{ id: "u1", name: "UNICEN", slug: "unicen", createdAt: "now" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

    const response = await client.listUniversities();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.data).toHaveLength(1);
    expect(response.data[0]?.name).toBe("UNICEN");
  });

  it("passes pagination filters to paginated endpoints", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () =>
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    await client.listUniversities({ page: 2, limit: 5 });
    await client.listFaculties({ universityId: "u1", page: 3, limit: 10 });

    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/v1/universities?page=2&limit=5");
    expect(fetchMock.mock.calls[1]?.[0]).toContain(
      "/api/v1/faculties?universityId=u1&page=3&limit=10"
    );
  });

  it("maps 429 to rate_limited error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(client.listResources({})).rejects.toMatchObject({
      code: "rate_limited",
      status: 429,
    } satisfies Partial<ApiClientError>);
  });

  it("maps 404 to not_found error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Materia no encontrada" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(client.getSubject("missing-subject")).rejects.toMatchObject({
      code: "not_found",
      status: 404,
    } satisfies Partial<ApiClientError>);
  });
});
