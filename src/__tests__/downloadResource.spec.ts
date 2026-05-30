import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("download-resource", () => {
  let downloadsDir = "";

  beforeEach(async () => {
    downloadsDir = await mkdtemp(path.join(os.tmpdir(), "exactamente-mcp-"));
    vi.stubEnv("EXACTAMENTE_DOWNLOADS_DIR", downloadsDir);
    vi.resetModules();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
    await rm(downloadsDir, { recursive: true, force: true });
  });

  it("is not annotated as read-only because it writes a local file", async () => {
    const { metadata } = await import("../tools/download-resource");

    expect(metadata.annotations?.readOnlyHint).toBe(false);
    expect(metadata.annotations?.idempotentHint).toBe(true);
    expect(metadata.annotations?.destructiveHint).toBe(false);
  });

  it("uses subjectId for lookup and writes deterministic filenames", async () => {
    const resourceId = "2d070fd6-ceab-4b5d-a5eb-1b936958bfeb";
    const fileUrl = "https://files.test/parcial.pdf";
    const { default: downloadResource } = await import("../tools/download-resource");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/api/v1/resources")) {
        expect(url).toContain("subjectId=A1C1M1");
        return new Response(
          JSON.stringify({
            data: [
              {
                id: resourceId,
                subjectId: "A1C1M1",
                title: "Parcial 2024",
                type: "parcial",
                subtype: "parcial",
                status: "published",
                examYear: 2024,
                examMonth: null,
                topic: null,
                createdAt: "now",
                fileUrl,
              },
            ],
            total: 1,
            page: 1,
            totalPages: 1,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url === fileUrl) {
        return new Response("pdf bytes", {
          status: 200,
          headers: { "Content-Type": "application/pdf" },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await downloadResource({
      resourceId,
      subjectId: "A1C1M1",
    });
    const structured = result.structuredContent as {
      filename: string;
      filePath: string;
      alreadyExisted: boolean;
      subjectId: string;
    };

    expect(structured.filename).toBe(`${resourceId}-Parcial 2024.pdf`);
    expect(structured.subjectId).toBe("A1C1M1");
    expect(structured.alreadyExisted).toBe(false);
    await expect(readFile(structured.filePath, "utf8")).resolves.toBe("pdf bytes");

    const secondResult = await downloadResource({
      resourceId,
      subjectId: "A1C1M1",
    });
    const secondStructured = secondResult.structuredContent as {
      alreadyExisted: boolean;
    };

    expect(secondStructured.alreadyExisted).toBe(true);
    expect(fetchMock.mock.calls.filter(([input]) => String(input) === fileUrl)).toHaveLength(1);
  });
});
