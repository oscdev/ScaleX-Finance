import fs from 'fs';
import path from 'path';

/**
 * Load HTML email templates from system-events/email/templates/.
 *
 * @param eventName - Event basename without .html, e.g. `loan-application`
 * @param data - Placeholder map for {{key}} replacement
 */
export function getEmailTemplate(
  eventName: string,
  data: Record<string, unknown>
): string {
  try {
    const raw = String(eventName || '').trim();
    if (!raw || raw.includes('/') || raw.includes('\\') || raw.includes('..')) {
      throw new Error(
        `Invalid email template name "${eventName}" (use a flat event name, e.g. loan-application)`
      );
    }

    const base = raw.endsWith('.html') ? raw.slice(0, -5) : raw;
    if (!base || /[^a-zA-Z0-9_-]/.test(base)) {
      throw new Error(`Invalid email template name "${eventName}"`);
    }

    const fullPath = path.join(
      process.cwd(),
      'src',
      'api',
      'system-events',
      'email',
      'templates',
      `${base}.html`
    );

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Email template not found at ${fullPath}`);
    }

    let html = fs.readFileSync(fullPath, 'utf8');

    Object.keys(data).forEach((key) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(placeholder, String(data[key] ?? ''));
    });

    return html;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return `<p>Error loading email content: ${message}</p>`;
  }
}
