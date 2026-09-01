import fs from 'fs/promises';
import type { Core } from '@strapi/strapi';
import { buildLeadUploadFolderName } from '../../utils/lead-upload-folder';
import { API_UPLOADS_ROOT_NAME, UPLOAD_FOLDER_UID } from './constants';
import { getApiUploadsDiskRoot, getLeadDiskDir } from './paths';
import type { UploadFolderRow } from './paths';
import { resolveLeadFolderNameFromFile, getApiUploadsRootFolder } from './scope';

export { getApiUploadsRootFolder } from './scope';

export async function ensureApiUploadsRootFolder(
  strapi: Core.Strapi
): Promise<UploadFolderRow | null> {
  let root = await getApiUploadsRootFolder(strapi);
  if (root) return root;

  const folderService = strapi.plugin('upload').service('folder');
  try {
    root = await folderService.create({ name: API_UPLOADS_ROOT_NAME, parent: null });
  } catch {
    root = await getApiUploadsRootFolder(strapi);
  }
  await fs.mkdir(getApiUploadsDiskRoot(), { recursive: true });
  return root;
}

export async function ensureLeadFolders(
  strapi: Core.Strapi,
  leadFolderName: string
): Promise<{ root: UploadFolderRow; lead: UploadFolderRow } | null> {
  const root = await ensureApiUploadsRootFolder(strapi);
  if (!root) return null;

  let leadFolder = await strapi.db.query(UPLOAD_FOLDER_UID).findOne({
    where: { name: leadFolderName, parent: root.id },
  });

  if (!leadFolder) {
    const folderService = strapi.plugin('upload').service('folder');
    try {
      leadFolder = await folderService.create({
        name: leadFolderName,
        parent: root.id,
      });
    } catch {
      leadFolder = await strapi.db.query(UPLOAD_FOLDER_UID).findOne({
        where: { name: leadFolderName, parent: root.id },
      });
    }
  }

  if (!leadFolder) return null;

  await fs.mkdir(getLeadDiskDir(leadFolderName), { recursive: true });
  return { root, lead: leadFolder };
}

export async function isFileInApiUploadsScope(
  strapi: Core.Strapi,
  file: {
    folder?: number | { id: number } | null;
    folderPath?: string | null;
    url?: string | null;
  }
): Promise<boolean> {
  const leadFolder = await resolveLeadFolderNameFromFile(strapi, file);
  return leadFolder != null;
}

export async function ensureDiskLeadFolder(leadFolderName: string): Promise<string> {
  const dir = getLeadDiskDir(leadFolderName);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function ensureMediaLeadFolder(
  strapi: Core.Strapi,
  leadFolderName: string
): Promise<UploadFolderRow | null> {
  const pair = await ensureLeadFolders(strapi, leadFolderName);
  return pair?.lead ?? null;
}

/** Link upload file(s) to Media Library folder API Uploads/{leadId}-{name}/. */
export async function linkFilesToLeadUploadFolder(
  strapi: Core.Strapi,
  leadId: number | string,
  applicantName: string,
  fileIds: Iterable<number>
): Promise<void> {
  const folderName = buildLeadUploadFolderName(leadId, applicantName);
  const pair = await ensureLeadFolders(strapi, folderName);
  if (!pair?.lead) return;

  const UPLOAD_FILE_UID = 'plugin::upload.file';
  const ids = [...fileIds];
  if (!ids.length) return;

  for (const fileId of ids) {
    try {
      await strapi.entityService.update(UPLOAD_FILE_UID, fileId, {
        data: {
          folder: pair.lead.id,
          folderPath: pair.lead.path,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      strapi.log.warn(
        `[ApiUploadsMirror] Failed to link file ${fileId} to folder ${folderName}: ${message}`
      );
    }
  }

  strapi.log.info(
    `[ApiUploadsMirror] Linked ${ids.length} file(s) to Media Library folder: API Uploads/${folderName}`
  );
}

export {
  getFolderParentId,
  loadFileForMirror,
  resolveLeadFolderNameFromFile,
  resolveLeadFolderNameFromFolderId,
  isApiUploadsLeadFolder,
} from './scope';
