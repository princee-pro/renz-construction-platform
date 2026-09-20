import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/styles/globals.css";
import "@/styles/public.css";
import "@/styles/final-base.css";
import "@/styles/final-nav.css";
import "@/styles/final-pages.css";
import "@/styles/final-routes.css";
import "@/styles/final-landing.css";
import "@/styles/final-motion.css";
import "@/styles/final-forms.css";
import "@/styles/final-sections.css";
import "@/styles/whatsapp.css";
import "@/styles/admin-auth.css";
import "@/styles/admin-shell.css";
import "@/styles/website-cms.css";
import "@/styles/documents.css";

import { fontClassName } from "@/lib/fonts";
import { robotsFor } from "@/lib/seo/public-metadata";
import { getSiteIdentity } from "@/lib/site/public-configuration";

/** Root metadata comes from the published site configuration (C7). */
export async function generateMetadata(): Promise<Metadata> {
  const identity = await getSiteIdentity();
  const metadataBase = identity.canonicalBaseUrl ? new URL(identity.canonicalBaseUrl) : undefined;
  return {
    ...(metadataBase ? { metadataBase } : {}),
    title: {
      default: identity.seo.siteName === "RENZ" ? identity.displayName : identity.seo.siteName,
      template: identity.seo.titleTemplate,
    },
    description:
      identity.seo.metaDescription ??
      identity.description ??
      `${identity.displayName} — construction services.`,
    applicationName: identity.seo.siteName,
    robots: robotsFor(identity),
    ...(identity.brand["favicon"] ? { icons: { icon: "/api/media/brand/favicon" } } : {}),
  };
}

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html className={fontClassName} lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
