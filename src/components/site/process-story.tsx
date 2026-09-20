"use client";

import { useEffect, useRef, useState } from "react";

import { Reveal } from "@/components/motion/primitives";
import { Field } from "@/components/site/fields";
import { indexSteps } from "@/components/site/process-navigator";
import type { ProcessStep } from "@/features/website/contracts";

/**
 * The RENZ process as a ledger (D1.7 §49–52): a sticky index rail on the
 * left and one panel per step on the right, the whole composition centred
 * in the container. Ordinary vertical scrolling; the rail highlights the
 * step in view. Each panel: index, verb, title, what happens, what the
 * client receives, the decision taken, and what comes next. The "compact"
 * mode (Services page) keeps the same composition with tighter panels and
 * no background field.
 */
export function ProcessStory({
  steps,
  compact = false,
  kicker = "How RENZ works",
  heading = "From the first conversation to handover.",
  intro = null,
  closing = "Sign-off, and the next project.",
}: Readonly<{
  steps: readonly ProcessStep[];
  compact?: boolean;
  kicker?: string | null;
  heading?: string | null;
  intro?: string | null;
  closing?: string | null;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const processSteps = indexSteps(steps);
  const count = processSteps.length;

  useEffect(() => {
    const root = ref.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const panels = Array.from(root.querySelectorAll<HTMLElement>("[data-step-index]"));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = Number(visible.target.getAttribute("data-step-index"));
        if (!Number.isNaN(index)) setActive(index);
      },
      { rootMargin: "-35% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    for (const panel of panels) observer.observe(panel);
    return () => observer.disconnect();
  }, [count]);

  if (count === 0) return null;
  return (
    <div className={`process-story${compact ? " process-story-compact" : ""}`} ref={ref}>
      <div className="container process-story-head">
        <div>
          {kicker ? <p className="kicker">{kicker}</p> : null}
          <h2 id="process-heading">{heading}</h2>
        </div>
        {intro ? <p>{intro}</p> : null}
      </div>
      <div className="container process-ledger">
        <ol aria-label="Steps" className="process-ledger-rail">
          {processSteps.map((step, index) => (
            <li data-active={index === active ? "true" : undefined} key={step.key}>
              <a href={`#process-step-${step.key}`}>
                <span className="index-mark">{step.index}</span>
                <span>{step.title}</span>
              </a>
            </li>
          ))}
        </ol>
        <div className="process-ledger-panels">
          {processSteps.map((step, index) => (
            <Reveal
              as="article"
              className={`process-panel process-panel-${step.key}`}
              delay={0.05}
              id={`process-step-${step.key}`}
              key={step.key}
              variant="assemble"
            >
              <div data-step-index={index} className="process-panel-inner">
                {compact ? null : (
                  <Field tone="light" variant={step.field} className="process-panel-field" />
                )}
                <div className="process-panel-lead">
                  <div className="process-panel-head">
                    <span className="process-panel-index">{step.index}</span>
                    <span className="datum-label">{step.verb}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p className="process-panel-summary">{step.summary}</p>
                </div>
                <dl className="process-panel-facts">
                  <div>
                    <dt>You receive</dt>
                    <dd>{step.receives}</dd>
                  </div>
                  <div>
                    <dt>Decision</dt>
                    <dd>{step.decision}</dd>
                  </div>
                  <div className="process-panel-next">
                    <dt>Then</dt>
                    <dd>
                      {processSteps[index + 1]
                        ? `${processSteps[index + 1]?.index} ${processSteps[index + 1]?.title}`
                        : closing}
                    </dd>
                  </div>
                </dl>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
