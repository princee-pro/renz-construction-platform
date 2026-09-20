"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useState, type KeyboardEvent } from "react";

import { ArrowMark } from "@/components/site/arrow-mark";
import { Field } from "@/components/site/fields";
import type { NavCopy, NavService } from "@/components/site/nav/nav-types";
import { isApiMediaSrc } from "@/lib/media/public-src";

type ServicesMegaPanelProps = Readonly<{
  id: string;
  open: boolean;
  label: string;
  services: readonly NavService[];
  copy: NavCopy;
  onEnter: () => void;
  onLeave: () => void;
  onClose: () => void;
}>;

/**
 * Services mega panel (D1.6 brief §36): an architectural sheet that opens
 * under the track on hover or focus. 01 the service index, 02 what the
 * selected service does, 03 what it includes, 04 one related study and
 * 05 the way in. Changing the highlighted service moves the datum, swaps the
 * media plane and re-types the copy. Services come from the published
 * register, so a sixth service appears here without a code change. The
 * panel lives at header level (not inside the track) so it can span the
 * viewport; the track owns the hover intent and passes `open` down.
 */
export function ServicesMegaPanel({
  id,
  open,
  label,
  services,
  copy,
  onEnter,
  onLeave,
  onClose,
}: ServicesMegaPanelProps) {
  const reduced = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const active = services[Math.min(activeIndex, Math.max(0, services.length - 1))];

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const items = Array.from(
        event.currentTarget.querySelectorAll<HTMLAnchorElement>(".mega-index a"),
      );
      const position = items.indexOf(document.activeElement as HTMLAnchorElement);
      if (position < 0) return;
      event.preventDefault();
      const next = (position + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    }
  }

  return (
    <div
      aria-label={`${label} index`}
      className="mega-panel"
      data-open={open ? "true" : "false"}
      id={id}
      inert={!open}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (!next || !event.currentTarget.contains(next)) onLeave();
      }}
      onFocus={onEnter}
      onKeyDown={handleKeyDown}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="container mega-grid">
        <nav aria-label="Service index" className="mega-index">
          <p className="mega-zone-label">
            <span>01</span> Service index
          </p>
          <ul>
            {services.map((service, index) => (
              <li key={service.slug}>
                <Link
                  data-active={index === activeIndex ? "true" : undefined}
                  href={`/services/${service.slug}`}
                  onFocus={() => setActiveIndex(index)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <span className="index-mark">{service.index}</span>
                  <strong>{service.name}</strong>
                  <ArrowMark />
                </Link>
              </li>
            ))}
          </ul>
          <Link className="mega-all" href="/services">
            <span className="datum-label">{copy.allServicesLabel}</span>
            <ArrowMark />
          </Link>
        </nav>

        <div className="mega-detail-slot">
          <AnimatePresence initial={false} mode="wait">
            {active ? (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="mega-detail"
                exit={{ opacity: 0, y: reduced ? 0 : -6 }}
                initial={{ opacity: 0, y: reduced ? 0 : 8 }}
                key={active.slug}
                transition={{ duration: reduced ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="mega-zone-label">
                  <span>02</span> {active.index} / {active.name}
                </p>
                <p className="mega-positioning">{active.positioning}</p>
                {active.subServices.length > 0 ? (
                  <>
                    <p className="mega-zone-label">
                      <span>03</span> Includes
                    </p>
                    <ul aria-label="Includes" className="mega-includes">
                      {active.subServices.slice(0, 4).map((sub) => (
                        <li key={sub}>{sub}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {active.receive ? (
                  <dl className="mega-facts">
                    <div>
                      <dt>You receive</dt>
                      <dd>{active.receive}</dd>
                    </div>
                  </dl>
                ) : null}
                <div className="mega-actions">
                  <Link className="btn btn-primary btn-compact" href={`/services/${active.slug}`}>
                    <span>View {active.name}</span>
                    <ArrowMark />
                  </Link>
                  <Link
                    className="datum-link on-dark"
                    data-analytics-cta="service_enquiry"
                    href={`/enquire/service?service=${active.slug}`}
                  >
                    Ask about this service
                    <ArrowMark />
                  </Link>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="mega-media">
          <div aria-hidden="true" className="mega-media-plane">
            <AnimatePresence initial={false}>
              {active ? (
                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  className="mega-media-frame"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0, scale: reduced ? 1 : 1.03 }}
                  key={active.slug}
                  transition={{ duration: reduced ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  {open && active.related?.src ? (
                    <Image
                      alt=""
                      fill
                      sizes="(max-width: 1280px) 30vw, 420px"
                      src={active.related.src}
                      unoptimized={isApiMediaSrc(active.related.src)}
                    />
                  ) : (
                    <Field tone="dark" variant={active.field} />
                  )}
                  <span className="mega-media-datum" />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <div className="mega-media-caption">
            <p className="mega-zone-label">
              <span>04</span> Related study
            </p>
            {active?.related ? (
              <Link className="mega-media-link" href={active.related.href}>
                <strong>{active.related.title}</strong>
                {active.related.provenance ? (
                  <small className="concept-badge">{active.related.provenance}</small>
                ) : null}
              </Link>
            ) : (
              <strong>Field {active?.index ?? ""}</strong>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
