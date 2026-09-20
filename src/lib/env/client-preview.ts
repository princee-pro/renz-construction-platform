import "server-only";

import { parseClientPreviewFlag } from "@/lib/env/preview-flag";

export function isClientPreviewEnabled(): boolean {
  return parseClientPreviewFlag(process.env["RENZ_CLIENT_PREVIEW"]);
}
