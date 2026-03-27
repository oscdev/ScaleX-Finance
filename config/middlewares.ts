import type { Core } from '@strapi/strapi';

const config: Core.Config.Middlewares = [
  'strapi::logger',
  'strapi::errors',
  'global::maintenance',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      credentials: true,
      origin: [
        'https://scalex.local',
        'http://scalex.local',
        'http://scalex.local:3000',
        'https://scalex.local:3000',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:1337',
        'http://127.0.0.1:1337',
      ],
      headers: [
        'Content-Type',
        'Authorization',
        'Origin',
        'Accept',
        'X-Requested-With',
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      formLimit: '300mb',
      jsonLimit: '300mb',
      textLimit: '300mb',
      formidable: {
        maxFileSize: 300 * 1024 * 1024, // 300MB
      },
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;
