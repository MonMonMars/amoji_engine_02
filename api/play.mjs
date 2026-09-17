import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";
import {
  FRESH_HTML_HEADERS,
  buildPlayRedirectLocation,
} from "../amoji-engine/engine/companion/companionFreshBoot.js";

/**
 * Bookmark entry: never-cached 303 onto a brand-new `/n/<stamp>/full` path.
 * 303 is not cacheable unless explicitly allowed, so iOS cannot freeze this hop.
 * A pathname it has never seen cannot be an old HTML document.
 */
export default function handler(req, res) {
  const rawUrl = typeof req.url === "string" ? req.url : "/play";
  const url = new URL(rawUrl, "http://localhost");
  const location = buildPlayRedirectLocation(url.search, { build: AMOJI_BUILD });
  for (const [key, value] of Object.entries(FRESH_HTML_HEADERS)) {
    res.setHeader(key, value);
  }
  res.setHeader("Location", location);
  res.status(303).end();
}
