/**
 * Next rewrites turn Vite's valueless `?raw` into `?raw=`.
 * Restore the flag so admin assets still compile behind that proxy.
 */
export default () => {
  return async (ctx, next) => {
    const url = String(ctx.url || '');
    if (url.includes('raw=')) {
      ctx.url = url.replace(/raw=(?=&|$)/g, 'raw');
    }
    await next();
  };
};
