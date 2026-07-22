import * as React from "react";

/**
 * Google Docs style document mark — a blue page with a folded corner and text lines.
 */
export function DocsLogo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size * 0.78}
      height={size}
      viewBox="0 0 40 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Docs"
      role="img"
    >
      <path
        d="M4 0h22l14 14v34a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4Z"
        fill="#4285F4"
      />
      <path d="M26 0l14 14H30a4 4 0 0 1-4-4V0Z" fill="#A1C2FA" />
      <rect x="9" y="22" width="22" height="2.4" rx="1.2" fill="#fff" />
      <rect x="9" y="28" width="22" height="2.4" rx="1.2" fill="#fff" />
      <rect x="9" y="34" width="22" height="2.4" rx="1.2" fill="#fff" />
      <rect x="9" y="40" width="14" height="2.4" rx="1.2" fill="#fff" />
    </svg>
  );
}
