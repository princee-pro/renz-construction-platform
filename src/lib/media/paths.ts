const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const OBJECT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;

export const EDITORIAL_BUCKETS = ["editorial-originals", "editorial-derivatives"] as const;
export type EditorialBucket = (typeof EDITORIAL_BUCKETS)[number];

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function isSafeEditorialObjectPath(assetId: string, objectPath: string): boolean {
  if (!isUuid(assetId)) {
    return false;
  }

  const [root, objectName, ...extra] = objectPath.split("/");
  return (
    root?.toLowerCase() === assetId.toLowerCase() &&
    extra.length === 0 &&
    OBJECT_NAME_PATTERN.test(objectName ?? "")
  );
}

export function assertSafeEditorialObjectPath(assetId: string, objectPath: string): string {
  if (!isSafeEditorialObjectPath(assetId, objectPath)) {
    throw new TypeError(
      "Editorial media paths must use an immutable UUID directory and safe object name.",
    );
  }
  return objectPath;
}
