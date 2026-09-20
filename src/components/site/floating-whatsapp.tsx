import { whatsappHref } from "@/lib/site/contact-details";

type FloatingWhatsAppProps = Readonly<{
  digits?: string | undefined;
  shortName?: string | undefined;
  label?: string | undefined;
  message?: string | undefined;
}>;

/** WhatsApp texting only — never a call action (client rule, C3.5 / C7). Green by design (CR1 §68). */
export function FloatingWhatsApp({
  digits,
  shortName = "RENZ",
  label,
  message,
}: FloatingWhatsAppProps) {
  const href = whatsappHref(
    message ?? `Hello ${shortName}, I would like to discuss a project.`,
    digits,
  );
  return (
    <a
      aria-label={`Message ${shortName} on WhatsApp`}
      className="floating-whatsapp"
      data-analytics-cta="whatsapp"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <path
          d="M12.01 2C6.48 2 2 6.35 2 11.73c0 1.94.56 3.75 1.53 5.3L2 22l5.12-1.47a10.2 10.2 0 0 0 4.89 1.24h.01c5.53 0 10.01-4.35 10.01-9.73C22.03 6.35 17.55 2 12.01 2Zm0 17.79h-.01a8.6 8.6 0 0 1-4.34-1.18l-.31-.18-3.04.87.86-2.92-.2-.3a7.87 7.87 0 0 1-1.24-4.25c0-4.4 3.65-7.98 8.15-7.98 2.17 0 4.22.83 5.76 2.34a7.79 7.79 0 0 1 2.38 5.64c0 4.4-3.66 7.96-8.16 7.96Zm4.47-5.97c-.24-.12-1.44-.7-1.66-.78-.22-.08-.38-.12-.55.12-.16.24-.63.78-.77.94-.14.16-.28.18-.53.06-.24-.12-1.02-.37-1.95-1.19a7.24 7.24 0 0 1-1.35-1.66c-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.31-.75-1.79-.2-.47-.4-.4-.55-.41h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z"
          fill="currentColor"
        />
      </svg>
      <span>{label ?? "Message on WhatsApp"}</span>
    </a>
  );
}
