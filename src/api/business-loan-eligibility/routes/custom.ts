/**
 * Custom BL eligibility routes (content-api).
 */
export default {
  routes: [
    {
      method: 'POST',
      path: '/business-loan-eligibility/matched-lenders',
      handler: 'lenders-criteria-bl.matchedLenders',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/business-loan-eligibility/matched-lenders',
      handler: 'lenders-criteria-bl.matchedLenders',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/business-loan-eligibility/evaluate',
      handler: 'lenders-criteria-bl.evaluate',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
  ],
};
