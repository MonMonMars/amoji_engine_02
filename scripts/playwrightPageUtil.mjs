/**
 * Playwright helpers — avoid passing { timeout } as the pageFunction arg.
 * @param {import("playwright").Page} page
 * @param {(...args: unknown[]) => unknown} pageFunction
 * @param {import("playwright").PageWaitForFunctionOptions} [options]
 */
export function waitForPageFn(page, pageFunction, options = {}) {
  return page.waitForFunction(pageFunction, undefined, options);
}

/**
 * @param {import("playwright").Page} page
 * @param {unknown} arg
 * @param {(...args: unknown[]) => unknown} pageFunction
 * @param {import("playwright").PageWaitForFunctionOptions} [options]
 */
export function waitForPageFnArg(page, arg, pageFunction, options = {}) {
  return page.waitForFunction(pageFunction, arg, options);
}
