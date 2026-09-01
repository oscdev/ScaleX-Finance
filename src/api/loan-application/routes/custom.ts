export default {
  routes: [
    {
      method: 'POST',
      path: '/loan-applications/sync-documents',
      handler: 'api::loan-application.loan-application.syncDocuments',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/loan-applications/prepare-document-upload',
      handler: 'api::loan-application.loan-application.prepareDocumentUpload',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
  ],
};
