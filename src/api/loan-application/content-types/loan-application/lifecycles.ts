import {
  capturePrevCibilFileId,
  handleCibilLifecycleSync,
} from '../../services/cibil-lifecycle-sync';
import {
  findLoanAppFromLifecycleEvent,
  handleLoanAppAdminChangeLog,
} from '../../services/admin-change-log';
import { syncLoanTypeFromLeadOnWrite } from '../../services/loan-type-sync';

type LifecycleState = {
  prevCibilFileId?: number | null;
  adminChangePrev?: Record<string, unknown>;
};

export default {
  async beforeCreate(event: { params?: { data?: Record<string, unknown> } }) {
    const data = event.params?.data;
    if (data) {
      await syncLoanTypeFromLeadOnWrite(strapi, data);
    }
  },

  async beforeUpdate(event: {
    params?: { where?: Record<string, unknown>; data?: Record<string, unknown> };
    state?: LifecycleState;
  }) {
    event.state = event.state || {};
    event.state.prevCibilFileId = await capturePrevCibilFileId(strapi, event);

    const data = event.params?.data;
    if (!data) return;

    const existing = await findLoanAppFromLifecycleEvent(strapi, event);
    if (existing) {
      event.state.adminChangePrev = { ...existing };
    }
    await syncLoanTypeFromLeadOnWrite(strapi, data, existing);
  },

  async afterCreate(event: { params?: { data?: Record<string, unknown> }; result?: { id?: number } }) {
    await handleCibilLifecycleSync(strapi, event, { isCreate: true });
  },

  async afterUpdate(event: {
    params?: { where?: Record<string, unknown>; data?: Record<string, unknown> };
    result?: { id?: number };
    state?: LifecycleState;
  }) {
    await handleCibilLifecycleSync(strapi, event, {
      isCreate: false,
      prevCibilFileId: event.state?.prevCibilFileId ?? null,
    });
    await handleLoanAppAdminChangeLog(strapi, event);
  },
};
