"use client";

import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { ArrowMark } from "@/components/site/arrow-mark";
import { MobileNavigator } from "@/components/site/nav/mobile-navigator";
import {
  isCurrentPath,
  type NavContact,
  type NavCopy,
  type NavLink,
  type NavService,
} from "@/components/site/nav/nav-types";
import { ServicesMegaPanel } from "@/components/site/nav/services-mega-panel";
import { WhatsAppGlyph } from "@/components/site/whatsapp-glyph";

type MeasuredTrackNavProps = Readonly<{
  brand: ReactNode;
  /** The mark shown inside the mobile navigator (not a link: Home is the first route). */
  menuBrand: ReactNode;
  previewLabel: boolean;
  navigation: readonly NavLink[];
  cta: NavLink;
  services: readonly NavService[];
  contact: NavContact;
  copy: NavCopy;
}>;

type Plate = Readonly<{ x: number; width: number; visible: boolean }>;
const hiddenPlate: Plate = { x: 0, width: 0, visible: false };

/**
 * RENZ MEASURED TRACK (D1.6 brief §30–40). Left: the mark. Centre: a
 * floating track carrying the owner-managed routes, each indexed like a
 * drawing sheet. One gold PLATE sits under the current route and glides to
 * the next route on navigation; a thinner PREVIEW MARK follows hover and
 * keyboard focus and returns home on leave. Right: WhatsApp (green,
 * messaging only) and the primary call to action. Over the landing media the
 * header is transparent; once scrolled it becomes a solid ink bar with a
 * bottom datum, the mark and the track tighten, and the plate keeps
 * measuring. Routes that do not fit fold into a "More" list so the owner can
 * add pages without breaking the composition.
 */
export function MeasuredTrackNav({
  brand,
  menuBrand,
  previewLabel,
  navigation,
  cta,
  services,
  contact,
  copy,
}: MeasuredTrackNavProps) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (latest) => {
    const next = latest > 32;
    setScrolled((current) => (current === next ? current : next));
  });

  const primary = navigation.filter((link) => link.href !== cta.href && link.href !== "/");
  const activeIndex = primary.findIndex((link) => isCurrentPath(pathname, link.href));

  // ----- overflow: fold trailing routes into "More" when the track is full -----
  const trackRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const naturalWidths = useRef<number[]>([]);
  const [visibleCount, setVisibleCount] = useState(primary.length);
  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const inner = track.closest<HTMLElement>(".public-header-inner");
    if (!inner) return;
    // Natural widths are recorded while every item is rendered, then reused.
    if (
      naturalWidths.current.length !== primary.length &&
      itemRefs.current.length >= primary.length
    ) {
      naturalWidths.current = itemRefs.current
        .slice(0, primary.length)
        .map((item) => item?.getBoundingClientRect().width ?? 0);
      if (naturalWidths.current.some((width) => width === 0)) return;
    }
    // Free space = header row minus brand, actions, gaps and the frame padding.
    const brand = inner.querySelector<HTMLElement>(".public-header-brand");
    const actions = inner.querySelector<HTMLElement>(".public-header-actions");
    const reserved =
      (brand?.getBoundingClientRect().width ?? 0) +
      (actions?.getBoundingClientRect().width ?? 0) +
      3 * 24 +
      16;
    const available = inner.getBoundingClientRect().width - reserved - 96; // room for "More"
    let used = 0;
    let count = 0;
    for (const width of naturalWidths.current) {
      if (used + width > available) break;
      used += width;
      count += 1;
    }
    const next = count >= primary.length ? primary.length : Math.max(2, count);
    setVisibleCount((current) => (current === next ? current : next));
  }, [primary.length]);
  useLayoutEffect(() => {
    measure();
    const inner = trackRef.current?.closest<HTMLElement>(".public-header-inner");
    if (!inner || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(inner);
    return () => observer.disconnect();
  }, [measure]);
  // A changed route count (owner added a page) re-measures from scratch.
  const [measuredFor, setMeasuredFor] = useState(primary.length);
  if (measuredFor !== primary.length) {
    setMeasuredFor(primary.length);
    setVisibleCount(primary.length);
  }

  const visible = primary.slice(0, visibleCount);
  const folded = primary.slice(visibleCount);
  const activeFolded = folded.some((link) => isCurrentPath(pathname, link.href));

  // ----- Services mega panel: hover intent owned here, rendered at header level -----
  const megaId = useId();
  const [megaOpen, setMegaOpen] = useState(false);
  const megaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // After Escape the panel stays closed until focus or the pointer leaves.
  const megaSuppressed = useRef(false);
  const openMega = useCallback(() => {
    if (megaTimer.current) clearTimeout(megaTimer.current);
    if (services.length > 0 && !megaSuppressed.current) setMegaOpen(true);
  }, [services.length]);
  const scheduleMegaClose = useCallback(() => {
    if (megaTimer.current) clearTimeout(megaTimer.current);
    megaSuppressed.current = false;
    megaTimer.current = setTimeout(() => setMegaOpen(false), 160);
  }, []);
  const closeMegaNow = useCallback(() => {
    if (megaTimer.current) clearTimeout(megaTimer.current);
    megaSuppressed.current = true;
    setMegaOpen(false);
  }, []);
  const [megaPathname, setMegaPathname] = useState(pathname);
  if (megaPathname !== pathname) {
    setMegaPathname(pathname);
    setMegaOpen(false);
  }

  // ----- the plate (current route) and the preview mark (hover / focus) -----
  // Both are Motion values animated from DOM measurements, so React state
  // never has to mirror layout; reduced motion snaps instead of gliding.
  const plateX = useMotionValue(0);
  const plateWidth = useMotionValue(0);
  const plateOpacity = useMotionValue(0);
  const previewX = useMotionValue(0);
  const previewWidth = useMotionValue(0);
  const previewOpacity = useMotionValue(0);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const rectFor = useCallback((index: number): Plate => {
    const track = trackRef.current;
    const item = itemRefs.current[index];
    if (!track || !item) return hiddenPlate;
    const trackRect = track.getBoundingClientRect();
    const rect = item.getBoundingClientRect();
    return { x: rect.left - trackRect.left, width: rect.width, visible: true };
  }, []);
  const plateTarget = activeFolded ? visibleCount : activeIndex;
  useLayoutEffect(() => {
    const spring = reduced
      ? ({ duration: 0 } as const)
      : ({ type: "spring", stiffness: 420, damping: 38, mass: 0.6 } as const);
    const target = plateTarget >= 0 ? rectFor(plateTarget) : hiddenPlate;
    if (target.visible) {
      animate(plateX, target.x, spring);
      animate(plateWidth, target.width, spring);
    }
    animate(plateOpacity, target.visible ? 1 : 0, { duration: reduced ? 0 : 0.2 });
  }, [plateTarget, rectFor, visibleCount, scrolled, plateX, plateWidth, plateOpacity, reduced]);
  // While the mega panel is open the preview mark stays on Services.
  const servicesIndex = visible.findIndex((link) => link.href === "/services");
  const effectivePreview = megaOpen && servicesIndex >= 0 ? servicesIndex : previewIndex;
  useLayoutEffect(() => {
    const spring = reduced
      ? ({ duration: 0 } as const)
      : ({ type: "spring", stiffness: 420, damping: 38, mass: 0.6 } as const);
    const target = effectivePreview === null ? hiddenPlate : rectFor(effectivePreview);
    if (target.visible) {
      animate(previewX, target.x, spring);
      animate(previewWidth, target.width, spring);
    }
    animate(previewOpacity, target.visible ? 1 : 0, { duration: reduced ? 0 : 0.18 });
  }, [effectivePreview, rectFor, scrolled, previewX, previewWidth, previewOpacity, reduced]);

  // "More" closes whenever the route changes (state adjusted during render).
  const [moreOpen, setMoreOpen] = useState(false);
  const [morePathname, setMorePathname] = useState(pathname);
  if (morePathname !== pathname) {
    setMorePathname(pathname);
    setMoreOpen(false);
  }
  const moreId = useId();
  const moreRef = useRef<HTMLLIElement>(null);

  function trackKeys(event: KeyboardEvent<HTMLUListElement>): void {
    if (
      event.key !== "ArrowRight" &&
      event.key !== "ArrowLeft" &&
      event.key !== "Home" &&
      event.key !== "End"
    )
      return;
    const links = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(":scope > li > a, :scope > li > button"),
    );
    const current = links.indexOf(document.activeElement as HTMLElement);
    if (current < 0) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? links.length - 1
          : (current + (event.key === "ArrowRight" ? 1 : -1) + links.length) % links.length;
    links[next]?.focus();
  }

  return (
    <header className="public-header" data-scrolled={scrolled ? "true" : "false"}>
      <div className="container public-header-inner">
        <div className="public-header-brand">
          {brand}
          {previewLabel ? <span className="client-preview-label">Preview</span> : null}
        </div>

        <nav aria-label="Primary navigation" className="public-desktop-navigation">
          <div className="nav-track-frame">
            <ul
              className="nav-track"
              onKeyDown={trackKeys}
              onMouseLeave={() => setPreviewIndex(null)}
              ref={trackRef}
            >
              {/* PLATE: the current route, measured. */}
              <motion.span
                aria-hidden="true"
                className="nav-plate"
                style={{ x: plateX, width: plateWidth, opacity: plateOpacity }}
              />
              {/* PREVIEW MARK: the hovered / focused route. */}
              <motion.span
                aria-hidden="true"
                className="nav-preview"
                style={{ x: previewX, width: previewWidth, opacity: previewOpacity }}
              />
              {visible.map((link, index) => {
                const current = isCurrentPath(pathname, link.href);
                const isServices = link.href === "/services";
                return (
                  <li
                    className={isServices ? "nav-item nav-item-services" : "nav-item"}
                    data-current={current ? "true" : undefined}
                    data-open={isServices && megaOpen ? "true" : undefined}
                    key={link.href}
                    onBlur={
                      isServices
                        ? (event) => {
                            const next = event.relatedTarget as Node | null;
                            if (!next || !event.currentTarget.contains(next)) scheduleMegaClose();
                          }
                        : undefined
                    }
                    onFocus={isServices ? openMega : undefined}
                    onKeyDown={
                      isServices
                        ? (event) => {
                            if (event.key === "Escape") closeMegaNow();
                            if (event.key === "ArrowDown" && megaOpen) {
                              event.preventDefault();
                              document
                                .querySelector<HTMLAnchorElement>(
                                  `#${CSS.escape(megaId)} .mega-index a`,
                                )
                                ?.focus();
                            }
                          }
                        : undefined
                    }
                    onMouseEnter={isServices ? openMega : undefined}
                    onMouseLeave={isServices ? scheduleMegaClose : undefined}
                    ref={(element) => {
                      itemRefs.current[index] = element;
                    }}
                  >
                    <Link
                      aria-controls={isServices ? megaId : undefined}
                      aria-current={current ? "page" : undefined}
                      aria-expanded={isServices ? megaOpen : undefined}
                      aria-haspopup={isServices ? "true" : undefined}
                      href={link.href}
                      onBlur={() => setPreviewIndex((value) => (value === index ? null : value))}
                      onFocus={() => setPreviewIndex(index)}
                      onMouseEnter={() => setPreviewIndex(index)}
                    >
                      <span aria-hidden="true" className="nav-index">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="nav-label">{link.label}</span>
                    </Link>
                  </li>
                );
              })}
              {folded.length > 0 ? (
                <li
                  className="nav-item nav-item-more"
                  data-current={activeFolded ? "true" : undefined}
                  onBlur={(event) => {
                    if (!moreRef.current?.contains(event.relatedTarget)) {
                      setMoreOpen(false);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setMoreOpen(false);
                      moreRef.current?.querySelector("button")?.focus();
                    }
                  }}
                  onMouseEnter={() => setPreviewIndex(visibleCount)}
                  ref={(element) => {
                    itemRefs.current[visibleCount] = element;
                    moreRef.current = element;
                  }}
                >
                  <button
                    aria-controls={moreId}
                    aria-expanded={moreOpen}
                    onClick={() => setMoreOpen((value) => !value)}
                    onFocus={() => setPreviewIndex(visibleCount)}
                    type="button"
                  >
                    <span aria-hidden="true" className="nav-index">
                      +{folded.length}
                    </span>
                    <span className="nav-label">More</span>
                  </button>
                  <ul className="nav-more-list" hidden={!moreOpen} id={moreId}>
                    {folded.map((link, index) => (
                      <li key={link.href}>
                        <Link
                          aria-current={isCurrentPath(pathname, link.href) ? "page" : undefined}
                          href={link.href}
                        >
                          <span aria-hidden="true" className="nav-index">
                            {String(visibleCount + index + 1).padStart(2, "0")}
                          </span>
                          <span className="nav-label">{link.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : null}
            </ul>
          </div>
          {services.length > 0 && visible.some((link) => link.href === "/services") ? (
            <ServicesMegaPanel
              copy={copy}
              id={megaId}
              label={visible.find((link) => link.href === "/services")?.label ?? "Services"}
              onClose={() => {
                closeMegaNow();
                trackRef.current?.querySelector<HTMLAnchorElement>('a[href="/services"]')?.focus();
              }}
              onEnter={openMega}
              onLeave={scheduleMegaClose}
              open={megaOpen}
              services={services}
            />
          ) : null}
        </nav>

        <div className="public-header-actions">
          <a
            aria-label={`Message ${contact.shortName} on WhatsApp`}
            className="header-icon-action header-icon-whatsapp"
            data-analytics-cta="whatsapp"
            href={contact.whatsappUrl}
            rel="noreferrer"
            target="_blank"
          >
            <WhatsAppGlyph />
          </a>
          <Link
            aria-current={isCurrentPath(pathname, cta.href) ? "page" : undefined}
            className="public-header-cta"
            data-analytics-cta="start_project"
            href={cta.href}
          >
            <span>{cta.label}</span>
            <ArrowMark />
          </Link>
          <MobileNavigator
            brand={menuBrand}
            contact={contact}
            copy={copy}
            cta={cta}
            navigation={[{ href: "/", label: "Home" }, ...primary]}
            services={services}
          />
        </div>
      </div>
      <span aria-hidden="true" className="public-header-datum" />
      <span aria-hidden="true" className="public-header-progress" />
    </header>
  );
}
