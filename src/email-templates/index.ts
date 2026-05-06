import fs from 'fs';
import path from 'path';

/**
 * Utility to load and parse HTML email templates from the local file system.
 * 
 * @param templateName - The name of the HTML file in the templates folder (without .html)
 * @param data - An object containing the key-value pairs to replace in the template (e.g. {{fullName}})
 * @returns The compiled HTML string
 */
export const getEmailTemplate = (templateName: string, data: Record<string, any>): string => {
  try {
    // We use process.cwd() to consistently point to the project root, 
    // as HTML files are not copied into the /dist folder by the TypeScript compiler.
    const templatePath = path.join(process.cwd(), 'src', 'email-templates', `${templateName}.html`);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Email template ${templateName} not found at ${templatePath}`);
    }

    let html = fs.readFileSync(templatePath, 'utf8');

    // Simple placeholder replacement: {{variable}} -> data.variable
    Object.keys(data).forEach((key) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(placeholder, data[key]);
    });

    return html;
  } catch (error: any) {
    // console.error(`[Email Template Error]: ${error.message}`);
    return `<p>Error loading email content: ${error.message}</p>`;
  }
};

export default {
  getEmailTemplate,
};
