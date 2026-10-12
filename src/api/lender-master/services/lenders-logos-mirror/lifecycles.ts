import type { Core } from '@strapi/strapi';
import { clearCatalogLogoDisk, deleteDiskForMediaFile, placeCatalogLogo, placeCatalogLogoForFile } from './sync';
import { CATALOG_UID, UPLOAD_FILE_UID } from './paths';

function schedule(fn: () => Promise<void>, log: (message: string) => void): void {
  setImmediate(() => {
    fn().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      log(message);
    });
  });
}

async function readLogoId(strapi: Core.Strapi, catalogId: number): Promise<number | null> {
  const row = await strapi.db.query(CATALOG_UID).findOne({
    where: { id: catalogId },
    populate: { logo: true },
  });
  const logo = row?.logo;
  if (!logo) return null;
  const id = Number(typeof logo === 'number' ? logo : logo.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function registerLendersLogosLifecycles(strapi: Core.Strapi): void {
  const previousLogoId = new Map<number, number | null>();

  strapi.db.lifecycles.subscribe({
    models: [CATALOG_UID],
    async beforeUpdate(event: { params?: { where?: { id?: number; documentId?: string } } }) {
      const where = event.params?.where;
      let id = Number(where?.id);
      if (!id && where?.documentId) {
        const row = await strapi.db.query(CATALOG_UID).findOne({
          where: { documentId: where.documentId },
        });
        id = Number(row?.id);
      }
      if (!id) return;
      try {
        previousLogoId.set(id, await readLogoId(strapi, id));
      } catch {
        previousLogoId.set(id, null);
      }
    },
    async afterCreate(event: { result?: { id?: number } }) {
      const id = Number(event.result?.id);
      if (!id) return;
      try {
        await placeCatalogLogo(strapi, id);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        strapi.log.warn(`[LendersLogos] catalog create: ${message}`);
      }
    },
    async afterUpdate(event: { result?: { id?: number } }) {
      const id = Number(event.result?.id);
      if (!id) return;
      const previous = previousLogoId.get(id) ?? null;
      previousLogoId.delete(id);
      try {
        const next = await readLogoId(strapi, id);
        if (next) {
          await placeCatalogLogo(strapi, id);
          return;
        }
        if (previous) await clearCatalogLogoDisk(strapi, id);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        strapi.log.warn(`[LendersLogos] catalog update: ${message}`);
      }
    },
  });

  strapi.db.lifecycles.subscribe({
    models: [UPLOAD_FILE_UID],
    afterCreate(event: { result?: { id?: number } }) {
      const id = Number(event.result?.id);
      if (!id) return;
      schedule(
        () => placeCatalogLogoForFile(strapi, id),
        (message) => strapi.log.warn(`[LendersLogos] file create: ${message}`)
      );
    },
    afterUpdate(event: { result?: { id?: number } }) {
      const id = Number(event.result?.id);
      if (!id) return;
      schedule(
        () => placeCatalogLogoForFile(strapi, id),
        (message) => strapi.log.warn(`[LendersLogos] file update: ${message}`)
      );
    },
    async beforeDelete(event: { params?: { where?: { id?: number } } }) {
      const id = Number(event.params?.where?.id);
      if (!id) return;
      try {
        await deleteDiskForMediaFile(strapi, id);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        strapi.log.warn(`[LendersLogos] file delete: ${message}`);
      }
    },
  });
}
