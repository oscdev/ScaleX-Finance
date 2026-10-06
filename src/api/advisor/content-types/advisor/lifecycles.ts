import { applyPasswordHashToLifecycleData } from '../../utils/hash-advisor-password';
import { syncApprovedAdvisorToAdmin } from '../../utils/sync-admin-user';

export default {
    async beforeCreate(event: any) {
        try {
            await applyPasswordHashToLifecycleData(strapi, event.params?.data, { required: true });
        } catch (err) {
            strapi.log.error('[Advisor Lifecycle] Password hash on create failed:', err);
            throw err;
        }
    },

    async beforeUpdate(event: any) {
        try {
            await applyPasswordHashToLifecycleData(strapi, event.params?.data, { required: false });
        } catch (err) {
            strapi.log.error('[Advisor Lifecycle] Password hash on update failed:', err);
            throw err;
        }
    },

    async afterCreate(event: any) {
        const { result } = event;

        try {
            await strapi.db.query('api::advisor.advisor').update({
                where: { id: result.id },
                data: { advisorId: `ADV${result.id}` },
            });
        } catch (err) {
            strapi.log.error('[Advisor Lifecycle] Failed to set advisorId:', err);
        }

        try {
            if (result?.advisorStatus === 'Approved') {
                await syncApprovedAdvisorToAdmin(strapi, result);
            }
        } catch (err) {
            strapi.log.error('[Advisor Lifecycle] Admin sync after create failed:', err);
        }
    },

    async afterUpdate(event: any) {
        const { result } = event;

        try {
            const advisor = await strapi.db.query('api::advisor.advisor').findOne({
                where: { id: result.id },
            });

            if (!advisor) return;

            if (!advisor.advisorId) {
                await strapi.db.query('api::advisor.advisor').update({
                    where: { id: advisor.id },
                    data: { advisorId: `ADV${advisor.id}` },
                });
            }

            if (advisor.advisorStatus !== 'Approved') return;

            strapi.log.info(`[Advisor Lifecycle] Syncing Admin User for advisor: ${advisor.email}`);
            await syncApprovedAdvisorToAdmin(strapi, advisor);
        } catch (err) {
            strapi.log.error('[Advisor Lifecycle] Sync failed:', err);
        }
    },
};
