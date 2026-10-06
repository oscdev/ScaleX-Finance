/**
 * Strapi-standard bcrypt helpers for advisor.password (admin::auth cost 10).
 */

const BCRYPT_RE = /^\$2[aby]?\$\d{2}\$/;

export const isBcryptHash = (value: unknown): boolean =>
  typeof value === 'string' && BCRYPT_RE.test(value);

/** Hash plaintext with admin::auth; leave existing bcrypt unchanged. */
export const hashAdvisorPasswordIfNeeded = async (
  strapi: any,
  password: unknown
): Promise<string | null> => {
  if (password == null) return null;
  const raw = String(password);
  if (!raw) return null;
  if (isBcryptHash(raw)) return raw;

  const authService = strapi.service('admin::auth');
  if (!authService?.hashPassword) {
    throw new Error('admin::auth.hashPassword is unavailable');
  }
  return authService.hashPassword(raw);
};

/**
 * Mutate lifecycle `event.params.data` so password is bcrypt before write.
 * Empty / missing password on update is removed so the stored hash is kept.
 */
export const applyPasswordHashToLifecycleData = async (
  strapi: any,
  data: Record<string, unknown> | undefined | null,
  opts: { required: boolean }
): Promise<void> => {
  if (!data || typeof data !== 'object') return;

  if (!Object.prototype.hasOwnProperty.call(data, 'password')) {
    return;
  }

  const value = data.password;
  if (value == null || String(value).trim() === '') {
    if (!opts.required) {
      delete data.password;
    }
    return;
  }

  data.password = await hashAdvisorPasswordIfNeeded(strapi, value);
};
