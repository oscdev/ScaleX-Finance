import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::loan-application.loan-application', ({ strapi }) => ({
    async create(ctx: any) {
        const { data } = ctx.request.body;
        let createdRecord: any = null;
        let result: any = null;

        // 1. Snapshot uploaded file IDs before Strapi native mutation
        const fileIds: Set<number> = new Set();
        const mediaFields = ['panCard', 'aadharCardFront', 'aadharCardBack', 'proprietorshipDoc', 'businessRegProofDoc', 'bankStatement', 'salarySlips', 'coAppPan', 'coAppAadharFront', 'coAppAadharBack', 'propertyPapers', 'otherDocs'];
        
        if (data) {
            for (const field of mediaFields) {
                if (data[field]) {
                    const val = data[field];
                    if (Array.isArray(val)) {
                        val.forEach((id: any) => { if (id) fileIds.add(parseInt(id, 10)); });
                    } else if (val && typeof val !== 'object') {
                        fileIds.add(parseInt(val, 10));
                    } else if (val && val.id) {
                        fileIds.add(parseInt(val.id, 10)); // Defensive catch
                    }
                }
            }
        }

        // If ID is provided (passed from Lead form), we use the database query directly
        // to bypass Strapi's automatic ID generation which usually ignores user-provided IDs.
        if (data && data.id) {
            try {
                // Check if already exists to avoid conflict
                const existing = await strapi.db.query('api::loan-application.loan-application').findOne({
                    where: { id: data.id }
                });

                if (existing) {
                    result = await super.create(ctx);
                } else {
                    const entry = await strapi.db.query('api::loan-application.loan-application').create({
                        data: data
                    });
                    // Return in Strapi format
                    result = { data: entry };
                    createdRecord = entry;
                }
            } catch (err) {
                // Fallback to default if something goes wrong
                result = await super.create(ctx);
            }
        } else {
            result = await super.create(ctx);
        }

        // Determine createdRecord from result if using super.create
        if (!createdRecord && result && result.data) {
            // Strapi standard format often places attributes inside .data or .data.attributes depending on version
            createdRecord = result.data.attributes || result.data;
            if (!createdRecord.id && result.data.id) {
                createdRecord.id = result.data.id;
            }
        }

        // Post-Creation: Move Documents into Specific Media Library Folder
        if (createdRecord) {
            try {
                const leadId = data.leadId || createdRecord.leadId || 'Unknown_Lead';
                const applicantName = data.applicantName || createdRecord.applicantName || 'Applicant';
                
                // Clean folder name to prevent errors with special characters
                const folderName = `${leadId}-${applicantName}`.replace(/[^a-zA-Z0-9.\- ]/g, '').trim();

                if (fileIds.size > 0) {
                    // 2. Get or Create Root Folder 'API Uploads'
                    let rootFolder = await strapi.db.query('plugin::upload.folder').findOne({
                        where: { name: 'API Uploads', parent: null }
                    });

                    const folderService = strapi.plugin('upload').service('folder');

                    if (!rootFolder) {
                        try {
                            rootFolder = await folderService.create({ name: 'API Uploads', parent: null });
                        } catch (e) {
                            rootFolder = await strapi.db.query('plugin::upload.folder').findOne({ where: { name: 'API Uploads', parent: null } });
                        }
                    }

                    if (rootFolder) {
                        // 3. Get or Create Lead Specific Folder inside 'API Uploads'
                        let leadFolder = await strapi.db.query('plugin::upload.folder').findOne({
                            where: { name: folderName, parent: rootFolder.id }
                        });

                        if (!leadFolder) {
                            try {
                                leadFolder = await folderService.create({ name: folderName, parent: rootFolder.id });
                            } catch (e) {
                                leadFolder = await strapi.db.query('plugin::upload.folder').findOne({ where: { name: folderName, parent: rootFolder.id } });
                            }
                        }

                        if (leadFolder) {
                            // 4. Critical Step: Update both folder relation AND folderPath for UI visibility
                            // Using entityService ensures pivot tables and relations are correctly managed
                            for (const fileId of fileIds) {
                                try {
                                    await strapi.entityService.update('plugin::upload.file', fileId, {
                                        data: { 
                                            folder: leadFolder.id,
                                            folderPath: leadFolder.path
                                        }
                                    });
                                } catch (updateErr) {
                                    console.error(`[LoanApp] Failed to link file ${fileId} to folder ${folderName}:`, updateErr);
                                }
                            }
                            console.log(`[LoanApp] Successfully moved ${fileIds.size} files into Media Library folder: API Uploads/${folderName}`);
                        }
                    }
                }
            } catch (err) {
                console.error('[LoanApp] Error organizing uploaded documents into folder:', err);
            }
        }

        return result;
    }
}));
