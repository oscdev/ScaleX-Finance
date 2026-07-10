export default {
  routes: [
    {
      method: 'POST',
      path: '/cibil-report-summaries/extract',
      handler: 'api::bureau-data-extraction.cibil-report-summary.extract',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
  ],
};
