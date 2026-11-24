import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('download-resource', () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('is annotated as read-only because it returns a URL without side effects', async () => {
    const { metadata } = await import('../tools/download-resource');

    expect(metadata.annotations?.readOnlyHint).toBe(true);
    expect(metadata.annotations?.idempotentHint).toBe(true);
    expect(metadata.annotations?.destructiveHint).toBe(false);
  });

  it('uses subjectId for lookup and returns download URL', async () => {
    const resourceId = '2d070fd6-ceab-4b5d-a5eb-1b936958bfeb';
    const fileUrl = 'https://files.test/parcial.pdf';
    const { default: downloadResource } = await import('../tools/download-resource');

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes('/api/v1/resources')) {
        expect(url).toContain('subjectId=A1C1M1');
        return new Response(
          JSON.stringify({
            data: [
              {
                id: resourceId,
                subjectId: 'A1C1M1',
                title: 'Parcial 2024',
                type: 'parcial',
                subtype: 'parcial',
                status: 'published',
                examYear: 2024,
                examMonth: null,
                topic: null,
                createdAt: 'now',
                fileUrl,
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

    const result = await downloadResource({
      resourceId,
      subjectId: 'A1C1M1',
    });
    const structured = result.structuredContent as {
      downloadUrl: string;
      subjectId: string;
      resourceId: string;
      title: string;
      type: string;
    };

    expect(structured.downloadUrl).toBe(fileUrl);
    expect(structured.subjectId).toBe('A1C1M1');
    expect(structured.resourceId).toBe(resourceId);
    expect(structured.title).toBe('Parcial 2024');
    expect(structured.type).toBe('parcial');
  });
  it('requires subjectId so a lookup never scans the whole catalogue', async () => {
    const { schema, default: downloadResource } = await import('../tools/download-resource');
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    expect(schema.subjectId.safeParse(undefined).success).toBe(false);
    await expect(downloadResource({ resourceId: 'r1', subjectId: '' } as never)).rejects.toThrow(
      '[validation_error]',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('caps how many pages of a subject it scans before giving up', async () => {
    const { default: downloadResource, MAX_LOOKUP_PAGES } =
      await import('../tools/download-resource');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify({ data: [], total: 5000, page: 1, totalPages: 50 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );

    await expect(downloadResource({ resourceId: 'missing', subjectId: 'A1C1M1' })).rejects.toThrow(
      '[not_found]',
    );
    expect(fetchMock).toHaveBeenCalledTimes(MAX_LOOKUP_PAGES);
    for (const call of fetchMock.mock.calls) {
      expect(String(call[0])).toContain('subjectId=A1C1M1');
    }
  });
});
