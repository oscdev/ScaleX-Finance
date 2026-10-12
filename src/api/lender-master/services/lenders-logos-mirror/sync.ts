import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type { Core } from '@strapi/strapi';
import { withLogoGuard } from './guard';
import {
  CATALOG_UID,
  diskPathForFilename,
  getLendersLogosDiskRoot,
  isLendersLogoUrl,
  isLogoImageFilename,
  lenderCodeFromFilename,
  LENDERS_LOGOS_FOLDER_NAME,
  logoFilename,
  logoPublicUrl,
  publicPathToDisk,
  sanitizeLenderCode,
  UPLOAD_FILE_UID,
  UPLOAD_FOLDER_UID,
} from './paths';

type UploadFileRow = {
  id: number;
  name?: string | null;
  url?: string | null;
  hash?: string | null;
  ext?: string | null;
  mime?: string | null;
  size?: number | null;
  folder?: number | { id: number } | null;
  formats?: Record<string, { url?: string }> | null;
};

type CatalogRow = {
  id: number;
  documentId?: string;
  lenderCode?: string | null;
  logo?: { id: number } | number | null;
};

function logoId(logo: CatalogRow['logo']): number | null {
  if (!logo) return null;
  if (typeof logo === 'number') return logo;
  const id = Number(logo.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function folderId(folder: UploadFileRow['folder']): number | null {
  if (!folder) return null;
  if (typeof folder === 'number') return folder;
  return folder.id ?? null;
}

async function ensureLogosFolder(strapi: Core.Strapi): Promise<{ id: number; path?: string } | null> {
  const named = (await strapi.db.query(UPLOAD_FOLDER_UID).findMany({
    where: { name: LENDERS_LOGOS_FOLDER_NAME },
    populate: { parent: true },
  })) as Array<{ id: number; path?: string; parent?: unknown }>;
  let folder = named.find((row) => !row.parent) ?? null;
  if (!folder) {
    const folderService = strapi.plugin('upload').service('folder');
    try {
      folder = await folderService.create({ name: LENDERS_LOGOS_FOLDER_NAME, parent: null });
    } catch {
      const again = (await strapi.db.query(UPLOAD_FOLDER_UID).findMany({
        where: { name: LENDERS_LOGOS_FOLDER_NAME },
        populate: { parent: true },
      })) as Array<{ id: number; path?: string; parent?: unknown }>;
      folder = again.find((row) => !row.parent) ?? null;
    }
  }
  await fs.mkdir(getLendersLogosDiskRoot(), { recursive: true });
  return folder ?? null;
}

async function findCatalogByCode(strapi: Core.Strapi, code: string): Promise<CatalogRow | null> {
  const row = await strapi.db.query(CATALOG_UID).findOne({
    where: { lenderCode: { $eqi: code } },
    populate: { logo: true },
  });
  return (row as CatalogRow | null) ?? null;
}

async function catalogIdForFile(strapi: Core.Strapi, fileId: number): Promise<number | null> {
  try {
    const knex = strapi.db.connection;
    const hasTable = await knex.schema.hasTable('files_related_mph');
    if (!hasTable) return null;
    const row = await knex('files_related_mph')
      .where({ file_id: fileId, field: 'logo' })
      .where('related_type', 'like', '%lenders-catalog%')
      .first();
    const id = Number(row?.related_id);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

const RESPONSIVE_PREFIXES = ['thumbnail_', 'small_', 'medium_', 'large_'];

function isDefaultUploadsRootFile(absPath: string): boolean {
  const root = path.resolve(process.cwd(), 'public', 'uploads');
  return path.dirname(path.resolve(absPath)) === root;
}

async function removeDefaultUploadFiles(file: UploadFileRow): Promise<void> {
  const urls = new Set<string>();
  if (file.url && !isLendersLogoUrl(file.url)) urls.add(file.url);
  for (const item of Object.values(file.formats || {})) {
    if (item?.url && !isLendersLogoUrl(item.url)) urls.add(item.url);
  }
  const ext = file.ext || path.extname(file.url || file.name || '');
  if (file.hash && ext) {
    const suffix = ext.startsWith('.') ? ext : `.${ext}`;
    urls.add(`/uploads/${file.hash}${suffix}`);
    for (const prefix of RESPONSIVE_PREFIXES) {
      urls.add(`/uploads/${prefix}${file.hash}${suffix}`);
    }
  }
  for (const url of urls) {
    const abs = publicPathToDisk(url);
    if (!isDefaultUploadsRootFile(abs)) continue;
    await fs.unlink(abs).catch(() => undefined);
  }
}

async function deleteDiskForCode(lenderCode: string, keepFilename?: string): Promise<void> {
  const stem = sanitizeLenderCode(lenderCode).toLowerCase();
  let names: string[] = [];
  try {
    names = await fs.readdir(getLendersLogosDiskRoot());
  } catch {
    return;
  }
  for (const name of names) {
    if (keepFilename && name === keepFilename) continue;
    if (lenderCodeFromFilename(name).toLowerCase() !== stem) continue;
    await fs.unlink(diskPathForFilename(name)).catch(() => undefined);
  }
}

async function sourcePathForFile(file: UploadFileRow): Promise<string | null> {
  if (file.url) {
    const fromUrl = publicPathToDisk(file.url);
    try {
      await fs.access(fromUrl);
      return fromUrl;
    } catch {
      /* fall through to hash storage */
    }
  }
  if (file.hash && file.ext) {
    const hashed = path.join(process.cwd(), 'public', 'uploads', `${file.hash}${file.ext}`);
    try {
      await fs.access(hashed);
      return hashed;
    } catch {
      return null;
    }
  }
  return null;
}

async function setCatalogLogo(strapi: Core.Strapi, catalog: CatalogRow, fileId: number | null): Promise<void> {
  try {
    if (catalog.documentId) {
      await strapi.documents(CATALOG_UID).update({
        documentId: catalog.documentId,
        data: { logo: fileId },
      });
    } else {
      await strapi.entityService.update(CATALOG_UID, catalog.id, {
        data: { logo: fileId },
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    strapi.log.warn(`[LendersLogos] Could not set logo on catalog ${catalog.id}: ${message}`);
  }

  if (fileId != null) return;
  try {
    const knex = strapi.db.connection;
    const hasTable = await knex.schema.hasTable('files_related_mph');
    if (!hasTable) return;
    await knex('files_related_mph')
      .where({ related_id: catalog.id, field: 'logo' })
      .where('related_type', 'like', '%lenders-catalog%')
      .del();
  } catch {
    /* relation clear is best-effort after the document update */
  }
}

export async function placeCatalogLogo(strapi: Core.Strapi, catalogId: number): Promise<void> {
  await withLogoGuard(`catalog:${catalogId}`, async () => {
    const catalog = (await strapi.db.query(CATALOG_UID).findOne({
      where: { id: catalogId },
      populate: { logo: true },
    })) as CatalogRow | null;
    const code = String(catalog?.lenderCode || '').trim();
    if (!catalog || !code) return;

    const fileId = logoId(catalog.logo);
    if (!fileId) return;

    const file = (await strapi.db.query(UPLOAD_FILE_UID).findOne({
      where: { id: fileId },
      populate: { folder: true },
    })) as UploadFileRow | null;
    if (!file) {
      await deleteDiskForCode(code);
      return;
    }

    const ext = file.ext || path.extname(file.name || file.url || '') || '.png';
    const filename = logoFilename(code, ext);
    const destPath = diskPathForFilename(filename);
    const publicUrl = logoPublicUrl(filename);
    await fs.mkdir(getLendersLogosDiskRoot(), { recursive: true });

    const source = await sourcePathForFile(file);
    if (source && path.resolve(source) !== path.resolve(destPath)) {
      await fs.copyFile(source, destPath);
    }

    const folder = await ensureLogosFolder(strapi);
    if (!folder) return;

    let onDisk = false;
    try {
      await fs.access(destPath);
      onDisk = true;
    } catch {
      onDisk = false;
    }
    const alreadyPlaced =
      onDisk && file.url === publicUrl && folderId(file.folder) === folder.id && !file.formats;
    if (!alreadyPlaced) {
      await withLogoGuard(`ml:file:${file.id}`, async () => {
        await strapi.db.query(UPLOAD_FILE_UID).update({
          where: { id: file.id },
          data: {
            name: filename,
            url: publicUrl,
            ext: path.extname(filename),
            folder: folder.id,
            folderPath: folder.path,
            formats: null,
          },
        });
      });
    }

    await removeDefaultUploadFiles(file);
    await deleteDiskForCode(code, filename);
  });
}

export async function clearCatalogLogoDisk(strapi: Core.Strapi, catalogId: number): Promise<void> {
  const catalog = (await strapi.db.query(CATALOG_UID).findOne({
    where: { id: catalogId },
  })) as CatalogRow | null;
  const code = String(catalog?.lenderCode || '').trim();
  if (!code) return;
  await deleteDiskForCode(code);
}

export async function placeCatalogLogoForFile(strapi: Core.Strapi, fileId: number): Promise<void> {
  const catalogId = await catalogIdForFile(strapi, fileId);
  if (!catalogId) return;
  await placeCatalogLogo(strapi, catalogId);
}

export async function deleteDiskForMediaFile(strapi: Core.Strapi, fileId: number): Promise<void> {
  const file = (await strapi.db.query(UPLOAD_FILE_UID).findOne({
    where: { id: fileId },
  })) as UploadFileRow | null;
  if (!file?.url || !isLendersLogoUrl(file.url)) return;
  await withLogoGuard(`disk:${path.basename(file.url)}`, async () => {
    await fs.unlink(publicPathToDisk(file.url as string)).catch(() => undefined);
  });
}

async function upsertMediaFromDisk(
  strapi: Core.Strapi,
  filename: string,
  folder: { id: number; path?: string }
): Promise<number | null> {
  const diskPath = diskPathForFilename(filename);
  const stats = await fs.stat(diskPath);
  const publicUrl = logoPublicUrl(filename);
  const ext = path.extname(filename);
  const mime =
    ext === '.png'
      ? 'image/png'
      : ext === '.gif'
        ? 'image/gif'
        : ext === '.webp'
          ? 'image/webp'
          : ext === '.svg'
            ? 'image/svg+xml'
            : 'image/jpeg';

  const existing = (await strapi.db.query(UPLOAD_FILE_UID).findOne({
    where: { url: publicUrl },
  })) as UploadFileRow | null;

  if (existing) {
    await withLogoGuard(`ml:file:${existing.id}`, async () => {
      await strapi.entityService.update(UPLOAD_FILE_UID, existing.id, {
        data: {
          name: filename,
          url: publicUrl,
          size: stats.size / 1024,
          mime,
          ext,
          folder: folder.id,
          folderPath: folder.path,
          formats: null,
        },
      });
    });
    return existing.id;
  }

  const hash = crypto.createHash('md5').update(`lenders_logos/${filename}`).digest('hex').slice(0, 22);
  const created = await strapi.entityService.create(UPLOAD_FILE_UID, {
    data: {
      name: filename,
      hash,
      ext,
      mime,
      size: stats.size / 1024,
      url: publicUrl,
      folder: folder.id,
      folderPath: folder.path,
      provider: 'local',
    },
  });
  const createdId = Number(created?.id);
  return Number.isFinite(createdId) && createdId > 0 ? createdId : null;
}

export async function mirrorDiskLogoToCatalog(strapi: Core.Strapi, filename: string): Promise<void> {
  const base = path.basename(filename);
  if (!isLogoImageFilename(base)) return;
  await withLogoGuard(`disk:${base}`, async () => {
    const catalog = await findCatalogByCode(strapi, lenderCodeFromFilename(base));
    if (!catalog) return;
    const folder = await ensureLogosFolder(strapi);
    if (!folder) return;
    const fileId = await upsertMediaFromDisk(strapi, base, folder);
    if (!fileId) return;
    if (logoId(catalog.logo) !== fileId) {
      await setCatalogLogo(strapi, catalog, fileId);
    }
  });
}

export async function mirrorDiskLogoRemoved(strapi: Core.Strapi, filename: string): Promise<void> {
  const base = path.basename(filename);
  if (!isLogoImageFilename(base)) return;
  await withLogoGuard(`disk:${base}`, async () => {
    const catalog = await findCatalogByCode(strapi, lenderCodeFromFilename(base));
    const file = (await strapi.db.query(UPLOAD_FILE_UID).findOne({
      where: { url: logoPublicUrl(base) },
    })) as UploadFileRow | null;
    if (catalog && logoId(catalog.logo) && file && logoId(catalog.logo) === file.id) {
      await setCatalogLogo(strapi, catalog, null);
    }
    if (file) {
      await withLogoGuard(`ml:file:${file.id}`, async () => {
        await strapi.entityService.delete(UPLOAD_FILE_UID, file.id);
      });
    }
  });
}

export async function reconcileLendersLogos(strapi: Core.Strapi): Promise<{ toDisk: number; toMedia: number }> {
  const summary = { toDisk: 0, toMedia: 0 };
  await fs.mkdir(getLendersLogosDiskRoot(), { recursive: true });

  const catalogs = (await strapi.db.query(CATALOG_UID).findMany({
    populate: { logo: true },
    limit: 500,
  })) as CatalogRow[];

  for (const catalog of catalogs) {
    if (!logoId(catalog.logo) || !catalog.lenderCode) continue;
    const file = (await strapi.db.query(UPLOAD_FILE_UID).findOne({
      where: { id: logoId(catalog.logo) },
    })) as UploadFileRow | null;
    if (!file) continue;
    const filename = logoFilename(catalog.lenderCode, file.ext || path.extname(file.url || '') || '.png');
    try {
      await fs.access(diskPathForFilename(filename));
      if (isLendersLogoUrl(file.url) && folderId(file.folder)) continue;
    } catch {
      summary.toDisk += 1;
    }
    await placeCatalogLogo(strapi, catalog.id);
  }

  let names: string[] = [];
  try {
    names = await fs.readdir(getLendersLogosDiskRoot());
  } catch {
    return summary;
  }
  for (const name of names) {
    if (!isLogoImageFilename(name)) continue;
    const catalog = await findCatalogByCode(strapi, lenderCodeFromFilename(name));
    if (!catalog) continue;
    const linked = logoId(catalog.logo);
    const file = linked
      ? ((await strapi.db.query(UPLOAD_FILE_UID).findOne({ where: { id: linked } })) as UploadFileRow | null)
      : null;
    if (file && isLendersLogoUrl(file.url) && path.basename(file.url || '') === name) continue;
    summary.toMedia += 1;
    await mirrorDiskLogoToCatalog(strapi, name);
  }

  return summary;
}
