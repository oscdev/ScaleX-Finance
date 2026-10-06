/**
 * Sync Approved advisor → admin::user with bcrypt password copy (never re-hash).
 */

import crypto from 'crypto';
import { hashAdvisorPasswordIfNeeded, isBcryptHash } from './hash-advisor-password';

const findAdvisorAdminRole = async (strapi: any) => {
  return strapi.db.query('admin::role').findOne({
    where: {
      $or: [
        { code: 'strapi-advisor' },
        { name: 'Advisor' },
        { name: 'advisor' },
        { code: 'advisor' },
      ],
    },
  });
};

const splitName = (fullName: string | undefined | null) => {
  const names = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  const firstname = names[0] || 'Advisor';
  const lastname = names.length > 1 ? names.slice(1).join(' ') : names[0] || 'User';
  return { firstname, lastname };
};

/**
 * Ensure Approved advisor has an active admin user whose password matches
 * advisors.password (already bcrypt). Safe to call repeatedly.
 */
export const syncApprovedAdvisorToAdmin = async (
  strapi: any,
  advisor: {
    id?: number | string;
    email?: string;
    fullName?: string;
    password?: string;
    advisorStatus?: string;
  }
): Promise<{ created: boolean; updated: boolean }> => {
  if (!advisor || advisor.advisorStatus !== 'Approved') {
    return { created: false, updated: false };
  }

  const email = String(advisor.email || '').trim().toLowerCase();
  if (!email) return { created: false, updated: false };

  let passwordHash = advisor.password;
  if (!passwordHash) {
    return { created: false, updated: false };
  }

  if (!isBcryptHash(passwordHash)) {
    passwordHash = (await hashAdvisorPasswordIfNeeded(strapi, passwordHash)) || passwordHash;
    if (advisor.id != null && isBcryptHash(passwordHash)) {
      try {
        await strapi.db.query('api::advisor.advisor').update({
          where: { id: advisor.id },
          data: { password: passwordHash },
        });
      } catch (err) {
        strapi.log?.warn?.('[Advisor Sync] Failed to persist hashed advisor password', err);
      }
    }
  }

  if (!isBcryptHash(passwordHash)) {
    strapi.log?.error?.('[Advisor Sync] Advisor password is not a bcrypt hash; aborting admin sync');
    return { created: false, updated: false };
  }

  const advisorRole = await findAdvisorAdminRole(strapi);
  if (!advisorRole) {
    strapi.log?.error?.('[Advisor Sync] Advisor admin role not found');
    return { created: false, updated: false };
  }

  const existingAdmin = await strapi.db.query('admin::user').findOne({
    where: { email: { $eqi: email } },
  });

  const { firstname, lastname } = splitName(advisor.fullName);

  if (existingAdmin) {
    await strapi.db.query('admin::user').update({
      where: { id: existingAdmin.id },
      data: {
        password: passwordHash,
        roles: [advisorRole.id],
        isActive: true,
        firstname: existingAdmin.firstname || firstname,
        lastname: existingAdmin.lastname || lastname,
      },
    });
    return { created: false, updated: true };
  }

  // Prefer create via admin service (validates + links roles), then overwrite
  // password with the advisor bcrypt so we never double-hash.
  const adminUserService = strapi.service('admin::user');
  const tempPassword = crypto.randomBytes(24).toString('base64url');

  try {
    const created = await adminUserService.create({
      email,
      firstname,
      lastname,
      password: tempPassword,
      roles: [advisorRole.id],
      isActive: true,
      registrationToken: null,
    });

    await strapi.db.query('admin::user').update({
      where: { id: created.id },
      data: { password: passwordHash },
    });

    return { created: true, updated: false };
  } catch (err: any) {
    // Fallback: direct db create (keeps numeric id aligned with advisor when possible)
    strapi.log?.warn?.(
      `[Advisor Sync] admin::user.create failed (${err?.message || err}); falling back to db.query`
    );

    const createData: Record<string, unknown> = {
      email,
      password: passwordHash,
      firstname,
      lastname,
      roles: [advisorRole.id],
      isActive: true,
      registrationToken: null,
    };
    if (advisor.id != null) {
      createData.id = Number(advisor.id);
    }

    await strapi.db.query('admin::user').create({ data: createData });
    return { created: true, updated: false };
  }
};
