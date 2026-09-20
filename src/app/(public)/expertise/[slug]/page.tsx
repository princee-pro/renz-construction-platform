import { redirect } from "next/navigation";

/**
 * Old `/expertise/:slug` records used the previous DB-driven expertise
 * register, which has no reliable 1:1 mapping onto the new `/services`
 * taxonomy slugs. Rather than 404 an old bookmark or inbound link, send it
 * to the new canonical services index.
 */
export default function ExpertiseDetailRedirectPage() {
  redirect("/services");
}
