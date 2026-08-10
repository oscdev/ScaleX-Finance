export default {
  routes: [
    {
      method: 'POST',
      path: '/pl-submission-audit/log',
      handler: 'api::lead.lead.logSubmissionAudit',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
  ],
};
