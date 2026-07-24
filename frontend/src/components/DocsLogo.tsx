import * as React from "react";

export function DocsLogo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Docs"
      role="img"
    >
      <rect width="32" height="32" rx="8" fill="#4f46e5" />
      <path
        d="M10 9h8l4 4v10a2 2 0 01-2 2H10a2 2 0 01-2-2V11a2 2 0 012-2z"
        fill="#fff"
        fillOpacity="0.9"
      />
      <path d="M18 9l4 4h-4a1 1 0 01-1-1V9z" fill="#c7d2fe" />
      <rect x="11" y="15" width="10" height="1.5" rx="0.75" fill="#4f46e5" fillOpacity="0.3" />
      <rect x="11" y="18.5" width="10" height="1.5" rx="0.75" fill="#4f46e5" fillOpacity="0.3" />
      <rect x="11" y="22" width="6" height="1.5" rx="0.75" fill="#4f46e5" fillOpacity="0.3" />
    </svg>
  );
}
