import './bootstrap/injectEarlyCSS'; // runs at module eval time — before React renders
import type { StrapiApp } from '@strapi/strapi/admin';
import { appConfig } from './bootstrap/appConfig';
import { installFetchInterceptor } from './bootstrap/fetchInterceptor';
import { syncSessionRole } from './bootstrap/sessionRoleResolver';
import { registerClickHandlers } from './bootstrap/clickHandlers';
import { startDomOverrides } from './bootstrap/domOverrides';

export default {
    config: appConfig,
    bootstrap(_app: StrapiApp) {
        installFetchInterceptor();
        // Expose so the fetch interceptor can re-sync on token change (new login)
        (window as any)._syncSessionRole = syncSessionRole;
        syncSessionRole();

        if (typeof window !== 'undefined') {
            registerClickHandlers();
            startDomOverrides();
        }
    },
};
