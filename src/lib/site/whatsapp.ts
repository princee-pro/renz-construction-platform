/** Client-safe WhatsApp texting link (wa.me only — RENZ never renders a call CTA from its number). */
export function whatsappLink(digits: string, message: string): string {
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
