/**
 * Where the repeat site lives. With a custom domain set NEXT_PUBLIC_REPEAT_SUBDOMAIN=1:
 * repeat.<domain>/review. Otherwise (*.vercel.app, localhost — no subdomains there) it is
 * served on the main host under /repeat: /repeat/review.
 */
export const REPEAT_ON_SUBDOMAIN = process.env.NEXT_PUBLIC_REPEAT_SUBDOMAIN === "1";

/** A repeat-site link: "/review" → "/repeat/review" unless the site is on its subdomain. */
export function rp(path: string): string {
  if (REPEAT_ON_SUBDOMAIN) return path;
  if (path === "/") return "/repeat";
  return path.startsWith("/?") ? `/repeat${path.slice(1)}` : `/repeat${path}`;
}
