"use client";

import { useId, useState } from "react";

import { Field } from "@/components/site/fields";
import type { ProcessStep } from "@/features/website/contracts";

export type IndexedProcessStep = ProcessStep & Readonly<{ index: string }>;

export function indexSteps(steps: readonly ProcessStep[]): readonly IndexedProcessStep[] {
  return steps.map((step, index) => ({ ...step, index: String(index + 1).padStart(2, "0") }));
}

/**
 * Process navigator (D1.5 §45): a step rail on the left, the active step
 * large on the right — what happens, what you receive, the decision — with
 * the technical field changing per step. Tabs pattern (arrow keys, Home,
 * End); on narrow viewports every step is laid out as a vertical timeline
 * so nothing depends on the interaction.
 */
export function ProcessNavigator({ steps }: Readonly<{ steps: readonly ProcessStep[] }>) {
  const processSteps = indexSteps(steps);
  const [active, setActive] = useState(0);
  const baseId = useId();
  const step = processSteps[active] ?? processSteps[0];
  if (!step) return null;

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    const keys: Record<string, number> = {
      ArrowDown: active + 1,
      ArrowRight: active + 1,
      ArrowUp: active - 1,
      ArrowLeft: active - 1,
      Home: 0,
      End: processSteps.length - 1,
    };
    const next = keys[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const index = (next + processSteps.length) % processSteps.length;
    setActive(index);
    document.getElementById(`${baseId}-tab-${index}`)?.focus();
  }

  return (
    <div className="process-nav" data-step={step.key}>
      <div
        aria-label="Process steps"
        className="process-nav-rail"
        onKeyDown={onKeyDown}
        role="tablist"
        aria-orientation="vertical"
      >
        {processSteps.map((entry, index) => (
          <button
            aria-controls={`${baseId}-panel`}
            aria-selected={index === active}
            className="process-nav-tab"
            id={`${baseId}-tab-${index}`}
            key={entry.key}
            onClick={() => setActive(index)}
            onFocus={() => setActive(index)}
            role="tab"
            tabIndex={index === active ? 0 : -1}
            type="button"
          >
            <span className="index-mark">{entry.index}</span>
            <strong>{entry.title}</strong>
            <span className="process-nav-verb">{entry.verb}</span>
          </button>
        ))}
      </div>
      <div
        aria-labelledby={`${baseId}-tab-${active}`}
        className="process-nav-panel"
        id={`${baseId}-panel`}
        key={step.key}
        role="tabpanel"
      >
        <Field tone="light" variant={step.field} className="process-nav-field" />
        <div className="process-nav-panel-inner">
          <p className="kicker">
            {step.index} / {step.verb}
          </p>
          <h3>{step.title}</h3>
          <p className="process-nav-summary">{step.summary}</p>
          <dl className="process-nav-facts">
            <div>
              <dt>You receive</dt>
              <dd>{step.receives}</dd>
            </div>
            <div>
              <dt>Decision</dt>
              <dd>{step.decision}</dd>
            </div>
          </dl>
        </div>
      </div>
      {/* Narrow viewports: the whole sequence, no interaction required. */}
      <ol className="process-nav-timeline" aria-label="The steps in order">
        {processSteps.map((entry) => (
          <li key={entry.key}>
            <span className="index-mark">{entry.index}</span>
            <div>
              <strong>{entry.title}</strong>
              <p>{entry.summary}</p>
              <dl>
                <div>
                  <dt>You receive</dt>
                  <dd>{entry.receives}</dd>
                </div>
                <div>
                  <dt>Decision</dt>
                  <dd>{entry.decision}</dd>
                </div>
              </dl>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
