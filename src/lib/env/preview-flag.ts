export function parseClientPreviewFlag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}
