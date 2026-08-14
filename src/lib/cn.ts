/** Joins class names, dropping anything falsy. Keeps a dependency out of the bundle. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
