import { factories } from '@strapi/strapi';

import { resolveAdvisorLoginLink } from '../../../utils/admin-spa-path';

/**
 * Patch advisorLoginLink on Header responses so legacy `/admin/auth/login`
 * (or empty) resolves to the current Admin SPA path from config.
 */
function patchAdvisorLoginLink(strapi: any, body: any): void {
  if (!body || typeof body !== 'object') return;

  const apply = (entry: any) => {
    if (!entry || typeof entry !== 'object') return;
    if ('advisorLoginLink' in entry) {
      entry.advisorLoginLink = resolveAdvisorLoginLink(strapi, entry.advisorLoginLink);
    }
    if (
      entry.attributes &&
      typeof entry.attributes === 'object' &&
      'advisorLoginLink' in entry.attributes
    ) {
      entry.attributes.advisorLoginLink = resolveAdvisorLoginLink(
        strapi,
        entry.attributes.advisorLoginLink
      );
    }
  };

  if (body.data !== undefined) {
    if (Array.isArray(body.data)) {
      body.data.forEach(apply);
    } else {
      apply(body.data);
    }
  } else {
    apply(body);
  }
}

export default factories.createCoreController('api::header.header', ({ strapi }) => ({
  async find(ctx) {
    // Core single-type find via service (avoids fragile `super` binding).
    const sanitizedQuery = await this.sanitizeQuery(ctx);
    const entity = await strapi.service('api::header.header').find(sanitizedQuery);
    if (!entity) {
      return ctx.notFound();
    }
    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    const response = this.transformResponse(sanitizedEntity);
    try {
      patchAdvisorLoginLink(strapi, response);
    } catch {
      // never break Header fetch over link rewrite
    }
    return response;
  },
}));
