import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::loan-application.loan-application', ({ strapi }) => ({
    async create(ctx: any) {
        const { data } = ctx.request.body;

        // If ID is provided (passed from Lead form), we use the database query directly
        // to bypass Strapi's automatic ID generation which usually ignores user-provided IDs.
        if (data && data.id) {
            // console.log(`[LoanApp] Creating record with manual ID: ${data.id}`);
            // // console.log(`[LoanApp] Creating record with manual ID: ${data.id}`);
            
            try {
                // Check if already exists to avoid conflict
                const existing = await strapi.db.query('api::loan-application.loan-application').findOne({
                    where: { id: data.id }
                });

                if (existing) {
                    // console.warn(`[LoanApp] Record with ID ${data.id} already exists. Falling back to default creation.`);
                    return await super.create(ctx);
                }

                const entry = await strapi.db.query('api::loan-application.loan-application').create({
                    data: data
                });

                // Return in Strapi format
                return { data: entry };
            } catch (err) {
                // console.error('[LoanApp] Error during manual ID creation:', err);
                // Fallback to default if something goes wrong
                return await super.create(ctx);
            }
        }

        return await super.create(ctx);
    }
}));
