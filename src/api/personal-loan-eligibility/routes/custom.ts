/**
 * Custom PL eligibility routes (content-api).
 */
export default {
  routes: [
    {
      method: 'GET',
      path: '/personal-loan-eligibility/loan-type',
      handler: 'lenders-criteria-pl.loanType',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/personal-loan-eligibility/matched-lenders',
      handler: 'lenders-criteria-pl.matchedLenders',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/personal-loan-eligibility/matched-lenders',
      handler: 'lenders-criteria-pl.matchedLenders',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/personal-loan-eligibility/evaluate',
      handler: 'lenders-criteria-pl.evaluate',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
  ],
};
