export default {
  routes: [
    {
      method: 'POST',
      path: '/loan-applications/sync-documents',
      handler: 'api::loan-application.loan-application.syncDocuments',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
