/**
 * Custom PL scoring routes (content-api).
 */
export default {
  routes: [
    {
      method: 'POST',
      path: '/personal-loan-scoring-criteria/score',
      handler: 'scoring.score',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/personal-loan-scoring-criteria/rank',
      handler: 'scoring.rank',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
  ],
};
