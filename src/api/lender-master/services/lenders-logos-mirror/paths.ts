import path from 'path';

export const LENDERS_LOGOS_FOLDER_NAME = 'Lenders Logos';
export const LENDERS_LOGOS_DISK_SEGMENT = 'lenders_logos';
export const CATALOG_UID = 'api::lender-master.lenders-catalog';
export const UPLOAD_FILE_UID = 'plugin::upload.file';
export const UPLOAD_FOLDER_UID = 'plugin::upload.folder';

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);

export function getLendersLogosDiskRoot(): string {
  return path.join(process.cwd(), 'public', 'uploads', LENDERS_LOGOS_DISK_SEGMENT);
}

export function logoPublicUrl(filename: string): string {
  return `/uploads/${LENDERS_LOGOS_DISK_SEGMENT}/${filename}`;
}

export function diskPathForFilename(filename: string): string {
  return path.join(getLendersLogosDiskRoot(), path.basename(filename));
}

export function isLendersLogoUrl(url: string | null | undefined): boolean {
  return typeof url === 'string' && url.includes(`/uploads/${LENDERS_LOGOS_DISK_SEGMENT}/`);
}

export function sanitizeLenderCode(code: string): string {
  return code.replace(/[^a-zA-Z0-9_-]/g, '') || 'logo';
}

export function logoFilename(lenderCode: string, ext: string): string {
  const stem = sanitizeLenderCode(lenderCode);
  const normalized = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  return `${stem}${normalized}`;
}

export function isLogoImageFilename(filename: string): boolean {
  return IMAGE_EXT.has(path.extname(filename).toLowerCase());
}

export function lenderCodeFromFilename(filename: string): string {
  return path.basename(filename, path.extname(filename));
}

export function publicPathToDisk(url: string): string {
  return path.join(process.cwd(), 'public', url.replace(/^\//, ''));
}
