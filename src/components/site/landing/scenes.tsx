"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, type PointerEvent } from "react";

import type { LandingConcept } from "@/components/site/landing/landing-concepts";
import {
  Dim,
  Draw,
  Fill,
  HatchDefs,
  Label,
  Mark,
  Register,
  Scene,
} from "@/components/site/landing/scene-kit";

/**
 * One scene per landing concept (D1.6 brief §53–70). Each is a different
 * visual idea inside the same vocabulary: measured lines, registration
 * marks, hatched mass, a single gold datum. Scenes are decorative; the copy
 * beside them carries the message. t0 = the moment the landing mounts.
 */

/* ---------- Home: LAND → STRUCTURE ---------- */
function LandScene() {
  return (
    <Scene className="scene-land" fit="none">
      {/* survey point registers top-right, then the vertical datum drops */}
      <Mark delay={0.35} pulse tone="gold" x={1030} y={120} />
      <Draw d="M1030 150v560" dashed delay={0.8} duration={1.3} opacity={0.55} tone="paper" />
      {/* ground datum measures across the site */}
      <Draw d="M560 705h580" delay={1.2} duration={1.4} opacity={0.75} tone="gold" />
      <Draw
        d="M560 705v-14M760 705v-10M960 705v-10M1140 705v-14"
        delay={2.4}
        duration={0.4}
        tone="gold"
      />
      {/* structure lines resolve on the slope */}
      <Draw d="M760 705V520h180v185" delay={2.2} duration={1.1} opacity={0.6} tone="paper" />
      <Draw d="M700 705V600h60" delay={2.6} duration={0.7} opacity={0.5} tone="paper" />
      <Draw d="M940 600h120v105" delay={2.8} duration={0.7} opacity={0.5} tone="paper" />
      <Label anchor="end" delay={3.2} tone="gold" x={1140} y={690}>
        DATUM 00.00
      </Label>
      <Label delay={1.1} tone="paper" x={1048} y={124}>
        SP-01
      </Label>
    </Scene>
  );
}

/* ---------- Services: ONE PROJECT, DIFFERENT WAYS TO HELP ---------- */
function StagesScene() {
  const panes = [
    { x: 40, label: "01 DRAWING" },
    { x: 440, label: "02 STRUCTURE" },
    { x: 840, label: "03 BUILT" },
  ];
  return (
    <Scene className="scene-stages" fit="meet" viewBox="0 60 1200 540">
      <HatchDefs id="stages-hatch" />
      {/* measuring datum with three stage ticks */}
      <Draw d="M40 120h1120" delay={0.2} duration={1.2} tone="gold" />
      {panes.map((pane, index) => (
        <g key={pane.label}>
          <Draw d={`M${pane.x} 110v20`} delay={0.9 + index * 0.15} duration={0.25} tone="gold" />
          <Label delay={1 + index * 0.15} tone="gold" x={pane.x + 12} y={100}>
            {pane.label}
          </Label>
        </g>
      ))}
      {/* 01 drawing: plan fragment */}
      <Draw
        d="M80 220h240v300H80zM80 370h120M200 220v150M240 370v150"
        delay={1.3}
        duration={1.2}
        tone="paper"
      />
      <Dim delay={2.2} label="12.0" tone="gold" x1={80} x2={320} y1={560} y2={560} />
      {/* 02 structure: columns and beams */}
      <Draw d="M480 520h240M480 420h240M480 320h240" delay={1.9} duration={0.9} tone="paper" />
      <Draw d="M500 520V240M600 520V240M700 520V240" delay={2.3} duration={0.9} tone="paper" />
      <Draw d="M480 240h240" delay={2.9} duration={0.5} tone="gold" />
      {/* 03 built: hatched mass rising */}
      <g className="scene-paper">
        <Fill delay={2.6} height={120} opacity={0.35} width={240} x={880} y={400} />
        <Fill delay={2.9} height={100} opacity={0.5} width={200} x={900} y={300} />
        <Fill delay={3.2} height={70} opacity={0.65} width={150} x={925} y={230} />
      </g>
      <Draw d="M880 520h240" delay={3.4} duration={0.6} tone="gold" />
      <Mark delay={3.6} tone="gold" x={1120} y={230} />
    </Scene>
  );
}

/* ---------- Design: DRAWING → FORM ---------- */
function DrawingFormScene() {
  return (
    <Scene className="scene-drawing-form" fit="meet" viewBox="40 260 1080 540">
      {/* plan lines and dimensions */}
      <Draw d="M120 520h360v200H120z" delay={0.2} duration={1.2} tone="paper" />
      <Draw
        d="M120 620h140M260 520v100M360 620v100"
        delay={1.1}
        duration={0.7}
        opacity={0.7}
        tone="paper"
      />
      <Dim delay={1.6} label="9.60" tone="gold" x1={120} x2={480} y1={760} y2={760} />
      <Dim delay={1.9} label="5.20" tone="gold" x1={80} x2={80} y1={520} y2={720} />
      {/* elevation rises */}
      <Draw d="M120 470V300h360v170" delay={2.2} duration={1} opacity={0.7} tone="paper" />
      <Draw
        d="M180 470v-90h70v90M330 470v-110h100v110"
        delay={2.9}
        duration={0.8}
        opacity={0.6}
        tone="paper"
      />
      {/* isometric mass extrudes on the right */}
      <Draw d="M640 640l220-120 220 120-220 120z" delay={2.4} duration={1} tone="paper" />
      <Draw
        d="M640 640v-220l220-120 220 120v220M860 520v240M860 300v220"
        delay={3.1}
        duration={1.1}
        tone="paper"
      />
      <Draw d="M1080 420l-220 120" delay={3.9} duration={0.5} tone="gold" />
      <Draw
        d="M700 600l160-88M700 560l160-88"
        dashed
        delay={4.1}
        duration={0.5}
        opacity={0.5}
        tone="hair"
      />
      <Mark delay={4.2} pulse tone="gold" x={860} y={300} />
      <Label delay={4.3} tone="gold" x={880} y={296}>
        FORM
      </Label>
      <Label delay={1.4} tone="gold" x={120} y={505}>
        PLAN 1:100
      </Label>
    </Scene>
  );
}

/* ---------- Execution: PLAN → BUILD ---------- */
function PlanBuildScene() {
  const cells = [0, 1, 2, 3, 4, 5];
  return (
    <Scene className="scene-plan-build" fit="none">
      <HatchDefs id="build-hatch" />
      {/* staged progress datum */}
      <Draw d="M80 700h1040" delay={0.2} duration={1.1} tone="gold" />
      {["SET OUT", "STRUCTURE", "ENVELOPE", "SERVICES", "FINISH"].map((stage, index) => (
        <g key={stage}>
          <Draw
            d={`M${80 + index * 260} 692v16`}
            delay={1 + index * 0.12}
            duration={0.2}
            tone="gold"
          />
          <Label delay={1.1 + index * 0.12} tone="gold" x={80 + index * 260} y={735}>
            {`0${index + 1} ${stage}`}
          </Label>
        </g>
      ))}
      {/* formwork bays fill in order */}
      <g className="scene-paper">
        {cells.map((cell) => (
          <Fill
            axis="y"
            delay={1.5 + cell * 0.22}
            height={110}
            key={cell}
            opacity={0.22}
            width={150}
            x={720 + (cell % 3) * 160}
            y={cell < 3 ? 540 : 400}
          />
        ))}
      </g>
      {/* rebar grid draws through the bays */}
      <Draw
        d="M740 660h420M740 620h420M740 580h420M740 520h420M740 480h420M740 440h420"
        delay={2.6}
        duration={1}
        opacity={0.6}
        tone="paper"
      />
      <Draw
        d="M760 400v260M860 400v260M960 400v260M1060 400v260M1150 400v260"
        delay={3.2}
        duration={0.9}
        opacity={0.6}
        tone="paper"
      />
      <Mark delay={3.8} pulse tone="gold" x={720} y={400} />
      <Label delay={3.9} tone="paper" x={738} y={392}>
        POUR 03
      </Label>
    </Scene>
  );
}

/* ---------- Hybrid: ONE TEAM FROM DRAWING TO BUILD (moving datum reveal) ---------- */
export function SplitMorphOverlay() {
  const reduced = useReducedMotion();
  const target = useMotionValue(0.56);
  const x = useSpring(target, { stiffness: 60, damping: 22, mass: 1.2 });
  const clip = useTransform(x, (value) => `inset(0 ${Math.round((1 - value) * 100)}% 0 0)`);
  const left = useTransform(x, (value) => `${value * 100}%`);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduced) return;
    let direction = 1;
    const id = setInterval(() => {
      const current = target.get();
      if (current > 0.7) direction = -1;
      if (current < 0.38) direction = 1;
      target.set(current + direction * 0.02);
    }, 900);
    return () => clearInterval(id);
  }, [reduced, target]);
  function follow(event: PointerEvent<HTMLDivElement>): void {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    target.set(Math.min(0.85, Math.max(0.15, (event.clientX - rect.left) / rect.width)));
  }
  return (
    <div aria-hidden="true" className="split-morph" onPointerMove={follow} ref={ref}>
      <motion.div
        className="split-morph-drawing"
        style={reduced ? { clipPath: "inset(0 44% 0 0)" } : { clipPath: clip }}
      >
        <Scene className="scene-split" fit="none">
          <Draw d="M560 540h640" delay={0.3} duration={1} tone="gold" />
          <Draw
            d="M620 540V220h200v320M840 540V160h220v380M1080 540V280h100v260"
            delay={0.8}
            duration={1.3}
            tone="paper"
          />
          <Draw
            d="M650 280h140M650 360h140M650 440h140M870 220h160M870 320h160M870 420h160M1110 340h50M1110 440h50"
            delay={1.6}
            duration={1}
            opacity={0.6}
            tone="paper"
          />
          <Draw
            d="M620 220h200M840 160h220"
            dashed
            delay={2.2}
            duration={0.6}
            opacity={0.5}
            tone="hair"
          />
          <Dim delay={2.4} label="24.0" tone="gold" x1={620} x2={1180} y1={600} y2={600} />
        </Scene>
      </motion.div>
      <motion.span className="split-morph-datum" style={reduced ? { left: "56%" } : { left }} />
    </div>
  );
}

/* ---------- Supervision: CHECK EVERY STAGE ---------- */
function CheckpointsScene() {
  const points = [
    { x: 300, y: 620, n: "01" },
    { x: 560, y: 440, n: "02" },
    { x: 820, y: 560, n: "03" },
    { x: 1060, y: 380, n: "04" },
  ];
  return (
    <Scene className="scene-checkpoints" fit="none">
      {/* level line with bubble */}
      <Draw d="M80 500h1040" delay={0.2} duration={1.2} opacity={0.7} tone="gold" />
      <Register delay={1.3} from="scale">
        <g className="scene-gold">
          <rect fill="none" height="22" rx="11" strokeWidth="1" width="90" x="555" y="489" />
          <circle cx="600" cy="500" fill="currentColor" r="5" />
        </g>
      </Register>
      {/* crosshair registers, then checkpoints in sequence */}
      <Draw d="M900 160v120M840 220h120" delay={1.1} duration={0.6} tone="paper" />
      <Register delay={1.6} from="scale">
        <circle className="scene-paper" cx="900" cy="220" fill="none" r="34" strokeWidth="1" />
      </Register>
      {points.map((point, index) => (
        <g key={point.n}>
          <Draw
            d={`M${point.x} ${point.y}v-60`}
            delay={1.9 + index * 0.35}
            duration={0.4}
            tone="gold"
          />
          <Register delay={2.1 + index * 0.35} from="scale">
            <g className="scene-gold">
              <circle cx={point.x} cy={point.y - 80} fill="none" r="20" strokeWidth="1" />
              <circle
                className="scene-pulse"
                cx={point.x}
                cy={point.y - 80}
                fill="none"
                r="20"
                strokeWidth="1"
              />
              <text className="scene-label" textAnchor="middle" x={point.x} y={point.y - 75}>
                {point.n}
              </text>
            </g>
          </Register>
        </g>
      ))}
      <Label anchor="end" delay={3.6} tone="paper" x={1120} y={485}>
        LEVEL 0.000
      </Label>
    </Scene>
  );
}

/* ---------- Consultation: SITE → DECISION ---------- */
function SiteDecisionScene() {
  return (
    <Scene className="scene-site" fit="meet" viewBox="60 80 1100 680">
      {/* contours */}
      <Draw
        d="M120 560C260 470 420 500 560 430S860 330 1080 380"
        delay={0.2}
        duration={1.4}
        opacity={0.7}
        tone="paper"
      />
      <Draw
        d="M100 640C280 540 460 580 600 500S900 400 1100 460"
        delay={0.5}
        duration={1.4}
        opacity={0.55}
        tone="paper"
      />
      <Draw
        d="M140 720C320 620 520 660 660 580S940 470 1120 540"
        delay={0.8}
        duration={1.4}
        opacity={0.4}
        tone="paper"
      />
      <Draw
        d="M200 480C360 400 500 440 640 370S880 270 1040 300"
        delay={1.1}
        duration={1.4}
        opacity={0.35}
        tone="paper"
      />
      {/* site boundary */}
      <Draw d="M420 560l260-120 220 90-120 170-300 30z" delay={1.8} duration={1.2} tone="gold" />
      {/* sun path and orientation */}
      <Draw
        d="M300 250A340 340 0 0 1 980 250"
        dashed
        delay={2.4}
        duration={1.2}
        opacity={0.7}
        tone="gold"
      />
      <Register delay={3.2} from="scale">
        <g className="scene-gold">
          <circle cx="640" cy="120" fill="none" r="14" strokeWidth="1" />
          <path d="M640 96v-16M640 160v-16M596 120h-16M700 120h-16" strokeWidth="1" />
        </g>
      </Register>
      <Draw d="M1040 120v90M1030 140l10-20 10 20" delay={3} duration={0.6} tone="paper" />
      <Label anchor="middle" delay={3.3} tone="paper" x={1040} y={240}>
        N
      </Label>
      {/* access arrow */}
      <Draw d="M180 660l240-100" delay={3.4} duration={0.7} tone="gold" />
      <Draw d="M400 552l20 8-14 16" delay={4} duration={0.3} tone="gold" />
      <Label delay={4.1} tone="gold" x={150} y={690}>
        ACCESS
      </Label>
      <Mark delay={3.6} pulse tone="gold" x={680} y={600} />
    </Scene>
  );
}

/* ---------- About: HOW RENZ WORKS ---------- */
function HowWeWorkScene() {
  const stages = [
    { x: 160, label: "PLAN" },
    { x: 440, label: "BUILD" },
    { x: 720, label: "CHECK" },
    { x: 1000, label: "ADVISE" },
  ];
  return (
    <Scene className="scene-how" fit="meet" viewBox="60 240 1040 300">
      <HatchDefs id="how-hatch" />
      <Draw d="M160 420h840" delay={0.3} duration={1.4} tone="gold" />
      {stages.map((stage, index) => (
        <g key={stage.label}>
          <Register delay={1 + index * 0.4} from="scale">
            <g className="scene-paper">
              {index === 0 ? (
                <rect fill="none" height="90" strokeWidth="1" width="90" x={stage.x - 45} y="330" />
              ) : null}
              {index === 1 ? (
                <rect
                  fill="url(#how-hatch)"
                  height="90"
                  stroke="currentColor"
                  strokeWidth="1"
                  width="90"
                  x={stage.x - 45}
                  y="330"
                />
              ) : null}
              {index === 2 ? (
                <g>
                  <circle cx={stage.x} cy="375" fill="none" r="45" strokeWidth="1" />
                  <path d={`M${stage.x - 60} 375h120M${stage.x} 315v120`} strokeWidth="1" />
                </g>
              ) : null}
              {index === 3 ? (
                <g>
                  <path
                    d={`M${stage.x - 45} 330h90v60h-50l-20 24v-24h-20z`}
                    fill="none"
                    strokeWidth="1"
                  />
                  <circle cx={stage.x} cy="360" fill="currentColor" r="3" />
                </g>
              ) : null}
            </g>
          </Register>
          <Draw d={`M${stage.x} 430v16`} delay={1.2 + index * 0.4} duration={0.2} tone="gold" />
          <Label anchor="middle" delay={1.4 + index * 0.4} tone="gold" x={stage.x} y={480}>
            {`0${index + 1} ${stage.label}`}
          </Label>
        </g>
      ))}
      <Mark delay={2.9} pulse tone="gold" x={1000} y={420} />
    </Scene>
  );
}

/* ---------- Insights: DRAWING BOARD ---------- */
function DrawingBoardScene() {
  return (
    <Scene className="scene-board" fit="meet" viewBox="0 0 600 400">
      <HatchDefs id="board-hatch" />
      <Register delay={0.2} from="up">
        <rect
          className="scene-paper"
          fill="none"
          height="260"
          strokeWidth="1"
          width="200"
          x="40"
          y="80"
        />
      </Register>
      <Register delay={0.5} from="up">
        <rect
          className="scene-paper"
          fill="none"
          height="240"
          strokeWidth="1"
          width="200"
          x="90"
          y="40"
        />
      </Register>
      <Draw
        d="M120 90h140M120 120h140M120 150h100M120 180h140M120 210h80"
        delay={0.9}
        duration={1.1}
        opacity={0.65}
        tone="paper"
      />
      <Draw d="M340 120h200v160H340z" delay={1.3} duration={0.9} tone="paper" />
      <Register delay={2} from="scale">
        <rect
          className="scene-paper"
          fill="url(#board-hatch)"
          height="70"
          stroke="currentColor"
          strokeWidth="1"
          width="70"
          x="470"
          y="200"
        />
      </Register>
      <Draw
        d="M360 150h60M360 170h90M360 190h50"
        delay={2.2}
        duration={0.6}
        opacity={0.6}
        tone="paper"
      />
      <Draw d="M40 360h500" delay={2.4} duration={0.9} tone="gold" />
      <Mark delay={2.9} tone="gold" x={340} y={120} />
      <Label delay={3} tone="gold" x={352} y={110}>
        NOTE 01
      </Label>
    </Scene>
  );
}

/* ---------- Contact: DIRECT LINE ---------- */
function DirectLineScene() {
  return (
    <Scene className="scene-direct" fit="none">
      <Draw
        d="M0 200C300 220 600 520 900 520"
        delay={0.3}
        duration={1.4}
        opacity={0.6}
        tone="paper"
      />
      <Draw
        d="M0 400C300 400 600 520 900 520"
        delay={0.6}
        duration={1.3}
        opacity={0.6}
        tone="paper"
      />
      <Draw
        d="M0 640C300 640 600 540 900 520"
        delay={0.9}
        duration={1.2}
        opacity={0.6}
        tone="paper"
      />
      <Draw d="M900 520h240" delay={1.9} duration={0.7} tone="gold" />
      <Mark delay={2.1} pulse tone="gold" x={900} y={520} />
      <Label delay={2.4} tone="gold" x={920} y={506}>
        REPLY
      </Label>
    </Scene>
  );
}

/* ---------- Start a Project: FIRST BRIEF ---------- */
function FirstBriefScene() {
  return (
    <Scene className="scene-brief" fit="meet" viewBox="60 60 1080 680">
      <HatchDefs id="brief-hatch" />
      {/* blank drawing frame */}
      <Draw d="M100 100h1000v600H100z" delay={0.2} duration={1.2} opacity={0.6} tone="paper" />
      <Draw d="M100 660h1000M960 100v600" delay={1} duration={0.6} opacity={0.4} tone="hair" />
      <Label delay={1.2} tone="paper" x={980} y={690}>
        SHEET 01
      </Label>
      {/* site outline */}
      <Draw d="M300 560l140-220 280-60 120 200-160 120z" delay={1.6} duration={1.3} tone="gold" />
      {/* project mass */}
      <Register delay={2.8} from="up">
        <rect
          className="scene-paper"
          fill="url(#brief-hatch)"
          height="120"
          stroke="currentColor"
          strokeWidth="1"
          width="200"
          x="480"
          y="360"
        />
      </Register>
      <Draw
        d="M480 360l40-40h200v120l-40 40"
        delay={3.2}
        duration={0.8}
        opacity={0.7}
        tone="paper"
      />
      <Dim delay={3.6} label="?" tone="gold" x1={480} x2={680} y1={520} y2={520} />
      <Mark delay={3.9} pulse tone="gold" x={300} y={560} />
    </Scene>
  );
}

/* ---------- Service enquiry: SERVICE CUE ---------- */
function ServiceCueScene() {
  return (
    <Scene className="scene-cue" fit="none">
      <Draw d="M0 620h1200" delay={0.2} duration={1} tone="gold" />
      <Draw d="M900 620V380h200" delay={1} duration={0.8} opacity={0.7} tone="paper" />
      <Mark delay={1.6} tone="gold" x={900} y={380} />
    </Scene>
  );
}

/* ---------- Material enquiry: MATERIAL REGISTER ---------- */
function MaterialRegisterScene() {
  const cells = Array.from({ length: 9 }, (_, index) => index);
  return (
    <Scene className="scene-materials" fit="meet" viewBox="0 0 600 600">
      <HatchDefs id="mat-hatch" />
      {cells.map((cell) => {
        const x = 80 + (cell % 3) * 150;
        const y = 80 + Math.floor(cell / 3) * 150;
        const fill =
          cell % 3 === 0 ? "url(#mat-hatch)" : cell % 3 === 1 ? "url(#mat-hatch-cross)" : "none";
        return (
          <g key={cell}>
            <Register delay={0.3 + cell * 0.12} from="scale">
              <rect
                className="scene-paper"
                fill={fill}
                height="110"
                stroke="currentColor"
                strokeWidth="1"
                width="110"
                x={x}
                y={y}
              />
            </Register>
            <Label delay={0.5 + cell * 0.12} tone="gold" x={x + 84} y={y + 104}>
              ×
            </Label>
          </g>
        );
      })}
      <Draw d="M80 560h440" delay={1.7} duration={0.8} tone="gold" />
    </Scene>
  );
}

/* ---------- Project detail: registration corners only ---------- */
function ProjectScene() {
  return (
    <Scene className="scene-project" fit="none">
      <Draw d="M60 700h120M60 700v-120" delay={0.6} duration={0.6} opacity={0.7} tone="gold" />
      <Draw d="M1140 100h-120M1140 100v120" delay={0.8} duration={0.6} opacity={0.7} tone="gold" />
    </Scene>
  );
}

export function LandingScene({ concept }: Readonly<{ concept: LandingConcept }>) {
  switch (concept) {
    case "land":
      return <LandScene />;
    case "stages":
      return <StagesScene />;
    case "drawing-form":
      return <DrawingFormScene />;
    case "plan-build":
      return <PlanBuildScene />;
    case "split-morph":
      return <SplitMorphOverlay />;
    case "checkpoints":
      return <CheckpointsScene />;
    case "site-decision":
      return <SiteDecisionScene />;
    case "how-we-work":
      return <HowWeWorkScene />;
    case "drawing-board":
      return <DrawingBoardScene />;
    case "direct-line":
      return <DirectLineScene />;
    case "first-brief":
      return <FirstBriefScene />;
    case "service-cue":
      return <ServiceCueScene />;
    case "material-register":
      return <MaterialRegisterScene />;
    case "project":
      return <ProjectScene />;
    case "film-archive":
    case "calm":
      return null;
  }
}
