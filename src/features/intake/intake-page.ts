import "server-only";

import type { IntakeFormContext } from "@/components/site/intake/contact-form";
import { issueFormToken, turnstileSiteKey } from "@/features/intake/intake-server";
import { getPublishedLegalPage } from "@/lib/site/legal-pages";
import { getSiteIdentity, type SiteIdentity } from "@/lib/site/public-configuration";

/** Everything a public intake form needs from the server for one render. */
export async function buildIntakeFormContext(): Promise<
  Readonly<{ context: IntakeFormContext; identity: SiteIdentity }>
> {
  const [identity, privacy] = await Promise.all([
    getSiteIdentity(),
    getPublishedLegalPage("privacy"),
  ]);
  return {
    identity,
    context: {
      formToken: issueFormToken(),
      privacyRevision: privacy?.revision ?? null,
      turnstileSiteKey: turnstileSiteKey(),
      whatsappDigits: identity.whatsappDigits,
      shortName: identity.shortName,
      email: identity.email,
    },
  };
}
