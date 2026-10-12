import type { Core } from '@strapi/strapi';
import { registerLendersLogosLifecycles } from './lifecycles';
import { reconcileLendersLogos } from './sync';
import { startLendersLogosWatcher } from './watcher';

export async function bootstrapLendersLogosMirror(strapi: Core.Strapi): Promise<void> {
  registerLendersLogosLifecycles(strapi);

  try {
    const summary = await reconcileLendersLogos(strapi);
    strapi.log.info(`[LendersLogos] Boot reconcile: ${JSON.stringify(summary)}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    strapi.log.error(`[LendersLogos] Boot reconcile failed: ${message}`);
  }

  await startLendersLogosWatcher(strapi);
}
