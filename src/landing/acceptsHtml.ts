export function acceptsHtml(accept: string | null): boolean {
  if (!accept) return false;

  for (const part of accept.split(',')) {
    const [rawType, ...params] = part.split(';');
    if (rawType.trim().toLowerCase() !== 'text/html') continue;

    const qParam = params
      .map((param) => param.trim().toLowerCase())
      .find((param) => param.startsWith('q='));
    if (!qParam) return true;

    const quality = Number(qParam.slice(2));
    if (Number.isFinite(quality) && quality > 0) return true;
  }

  return false;
}
