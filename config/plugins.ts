import type { Core } from '@strapi/strapi';

const config = ({ env }: { env: any }) => ({
    upload: {
        config: {
            sizeLimit: 300 * 1024 * 1024, // 300MB
        },
    },

    email: {
        config: {
            provider: 'nodemailer',
            providerOptions: {
                host: env('SMTP_HOST', 'mail.oscprofessionals.in'),
                port: env.int('SMTP_PORT', 465),
                auth: {
                    user: env('SMTP_USERNAME'),
                    pass: env('SMTP_PASSWORD'),
                },
                secure: true,
            },
            settings: {
                defaultFrom: env('SMTP_DEFAULT_FROM'),
                defaultReplyTo: env('SMTP_DEFAULT_REPLY_TO'),
            },
        },
    },
});

export default config;