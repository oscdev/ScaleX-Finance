export default {
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
    },

    async afterUpdate(event: any) {
        const { result } = event;

        try {
            // Always fetch fresh data to ensure we have all fields (like password)
            const advisor = await strapi.db.query('api::advisor.advisor').findOne({
                where: { id: result.id }
            });

            if (!advisor) return;

            // 1. Handle advisorId backfill
            if (!advisor.advisorId) {
                await strapi.db.query('api::advisor.advisor').update({
                    where: { id: advisor.id },
                    data: { advisorId: `ADV${advisor.id}` },
                });
            }

            if (advisor.advisorStatus !== 'Approved') return;

            // 2. Sync with Admin Users
            strapi.log.info(`[Advisor Lifecycle] Syncing Admin User for advisor: ${advisor.email}`);

            const advisorRole = await strapi.db.query('admin::role').findOne({ 
                where: { 
                    $or: [
                        { name: 'Advisor' },
                        { code: 'advisor' },
                        { name: 'advisor' }
                    ]
                } 
            });

            if (!advisorRole) {
                strapi.log.error('[Advisor Lifecycle] "Advisor" role not found.');
                return;
            }

            const existingAdmin = await strapi.db.query('admin::user').findOne({ 
                where: { email: advisor.email } 
            });

            const hashedPassword = await strapi.service('admin::user').hashPassword(advisor.password);

            if (existingAdmin) {
                await strapi.db.query('admin::user').update({
                    where: { id: existingAdmin.id },
                    data: {
                        password: hashedPassword,
                        roles: [advisorRole.id],
                        isActive: true
                    }
                });
                strapi.log.info(`[Advisor Lifecycle] Updated existing Admin User for ${advisor.email}`);
            } else {
                await strapi.db.query('admin::user').create({
                    data: {
                        id: advisor.id,
                        email: advisor.email,
                        password: hashedPassword,
                        firstname: advisor.fullName.split(' ')[0] || 'Advisor',
                        lastname: advisor.fullName.split(' ').slice(1).join(' ') || 'User',
                        roles: [advisorRole.id],
                        isActive: true,
                        registrationToken: null,
                    }
                });
                strapi.log.info(`[Advisor Lifecycle] Created new Admin User with ID ${advisor.id} for ${advisor.email}`);
            }
        } catch (err) {
            strapi.log.error('[Advisor Lifecycle] Sync failed:', err);
        }
    },
};
