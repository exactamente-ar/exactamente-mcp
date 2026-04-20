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
