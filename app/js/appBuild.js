/** @type {string | null} */
let cachedBuild = null;

/**
 * @param {string} baseUrl
 * @returns {Promise<string | null>}
 */
export async function fetchAppBuild(baseUrl) {
  if (cachedBuild) return cachedBuild;
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/health`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    cachedBuild = data?.build ? String(data.build) : null;
    return cachedBuild;
  } catch {
    return null;
  }
}
