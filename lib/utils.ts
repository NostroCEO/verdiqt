import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Evidence URLs come from the public web (HN submissions, GitHub, etc). React
// does not sanitize href, so a `javascript:` or `data:` URL would execute on
// click. Only http(s) links are ever rendered; anything else collapses to a
// non-navigating anchor.
export function safeHttpUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    // fall through
  }
  return "#";
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
