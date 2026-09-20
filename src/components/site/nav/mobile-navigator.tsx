"use client";

import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { ArrowMark } from "@/components/site/arrow-mark";
import { Field, type FieldVariant } from "@/components/site/fields";
import {
  isCurrentPath,
  type NavContact,
  type NavCopy,
  type NavLink,
  type NavService,
} from "@/components/site/nav/nav-types";
import { WhatsAppGlyph } from "@/components/site/whatsapp-glyph";
import { isApiMediaSrc } from "@/lib/media/public-src";

type MobileNavigatorProps = Readonly<{
  brand: ReactNode;
  navigation: readonly NavLink[];
  cta: NavLink;
  services: readonly NavService[];
  contact: NavContact;
  copy: NavCopy;
}>;

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Each route lights a different field behind the list; unknown routes cycle. */
const routeFields: Readonly<Record<string, FieldVariant>> = {
  "/": "datum",
  "/services": "plan",
  "/projects": "material",
  "/about": "structure",
  "/insights": "quiet",
  "/contact": "survey",
};
const fieldCycle: readonly FieldVariant[] = ["datum", "plan", "structure", "survey", "quiet"];

/**
 * Mobile navigator (D1.6 brief §39): a full-screen ink field rather than a
 * drawer. Large numbered routes, a gold datum that travels down the rail to
 * the focused route, Services expandable in place, the background field
 * changing with the focused route, WhatsApp in green and the primary call
 * to action fixed at the foot. The native <dialog> and the manual focus
 * wraparound proven since C3.5 are unchanged.
 */
export function MobileNavigator({
  brand,
  navigation,
  cta,
  services,
  contact,
  copy,
}: MobileNavigatorProps) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const currentIndex = Math.max(
    0,
    navigation.findIndex((link) => isCurrentPath(pathname, link.href)),
  );
  const [focused, setFocused] = useState<number>(currentIndex);
  const railY = useMotionValue(0);
  const railHeight = useMotionValue(0);
  const railOpacity = useMotionValue(0);

  function openMenu(): void {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    setOpen(true);
    setFocused(currentIndex);
    document.documentElement.classList.add("public-menu-open");
    requestAnimationFrame(() => closeRef.current?.focus());
  }
  function closeMenu(): void {
    const dialog = dialogRef.current;
    if (!dialog?.open) return;
    dialog.close();
  }
  function finishClose(): void {
    setOpen(false);
    document.documentElement.classList.remove("public-menu-open");
    triggerRef.current?.focus();
  }

  // The native <dialog> top-layer does not reliably trap Tab/Shift+Tab focus
  // in every environment this renders in, so the wraparound is enforced
  // manually instead of assuming showModal() alone contains it.
  function trapTabKey(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (element) => element.offsetParent !== null,
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first?.focus();
    } else if (!panel.contains(active)) {
      event.preventDefault();
      first?.focus();
    }
  }

  useEffect(() => {
    return () => document.documentElement.classList.remove("public-menu-open");
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const row = rowRefs.current[focused];
    if (!list || !row) return;
    const listRect = list.getBoundingClientRect();
    const rowRect =
      row.querySelector(".mobile-route-row")?.getBoundingClientRect() ??
      row.getBoundingClientRect();
    const spring = reduced
      ? ({ duration: 0 } as const)
      : ({ type: "spring", stiffness: 380, damping: 36, mass: 0.7 } as const);
    animate(railY, rowRect.top - listRect.top, spring);
    animate(railHeight, rowRect.height, spring);
    animate(railOpacity, 1, { duration: reduced ? 0 : 0.2 });
  }, [focused, open, servicesOpen, reduced, railY, railHeight, railOpacity]);

  const focusedLink = navigation[focused] ?? navigation[0];
  const focusedField =
    routeFields[focusedLink?.href ?? "/"] ?? fieldCycle[focused % fieldCycle.length] ?? "datum";
  // Only while the navigator is open: a closed dialog must not hold a lazy image.
  const projectImage =
    open && focusedLink?.href === "/projects"
      ? (services.find((service) => service.related?.src)?.related ?? null)
      : null;

  return (
    <>
      <div className="public-mobile-actions">
        <button
          aria-controls="public-navigation-dialog"
          aria-expanded={open}
          className="public-menu-trigger"
          onClick={openMenu}
          ref={triggerRef}
          type="button"
        >
          <span>Menu</span>
          <span aria-hidden="true" className="menu-glyph">
            <i />
            <i />
          </span>
        </button>
      </div>
      <dialog
        aria-labelledby="public-menu-title"
        className="public-menu-dialog"
        id="public-navigation-dialog"
        onCancel={() => setOpen(false)}
        onClose={finishClose}
        ref={dialogRef}
      >
        <div className="public-menu-panel" onKeyDown={trapTabKey} ref={panelRef}>
          <div aria-hidden="true" className="mobile-field">
            <AnimatePresence initial={false}>
              <motion.div
                animate={{ opacity: 1 }}
                className="mobile-field-plane"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key={projectImage ? "project" : focusedField}
                transition={{ duration: reduced ? 0 : 0.45 }}
              >
                {projectImage?.src ? (
                  <Image
                    alt=""
                    fill
                    sizes="100vw"
                    src={projectImage.src}
                    unoptimized={isApiMediaSrc(projectImage.src)}
                  />
                ) : (
                  <Field tone="dark" variant={focusedField} />
                )}
              </motion.div>
            </AnimatePresence>
            <span className="mobile-field-wash" />
          </div>

          <header className="public-menu-header">
            <div className="public-menu-identity">
              {brand}
              <p className="visually-hidden" id="public-menu-title">
                RENZ / Navigation
              </p>
            </div>
            <button className="public-menu-close" onClick={closeMenu} ref={closeRef} type="button">
              <span>Close</span>
              <span aria-hidden="true">×</span>
            </button>
          </header>

          <div className="public-menu-body">
            <nav aria-label="Primary mobile navigation" className="public-menu-navigation">
              <ol ref={listRef}>
                <motion.span
                  aria-hidden="true"
                  className="mobile-rail"
                  style={{ y: railY, height: railHeight, opacity: railOpacity }}
                />
                {navigation.map(({ label, href }, index) => {
                  const isServices = href === "/services";
                  const current = isCurrentPath(pathname, href);
                  return (
                    <li
                      data-expanded={isServices && servicesOpen ? "true" : undefined}
                      data-focused={index === focused ? "true" : undefined}
                      key={href}
                      ref={(element) => {
                        rowRefs.current[index] = element;
                      }}
                    >
                      <div className="mobile-route-row public-menu-row">
                        <Link
                          aria-current={current ? "page" : undefined}
                          href={href}
                          onClick={closeMenu}
                          onFocus={() => setFocused(index)}
                          onPointerEnter={() => setFocused(index)}
                        >
                          <span className="index-mark">{String(index + 1).padStart(2, "0")}</span>
                          <strong>{label}</strong>
                        </Link>
                        {isServices && services.length > 0 ? (
                          <button
                            aria-controls="public-menu-services"
                            aria-expanded={servicesOpen}
                            aria-label={servicesOpen ? "Hide services" : "Show services"}
                            className="public-menu-expand"
                            onClick={() => setServicesOpen((value) => !value)}
                            onFocus={() => setFocused(index)}
                            type="button"
                          >
                            <span aria-hidden="true">{servicesOpen ? "−" : "+"}</span>
                          </button>
                        ) : (
                          <ArrowMark />
                        )}
                      </div>
                      {isServices ? (
                        <ul
                          className="public-menu-services"
                          hidden={!servicesOpen}
                          id="public-menu-services"
                        >
                          {services.map((service) => (
                            <li key={service.slug}>
                              <Link
                                aria-current={
                                  isCurrentPath(pathname, `/services/${service.slug}`)
                                    ? "page"
                                    : undefined
                                }
                                href={`/services/${service.slug}`}
                                onClick={closeMenu}
                                onFocus={() => setFocused(index)}
                              >
                                <span className="index-mark">{service.index}</span>
                                {service.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </nav>
            <aside aria-label="Contact routes" className="public-menu-contact">
              <p className="kicker">Talk to {contact.shortName}</p>
              <a
                className="public-menu-contact-link public-menu-contact-whatsapp"
                data-analytics-cta="whatsapp"
                href={contact.whatsappUrl}
                rel="noreferrer"
                target="_blank"
              >
                <WhatsAppGlyph />
                <span>{copy.whatsappLabel}</span>
              </a>
              <a
                className="public-menu-contact-link"
                data-analytics-cta="email"
                href={`mailto:${contact.email}`}
              >
                <span aria-hidden="true" className="glyph-at">
                  @
                </span>
                <span>{contact.email}</span>
              </a>
              <Link className="public-menu-staff" href="/admin/sign-in" onClick={closeMenu}>
                {copy.staffLoginLabel}
              </Link>
            </aside>
          </div>
          <footer className="public-menu-footer">
            <p className="datum-label">{copy.menuTagline}</p>
            <Link
              aria-current={isCurrentPath(pathname, cta.href) ? "page" : undefined}
              className="public-menu-cta"
              data-analytics-cta="start_project"
              href={cta.href}
              onClick={closeMenu}
            >
              {cta.label}
              <ArrowMark />
            </Link>
          </footer>
        </div>
      </dialog>
    </>
  );
}
