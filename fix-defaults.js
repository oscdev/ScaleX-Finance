
module.exports = async ({ strapi }) => {
  const singleTypesToSync = [
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

  console.log(`[Script] Starting sync for ${singleTypesToSync.length} single types...`);
  
  for (const uid of singleTypesToSync) {
    try {
      const contentType = strapi.contentType(uid);
      if (!contentType) {
        console.log(`[Script] Content type ${uid} not found. Skipping.`);
        continue;
      }

      const entries = await strapi.db.query(uid).findMany({});
      const schemaAttributes = contentType.attributes;
      const defaultData = {};
      
      for (const [key, attr] of Object.entries(schemaAttributes)) {
        if (attr.default !== undefined) {
           defaultData[key] = attr.default;
        }
      }

      if (Object.keys(defaultData).length === 0) {
        // console.log(`[Script] ${uid}: No default values found in schema.`);
        continue;
      }

      if (entries.length === 0) {
         await strapi.db.query(uid).create({
            data: { ...defaultData, publishedAt: new Date() }
         });
         console.log(`[Script] ${uid}: Created initial entry with defaults.`);
      } else {
         for (const existing of entries) {
            const specificUpdate = {};
            let hasNewData = false;
            for (const [key, defaultValue] of Object.entries(defaultData)) {
               const currentValue = existing[key];
               if (currentValue === null || currentValue === undefined || (typeof currentValue === 'string' && currentValue.trim() === '')) {
                  specificUpdate[key] = defaultValue;
                  hasNewData = true;
               }
            }
            if (hasNewData) {
               const updatePayload = { ...specificUpdate };
               if (!existing.publishedAt && !contentType.options.draftAndPublish) {
                  updatePayload.publishedAt = new Date();
               }
               await strapi.db.query(uid).update({
                  where: { id: existing.id },
                  data: updatePayload
               });
               console.log(`[Script] ${uid}: Updated ID ${existing.id} with ${Object.keys(specificUpdate).length} fields.`);
            }
         }
      }
    } catch (err) {
      console.error(`[Script] ${uid}: Error:`, err.message);
    }
  }
  console.log(`[Script] Finished all syncs.`);
};
