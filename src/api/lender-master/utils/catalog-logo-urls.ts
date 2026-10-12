function mediaUrl(logo: unknown): string | null {
  if (!logo) return null;
  if (Array.isArray(logo)) return mediaUrl(logo[0]);
  if (typeof logo === 'object' && logo !== null && 'url' in logo) {
    const url = (logo as { url?: unknown }).url;
    return typeof url === 'string' && url.trim() ? url : null;
  }
  return null;
}

/** Logo URLs for the given lender codes. Missing logos are omitted. */
export async function logoUrlsByLenderCode(
  strapi: any,
  codes: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(codes.map((code) => String(code || '').trim()).filter(Boolean))];
  const map = new Map<string, string>();
  if (!unique.length) return map;

  try {
    const rows = await strapi.documents('api::lender-master.lenders-catalog').findMany({
      filters: { lenderCode: { $in: unique } },
      fields: ['lenderCode'],
      populate: { logo: true },
    });
    for (const row of rows || []) {
      const url = mediaUrl(row?.logo);
      if (row?.lenderCode && url) map.set(String(row.lenderCode), url);
    }
  } catch {
    strapi.log.warn('[lenders-catalog] logo lookup failed');
  }
  return map;
}

export async function withLenderLogos(strapi: any, lenders: any[]): Promise<any[]> {
  if (!Array.isArray(lenders) || lenders.length === 0) return lenders;
  const map = await logoUrlsByLenderCode(
    strapi,
    lenders.map((lender) => lender?.lenderCode)
  );
  return lenders.map((lender) => ({
    ...lender,
    logoUrl: map.get(String(lender?.lenderCode || '')) || null,
  }));
}
