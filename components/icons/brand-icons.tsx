// Official platform marks, inline and dependency-free (founder rule
// 2026-08-28: real source icons in the research feed). Each is drawn from
// the brand's canonical mark in its brand color; no external assets, no
// tracking pixels, works offline.
type IconProps = { className?: string };

export function GitHubMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path
        fill="#181717"
        className="dark:fill-white"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
      />
    </svg>
  );
}

export function HackerNewsMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <rect width="16" height="16" fill="#FF6600" />
      <path
        fill="#fff"
        d="M7.35 9.2 4.5 3.8h1.6l1.9 3.9 1.9-3.9h1.6L8.65 9.2v3h-1.3v-3Z"
      />
    </svg>
  );
}

export function RedditMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <circle cx="8" cy="8" r="8" fill="#FF4500" />
      <ellipse cx="8" cy="9.4" rx="4.5" ry="3" fill="#fff" />
      <circle cx="3.4" cy="8.2" r="1.1" fill="#fff" />
      <circle cx="12.6" cy="8.2" r="1.1" fill="#fff" />
      <circle cx="6.2" cy="9" r="0.8" fill="#FF4500" />
      <circle cx="9.8" cy="9" r="0.8" fill="#FF4500" />
      <path
        d="M6.4 10.9c.9.7 2.3.7 3.2 0"
        stroke="#FF4500"
        strokeWidth="0.7"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M8.2 6.4 8.9 3l2.4.6" stroke="#fff" strokeWidth="0.7" fill="none" />
      <circle cx="11.6" cy="3.6" r="1" fill="#fff" />
    </svg>
  );
}

export function ProductHuntMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <circle cx="8" cy="8" r="8" fill="#DA552F" />
      <path
        fill="#fff"
        d="M9 8H6.9V6h2.1a1 1 0 0 1 0 2ZM9 4.4H5.3v7.2h1.6V9.6H9a2.6 2.6 0 0 0 0-5.2Z"
      />
    </svg>
  );
}

export function StackOverflowMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path fill="#BCBBBB" d="M12.6 14.6v-4h1.3V16H2v-5.4h1.3v4h9.3Z" />
      <path
        fill="#F48024"
        d="M4.8 12h6.5v1.3H4.8V12Zm.1-2.9 6.4 1.3.3-1.3-6.5-1.3-.2 1.3Zm.8-3 5.9 2.8.6-1.2L6.3 5l-.6 1.1Zm1.7-2.9 5 4.2.9-1L8.3 2.2l-.9 1Z"
      />
    </svg>
  );
}
