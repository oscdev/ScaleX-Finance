import type { Core } from '@strapi/strapi';
import { API_UPLOADS_ROOT_NAME, UPLOAD_FILE_UID, UPLOAD_FOLDER_UID } from './constants';

type JoinTableMeta = {
  name: string;
  joinColumn: { name: string; referencedColumn?: string };
  inverseJoinColumn: { name: string };
};

function getFolderParentJoinTable(strapi: Core.Strapi): JoinTableMeta | null {
  const metadata = strapi.db.metadata.get(UPLOAD_FOLDER_UID) as {
    attributes?: { parent?: { joinTable?: JoinTableMeta } };
  };
  return metadata?.attributes?.parent?.joinTable ?? null;
}

export async function getFolderParentId(
  strapi: Core.Strapi,
  folderId: number
): Promise<number | null> {
  const joinTable = getFolderParentJoinTable(strapi);
  if (joinTable) {
    const row = (await strapi.db
      .queryBuilder(joinTable.name)
      .select(joinTable.inverseJoinColumn.name)
      .where({ [joinTable.joinColumn.name]: folderId })
      .first()
      .execute()) as Record<string, number> | undefined;

    const parentId = row?.[joinTable.inverseJoinColumn.name];
    return parentId != null ? Number(parentId) : null;
  }

  const folder = await strapi.db.query(UPLOAD_FOLDER_UID).findOne({
    where: { id: folderId },
    populate: { parent: true },
  });
  const parent = folder?.parent;
  if (typeof parent === 'object' && parent && 'id' in parent) {
    return Number(parent.id);
  }
  if (typeof parent === 'number') return parent;
  return null;
}

export async function loadFileForMirror(
  strapi: Core.Strapi,
  fileId: number
): Promise<Record<string, unknown> | null> {
  return strapi.db.query(UPLOAD_FILE_UID).findOne({
    where: { id: fileId },
  });
}

export async function resolveLeadFolderNameFromFile(
  strapi: Core.Strapi,
  file: {
    folder?: number | { id: number } | null;
    folderPath?: string | null;
    url?: string | null;
  }
): Promise<string | null> {
  const folderId =
    typeof file.folder === 'object' && file.folder
      ? file.folder.id
      : (file.folder as number | undefined);

  if (folderId) {
    const fromFolder = await resolveLeadFolderNameFromFolderId(strapi, folderId);
    if (fromFolder) return fromFolder;
  }

  if (file.folderPath) {
    const folder = await strapi.db.query(UPLOAD_FOLDER_UID).findOne({
      where: { path: file.folderPath },
    });
    if (folder?.id) {
      const fromPath = await resolveLeadFolderNameFromFolderId(strapi, folder.id);
      if (fromPath) return fromPath;
    }
  }

  if (file.url?.includes('/uploads/api_uploads/')) {
    const match = file.url.match(/\/api_uploads\/([^/]+)\//);
    return match?.[1] ?? null;
  }

  return null;
}

async function getApiUploadsRootFolder(strapi: Core.Strapi) {
  const matches = await strapi.db.query(UPLOAD_FOLDER_UID).findMany({
    where: { name: API_UPLOADS_ROOT_NAME },
  });

  for (const folder of matches) {
    const parentId = await getFolderParentId(strapi, folder.id);
    if (parentId == null) return folder;
  }

  return matches[0] ?? null;
}

export { getApiUploadsRootFolder };

export async function resolveLeadFolderNameFromFolderId(
  strapi: Core.Strapi,
  folderId: number | null | undefined
): Promise<string | null> {
  if (!folderId) return null;

  const root = await getApiUploadsRootFolder(strapi);
  if (!root) return null;

  const parentId = await getFolderParentId(strapi, folderId);
  if (parentId !== root.id) return null;

  const folder = await strapi.db.query(UPLOAD_FOLDER_UID).findOne({
    where: { id: folderId },
  });
  return folder?.name ?? null;
}

export async function isApiUploadsLeadFolder(
  strapi: Core.Strapi,
  folderId: number
): Promise<boolean> {
  const root = await getApiUploadsRootFolder(strapi);
  if (!root) return false;
  const parentId = await getFolderParentId(strapi, folderId);
  return parentId === root.id;
}
