import path from 'path';
import { API_UPLOADS_DISK_SEGMENT, API_UPLOADS_ROOT_NAME } from './constants';
import { getLeadUploadDiskDir } from '../../utils/lead-upload-folder';

export function getApiUploadsDiskRoot(): string {
  return path.join(process.cwd(), 'public', 'uploads', API_UPLOADS_DISK_SEGMENT);
}

export function toPublicUrl(leadFolderName: string, filename: string): string {
  return `/uploads/${API_UPLOADS_DISK_SEGMENT}/${leadFolderName}/${filename}`;
}

export function diskPathFromPublicUrl(url: string): string {
  const rel = url.replace(/^\//, '');
  return path.join(process.cwd(), 'public', rel);
}

export function parseDiskRelPath(absOrRel: string): { leadFolder: string; filename: string } | null {
  const normalized = absOrRel.replace(/\\/g, '/');
  const marker = `/uploads/${API_UPLOADS_DISK_SEGMENT}/`;
  const idx = normalized.indexOf(marker);
  const rel = idx >= 0 ? normalized.slice(idx + marker.length) : normalized;
  const parts = rel.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const filename = parts[parts.length - 1];
  const leadFolder = parts.slice(0, -1).join('/');
  return { leadFolder, filename };
}

export function getLeadDiskDir(leadFolderName: string): string {
  return getLeadUploadDiskDir(leadFolderName);
}

export function isUnderApiUploadsDiskRoot(absPath: string): boolean {
  const root = getApiUploadsDiskRoot();
  const resolved = path.resolve(absPath);
  return resolved.startsWith(root + path.sep) || resolved === root;
}

export function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._\- ]/g, '_').trim();
  return base || 'document';
}

const EXT_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export function mimeFromFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return EXT_MIME[ext] || 'application/octet-stream';
}

export type UploadFolderRow = {
  id: number;
  name: string;
  path?: string;
  parent?: { id: number; name: string; parent?: unknown } | number | null;
};

export function isApiUploadsRootFolder(folder: UploadFolderRow | null): boolean {
  return folder?.name === API_UPLOADS_ROOT_NAME && !folder.parent;
}
