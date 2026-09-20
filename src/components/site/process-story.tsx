"use client";

import { useRef } from "react";

import { HorizontalStory, Reveal, ScrollProgress } from "@/components/motion/primitives";
import { Field } from "@/components/site/fields";
import { indexSteps } from "@/components/site/process-navigator";
import type { ProcessStep } from "@/features/website/contracts";

/**
 * The RENZ process as the site's ONE horizontal story (D1 §35–36). On wide
 * viewports vertical scrolling moves seven panels sideways under a sticky
 * progress datum; reduced motion and narrow viewports read as a vertical
 * sequence. Each panel: index, verb, title, what happens, what the client
 * receives, and the decision taken.
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
  const processSteps = indexSteps(steps);
  if (processSteps.length === 0) return null;
  return (
    <div className="process-story" ref={ref}>
      <div className="container process-story-head">
        <div>
          {kicker ? <p className="kicker">{kicker}</p> : null}
          <h2 id="process-heading">{heading}</h2>
        </div>
        {intro ? <p>{intro}</p> : null}
      </div>
      <div className="process-story-progress container" aria-hidden="true">
        <ScrollProgress target={ref} />
      </div>
      <HorizontalStory
        className={compact ? "process-story-compact" : ""}
        label="The RENZ process"
        panels={processSteps.length}
        rail={
          <ol className="process-rail">
            {processSteps.map((step) => (
              <li key={step.key}>
                <span className="index-mark">{step.index}</span>
                <span>{step.title}</span>
              </li>
            ))}
          </ol>
        }
      >
        {processSteps.map((step, index) => (
          <Reveal
            as="article"
            className={`process-panel process-panel-${step.key}`}
            delay={index * 0.04}
            key={step.key}
            variant="assemble"
          >
            <Field tone="light" variant={step.field} className="process-panel-field" />
            <div className="process-panel-inner">
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
      </HorizontalStory>
    </div>
  );
}
