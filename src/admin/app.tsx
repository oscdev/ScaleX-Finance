import './bootstrap/injectEarlyCSS'; // runs at module eval time — before React renders
import type { StrapiApp } from '@strapi/strapi/admin';
import { appConfig } from './bootstrap/appConfig';
import { installFetchInterceptor } from './bootstrap/fetchInterceptor';
import { syncAdvisorSession } from './bootstrap/advisorSession';
import { registerClickHandlers } from './bootstrap/clickHandlers';
import { startDomOverrides } from './bootstrap/domOverrides';

export default {
    config: appConfig,
    bootstrap(_app: StrapiApp) {
        installFetchInterceptor();
        syncAdvisorSession();

        if (typeof window !== 'undefined') {
            registerClickHandlers();
            startDomOverrides();
        }
    },
};
