"use client";

import dynamic from "next/dynamic";

/**
 * D1.6 (brief §104, C10 item 24): the C8 forms carry the client-side zod
 * schema (~85 KB transferred). A client-side dynamic boundary makes them a
 * separate chunk that loads only on the pages that render a form; the
 * static renderer map can keep listing them without shipping zod to Home.
 * Server rendering is unchanged (ssr stays on).
 */
export const ContactForm = dynamic(() =>
  import("@/components/site/intake/contact-form").then((module) => module.ContactForm),
);
export const StartAProjectWizard = dynamic(() =>
  import("@/components/site/intake/start-a-project-wizard").then(
    (module) => module.StartAProjectWizard,
  ),
);
export const ServiceEnquiryForm = dynamic(() =>
  import("@/components/site/intake/service-enquiry-form").then(
    (module) => module.ServiceEnquiryForm,
  ),
);
export const MaterialEnquiryForm = dynamic(() =>
  import("@/components/site/intake/material-enquiry-form").then(
    (module) => module.MaterialEnquiryForm,
  ),
);
