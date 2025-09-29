const PUBLIC_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBasePath<Path extends string>(path: Path): Path {
  if (!path || !path.startsWith("/")) {
    return path;
  }

  if (!PUBLIC_BASE_PATH || PUBLIC_BASE_PATH === "/") {
    return path;
  }

  if (path === PUBLIC_BASE_PATH || path.startsWith(`${PUBLIC_BASE_PATH}/`)) {
    return path as Path;
  }

  const normalizedBase = PUBLIC_BASE_PATH.endsWith("/")
    ? PUBLIC_BASE_PATH.slice(0, -1)
    : PUBLIC_BASE_PATH;

  return `${normalizedBase}${path}` as Path;
}
