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

/** The email-verification page, carrying the post-login destination along. */
export const verifyEmailUrl = (email: string) => {
  const next = getPostLoginPath();
  const params = new URLSearchParams({ email });
  if (next !== "/dashboard") params.set("next", next);
  return `/verify-email?${params}`;
};
