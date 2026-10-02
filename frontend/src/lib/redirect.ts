/** Where to go after signing in: the ?next= path (same-site only), else the dashboard. */
export const getPostLoginPath = () => {
  if (typeof window === "undefined") return "/dashboard";
  const next = new URLSearchParams(window.location.search).get("next");
  // Only allow local paths, never "//evil.com" or absolute URLs
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
};

/** Login URL that returns to the current page afterwards. */
export const loginUrlForCurrentPage = () =>
  `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
