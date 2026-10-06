/**
 * Super-Admin impersonation: issue admin session tokens for an Approved advisor's admin user.
 */

import crypto from 'crypto';

const REFRESH_COOKIE_NAME = 'strapi_admin_refresh';

const isSuperAdminUser = (user: { roles?: Array<{ code?: string; name?: string }> } | null): boolean => {
  if (!user?.roles?.length) return false;
  return user.roles.some((r) => {
    const code = String(r.code || '').toLowerCase();
    const name = String(r.name || '').toLowerCase();
    return (
      code === 'strapi-super-admin' ||
      code.includes('super-admin') ||
      name === 'super admin' ||
      name.includes('super admin')
    );
  });
};

const getRefreshCookieOptions = (secureRequest: boolean) => {
  const configuredSecure = strapi.config.get('admin.auth.cookie.secure');
  const isProduction = process.env.NODE_ENV === 'production';
  const domain =
    strapi.config.get('admin.auth.cookie.domain') || strapi.config.get('admin.auth.domain');
  const path = strapi.config.get('admin.auth.cookie.path', '/admin');
  const sameSite = strapi.config.get('admin.auth.cookie.sameSite') ?? 'lax';
  const isSecure =
    typeof configuredSecure === 'boolean'
      ? configuredSecure
      : isProduction && secureRequest;

  return {
    httpOnly: true,
    secure: isSecure,
    overwrite: true,
    domain,
    path,
    sameSite,
    maxAge: undefined as number | undefined,
  };
};

const buildCookieOptionsWithExpiry = (
  type: 'refresh' | 'session',
  absoluteExpiresAtISO: string | undefined,
  secureRequest: boolean
) => {
  const base = getRefreshCookieOptions(secureRequest);
  if (type === 'session') return base;

  const idleSeconds = Number(
    strapi.config.get('admin.auth.sessions.idleRefreshTokenLifespan', 14 * 24 * 60 * 60)
  );
  const now = Date.now();
  const idleExpiry = now + idleSeconds * 1000;
  const absoluteExpiry = absoluteExpiresAtISO
    ? new Date(absoluteExpiresAtISO).getTime()
    : idleExpiry;
  const chosen = new Date(Math.min(idleExpiry, absoluteExpiry));
  return {
    ...base,
    expires: chosen,
    maxAge: Math.max(0, chosen.getTime() - now),
  };
};

export const resolveCallerAdminFromBearer = async (
  strapi: any,
  authorizationHeader: string | undefined
): Promise<{ ok: true; user: any } | { ok: false; status: number; error: string }> => {
  const auth = String(authorizationHeader || '');
  if (!auth.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  const token = auth.slice(7).trim();
  if (!token) return { ok: false, status: 401, error: 'Unauthorized' };

  const manager = strapi.sessionManager;
  if (!manager?.('admin')?.validateAccessToken) {
    return { ok: false, status: 500, error: 'Session manager unavailable' };
  }

  const result = manager('admin').validateAccessToken(token);
  if (!result?.isValid) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const isActive = await manager('admin').isSessionActive(result.payload.sessionId);
  if (!isActive) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const rawUserId = result.payload.userId;
  const numericUserId = Number(rawUserId);
  const userId =
    Number.isFinite(numericUserId) && String(numericUserId) === String(rawUserId)
      ? numericUserId
      : rawUserId;

  const user = await strapi.db.query('admin::user').findOne({
    where: { id: userId },
    populate: ['roles'],
  });

  if (!user || user.isActive !== true) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  return { ok: true, user };
};

export const impersonateAdvisorAsAdmin = async (
  strapi: any,
  opts: {
    caller: any;
    advisorId?: number | string;
    documentId?: string;
    deviceId?: string;
    rememberMe?: boolean;
    secureRequest?: boolean;
  }
): Promise<
  | { ok: true; accessToken: string; refreshToken: string; cookieOptions: Record<string, unknown>; user: any }
  | { ok: false; status: number; error: string }
> => {
  if (!isSuperAdminUser(opts.caller)) {
    return { ok: false, status: 403, error: 'Only Super Admin can login as Advisor' };
  }

  let advisor: any = null;
  if (opts.documentId) {
    advisor = await strapi.db.query('api::advisor.advisor').findOne({
      where: { documentId: opts.documentId },
    });
  }
  if (!advisor && opts.advisorId != null && String(opts.advisorId).trim() !== '') {
    const idNum = Number(opts.advisorId);
    if (Number.isFinite(idNum)) {
      advisor = await strapi.db.query('api::advisor.advisor').findOne({
        where: { id: idNum },
      });
    }
    if (!advisor) {
      advisor = await strapi.db.query('api::advisor.advisor').findOne({
        where: { advisorId: String(opts.advisorId) },
      });
    }
  }

  if (!advisor) {
    return { ok: false, status: 404, error: 'Advisor not found' };
  }

  if (advisor.advisorStatus !== 'Approved') {
    return { ok: false, status: 422, error: 'Advisor is not Approved' };
  }

  const email = String(advisor.email || '').trim().toLowerCase();
  if (!email) {
    return { ok: false, status: 422, error: 'Advisor email missing' };
  }

  const adminUser = await strapi.db.query('admin::user').findOne({
    where: { email: { $eqi: email } },
    populate: ['roles'],
  });

  if (!adminUser || adminUser.isActive !== true) {
    return {
      ok: false,
      status: 422,
      error: 'No active admin account for this advisor. Ensure the advisor is Approved.',
    };
  }

  const hasAdvisorRole = (adminUser.roles || []).some((r: any) => {
    const code = String(r.code || '').toLowerCase();
    const name = String(r.name || '').toLowerCase();
    return code === 'strapi-advisor' || name === 'advisor';
  });
  if (!hasAdvisorRole) {
    return { ok: false, status: 422, error: 'Admin account does not have the Advisor role' };
  }

  const manager = strapi.sessionManager;
  if (!manager) {
    return { ok: false, status: 500, error: 'Session manager unavailable' };
  }

  const deviceId = opts.deviceId || crypto.randomUUID();
  const rememberMe = Boolean(opts.rememberMe);
  const userId = String(adminUser.id);

  const { token: refreshToken, absoluteExpiresAt } = await manager('admin').generateRefreshToken(
    userId,
    deviceId,
    { type: rememberMe ? 'refresh' : 'session' }
  );

  const accessResult = await manager('admin').generateAccessToken(refreshToken);
  if (!accessResult || 'error' in accessResult) {
    return { ok: false, status: 500, error: 'Failed to create access token' };
  }

  const cookieOptions = buildCookieOptionsWithExpiry(
    rememberMe ? 'refresh' : 'session',
    absoluteExpiresAt,
    Boolean(opts.secureRequest)
  );

  const sanitized =
    strapi.service('admin::user')?.sanitizeUser?.(adminUser) || {
      id: adminUser.id,
      email: adminUser.email,
      firstname: adminUser.firstname,
      lastname: adminUser.lastname,
    };

  return {
    ok: true,
    accessToken: accessResult.token,
    refreshToken,
    cookieOptions: { name: REFRESH_COOKIE_NAME, ...cookieOptions },
    user: sanitized,
  };
};

export { REFRESH_COOKIE_NAME, isSuperAdminUser };
