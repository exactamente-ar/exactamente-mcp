import { describe, expect, it } from "vitest";
import { normalizeApiBaseUrl } from "./config";

describe("normalizeApiBaseUrl", () => {
  it("normalizes a valid API base URL", () => {
    expect(normalizeApiBaseUrl("https://api.exactamente.com.ar")).toBe(
      "https://api.exactamente.com.ar"
    );
    expect(normalizeApiBaseUrl("https://api.exactamente.com.ar/")).toBe(
      "https://api.exactamente.com.ar"
    );
  });

  it("accepts whitespace and shell-style quoted values", () => {
    expect(normalizeApiBaseUrl(' "https://api.exactamente.com.ar/" ')).toBe(
      "https://api.exactamente.com.ar"
    );
    expect(normalizeApiBaseUrl(" 'https://api.exactamente.com.ar/' ")).toBe(
      "https://api.exactamente.com.ar"
    );
  });

  it("rejects unsupported protocols", () => {
    expect(() => normalizeApiBaseUrl("ftp://api.exactamente.com.ar")).toThrow(
      "EXACTAMENTE_API_BASE_URL must use http or https"
    );
  });
});
