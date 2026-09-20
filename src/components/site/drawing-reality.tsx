"use client";

import type { ChangeEvent, CSSProperties, ReactNode } from "react";
import { useState } from "react";

type RevealStyle = CSSProperties & Readonly<{ "--reveal-position": string }>;

type DrawingRealityProps = Readonly<{
  drawing: ReactNode;
  reality: ReactNode;
}>;

export function DrawingReality({ drawing, reality }: DrawingRealityProps) {
  const [value, setValue] = useState(54);
  const style: RevealStyle = { "--reveal-position": `${value}%` };
  const showingReality = value >= 50;

  function updateValue(event: ChangeEvent<HTMLInputElement>): void {
    setValue(Number(event.currentTarget.value));
  }

  return (
    <section
      className="drawing-reality"
      data-dominant-layer={showingReality ? "reality" : "drawing"}
      aria-labelledby="drawing-reality-title"
      style={style}
    >
      <header className="drawing-reality-header">
        <div>
          <p className="section-kicker">Drawing → built / concept comparison</p>
          <h2 id="drawing-reality-title">From the drawing to the building.</h2>
        </div>
        <p id="drawing-reality-description">
          Compare a technical interpretation with a concept visual. The control changes only this
          preview composition; the resolved layer remains a generated concept, not built evidence.
        </p>
      </header>
      <div className="drawing-reality-stage">
        <div className="drawing-reality-layer drawing-reality-drawing">
          {drawing}
          <span>Drawing / geometry study</span>
        </div>
        <div className="drawing-reality-layer drawing-reality-resolved">
          {reality}
          <span>Resolved concept / not RENZ built work</span>
        </div>
        <span className="drawing-reality-divider" aria-hidden="true" />
      </div>
      <div className="drawing-reality-controls">
        <label htmlFor="drawing-reality-range">Reveal resolved concept</label>
        <input
          id="drawing-reality-range"
          aria-describedby="drawing-reality-description"
          max="100"
          min="0"
          onChange={updateValue}
          step="1"
          type="range"
          value={value}
        />
        <output htmlFor="drawing-reality-range">{value}%</output>
        <button type="button" onClick={() => setValue(showingReality ? 0 : 100)}>
          {showingReality ? "Show drawing" : "Show resolved concept"}
        </button>
      </div>
    </section>
  );
}
