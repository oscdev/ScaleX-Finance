async function run() {
    const strapi = require('@strapi/strapi');
    const app = await strapi().load();

    const roleService = app.plugin('users-permissions').service('role');
    const roles = await roleService.find();

    const publicRole = roles.find(r => r.type === 'public');
    if (publicRole) {
        // console.log(`Setting permissions for Public role (ID: ${publicRole.id})...`);
        const requiredPermissions = [
            'api::advisor.advisor.create',
            'api::lead.lead.create',
            'api::loan-application.loan-application.create',
            'api::header.header.find',
            'api::footer.footer.find',
            'api::homepage.homepage.find',
            'api::lender.lender.find',
            'api::lenders-page.lenders-page.find',
            'api::lead-form-page.lead-form-page.find',
            'api::loan-application-page.loan-application-page.find',
            'api::axis-bank-page.axis-bank-page.find',
            'api::hdfc-bank-page.hdfc-bank-page.find',
            'api::about-us-page.about-us-page.find',
            'api::contact-us-page.contact-us-page.find'
        ];

        const existingPermissions = await app.db.query('plugin::users-permissions.permission').findMany({
            where: { role: publicRole.id }
        });

        for (const action of requiredPermissions) {
            const hasPerm = existingPermissions.find(p => p.action === action);
            if (!hasPerm) {
                await app.db.query('plugin::users-permissions.permission').create({
                    data: { action, role: publicRole.id }
                });
                // console.log(`✓ Permission granted: ${action}`);
            } else {
                // console.log(`- Permission already exists: ${action}`);
            }
        }
    }

    // console.log('Permission setup complete.');
    process.exit(0);
}

run().catch(err => {
    // console.error('Fatal Error during permission setup:', err);
    process.exit(1);
});
