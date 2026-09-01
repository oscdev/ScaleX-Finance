import type { Core } from '@strapi/strapi';
import { registerApiUploadsMirrorLifecycles } from './lifecycles';
import { registerApiUploadsEventHubMirror } from './event-hub';
import { reconcileApiUploads } from './reconcile';
import { startApiUploadsWatcher } from './watcher';

export { mirrorFileToDisk, mirrorLeadDocumentsToDisk, cleanupFieldDocumentsForLead } from './mirror-to-disk';
export { mirrorDiskFileToMedia, mirrorDiskPathToMedia } from './mirror-to-media';
export { mirrorDeleteFileFromMedia, mirrorDeleteFromDisk } from './mirror-delete';
export { reconcileApiUploads, reconcileLeadFolder, listLeadFolderMediaFiles } from './reconcile';
export {
  ensureLeadFolders,
  ensureApiUploadsRootFolder,
  linkFilesToLeadUploadFolder,
} from './folders';

export async function bootstrapApiUploadsMirror(strapi: Core.Strapi): Promise<void> {
  registerApiUploadsMirrorLifecycles(strapi);
  registerApiUploadsEventHubMirror(strapi);

  try {
    const summary = await reconcileApiUploads(strapi);
    strapi.log.info(
      `[ApiUploadsMirror] Boot reconcile: ${JSON.stringify({
        added_to_disk: summary.added_to_disk,
        added_to_ml: summary.added_to_ml,
        updated: summary.updated,
        skipped: summary.skipped,
      })}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    strapi.log.error(`[ApiUploadsMirror] Boot reconcile failed: ${message}`);
  }

  await startApiUploadsWatcher(strapi);
}
