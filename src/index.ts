import type { Core } from '@strapi/strapi';
import { getEmailTemplate } from './email-templates';

const createAdminUserFromAdvisor = async (strapi: Core.Strapi, advisor: any, rawPassword?: string) => {
  if (advisor.advisorStatus === 'Approved') {
    const { email, fullName, password } = advisor;

    try {
      const adminUserService = strapi.service('admin::user');
      const existingUser = await adminUserService.findOneByEmail(email);

      if (existingUser) {
        if (!existingUser.isActive) {
          await adminUserService.updateById(existingUser.id, { isActive: true });
        }
        return;
      }

      // Use strapi.db.query for more direct control on Admin Roles
      const advisorRole = await strapi.db.query('admin::role').findOne({
        where: { code: 'strapi-advisor' }
      });

      if (!advisorRole) {
        // console.error('[Advisor Approval Sync] CRITICAL: strapi-advisor role missing.');
        return;
      }

      const names = (fullName || '').trim().split(/\s+/);
      const firstname = names[0] || 'Advisor';
      const lastname = names.length > 1 ? names.slice(1).join(' ') : (names[0] || 'User');

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

      // console.log(`[Advisor Approval Sync] SUCCESS: Admin User created for ${email}`);
    } catch (err: any) {
      // console.error(`[Advisor Approval Sync] FAILED for ${email}:`, err?.message || err);
    }
  }
};

export default {
  register({ strapi }: { strapi: Core.Strapi }) { },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // console.log('[Bootstrap] Initialization started...');

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

    // 3. Register Global Lifecycle
    strapi.db.lifecycles.subscribe({
      models: ['api::advisor.advisor'],
      async afterCreate(event) {
        const { result } = event;
        await createAdminUserFromAdvisor(strapi, result, (event.params as any)?.data?.password);
      },
      async afterUpdate(event) {
        const { result } = event;
        await createAdminUserFromAdvisor(strapi, result, (event.params as any)?.data?.password);
      },
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
          { action: 'api::lender.lender.find', role: publicRole.id },
          { action: 'api::lenders-page.lenders-page.find', role: publicRole.id },
          { action: 'api::about-us-page.about-us-page.find', role: publicRole.id },
          { action: 'api::contact-us-page.contact-us-page.find', role: publicRole.id },
          { action: 'api::axis-bank-page.axis-bank-page.find', role: publicRole.id },
          { action: 'api::hdfc-bank-page.hdfc-bank-page.find', role: publicRole.id },
          { action: 'api::activity-log.activity-log.createLog', role: publicRole.id },
          { action: 'plugin::upload.content-api.upload', role: publicRole.id },
          { action: 'plugin::upload.upload', role: publicRole.id }
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
            loggingIsEnabled: true,
            retentionDays: 30,
            publishedAt: new Date()
          }
        });
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

          // Grant Loan Application permissions if missing
          const loanAppActions = [
            'plugin::content-manager.explorer.read',
            'plugin::content-manager.explorer.create',
            'plugin::content-manager.explorer.update'
          ];

          for (const action of loanAppActions) {
            const existing = await strapi.db.query('admin::permission').findOne({
              where: {
                action,
                subject: 'api::loan-application.loan-application'
              }
            });

            if (existing) {
              const linked = await strapi.db.connection('admin_permissions_role_lnk')
                .where({ permission_id: existing.id, role_id: dbAdvisorRole.id })
                .first();

              if (!linked) {
                await strapi.db.connection('admin_permissions_role_lnk').insert({
                  permission_id: existing.id,
                  role_id: dbAdvisorRole.id
                });
                // console.log(`[Permission Sync] Linked ${action} for Loan Application to Advisor role`);
              }
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

    // 4. Content API Public Permissions for Activity Logs (for the Notification Bell)
    try {
      const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'public' } });
      const authRole = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });

      const actions = [
        'api::activity-log.activity-log.find',
        'api::activity-log.activity-log.findOne',
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
      async afterCreate(event) {
        const { result } = event;
        const logger: any = strapi.service('api::activity-log.activity-log');
        if (logger) {
          await logger.logEvent({
            action: 'LEAD_CREATED',
            description: `New lead created: ${result.fullName}`,
            severity: 'info',
            model: 'api::lead.lead',
            metadata: { leadId: result.id, data: result }
          });
        }

        let emailsEnabled = true;
        try {
          const globalSetting = await strapi.db.query('api::global-setting.global-setting').findOne({});
          if (globalSetting && globalSetting.emailsIsEnabled === false) {
            emailsEnabled = false;
          }
        } catch (err) {
          // Proceed with default true if global settings fail to load
        }

        if (!emailsEnabled) {
          if (logger) {
            await logger.logEvent({
              action: 'EMAIL_SKIPPED',
              description: `Emails are globally disabled. System bypassed email notifications for Lead ${result.fullName}.`,
              severity: 'info',
              model: 'global-setting'
            });
          }
          return;
        }

        // ✉️ 1. Send Welcome Email to Lead (Only if opted in)
        try {
          if (result.email && result.getEmailNotification === true) {
            const welcomeHtml = getEmailTemplate('welcome-lead', {
              fullName: result.fullName,
              requiredAmount: result.requiredAmount || 'TBD',
              productType: result.selectedProduct || 'TBD',
              leadId: result.id
            });

            const subject = 'Your Loan Inquiry with ScaleX Finance';
            await strapi.plugins['email'].services.email.send({
              to: result.email,
              subject: subject,
              html: welcomeHtml,
            });

            if (logger) {
              await logger.logEvent({
                action: 'EMAIL_DISPATCHED',
                description: `Welcome email dispatched to lead: ${result.email}`,
                severity: 'info',
                model: 'email-service',
                metadata: { template: 'welcome-lead', recipient: result.email, status: 'success', subject }
              });
            }
          } else if (result.email && result.getEmailNotification === false) {
             if (logger) {
              await logger.logEvent({
                action: 'EMAIL_SKIPPED',
                description: `Lead opted out of email notifications: ${result.fullName}`,
                severity: 'info',
                model: 'lead'
              });
            }
          }
        } catch (emailError: any) {
          if (logger) {
            await logger.logEvent({
              action: 'EMAIL_DISPATCHED',
              description: `CRITICAL: Welcome email failed for ${result.email}`,
              severity: 'error',
              model: 'email-service',
              metadata: { template: 'welcome-lead', recipient: result.email, status: 'failure', error: emailError.message }
            });
          }
        }

        // ✉️ 2. Notify the Advisor
        try {
          if (result.advisorReferralId) {
            const advisor = await strapi.db.query('api::advisor.advisor').findOne({
              where: { id: result.advisorReferralId }
            });

            if (advisor && advisor.email) {
              const notifyHtml = getEmailTemplate('advisor-notification', {
                advisorName: advisor.fullName || 'Advisor',
                leadName: result.fullName,
                amount: result.requiredAmount || 'N/A',
                productType: result.selectedProduct || 'TBD',
                mobile: result.mobileNumber || 'N/A',
                city: result.pinCode || 'N/A'
              });

              const subject = `New Lead Assigned: ${result.fullName}`;
              await strapi.plugins['email'].services.email.send({
                to: advisor.email,
                subject: subject,
                html: notifyHtml,
              });

              if (logger) {
                await logger.logEvent({
                  action: 'EMAIL_DISPATCHED',
                  description: `Advisor notification dispatched for lead: ${result.fullName}`,
                  severity: 'info',
                  model: 'email-service',
                  metadata: { template: 'advisor-notification', recipient: advisor.email, advisorId: advisor.id, status: 'success', subject }
                });
              }
            }
          }
        } catch (err: any) {
          if (logger) {
            await logger.logEvent({
              action: 'EMAIL_DISPATCHED',
              description: `CRITICAL: Advisor notification failed for lead: ${result.fullName}`,
              severity: 'error',
              model: 'email-service',
              metadata: { template: 'advisor-notification', status: 'failure', error: err.message }
            });
          }
        }
      },
      async beforeUpdate(event) {
        const { params } = event;
        const { where, data } = params;

        if (data.leadStatus) {
          const oldLead = await strapi.db.query('api::lead.lead').findOne({ where });
          if (oldLead && oldLead.leadStatus !== data.leadStatus) {
            const logger: any = strapi.service('api::activity-log.activity-log');
            if (logger) {
              await logger.logEvent({
                action: 'LEAD_STATUS_CHANGED',
                description: `Lead status updated from ${oldLead.leadStatus} to ${data.leadStatus} for ${oldLead.fullName}`,
                severity: 'info',
                model: 'api::lead.lead',
                metadata: {
                  leadId: oldLead.id,
                  oldStatus: oldLead.leadStatus,
                  newStatus: data.leadStatus
                }
              });
            }
          }
        }
      }
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

            // Apply filter to loan applications
            event.params.where = {
              $and: [
                event.params.where || {},
                { id: { $in: validIds } }
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
                { id: { $in: validIds } }
              ]
            };
          }
        }
      }
    });

    // 7. Robust Maintenance: Ensure Single Types are unique and published
    const repairSingleTypes = async () => {
      const singleTypes = [
        'api::lead-form-page.lead-form-page',
        'api::loan-application-page.loan-application-page',
        'api::homepage.homepage',
        'api::product-page.product-page',
        'api::lenders-page.lenders-page',
        'api::about-us-page.about-us-page',
        'api::contact-us-page.contact-us-page',
        'api::advisor-registration-page.advisor-registration-page',
        'api::axis-bank-page.axis-bank-page',
        'api::hdfc-bank-page.hdfc-bank-page',
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
    // console.log('[Bootstrap] Initialization completed.');

    // console.log('[Bootstrap] Initialization completed.');
    // Force sync v2
  },
};
