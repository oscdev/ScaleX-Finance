import type { Core } from '@strapi/strapi';

const config = ({ env }: { env: any }) => ({
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
                secure: true, // Port 465 usually implies SSL
            },
            settings: {
                defaultFrom: env('SMTP_DEFAULT_FROM', 'parminder@oscprofessionals.in'),
                defaultReplyTo: env('SMTP_DEFAULT_REPLY_TO', 'parminder@oscprofessionals.in'),
            },
        },
    },
});

export default config;
