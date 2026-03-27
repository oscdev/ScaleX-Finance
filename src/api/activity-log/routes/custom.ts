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
    ],
  };
