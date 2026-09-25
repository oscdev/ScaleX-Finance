import type { Core } from '@strapi/strapi';
import { ensurePythonEnvironment } from './api/bureau-data-extraction/services/python-bridge';

function classifyAdminRoleKind(roles: Array<{ code?: string; name?: string }> | null | undefined): string {
  const list = roles || [];
  const codes = list.map((r) => String(r.code || '').toLowerCase());
  const names = list.map((r) => String(r.name || '').toLowerCase());
  const hit = (needle: string) =>
    codes.some((c) => c.includes(needle)) || names.some((n) => n.includes(needle));

  if (hit('strapi-advisor') || hit('advisor')) return 'Advisor';
  if (hit('banker')) return 'Banker';
  if (hit('staff')) return 'Staff';
  if (hit('super-admin') || hit('super admin') || hit('strapi-super-admin')) return 'Admin';
  if (list.length === 0) return 'Admin';
  return 'Admin';
}

async function logUserRegistrationEvent(strapi: Core.Strapi, params: Record<string, unknown>) {
  try {
    const logger: any = strapi.service('api::system-events.activity-log');
    if (logger?.logEvent) {
      await logger.logEvent({
        category: 'USER_REGISTRATION',
        ...params,
      });
    }
  } catch {
    // non-fatal
  }
}

/** Fields Staff/Advisor/Banker need on CM loan-application so section view/edit can save. */
const LOAN_APP_CM_FIELDS = [
  'leadId', 'loanAmount', 'loanType', 'form_data', 'status',
  'aadharNumber', 'panNumber', 'businessName', 'applicantName', 'email', 'phone',
  'proprietorshipDoc', 'panCard', 'cibilReport', 'aadharCardFront', 'aadharCardBack',
  'businessRegProofDoc', 'bankStatement', 'propertyPapers', 'coAppPan',
  'coAppAadharFront', 'coAppAadharBack', 'salarySlips', 'otherDocs',
  'itrYear1', 'itrYear2', 'itrYear3', 'auditedBooksDoc',
  'declarationAccepted', 'assignedStaffId', 'assignedBankerId',
];

const LOAN_APP_CM_ACTIONS = [
  'plugin::content-manager.explorer.read',
  'plugin::content-manager.explorer.create',
  'plugin::content-manager.explorer.update',
] as const;

async function linkAdminPermissionToRole(
  strapi: Core.Strapi,
  permissionId: number | string,
  roleId: number | string
): Promise<boolean> {
  const knex = strapi.db.connection;
  const linked = await knex('admin_permissions_role_lnk')
    .where({ permission_id: permissionId, role_id: roleId })
    .first();
  if (linked) return true;

  const maxOrd = await knex('admin_permissions_role_lnk')
    .where({ role_id: roleId })
    .max('permission_ord as max')
    .first();
  const nextOrd = Number(maxOrd?.max ?? 0) + 1;

  try {
    await knex('admin_permissions_role_lnk').insert({
      permission_id: permissionId,
      role_id: roleId,
      permission_ord: nextOrd,
    });
  } catch (e) {
    // Retry without permission_ord if column is absent / auto-managed
    try {
      await knex('admin_permissions_role_lnk').insert({
        permission_id: permissionId,
        role_id: roleId,
      });
    } catch (e2) {
      strapi.log.warn(
        `[Permission Sync] Failed linking permission ${permissionId} → role ${roleId}: ${(e2 as Error)?.message || e2}`
      );
      return false;
    }
  }

  const verified = await knex('admin_permissions_role_lnk')
    .where({ permission_id: permissionId, role_id: roleId })
    .first();
  if (!verified) {
    strapi.log.warn(
      `[Permission Sync] Link missing after insert: permission ${permissionId} → role ${roleId}`
    );
    return false;
  }
  return true;
}

async function ensurePermissionFields(
  strapi: Core.Strapi,
  perm: { id: number | string; properties?: { fields?: string[] } },
  fields: string[]
) {
  const current = Array.isArray(perm.properties?.fields) ? perm.properties.fields : [];
  const merged = Array.from(new Set([...current, ...fields]));
  if (merged.length === current.length && fields.every((f) => current.includes(f))) {
    return;
  }
  await strapi.db.query('admin::permission').update({
    where: { id: perm.id },
    data: { properties: { fields: merged } },
  });
}

/**
 * Find a permission for action+subject already linked to this role.
 * Do NOT reuse another role's / Super Admin shared row — Settings → Roles
 * saves create per-role rows and drop shared links, breaking other roles.
 */
async function findRoleLinkedPermission(
  strapi: Core.Strapi,
  roleId: number | string,
  action: string,
  subject: string
) {
  const knex = strapi.db.connection;
  const row = await knex('admin_permissions as p')
    .join('admin_permissions_role_lnk as l', 'l.permission_id', 'p.id')
    .where('l.role_id', roleId)
    .andWhere('p.action', action)
    .andWhere('p.subject', subject)
    .select('p.id')
    .first();
  if (!row?.id) return null;
  return strapi.db.query('admin::permission').findOne({ where: { id: row.id } });
}

/**
 * Ensure a role can CM-read/create/update loan-applications (incl. form_data)
 * via its own permission rows. Section UI still gates fields; without these
 * links Advisor/Staff/Banker get HTTP 403 on Lead View GET/PUT.
 */
async function ensureLoanAppCmPermissions(strapi: Core.Strapi, roleId: number | string) {
  const permReadAction = 'plugin::content-manager.explorer.read';
  const permReadSubject = 'api::loan-app-section-permission.loan-app-section-permission';
  const loanSubject = 'api::loan-application.loan-application';

  let sectionPerm = await findRoleLinkedPermission(
    strapi,
    roleId,
    permReadAction,
    permReadSubject
  );
  if (!sectionPerm) {
    sectionPerm = await strapi.db.query('admin::permission').create({
      data: {
        action: permReadAction,
        subject: permReadSubject,
        properties: { fields: ['roleId', 'roleName', 'permissions'] },
        conditions: [],
      },
    });
    if (sectionPerm) {
      await linkAdminPermissionToRole(strapi, sectionPerm.id, roleId);
    }
  } else {
    await ensurePermissionFields(strapi, sectionPerm, [
      'roleId',
      'roleName',
      'permissions',
    ]);
  }

  for (const action of LOAN_APP_CM_ACTIONS) {
    let existing = await findRoleLinkedPermission(strapi, roleId, action, loanSubject);

    if (!existing) {
      existing = await strapi.db.query('admin::permission').create({
        data: {
          action,
          subject: loanSubject,
          properties: { fields: [...LOAN_APP_CM_FIELDS] },
          conditions: [],
        },
      });
      if (existing) {
        await linkAdminPermissionToRole(strapi, existing.id, roleId);
      }
    } else {
      await ensurePermissionFields(strapi, existing, [...LOAN_APP_CM_FIELDS]);
    }
  }
}

/** Confirm role has explorer read+create+update on loan-application; return action suffixes. */
async function verifyLoanAppCmLinks(
  strapi: Core.Strapi,
  roleId: number | string
): Promise<string[]> {
  const knex = strapi.db.connection;
  const rows = await knex('admin_permissions as p')
    .join('admin_permissions_role_lnk as l', 'l.permission_id', 'p.id')
    .where('l.role_id', roleId)
    .andWhere('p.subject', 'api::loan-application.loan-application')
    .whereIn('p.action', [...LOAN_APP_CM_ACTIONS])
    .distinct('p.action')
    .select('p.action');
  const suffixes = (rows || []).map((r: { action: string }) =>
    String(r.action).replace('plugin::content-manager.explorer.', '')
  );
  return Array.from(new Set(suffixes)).sort();
}

async function resolveAdminRoleByCodesOrNames(
  strapi: Core.Strapi,
  codes: string[],
  names: string[]
) {
  const codeSet = new Set(codes.map((c) => c.toLowerCase()));
  const nameSet = new Set(names.map((n) => n.toLowerCase()));
  const roles = await strapi.db.query('admin::role').findMany({});
  return (roles || []).find((r: any) => {
    const code = String(r.code || '').toLowerCase();
    const name = String(r.name || '').toLowerCase();
    return codeSet.has(code) || nameSet.has(name);
  }) || null;
}

const createAdminUserFromAdvisor = async (strapi: Core.Strapi, advisor: any, rawPassword?: string) => {
  if (advisor.advisorStatus !== 'Approved') return;

  const { email, fullName, password } = advisor;

  try {
    const adminUserService = strapi.service('admin::user');
    const existingUser = await adminUserService.findOneByEmail(email);

    if (existingUser) {
      let adminUserUpdated = false;
      if (!existingUser.isActive) {
        await adminUserService.updateById(existingUser.id, { isActive: true });
        adminUserUpdated = true;
      }
      if (adminUserUpdated) {
        await logUserRegistrationEvent(strapi, {
          action: 'ADVISOR_APPROVED',
          description: `Advisor approved (Advisor): admin user reactivated for ${email}`,
          severity: 'info',
          model: 'api::advisor.advisor',
          metadata: {
            advisorId: advisor.id,
            email,
            roleKind: 'Advisor',
            adminUserCreated: false,
            adminUserUpdated: true,
          },
        });
      }
      return;
    }

    const advisorRole = await strapi.db.query('admin::role').findOne({
      where: { code: 'strapi-advisor' },
    });

    if (!advisorRole) {
      return;
    }

    const names = (fullName || '').trim().split(/\s+/);
    const firstname = names[0] || 'Advisor';
    const lastname = names.length > 1 ? names.slice(1).join(' ') : names[0] || 'User';

    const passToUse = rawPassword || password || 'Welcome@Scalex123';

    await adminUserService.create({
      email,
      firstname,
      lastname,
      password: passToUse,
      roles: [advisorRole.id],
      isActive: true,
      registrationToken: null,
    });

    await logUserRegistrationEvent(strapi, {
      action: 'ADVISOR_APPROVED',
      description: `Advisor approved (Advisor): admin user created for ${email}`,
      severity: 'info',
      model: 'api::advisor.advisor',
      metadata: {
        advisorId: advisor.id,
        email,
        roleKind: 'Advisor',
        adminUserCreated: true,
        adminUserUpdated: false,
      },
    });
  } catch (err: any) {
    // non-fatal
  }
};

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    const UID = 'api::loan-app-section-permission.loan-app-section-permission';
    const router = (strapi.server as any).router;

    const requireAuth = (ctx: any) => {
      const auth: string = ctx.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return false;
      }
      return true;
    };

    router.get('/admin/loan-app-permissions', async (ctx: any) => {
      if (!requireAuth(ctx)) return;
      const roleId = Number(ctx.query.roleId);
      const where = roleId ? { roleId } : {};
      // Return only the most-recently-created record to avoid returning stale duplicates
      const results = await strapi.db.query(UID).findMany({ where, orderBy: { id: 'desc' }, limit: 1 });
      ctx.body = { data: results };
    });

    router.post('/admin/loan-app-permissions', async (ctx: any) => {
      if (!requireAuth(ctx)) return;
      try {
        // Safely read body — ctx.request.body may be empty if body-parser hasn't run
        let body: any = ctx.request.body;
        if (!body || typeof body !== 'object' || !Object.keys(body).length) {
          const raw = await new Promise<string>((resolve) => {
            if ((ctx.req as any).complete) { resolve(''); return; }
            let d = '';
            ctx.req.on('data', (c: Buffer) => { d += c.toString(); });
            ctx.req.on('end', () => resolve(d));
            ctx.req.on('error', () => resolve(''));
          });
          try { body = JSON.parse(raw); } catch { body = {}; }
        }

        const { id, roleId, roleName, permissions } = body as any;

        if (!permissions || typeof permissions !== 'object') {
          ctx.status = 400;
          ctx.body = { error: 'permissions field missing or invalid in request body', received: JSON.stringify(body).slice(0, 300) };
          return;
        }

        let result: any;
        if (id) {
          result = await strapi.db.query(UID).update({ where: { id: Number(id) }, data: { roleId, roleName, permissions } });
        } else {
          const existing = roleId ? await strapi.db.query(UID).findOne({ where: { roleId: Number(roleId) } }) : null;
          if (existing) {
            result = await strapi.db.query(UID).update({ where: { id: existing.id }, data: { roleName, permissions } });
          } else {
            result = await strapi.db.query(UID).create({ data: { roleId: Number(roleId), roleName, permissions } });
          }
        }
        ctx.body = { data: result };
      } catch (e: any) {
        ctx.status = 500;
        ctx.body = { error: e?.message || 'Internal server error', type: e?.constructor?.name };
      }
    });

    router.put('/admin/loan-app-permissions/:id', async (ctx: any) => {
      if (!requireAuth(ctx)) return;
      const { roleId, roleName, permissions } = ctx.request.body as any;
      const updated = await strapi.db.query(UID).update({
        where: { id: Number(ctx.params.id) },
        data: { roleId, roleName, permissions },
      });
      ctx.body = { data: updated };
    });

    // Advisor name/contact list — accessible to any authenticated admin (including Advisor role)
    router.get('/admin/product-users', async (ctx: any) => {
      if (!requireAuth(ctx)) return;
      const product: string = (ctx.query.product as string) || '';
      if (!product) { ctx.body = { staff: [], bankers: [] }; return; }

      // Fetch all mappings for this product (carry user_role to classify staff vs banker)
      const mappings = await strapi.db.query('api::user-product-mapping.user-product-mapping').findMany({
        where: { product },
        select: ['adminUserId', 'user_role'],
        limit: 500,
      });
      if (!mappings.length) { ctx.body = { staff: [], bankers: [] }; return; }

      // adminUserId -> normalized user_role recorded on the mapping row ('staff' | 'banker')
      const roleByUserId = new Map<number, string>();
      mappings.forEach((m: any) => {
        const id = Number(m.adminUserId);
        if (id) roleByUserId.set(id, (m.user_role || '').trim().toLowerCase());
      });
      const adminUserIds = [...roleByUserId.keys()];
      if (!adminUserIds.length) { ctx.body = { staff: [], bankers: [] }; return; }

      // Fetch admin users + their roles in one query (roles used as a legacy fallback)
      const adminUsers = await strapi.db.query('admin::user').findMany({
        where: { id: { $in: adminUserIds } },
        select: ['id', 'firstname', 'lastname', 'email'],
        populate: { roles: { select: ['code', 'name'] } },
        limit: 500,
      });

      // Symmetric classifier: trust the mapping's user_role first, fall back to the
      // admin role (matched by code OR name) for rows saved before user_role existed.
      const isRole = (u: any, mappingRole: string, codes: string[], names: string[]): boolean => {
        if (roleByUserId.get(Number(u.id)) === mappingRole) return true;
        return (u.roles || []).some((r: any) =>
          codes.includes(r.code) || names.includes((r.name || '').trim().toLowerCase())
        );
      };

      const staff = adminUsers.filter((u: any) =>
        isRole(u, 'staff', ['strapi-editor', 'staff', 'strapi-staff'], ['staff'])
      );
      const bankers = adminUsers.filter((u: any) =>
        isRole(u, 'banker', ['bankers-mosko0d4', 'banker', 'bankers', 'strapi-banker'], ['banker', 'bankers'])
      );

      ctx.body = { staff, bankers };
    });

    router.get('/admin/advisors-list', async (ctx: any) => {
      if (!requireAuth(ctx)) return;
      const advisors = await strapi.db.query('api::advisor.advisor').findMany({
        select: ['id', 'fullName', 'email', 'phoneNumber'],
        limit: 500,
      });
      ctx.body = { data: advisors };
    });

    router.post('/admin/api-uploads/reconcile', async (ctx: any) => {
      if (!requireAuth(ctx)) return;
      try {
        const { reconcileApiUploads } = await import(
          './api/loan-application/services/api-uploads-mirror/reconcile'
        );
        const summary = await reconcileApiUploads(strapi);
        ctx.body = { data: summary };
      } catch (e: any) {
        ctx.status = 500;
        ctx.body = { error: { message: e?.message || 'Reconcile failed' } };
      }
    });

    router.get('/admin/api-uploads/lead-files', async (ctx: any) => {
      if (!requireAuth(ctx)) return;
      const leadId = ctx.query.leadId;
      const applicantName = String(ctx.query.applicantName ?? '').trim();
      if (!leadId || !applicantName) {
        ctx.status = 400;
        ctx.body = { error: { message: 'leadId and applicantName are required' } };
        return;
      }
      try {
        const { buildLeadUploadFolderName } = await import(
          './api/loan-application/utils/lead-upload-folder'
        );
        const { reconcileLeadFolder, listLeadFolderMediaFiles } = await import(
          './api/loan-application/services/api-uploads-mirror/reconcile'
        );
        const folderName = buildLeadUploadFolderName(leadId, applicantName);
        const reconcileSummary = await reconcileLeadFolder(strapi, folderName);
        const files = await listLeadFolderMediaFiles(strapi, folderName);
        ctx.body = { data: { folderName, files, reconcileSummary } };
      } catch (e: any) {
        ctx.status = 500;
        ctx.body = { error: { message: e?.message || 'Failed to list lead files' } };
      }
    });

    // Lead Activity Timeline aggregations (admin JWT — not Users & Permissions /api)
    router.get('/admin/activity-logs/by-lead', async (ctx: any) => {
      if (!requireAuth(ctx)) return;
      try {
        const service = strapi.service('api::system-events.activity-log') as any;
        ctx.body = await service.listByLead({
          search: ctx.query.search,
          page: ctx.query.page,
          pageSize: ctx.query.pageSize,
        });
      } catch (e: any) {
        ctx.status = 500;
        ctx.body = { error: { message: e?.message || 'Internal server error' } };
      }
    });

    router.get('/admin/activity-logs/by-lead/:leadId', async (ctx: any) => {
      if (!requireAuth(ctx)) return;
      try {
        const leadId = Number(ctx.params.leadId);
        if (!Number.isFinite(leadId) || leadId <= 0) {
          ctx.status = 400;
          ctx.body = { error: { message: 'leadId is required' } };
          return;
        }
        const service = strapi.service('api::system-events.activity-log') as any;
        ctx.body = await service.listForLead(leadId, {
          category: ctx.query.category,
          page: ctx.query.page,
          pageSize: ctx.query.pageSize,
        });
      } catch (e: any) {
        ctx.status = 500;
        ctx.body = { error: { message: e?.message || 'Internal server error' } };
      }
    });

    router.get('/admin/activity-logs/system', async (ctx: any) => {
      if (!requireAuth(ctx)) return;
      try {
        const pageSize = Math.min(100, Math.max(1, Number(ctx.query.pageSize) || 50));
        const results = await strapi.db.query('api::system-events.activity-log').findMany({
          where: {
            $or: [{ category: 'SYSTEM' }, { leadId: null }],
          },
          orderBy: { createdAt: 'desc' },
          limit: pageSize,
        });
        ctx.body = { data: results };
      } catch (e: any) {
        ctx.status = 500;
        ctx.body = { error: { message: e?.message || 'Internal server error' } };
      }
    });

    router.get('/admin/activity-logs/events', async (ctx: any) => {
      if (!requireAuth(ctx)) return;
      try {
        const service = strapi.service('api::system-events.activity-log') as any;
        ctx.body = await service.listEvents({
          search: ctx.query.search,
          category: ctx.query.category,
          severity: ctx.query.severity,
          page: ctx.query.page,
          pageSize: ctx.query.pageSize,
        });
      } catch (e: any) {
        ctx.status = 500;
        ctx.body = { error: { message: e?.message || 'Internal server error' } };
      }
    });

    // Role-scoped notification bell (Admin = all; Advisor/Staff/Banker = associated leads)
    router.get('/admin/activity-logs/notifications', async (ctx: any) => {
      if (!requireAuth(ctx)) return;
      try {
        const service = strapi.service('api::system-events.activity-log') as any;
        const adminUser = await service.resolveAdminUserFromAuthHeader(
          ctx.headers.authorization
        );
        if (!adminUser) {
          ctx.status = 401;
          ctx.body = { error: 'Unauthorized' };
          return;
        }
        const scope = await service.resolveAccessibleLeadIds(adminUser);
        ctx.body = await service.listForBell(scope, {
          limit: ctx.query.limit,
        });
      } catch (e: any) {
        ctx.status = 500;
        ctx.body = { error: { message: e?.message || 'Internal server error' } };
      }
    });

    // Active PL/BL criteria lender codes for Activity Logs (resolve product via leadId)
    router.get('/admin/activity-logs/active-lenders', async (ctx: any) => {
      if (!requireAuth(ctx)) return;
      try {
        const service = strapi.service('api::system-events.activity-log') as any;
        const leadIdRaw = ctx.query.leadId;
        const leadId =
          leadIdRaw != null && String(leadIdRaw).trim() !== ''
            ? Number(leadIdRaw)
            : null;
        ctx.body = await service.listActiveCriteriaLenderCodes(
          ctx.query.loanType as string | undefined,
          Number.isFinite(leadId as number) ? leadId : null
        );
      } catch (e: any) {
        ctx.status = 500;
        ctx.body = { error: { message: e?.message || 'Internal server error' } };
      }
    });
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // console.log('[Bootstrap] Initialization started...');

    await ensurePythonEnvironment(strapi.log);

    // 1. Create/Verify Advisor role
    let advisorRole = await strapi.db.query('admin::role').findOne({
      where: { code: 'strapi-advisor' }
    });

    if (!advisorRole) {
      // Check by name as fallback
      advisorRole = await strapi.db.query('admin::role').findOne({
        where: { name: 'Advisor' }
      });

      if (!advisorRole) {
        const adminRoleService = strapi.service('admin::role');
        advisorRole = await adminRoleService.create({
          name: 'Advisor',
          code: 'strapi-advisor',
          description: 'Advisor role for managing leads',
        });
        // console.log('Created Advisor Role (strapi-advisor)');
      } else {
        await strapi.db.query('admin::role').update({
          where: { id: advisorRole.id },
          data: { code: 'strapi-advisor' }
        });
        // console.log('Updated existing Advisor role code to strapi-advisor');
      }
    }

    // 1b. Fix advisor role field-level permissions for leads and loan-applications (grant all fields)
    try {
      const allLeadFields = [
        'fullName', 'email', 'requiredAmount', 'mobileNumber',
        'advisorReferralId', 'parentAdvisorId', 'selectedProduct',
        'panCard', 'aadharCard', 'propertyType', 'propertyStatus',
        'propertyValue', 'employmentType', 'leadType', 'getEmailNotification',
        'pinCode', 'leadStatus',
      ];
      const allLoanAppFields = [...LOAN_APP_CM_FIELDS];
      const permLinks = await strapi.db.connection('admin_permissions_role_lnk')
        .where({ role_id: advisorRole.id })
        .select('permission_id');
      const permIds = permLinks.map((r: any) => r.permission_id);
      if (permIds.length > 0) {
        await strapi.db.connection('admin_permissions')
          .whereIn('id', permIds)
          .where({ subject: 'api::lead.lead' })
          .update({ properties: JSON.stringify({ fields: allLeadFields }) });
        await strapi.db.connection('admin_permissions')
          .whereIn('id', permIds)
          .where({ subject: 'api::loan-application.loan-application' })
          .update({ properties: JSON.stringify({ fields: allLoanAppFields }) });
      }
    } catch (e) {}

    // 2. Sync existing Approved advisors
    try {
      const approvedAdvisors = await strapi.db.query('api::advisor.advisor').findMany({
        where: { advisorStatus: 'Approved' }
      });

      if (approvedAdvisors && approvedAdvisors.length > 0) {
        // console.log(`[Advisor Sync] Found ${approvedAdvisors.length} already approved advisors. Verifying admin access...`);
        for (const advisor of approvedAdvisors) {
          await createAdminUserFromAdvisor(strapi, advisor);
        }
      }
    } catch (err) {
      // console.error('[Advisor Sync] Failed to query approved advisors:', err);
    }

    // 2.5 Backfill advisorId for all advisors missing it
    try {
      const advisorsToBackfill = await strapi.db.query('api::advisor.advisor').findMany({
        where: {
          $or: [
            { advisorId: null },
            { advisorId: '' }
          ]
        }
      });

      if (advisorsToBackfill.length > 0) {
        console.log(`[Advisor Sync] Backfilling advisorId for ${advisorsToBackfill.length} records...`);
        for (const adv of advisorsToBackfill) {
          await strapi.db.query('api::advisor.advisor').update({
            where: { id: adv.id },
            data: { advisorId: `ADV${adv.id}` }
          });
        }
      }
    } catch (err) {
      console.error('[Advisor Sync] Backfill failed:', err);
    }

    // 3. Register Global Lifecycle
    strapi.db.lifecycles.subscribe({
      models: ['api::advisor.advisor'],
      async beforeUpdate(event) {
        const { params } = event;
        const { where, data } = params;
        if (!data || !Object.prototype.hasOwnProperty.call(data, 'advisorStatus')) {
          return;
        }
        try {
          const existing = await strapi.db.query('api::advisor.advisor').findOne({ where });
          (event as { state?: Record<string, unknown> }).state = {
            ...((event as { state?: Record<string, unknown> }).state || {}),
            prevAdvisorStatus: existing?.advisorStatus ?? null,
          };
        } catch {
          // non-fatal
        }
      },
      async afterCreate(event) {
        const { result } = event;

        // Auto-generate advisorId if missing
        if (!result.advisorId) {
          try {
            await strapi.db.query('api::advisor.advisor').update({
              where: { id: result.id },
              data: { advisorId: `ADV${result.id}` }
            });
          } catch (e) {}
        }

        try {
          const emailService: any = strapi.service('api::system-events.activity-log');
          if (emailService?.onAdvisorRegistrationSubmitted) {
            await emailService.onAdvisorRegistrationSubmitted({
              advisor: {
                id: result.id,
                fullName: result.fullName,
                email: result.email,
                phoneNumber: result.phoneNumber,
                state: result.state,
                district: result.district,
                pinCode: result.pinCode,
                specialization: result.specialization,
              },
            });
          }
        } catch {
          // non-fatal email side-effect
        }

        await createAdminUserFromAdvisor(strapi, result, (event.params as any)?.data?.password);
      },
      async afterUpdate(event) {
        const { result } = event;

        // Ensure advisorId is present
        if (!result.advisorId) {
           try {
            await strapi.db.query('api::advisor.advisor').update({
              where: { id: result.id },
              data: { advisorId: `ADV${result.id}` }
            });
          } catch (e) {}
        }

        const prevStatus = String(
          (event as { state?: { prevAdvisorStatus?: string | null } }).state
            ?.prevAdvisorStatus || ''
        );
        const nowStatus = String(result.advisorStatus || '');
        if (prevStatus !== 'Approved' && nowStatus === 'Approved') {
          try {
            const emailService: any = strapi.service('api::system-events.activity-log');
            const loginUrl = `${strapi.config.get('admin.absoluteUrl')}/auth/login`;
            if (emailService?.onRegistrationWelcome && result.email) {
              await emailService.onRegistrationWelcome({
                to: result.email,
                recipientName: result.fullName || 'Advisor',
                recipientRole: 'Advisor',
                auditRole: 'advisor',
                actionUrl: loginUrl,
                actionLabel: 'Sign in to ScaleX Admin',
                welcomeMessage:
                  'Your advisor registration has been approved. Sign in to the ScaleX admin dashboard to start managing leads.',
                lead: { fullName: result.fullName, email: result.email },
              });
            }
          } catch {
            // non-fatal email side-effect
          }
        }

        await createAdminUserFromAdvisor(strapi, result, (event.params as any)?.data?.password);
      },
    });

    // Admin user invite → welcome email with registration link (CE has no built-in invite mail)
    strapi.db.lifecycles.subscribe({
      models: ['admin::user'],
      async afterCreate(event) {
        const result = event.result as {
          id?: number | string;
          email?: string;
          firstname?: string;
          lastname?: string;
          registrationToken?: string | null;
          roles?: Array<{ code?: string; name?: string } | number | string>;
        };
        const token = String(result?.registrationToken || '').trim();
        const email = String(result?.email || '').trim();
        if (!token || !email) return;

        try {
          let roles = result.roles;
          if (!roles || !roles.length || typeof roles[0] !== 'object') {
            const full = await strapi.db.query('admin::user').findOne({
              where: { id: result.id },
              populate: { roles: { select: ['code', 'name'] } },
            });
            roles = full?.roles;
          }

          const roleLabel = (() => {
            const list = (roles || []) as Array<{ code?: string; name?: string }>;
            const blob = list
              .map((r) => `${r.code || ''} ${r.name || ''}`.toLowerCase())
              .join(' ');
            if (blob.includes('banker')) return 'Banker' as const;
            if (blob.includes('staff')) return 'Staff' as const;
            if (blob.includes('advisor')) return 'Advisor' as const;
            return 'Staff' as const;
          })();

          const auditRole =
            roleLabel === 'Banker'
              ? 'banker'
              : roleLabel === 'Advisor'
                ? 'advisor'
                : 'staff';

          const name =
            [result.firstname, result.lastname].filter(Boolean).join(' ').trim() ||
            roleLabel;

          const actionUrl = `${strapi.config.get('admin.absoluteUrl')}/auth/register?registrationToken=${encodeURIComponent(token)}`;
          const emailService: any = strapi.service('api::system-events.activity-log');
          if (emailService?.onRegistrationWelcome) {
            await emailService.onRegistrationWelcome({
              to: email,
              recipientName: name,
              recipientRole: roleLabel,
              auditRole,
              actionUrl,
              actionLabel: 'Complete registration',
              welcomeMessage: `You have been invited to ScaleX Finance as ${roleLabel}. Complete registration with the link below to set your password and activate your account.`,
              lead: { fullName: name, email },
            });
          }
        } catch {
          // non-fatal email side-effect
        }
      },
    });

    // Admin user create → Users & Auth activity
    strapi.db.lifecycles.subscribe({
      models: ['admin::user'],
      async afterCreate(event) {
        const result = event.result as any;
        if (!result) return;
        try {
          let roles: Array<{ code?: string; name?: string }> = [];
          if (Array.isArray(result.roles) && result.roles.length && typeof result.roles[0] === 'object') {
            roles = result.roles;
          } else {
            const full = await strapi.db.query('admin::user').findOne({
              where: { id: result.id },
              populate: ['roles'],
            });
            roles = (full?.roles || []) as Array<{ code?: string; name?: string }>;
          }
          const roleNames = roles.map((r) => r.name || r.code || 'unknown').filter(Boolean);
          const roleKind = classifyAdminRoleKind(roles);
          await logUserRegistrationEvent(strapi, {
            action: 'ADMIN_USER_CREATED',
            description: `Admin user created (${roleKind}): ${result.email || result.id}`,
            severity: 'info',
            model: 'admin::user',
            userId: result.id != null ? String(result.id) : undefined,
            metadata: {
              adminUserId: result.id,
              email: result.email ?? null,
              roleNames,
              roleKind,
            },
          });
        } catch {
          // non-fatal
        }
      },
    });

    // Shared /admin login → Users & Auth
    const resolveLoginEmail = (): string | null => {
      try {
        const ctx = (strapi as any).requestContext?.get?.();
        const body = ctx?.request?.body || {};
        const email = body.email || body.identifier;
        return email != null && String(email).trim() ? String(email).trim() : null;
      } catch {
        return null;
      }
    };

    const resolveRolesForEmail = async (email: string | null) => {
      if (!email) return { roles: [] as Array<{ code?: string; name?: string }>, adminUserId: null as number | null };
      try {
        const user = await strapi.db.query('admin::user').findOne({
          where: { email },
          populate: ['roles'],
        });
        if (!user) return { roles: [], adminUserId: null };
        return {
          roles: (user.roles || []) as Array<{ code?: string; name?: string }>,
          adminUserId: user.id ?? null,
        };
      } catch {
        return { roles: [], adminUserId: null };
      }
    };

    strapi.eventHub.on('admin.auth.success', async (payload: any) => {
      try {
        const user = payload?.user || {};
        const email = user.email || resolveLoginEmail();
        let roles: Array<{ code?: string; name?: string }> = Array.isArray(user.roles)
          ? user.roles
          : [];
        if (!roles.length && email) {
          const looked = await resolveRolesForEmail(email);
          roles = looked.roles;
        }
        const roleNames = roles.map((r) => r.name || r.code || 'unknown').filter(Boolean);
        const roleKind = roles.length ? classifyAdminRoleKind(roles) : 'Unknown';
        await logUserRegistrationEvent(strapi, {
          action: 'LOGIN_SUCCESS',
          description: `Login success (${roleKind}): ${email || user.id || 'unknown'}`,
          severity: 'info',
          model: 'admin::user',
          userId: user.id != null ? String(user.id) : undefined,
          metadata: {
            email: email ?? null,
            adminUserId: user.id ?? null,
            roleNames,
            roleKind,
            provider: payload?.provider || 'local',
          },
        });
      } catch {
        // non-fatal
      }
    });

    strapi.eventHub.on('admin.auth.error', async (payload: any) => {
      try {
        const email = resolveLoginEmail();
        const looked = await resolveRolesForEmail(email);
        const roleNames = looked.roles.map((r) => r.name || r.code || 'unknown').filter(Boolean);
        const roleKind = looked.roles.length
          ? classifyAdminRoleKind(looked.roles)
          : 'Unknown';
        const errorMessage =
          payload?.error?.message ||
          (payload?.error instanceof Error ? payload.error.message : null) ||
          'Login failed';
        await logUserRegistrationEvent(strapi, {
          action: 'LOGIN_FAILURE',
          description: `Login failed (${roleKind}): ${email || 'unknown'}`,
          severity: 'warning',
          model: 'admin::user',
          metadata: {
            email: email ?? null,
            adminUserId: looked.adminUserId,
            roleNames,
            roleKind,
            provider: payload?.provider || 'local',
            errorMessage,
          },
        });
      } catch {
        // non-fatal
      }
    });

    // 4. Update Public Permissions
    try {
      const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
        where: { type: 'public' }
      });

      if (publicRole) {
        const permissions = [
          { action: 'api::lead.lead.create', role: publicRole.id },
          { action: 'api::lead.lead.update', role: publicRole.id },
          { action: 'api::loan-application.loan-application.create', role: publicRole.id },
          { action: 'api::loan-application.loan-application.update', role: publicRole.id },
          { action: 'api::product.product.find', role: publicRole.id },
          { action: 'api::loan-application-page.loan-application-page.find', role: publicRole.id },
          { action: 'api::lender-master.lenders-catalog.find', role: publicRole.id },
          { action: 'api::about-us-page.about-us-page.find', role: publicRole.id },
          { action: 'api::contact-us-page.contact-us-page.find', role: publicRole.id },
          { action: 'api::system-events.activity-log.createLog', role: publicRole.id },
          { action: 'api::lead.lead.logSubmissionAudit', role: publicRole.id },
          { action: 'api::advisor.advisor.find', role: publicRole.id },
          { action: 'api::lead-remark.lead-remark.find', role: publicRole.id },
          { action: 'api::lead-remark.lead-remark.findOne', role: publicRole.id },
          { action: 'api::lead-remark.lead-remark.create', role: publicRole.id },
          { action: 'api::lead-remark.lead-remark.update', role: publicRole.id },
          { action: 'plugin::upload.content-api.upload', role: publicRole.id },
          { action: 'plugin::upload.upload', role: publicRole.id },
          { action: 'api::loan-app-section-permission.loan-app-section-permission.find', role: publicRole.id },
          { action: 'api::user-product-mapping.user-product-mapping.find', role: publicRole.id },
          { action: 'api::user-product-mapping.user-product-mapping.findOne', role: publicRole.id },
          { action: 'api::user-product-mapping.user-product-mapping.create', role: publicRole.id },
          { action: 'api::user-product-mapping.user-product-mapping.update', role: publicRole.id },
        ];

        for (const perm of permissions) {
          const existing = await strapi.db.query('plugin::users-permissions.permission').findOne({
            where: perm
          });
          if (!existing) {
            await strapi.db.query('plugin::users-permissions.permission').create({ data: perm });
          }
        }
      }
    } catch (err) { }

    // Initialize Global Settings
    try {
      const settings = await strapi.db.query('api::global-setting.global-setting').findOne({});
      if (!settings) {
        await strapi.db.query('api::global-setting.global-setting').create({
          data: {
            activityLoggingIsEnabled: true,
            codeLevelLoggingIsEnabled: true,
            loggingRetentionDays: 30,
            publishedAt: new Date()
          }
        });
      } else {
        const patch: Record<string, unknown> = {};
        if (settings.activityLoggingIsEnabled == null) {
          patch.activityLoggingIsEnabled = true;
        }
        if (settings.codeLevelLoggingIsEnabled == null) {
          patch.codeLevelLoggingIsEnabled = true;
        }
        if (settings.loggingRetentionDays == null) {
          patch.loggingRetentionDays = 30;
        }
        if (Object.keys(patch).length > 0) {
          await strapi.db.query('api::global-setting.global-setting').update({
            where: { id: settings.id },
            data: patch,
          });
        }
      }
    } catch (err) { }

    // 6. Ensure Advisor Role has field-level permissions for Leads
    try {
      const dbAdvisorRole = await strapi.db.query('admin::role').findOne({
        where: { code: 'strapi-advisor' }
      });

      if (dbAdvisorRole) {
        // Find all permissions that are linked to this specific role via the join table
        // First get the permission IDs linked to this role
        const rolePermissions = await strapi.db.connection('admin_permissions_role_lnk')
          .select('permission_id')
          .where('role_id', dbAdvisorRole.id);

        const permissionIds = rolePermissions.map((rp: any) => rp.permission_id);

        if (permissionIds.length > 0) {
          const permissions = await strapi.db.query('admin::permission').findMany({
            where: {
              id: { $in: permissionIds },
              subject: 'api::lead.lead'
            }
          });

          // console.log(`[Permission Sync] Found ${permissions.length} lead permissions for Advisor role ID: ${dbAdvisorRole.id}`);

          // Media Library: Lead View Add Document uses GET/POST /upload/folders + POST /upload
          // (Document Details View/Edit alone only gates UI — these actions are required to avoid Policy Failed)
          const uploadActions = [
            'plugin::upload.read',
            'plugin::upload.assets.create',
          ];
          for (const action of uploadActions) {
            try {
              let uploadPerm = await strapi.db.query('admin::permission').findOne({
                where: { action, subject: { $null: true } },
              });
              if (!uploadPerm) {
                const candidates = await strapi.db.query('admin::permission').findMany({
                  where: { action },
                });
                uploadPerm = (candidates || []).find(
                  (p) => p.subject == null || p.subject === ''
                ) || null;
              }
              if (!uploadPerm) {
                uploadPerm = await strapi.db.query('admin::permission').create({
                  data: {
                    action,
                    subject: null,
                    properties: {},
                    conditions: [],
                  },
                });
              }
              if (uploadPerm) {
                await linkAdminPermissionToRole(strapi, uploadPerm.id, dbAdvisorRole.id);
              }
            } catch (e) {
              strapi.log.warn(`[Permission Sync] Failed to grant ${action} to strapi-advisor: ${(e as Error)?.message || e}`);
            }
          }

          for (const permission of permissions) {
            if (permission.properties && permission.properties.fields) {
              const currentFields = [...permission.properties.fields];
              let updated = false;

              if (!currentFields.includes('advisorReferralId')) {
                currentFields.push('advisorReferralId');
                updated = true;
              }
              if (!currentFields.includes('selectedProduct')) {
                currentFields.push('selectedProduct');
                updated = true;
              }

              if (updated) {
                await strapi.db.query('admin::permission').update({
                  where: { id: permission.id },
                  data: {
                    properties: { ...permission.properties, fields: currentFields }
                  }
                });
                // console.log(`[Permission Sync] SUCCESS: Unlocked fields for ${permission.action}`);
              }
            }
          }
        }
      }
    } catch (err) {
      // console.error('[Permission Sync] ERROR:', err);
    }

    // 6b. Loan Application CM rights for Advisor + Staff + Banker
    // Settings → Loan Application Section view/edit only gates UI; these CM links
    // are required so Lead View GET/PUT form_data does not 403.
    // Advisor GET 200 + PUT 403 usually means explorer.update is not linked.
    try {
      const advisorForCm = await strapi.db.query('admin::role').findOne({
        where: { code: 'strapi-advisor' },
      });
      const staffForCm = await resolveAdminRoleByCodesOrNames(
        strapi,
        ['strapi-editor', 'staff', 'strapi-staff'],
        ['staff']
      );
      const bankerForCm = await resolveAdminRoleByCodesOrNames(
        strapi,
        ['bankers-mosko0d4', 'banker', 'bankers', 'strapi-banker'],
        ['banker', 'bankers']
      );

      const required = ['read', 'create', 'update'];
      for (const role of [advisorForCm, staffForCm, bankerForCm]) {
        if (!role?.id) continue;
        const label = role.code || role.name || String(role.id);
        try {
          await ensureLoanAppCmPermissions(strapi, role.id);
          const linked = await verifyLoanAppCmLinks(strapi, role.id);
          const missing = required.filter((a) => !linked.includes(a));
          if (missing.length) {
            strapi.log.warn(
              `[Permission Sync] loan-app CM incomplete for ${label}: have [${linked.join(',') || 'none'}] missing [${missing.join(',')}]`
            );
          } else {
            strapi.log.info(
              `[Permission Sync] loan-app CM OK for ${label}: ${linked.join(',')}`
            );
          }
        } catch (e) {
          strapi.log.warn(
            `[Permission Sync] Failed loan-app CM grant for role ${label}: ${(e as Error)?.message || e}`
          );
        }
      }
    } catch (err) {
      strapi.log.warn(`[Permission Sync] Loan-app CM grant block failed: ${(err as Error)?.message || err}`);
    }

    // 4. Content API Public Permissions for Activity Logs (for the Notification Bell)
    try {
      const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'public' } });
      const authRole = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });

      const actions = [
        'api::system-events.activity-log.find',
        'api::system-events.activity-log.findOne',
        'api::global-setting.global-setting.find'
      ];

      for (const role of [publicRole, authRole]) {
        if (role) {
          for (const action of actions) {
            const existing = await strapi.db.query('plugin::users-permissions.permission').findOne({
              where: { action, role: role.id }
            });
            if (!existing) {
              await strapi.db.query('plugin::users-permissions.permission').create({
                data: { action, role: role.id }
              });
            }
          }
        }
      }
    } catch (err) {
      // console.error('[Public Permission Sync] ERROR:', err);
    }

    // 5. Global Lead Visibility Security (Database Level)
    strapi.db.lifecycles.subscribe({
      models: ['api::lead.lead'],
      async beforeFindMany(event) {
        const requestContext = (strapi as any).requestContext?.get();
        if (!requestContext) return;

        const user = requestContext.state?.user || requestContext.state?.auth?.credentials;
        if (!user) return;

        const roles = user.roles || [];
        const isAdvisor = roles.some((r: any) =>
          ['strapi-advisor', 'Advisor', 'advisor'].includes(r.code) ||
          ['strapi-advisor', 'Advisor', 'advisor'].includes(r.name)
        );

        if (isAdvisor) {
          const advisorEntry = await strapi.db.query('api::advisor.advisor').findOne({
            where: { email: user.email }
          });

          if (advisorEntry) {
            const advisorID = advisorEntry.id.toString();

            // Apply the mandatory filter to the database query
            event.params.where = {
              $and: [
                event.params.where || {},
                { advisorReferralId: advisorID }
              ]
            };
          }
        }
      },
      async beforeCount(event) {
        const requestContext = (strapi as any).requestContext?.get();
        if (!requestContext) return;

        const user = requestContext.state?.user || requestContext.state?.auth?.credentials;
        if (!user) return;

        const roles = user.roles || [];
        const isAdvisor = roles.some((r: any) =>
          ['strapi-advisor', 'Advisor', 'advisor'].includes(r.code) ||
          ['strapi-advisor', 'Advisor', 'advisor'].includes(r.name)
        );

        if (isAdvisor) {
          const advisorEntry = await strapi.db.query('api::advisor.advisor').findOne({
            where: { email: user.email }
          });

          if (advisorEntry) {
            event.params.where = {
              $and: [
                event.params.where || {},
                { advisorReferralId: advisorEntry.id.toString() }
              ]
            };
          }
        }
      },
      async beforeCreate(event) {
        const data = event.params?.data as Record<string, unknown> | undefined;
        if (!data) return;

        const existingReferral = String(data.advisorReferralId ?? '').trim();
        if (existingReferral) return;

        try {
          const requestContext = (strapi as any).requestContext?.get();
          const user =
            requestContext?.state?.user || requestContext?.state?.auth?.credentials;
          if (!user?.email) return;

          const roles = user.roles || [];
          const isAdvisor = roles.some(
            (r: any) =>
              ['strapi-advisor', 'Advisor', 'advisor', 'Advisior'].includes(r.code) ||
              ['strapi-advisor', 'Advisor', 'advisor', 'Advisior'].includes(r.name)
          );
          if (!isAdvisor) return;

          const advisorEntry = await strapi.db.query('api::advisor.advisor').findOne({
            where: { email: user.email },
            select: ['id'],
          });
          if (advisorEntry?.id) {
            data.advisorReferralId = String(advisorEntry.id);
          }
        } catch {
          // non-fatal — create continues without stamp
        }
      },
      async afterCreate(event) {
        const { result } = event;
        const logger: any = strapi.service('api::system-events.activity-log');
        if (logger) {
          const meta: Record<string, unknown> = {
            leadId: result.id,
            leadName: result.fullName,
          };
          if (result.advisorReferralId != null && result.advisorReferralId !== '') {
            meta.advisorReferralId = result.advisorReferralId;
          }
          if (result.parentAdvisorId != null && result.parentAdvisorId !== '') {
            meta.parentAdvisorId = result.parentAdvisorId;
          }
          await logger.logEvent({
            action: 'LEAD_CREATED',
            description: `New lead created: ${result.fullName}`,
            severity: 'info',
            model: 'api::lead.lead',
            category: 'LEAD_FORM',
            leadId: result.id,
            leadName: result.fullName,
            metadata: meta,
          });
        }
      },
      async beforeUpdate(event) {
        const { params } = event;
        const { where, data } = params;
        if (!data) return;

        const touchesStatus = Object.prototype.hasOwnProperty.call(data, 'leadStatus');
        const touchesReferral = Object.prototype.hasOwnProperty.call(
          data,
          'advisorReferralId'
        );
        const touchesParent = Object.prototype.hasOwnProperty.call(
          data,
          'parentAdvisorId'
        );
        if (!touchesStatus && !touchesReferral && !touchesParent) return;

        const oldLead = await strapi.db.query('api::lead.lead').findOne({ where });
        if (!oldLead) return;

        const logger: any = strapi.service('api::system-events.activity-log');
        if (!logger?.logEvent) return;

        if (touchesStatus && oldLead.leadStatus !== data.leadStatus) {
          await logger.logEvent({
            action: 'LEAD_STATUS_CHANGED',
            description: `Lead status updated from ${oldLead.leadStatus} to ${data.leadStatus} for ${oldLead.fullName}`,
            severity: 'info',
            model: 'api::lead.lead',
            leadId: oldLead.id,
            leadName: oldLead.fullName,
            metadata: {
              leadId: oldLead.id,
              leadName: oldLead.fullName,
              oldStatus: oldLead.leadStatus,
              newStatus: data.leadStatus,
            },
          });
          if (logger.onLeadStatusChanged) {
            try {
              await logger.onLeadStatusChanged({
                leadId: oldLead.id,
                oldStatus: String(oldLead.leadStatus || ''),
                newStatus: String(data.leadStatus || ''),
              });
            } catch {
              // non-fatal email side-effect
            }
          }
        }

        const norm = (v: unknown) =>
          v == null || v === '' ? '' : String(v).trim();

        if (touchesReferral) {
          const oldVal = norm(oldLead.advisorReferralId);
          const newVal = norm(data.advisorReferralId);
          if (oldVal !== newVal) {
            await logger.logEventDeduped({
              action: 'LEAD_ADVISOR_ASSIGNED',
              description: newVal
                ? `Advisor assigned to Lead #${oldLead.id} (${oldLead.fullName || 'Unknown'})`
                : `Advisor cleared on Lead #${oldLead.id} (${oldLead.fullName || 'Unknown'})`,
              severity: 'info',
              model: 'api::lead.lead',
              category: 'LEAD_FORM',
              leadId: oldLead.id,
              leadName: oldLead.fullName,
              metadata: {
                leadId: oldLead.id,
                leadName: oldLead.fullName,
                field: 'advisorReferralId',
                oldValue: oldVal || null,
                newValue: newVal || null,
              },
            });
            if (newVal && logger.onLeadAdvisorAssigned) {
              try {
                await logger.onLeadAdvisorAssigned({
                  leadId: oldLead.id,
                  field: 'advisorReferralId',
                  newAdvisorKey: newVal,
                });
              } catch {
                // non-fatal email side-effect
              }
            }
          }
        }

        if (touchesParent) {
          const oldVal = norm(oldLead.parentAdvisorId);
          const newVal = norm(data.parentAdvisorId);
          if (oldVal !== newVal) {
            await logger.logEventDeduped({
              action: 'LEAD_ADVISOR_ASSIGNED',
              description: newVal
                ? `Parent advisor assigned to Lead #${oldLead.id} (${oldLead.fullName || 'Unknown'})`
                : `Parent advisor cleared on Lead #${oldLead.id} (${oldLead.fullName || 'Unknown'})`,
              severity: 'info',
              model: 'api::lead.lead',
              category: 'LEAD_FORM',
              leadId: oldLead.id,
              leadName: oldLead.fullName,
              metadata: {
                leadId: oldLead.id,
                leadName: oldLead.fullName,
                field: 'parentAdvisorId',
                oldValue: oldVal || null,
                newValue: newVal || null,
              },
            });
            if (newVal && logger.onLeadAdvisorAssigned) {
              try {
                await logger.onLeadAdvisorAssigned({
                  leadId: oldLead.id,
                  field: 'parentAdvisorId',
                  newAdvisorKey: newVal,
                });
              } catch {
                // non-fatal email side-effect
              }
            }
          }
        }
      },
    });

    // Lead remarks → activity timeline
    strapi.db.lifecycles.subscribe({
      models: ['api::lead-remark.lead-remark'],
      async afterCreate(event) {
        const result = event.result as any;
        if (!result?.leadId) return;
        try {
          const lead = await strapi.db.query('api::lead.lead').findOne({
            where: { id: result.leadId },
          });
          const logger: any = strapi.service('api::system-events.activity-log');
          if (logger?.logEvent) {
            await logger.logEvent({
              action: 'LEAD_REMARK_ADDED',
              description: `Remark added for lead ${result.leadId}${
                lead?.fullName ? ` (${lead.fullName})` : ''
              }`,
              severity: 'info',
              model: 'api::lead-remark.lead-remark',
              leadId: result.leadId,
              leadName: lead?.fullName ?? null,
              metadata: {
                leadId: result.leadId,
                leadName: lead?.fullName ?? null,
              },
            });
          }
        } catch {
          // non-fatal
        }
      },
      async afterUpdate(event) {
        const result = event.result as any;
        if (!result?.leadId) return;
        try {
          const lead = await strapi.db.query('api::lead.lead').findOne({
            where: { id: result.leadId },
          });
          const logger: any = strapi.service('api::system-events.activity-log');
          if (logger?.logEvent) {
            await logger.logEvent({
              action: 'LEAD_REMARK_ADDED',
              description: `Remark updated for lead ${result.leadId}${
                lead?.fullName ? ` (${lead.fullName})` : ''
              }`,
              severity: 'info',
              model: 'api::lead-remark.lead-remark',
              leadId: result.leadId,
              leadName: lead?.fullName ?? null,
              metadata: {
                leadId: result.leadId,
                leadName: lead?.fullName ?? null,
              },
            });
          }
        } catch {
          // non-fatal
        }
      },
    });

    // 6. Global Loan Application Visibility Security (Database Level)
    strapi.db.lifecycles.subscribe({
      models: ['api::loan-application.loan-application'],
      async beforeFindMany(event) {
        const requestContext = (strapi as any).requestContext?.get();
        if (!requestContext) return;

        const user = requestContext.state?.user || requestContext.state?.auth?.credentials;
        if (!user) return;

        const roles = user.roles || [];
        const isAdvisor = roles.some((r: any) =>
          ['strapi-advisor', 'Advisor', 'advisor'].includes(r.code) ||
          ['strapi-advisor', 'Advisor', 'advisor'].includes(r.name)
        );

        if (isAdvisor) {
          const advisorEntry = await strapi.db.query('api::advisor.advisor').findOne({
            where: { email: user.email }
          });

          if (advisorEntry) {
            const advisorID = advisorEntry.id.toString();
            // Get valid Lead IDs for this advisor
            const leads = await strapi.db.query('api::lead.lead').findMany({
              select: ['id'],
              where: { advisorReferralId: advisorID }
            });
            const validIds = leads.map(l => l.id);

            // Apply filter to loan applications by leadId field
            event.params.where = {
              $and: [
                event.params.where || {},
                { leadId: { $in: validIds } }
              ]
            };
          }
        }
      },
      async beforeCount(event) {
        const requestContext = (strapi as any).requestContext?.get();
        if (!requestContext) return;

        const user = requestContext.state?.user || requestContext.state?.auth?.credentials;
        if (!user) return;

        const roles = user.roles || [];
        const isAdvisor = roles.some((r: any) =>
          ['strapi-advisor', 'Advisor', 'advisor'].includes(r.code) ||
          ['strapi-advisor', 'Advisor', 'advisor'].includes(r.name)
        );

        if (isAdvisor) {
          const advisorEntry = await strapi.db.query('api::advisor.advisor').findOne({
            where: { email: user.email }
          });

          if (advisorEntry) {
            const leads = await strapi.db.query('api::lead.lead').findMany({
              select: ['id'],
              where: { advisorReferralId: advisorEntry.id.toString() }
            });
            const validIds = leads.map(l => l.id);

            event.params.where = {
              $and: [
                event.params.where || {},
                { leadId: { $in: validIds } }
              ]
            };
          }
        }
      },
      async beforeUpdate(event) {
        const { params } = event;
        const { where, data } = params;
        if (!data) return;

        const statusChanging = Object.prototype.hasOwnProperty.call(data, 'status');
        const staffChanging = Object.prototype.hasOwnProperty.call(data, 'assignedStaffId');
        const bankerChanging = Object.prototype.hasOwnProperty.call(data, 'assignedBankerId');
        if (!statusChanging && !staffChanging && !bankerChanging) return;

        try {
          const existing = await strapi.db
            .query('api::loan-application.loan-application')
            .findOne({ where });
          if (!existing) return;

          const logger: any = strapi.service('api::system-events.activity-log');
          if (!logger?.logEvent) return;

          let leadName: string | null = null;
          if (existing.leadId != null) {
            const lead = await strapi.db.query('api::lead.lead').findOne({
              where: { id: existing.leadId },
            });
            leadName = lead?.fullName ?? null;
          }

          const leadId = existing.leadId ?? null;

          if (statusChanging && existing.status !== data.status) {
            await logger.logEvent({
              action: 'LOAN_STATUS_CHANGED',
              description: `Loan application ${existing.id} status updated from ${existing.status} to ${data.status}`,
              severity: 'info',
              model: 'api::loan-application.loan-application',
              leadId,
              leadName,
              metadata: {
                loanApplicationId: existing.id,
                leadId,
                leadName,
                oldStatus: existing.status,
                newStatus: data.status,
              },
            });
          }

          const norm = (v: unknown) =>
            v === undefined || v === null || v === '' ? null : String(v);
          const oldStaff = norm(existing.assignedStaffId);
          const newStaff = staffChanging ? norm(data.assignedStaffId) : oldStaff;
          const oldBanker = norm(existing.assignedBankerId);
          const newBanker = bankerChanging ? norm(data.assignedBankerId) : oldBanker;

          if (
            (staffChanging && oldStaff !== newStaff) ||
            (bankerChanging && oldBanker !== newBanker)
          ) {
            const who =
              leadId != null
                ? `Lead #${leadId}${leadName ? ` (${leadName})` : ''}`
                : `loan application ${existing.id}`;
            const parts: string[] = [];
            if (staffChanging && oldStaff !== newStaff) {
              parts.push(
                newStaff
                  ? `Staff assigned to ${who}`
                  : `Staff cleared on ${who}`
              );
            }
            if (bankerChanging && oldBanker !== newBanker) {
              parts.push(
                newBanker
                  ? `Banker assigned to ${who}`
                  : `Banker cleared on ${who}`
              );
            }
            const description =
              parts.length > 0
                ? parts.join(' · ')
                : `Assignment updated on ${who}`;

            await logger.logEventDeduped({
              action: 'LOAN_ASSIGNMENT_CHANGED',
              description,
              severity: 'info',
              model: 'api::loan-application.loan-application',
              leadId,
              leadName,
              metadata: {
                loanApplicationId: existing.id,
                leadId,
                leadName,
                oldAssignedStaffId: oldStaff,
                newAssignedStaffId: newStaff,
                oldAssignedBankerId: oldBanker,
                newAssignedBankerId: newBanker,
              },
            });

            const emailStaffId =
              staffChanging && oldStaff !== newStaff && newStaff
                ? newStaff
                : null;
            const emailBankerId =
              bankerChanging && oldBanker !== newBanker && newBanker
                ? newBanker
                : null;
            if (
              (emailStaffId || emailBankerId) &&
              logger.onLoanStaffBankerAssigned
            ) {
              try {
                await logger.onLoanStaffBankerAssigned({
                  loanApplicationId: existing.id,
                  staffId: emailStaffId,
                  bankerId: emailBankerId,
                });
              } catch {
                // non-fatal email side-effect
              }
            }
          }
        } catch {
          // non-fatal
        }
      },
    });

    // Global Setting — maintenance mode toggle
    strapi.db.lifecycles.subscribe({
      models: ['api::global-setting.global-setting'],
      async beforeUpdate(event) {
        const { params } = event;
        const { where, data } = params;
        if (!data || !Object.prototype.hasOwnProperty.call(data, 'maintenanceModeIsEnabled')) {
          return;
        }
        try {
          const existing = await strapi.db
            .query('api::global-setting.global-setting')
            .findOne({ where });
          if (!existing) return;
          if (existing.maintenanceModeIsEnabled === data.maintenanceModeIsEnabled) return;

          const logger: any = strapi.service('api::system-events.activity-log');
          if (logger?.logEvent) {
            await logger.logEvent({
              action: 'MAINTENANCE_TOGGLED',
              description: `Maintenance mode ${data.maintenanceModeIsEnabled ? 'enabled' : 'disabled'}`,
              severity: 'warning',
              model: 'api::global-setting.global-setting',
              metadata: {
                oldValue: existing.maintenanceModeIsEnabled,
                newValue: data.maintenanceModeIsEnabled,
              },
            });
          }
        } catch {
          // non-fatal
        }
      },
    });

    // 7. Robust Maintenance: Ensure Single Types are unique and published
    const repairSingleTypes = async () => {
      const singleTypes = [
        'api::lead-form-page.lead-form-page',
        'api::loan-application-page.loan-application-page',
        'api::homepage.homepage',
        'api::product-page.product-page',
        'api::about-us-page.about-us-page',
        'api::contact-us-page.contact-us-page',
        'api::advisor-registration-page.advisor-registration-page',
        'api::footer.footer',
        'api::header.header',
        'api::global-setting.global-setting'
      ];

      for (const uid of singleTypes) {
        try {
          const entries = await strapi.db.query(uid).findMany({
            orderBy: { id: 'asc' }
          });

          if (entries.length > 1) {
            // Only keep the oldest entry (id 1 usually)
            const [bestEntry, ...toDelete] = entries;
            const idsToDelete = toDelete.map((e: any) => e.id);
            await strapi.db.query(uid).deleteMany({
              where: { id: { $in: idsToDelete } }
            });
            console.log(`[Repair] Purged ${idsToDelete.length} duplicates for ${uid}. Kept ID: ${bestEntry.id}`);
            
            // Ensure bestEntry is published
            if (!bestEntry.publishedAt) {
               await strapi.db.query(uid).update({
                  where: { id: bestEntry.id },
                  data: { publishedAt: new Date() }
               });
            }
          } else if (entries.length === 1) {
             const entry = entries[0];
             if (!entry.publishedAt) {
                await strapi.db.query(uid).update({
                   where: { id: entry.id },
                   data: { publishedAt: new Date() }
                });
                console.log(`[Repair] Published existing draft for ${uid}`);
             }
          } else if (entries.length === 0) {
             // Create initial record ONLY if it really is missing
             const contentType = strapi.contentType(uid as any);
             const defaults: any = {};
             for (const [key, attr] of Object.entries(contentType?.attributes || {})) {
               if ((attr as any).default !== undefined) defaults[key] = (attr as any).default;
             }
             await strapi.db.query(uid).create({
                data: { ...defaults, publishedAt: new Date() }
             });
             console.log(`[Repair] Re-initialized missing entry for ${uid}`);
          }
        } catch (err: any) {
          console.error(`[Repair Error] Failed to sync ${uid}:`, err.message);
        }
      }
    };

    await repairSingleTypes();

    const { bootstrapApiUploadsMirror } = await import(
      './api/loan-application/services/api-uploads-mirror'
    );
    await bootstrapApiUploadsMirror(strapi);

    const { startAutomationTestingSuite } = await import('./utils/start-suite-dashboard');
    await startAutomationTestingSuite(strapi);

    // console.log('[Bootstrap] Initialization completed.');
    // Force sync v2
  },
};
