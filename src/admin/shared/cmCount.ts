/** Parse total count from Strapi CM or admin list JSON. */
export const parsePaginationTotal = (data: any): number => {
    const n =
        data?.pagination?.total ??
        data?.meta?.pagination?.total ??
        data?.data?.pagination?.total;
    const total = Number(n);
    return Number.isFinite(total) && total >= 0 ? total : 0;
};

export const authHeadersFromToken = (token: string): Record<string, string> =>
    token
        ? {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
          }
        : { Accept: 'application/json' };

/** GET a list URL and return pagination.total (use pageSize=1 for cheap counts). */
export const fetchPaginationTotal = async (
    url: string,
    headers: Record<string, string>
): Promise<number> => {
    const res = await fetch(url, { headers, credentials: 'include' });
    if (!res.ok) return 0;
    const data = await res.json();
    return parsePaginationTotal(data);
};

/** Content-Manager collection list base path. */
export const cmCollectionUrl = (uid: string, query = ''): string => {
    const q = query.startsWith('?') || query.startsWith('&') ? query.replace(/^&/, '?') : query;
    const base = `/content-manager/collection-types/${uid}`;
    if (!q) return `${base}?pageSize=1`;
    if (q.startsWith('?')) {
        return q.includes('pageSize=') ? `${base}${q}` : `${base}${q}&pageSize=1`;
    }
    return `${base}?pageSize=1&${q}`;
};
