import { strapiPublicApi } from './strapi';

export type LogSeverity = 'info' | 'warning' | 'error' | 'critical';

export const logEvent = async (params: {
    action: string;
    description?: string;
    severity?: LogSeverity;
    model?: string;
    metadata?: any;
    userId?: string;
}) => {
    try {
        // Skip logs in production if they are just info (optional)
        // if (process.env.NODE_ENV === 'production' && params.severity === 'info') return;

        await fetch(strapiPublicApi('/api/activity-logs/log'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...params,
                severity: params.severity || 'info',
                model: params.model || 'frontend'
            })
        });
    } catch (err) {
        // We don't want to crash the UI if logging fails
        // console.error('[Frontend Logger Failure]', err);
    }
};
