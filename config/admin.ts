import type { Core } from '@strapi/strapi';
import fs from 'fs';
import path from 'path';

/**
 * Load forgot-password.html and convert {{placeholders}} to lodash <%= %>
 * for Strapi admin auth.sendTemplatedEmail.
 */
function loadForgotPasswordEmailTemplate(): {
  subject: string;
  html: string;
  text: string;
} {
  const htmlPath = path.join(
    process.cwd(),
    'src',
    'api',
    'system-events',
    'email',
    'templates',
    'forgot-password.html'
  );

  let html =
    '<p>Hello <%= user.firstname || "there" %>,</p><p>Reset your password: <%= url %></p>';
  try {
    if (fs.existsSync(htmlPath)) {
      html = fs.readFileSync(htmlPath, 'utf8');
      html = html
        .replace(/\{\{url\}\}/g, '<%= url %>')
        .replace(
          /\{\{userFirstname\}\}/g,
          '<%= user.firstname || "there" %>'
        );
    }
  } catch {
    // fall back to inline html above
  }

  return {
    subject: 'Reset your ScaleX Finance password',
    html,
    text: `Hello <%= user.firstname || "there" %>,\n\nReset your ScaleX Finance password:\n<%= url %>\n\nIf you did not request this, ignore this email.\n\nScaleX Finance`,
  };
}

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Admin => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
  },
  forgotPassword: {
    // Strapi types say `string`; runtime sendTemplatedEmail expects { subject, html, text }.
    emailTemplate: loadForgotPasswordEmailTemplate() as unknown as string,
  },
  rateLimit: {
    interval: 60 * 60 * 1000, // 1 hour
    max: 100, // allow 100 attempts per hour
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY'),
  },
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
  },
  watchIgnoreFiles: [
    '**/bureau-data-extraction/integrations/**',
    '**/__pycache__/**',
    '**/Automation-Testing/**',
    '**/graphify-out/**',
    '**/CLAUDE.md',
  ],
});

export default config;
