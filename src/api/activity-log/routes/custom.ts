export default {
  routes: [
    {
      method: 'POST',
      path: '/activity-logs/log',
      handler: 'api::activity-log.activity-log.createLog',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/activity-logs/by-lead',
      handler: 'api::activity-log.activity-log.byLead',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/activity-logs/by-lead/:leadId',
      handler: 'api::activity-log.activity-log.forLead',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
  ],
};
