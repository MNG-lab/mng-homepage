const ABSOLUTE_SCHEME_PATTERN = /^[a-z][a-z\d+\-.]*:/i;

export function resolveContentImageSrc(src) {
  if (typeof src !== "string") return "";
  const value = src.trim();
  if (!value) return "";

  if (value.startsWith("//") || ABSOLUTE_SCHEME_PATTERN.test(value)) {
    return value;
  }

  const normalized = value.replace(/^\.?\//, "").replace(/^\/+/, "");
  const base = import.meta.env.BASE_URL || "/";
  const safeBase = base.endsWith("/") ? base : `${base}/`;
  return `${safeBase}${normalized}`;
}
