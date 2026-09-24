import type { Core } from '@strapi/strapi';

export type AdminBellRole = 'admin' | 'advisor' | 'staff' | 'banker';

export type BellLeadScope =
  | { mode: 'all' }
  | { mode: 'leadIds'; leadIds: number[] };

type AdminRoleRef = { code?: string | null; name?: string | null };

type AdminUserRef = {
  id?: number | string | null;
  email?: string | null;
  roles?: AdminRoleRef[] | null;
};

/** Match sessionRoleResolver / fetchInterceptor role detection. */
export function detectAdminBellRole(roles: AdminRoleRef[] | null | undefined): AdminBellRole {
  const list = roles || [];
  const isAdvisor = list.some(
    (role) =>
      ['strapi-advisor', 'Advisor', 'advisor', 'Advisior'].includes(String(role.code || '')) ||
      ['strapi-advisor', 'Advisor', 'advisor', 'Advisior'].includes(String(role.name || ''))
  );
  if (isAdvisor) return 'advisor';

  const isStaff = list.some(
    (role) =>
      ['strapi-editor', 'staff', 'Staff', 'strapi-staff'].includes(String(role.code || '')) ||
      ['staff', 'Staff'].includes(String(role.name || ''))
  );
  if (isStaff) return 'staff';

  const isBanker = list.some(
    (role) =>
      [
        'bankers-mosko0d4',
        'banker',
        'Banker',
        'bankers',
        'Bankers',
        'strapi-banker',
      ].includes(String(role.code || '')) ||
      ['banker', 'Banker', 'bankers', 'Bankers'].includes(String(role.name || ''))
  );
  if (isBanker) return 'banker';

  return 'admin';
}

/**
 * Resolve which lead ids the signed-in admin may see in the notification bell.
 * Association matches CM leads list scoping.
 */
export async function resolveAccessibleLeadIds(
  strapi: Core.Strapi,
  adminUser: AdminUserRef
): Promise<BellLeadScope> {
  const role = detectAdminBellRole(adminUser.roles);
  if (role === 'admin') {
    return { mode: 'all' };
  }

  const adminUserId = Number(adminUser.id);
  if (!Number.isFinite(adminUserId) || adminUserId <= 0) {
    return { mode: 'leadIds', leadIds: [] };
  }

  if (role === 'advisor') {
    const email = String(adminUser.email || '').trim();
    if (!email) {
      return { mode: 'leadIds', leadIds: [] };
    }

    const advisor = await strapi.db.query('api::advisor.advisor').findOne({
      where: { email },
      select: ['id', 'advisorId'],
    });
    if (!advisor?.id) {
      return { mode: 'leadIds', leadIds: [] };
    }

    const orFilters: Record<string, unknown>[] = [
      { advisorReferralId: String(advisor.id) },
    ];
    const advisorCode = String((advisor as { advisorId?: string }).advisorId || '').trim();
    if (advisorCode) {
      orFilters.push({ parentAdvisorId: advisorCode });
    }

    const leads = await strapi.db.query('api::lead.lead').findMany({
      where: { $or: orFilters },
      select: ['id'],
      limit: 2000,
    });

    const leadIds = [
      ...new Set(
        (leads || [])
          .map((row: { id?: number }) => Number(row.id))
          .filter((id) => Number.isFinite(id) && id > 0)
      ),
    ];
    return { mode: 'leadIds', leadIds };
  }

  const filterKey = role === 'staff' ? 'assignedStaffId' : 'assignedBankerId';
  const loanApps = await strapi.db
    .query('api::loan-application.loan-application')
    .findMany({
      where: { [filterKey]: adminUserId },
      select: ['leadId'],
      limit: 2000,
    });

  const leadIds = [
    ...new Set(
      (loanApps || [])
        .map((row: { leadId?: number | string | null }) => Number(row.leadId))
        .filter((id) => Number.isFinite(id) && id > 0)
    ),
  ];
  return { mode: 'leadIds', leadIds };
}

/**
 * Resolve admin user from Bearer access token via Strapi session manager.
 */
export async function resolveAdminUserFromAuthHeader(
  strapi: Core.Strapi,
  authorization: string | undefined
): Promise<AdminUserRef | null> {
  const raw = String(authorization || '').trim();
  if (!raw.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  const token = raw.slice(7).trim();
  if (!token) return null;

  try {
    const sessionApi = (strapi as any).sessionManager?.('admin');
    if (!sessionApi?.validateAccessToken) {
      return null;
    }
    const validation = sessionApi.validateAccessToken(token);
    if (!validation?.isValid || !validation.payload?.userId) {
      return null;
    }
    const userId = Number(validation.payload.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return null;
    }

    const user = await strapi.db.query('admin::user').findOne({
      where: { id: userId },
      select: ['id', 'email', 'isActive'],
      populate: { roles: { select: ['code', 'name'] } },
    });
    if (!user || (user as { isActive?: boolean }).isActive === false) {
      return null;
    }
    return user as AdminUserRef;
  } catch {
    return null;
  }
}
