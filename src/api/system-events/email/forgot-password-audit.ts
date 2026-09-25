import type { Core } from '@strapi/strapi';
import {
  logEmailDispatched,
  logEmailFailed,
  type EmailAuditRole,
} from './email-audit';

type AdminRole = { code?: string; name?: string };

function auditRoleFromAdminRoles(
  roles: AdminRole[] | null | undefined
): EmailAuditRole {
  const list = roles || [];
  const blob = list
    .map((r) => `${r.code || ''} ${r.name || ''}`.toLowerCase())
    .join(' ');
  if (blob.includes('banker')) return 'banker';
  if (blob.includes('staff')) return 'staff';
  if (blob.includes('advisor')) return 'advisor';
  return 'admin';
}

/**
 * Replace admin forgotPassword so SMTP outcomes are audited as EMAIL_*
 * (Activity Log Email tab). Not gated by emailsIsEnabled — same as Strapi path.
 */
export function installAdminForgotPasswordAudit(strapi: Core.Strapi): void {
  const authService = strapi.service('admin::auth') as {
    forgotPassword?: (params?: { email?: string }) => Promise<unknown>;
  };
  if (!authService?.forgotPassword) {
    strapi.log.warn(
      '[email] admin::auth.forgotPassword missing — skip forgot-password audit wrap'
    );
    return;
  }

  authService.forgotPassword = async ({ email } = {}) => {
    const emailNorm = String(email || '').trim();
    if (!emailNorm) return;

    const user = await strapi.db.query('admin::user').findOne({
      where: { email: emailNorm, isActive: true },
      populate: { roles: { select: ['code', 'name'] } },
    });
    if (!user) {
      return;
    }

    const tokenService = strapi.service('admin::token') as {
      createToken: () => string;
    };
    const userService = strapi.service('admin::user') as {
      updateById: (
        id: number | string,
        data: Record<string, unknown>
      ) => Promise<unknown>;
    };

    const resetPasswordToken = tokenService.createToken();
    await userService.updateById(user.id, { resetPasswordToken });

    const url = `${strapi.config.get('admin.absoluteUrl')}/auth/reset-password?code=${resetPasswordToken}`;
    const emailTemplate = strapi.config.get(
      'admin.forgotPassword.emailTemplate'
    ) as { subject?: string; html?: string; text?: string };

    const subject =
      String(emailTemplate?.subject || '').trim() ||
      'Reset your ScaleX Finance password';
    const to = String(user.email || emailNorm).trim();
    const name =
      [user.firstname, user.lastname].filter(Boolean).join(' ').trim() ||
      'User';
    const lead = { fullName: name, email: to };
    const auditRole = auditRoleFromAdminRoles(
      user.roles as AdminRole[] | undefined
    );

    const extraMeta: Record<string, unknown> = {
      role: auditRole,
      adminUserId: user.id,
      recipientName: name,
    };

    if (auditRole === 'advisor') {
      try {
        const matched = await strapi.db.query('api::advisor.advisor').findOne({
          where: { email: to },
        });
        if (matched) {
          const code = String(matched.advisorId || '').trim();
          extraMeta.advisorId = code || `ADV${matched.id}`;
        }
      } catch {
        // keep adminUserId only
      }
    }

    try {
      await strapi.plugin('email').service('email').sendTemplatedEmail(
        {
          to,
          from: strapi.config.get('admin.forgotPassword.from'),
          replyTo: strapi.config.get('admin.forgotPassword.replyTo'),
        },
        emailTemplate,
        {
          url,
          user: {
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            username: user.username,
          },
        }
      );

      await logEmailDispatched(strapi, {
        lead,
        to,
        subject,
        template: 'forgot-password',
        description: `Forgot-password email dispatched to ${to}`,
        extraMeta,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      strapi.log.error(err);
      await logEmailFailed(strapi, {
        lead,
        error: message,
        description: `CRITICAL: Forgot-password email failed for ${to}`,
        to,
        subject,
        template: 'forgot-password',
        includeSmtpEnv: true,
        extraMeta,
      });
    }
  };

  strapi.log.info('[email] admin forgotPassword audit wrap installed');
}
