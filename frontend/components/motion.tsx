"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Reason } from "@/lib/types";

const EASE = [0.2, 0.7, 0.2, 1] as const;

/** Fades + rises into view once, on scroll. */
export function Reveal({ children, delay = 0, className, style }: { children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** One SHAP factor. Bar grows from zero; teal "rules-out" bars grow from the right. */
export function ReasonBar({ reason, index = 0 }: { reason: Reason; index?: number }) {
  const isRulesOut = reason.direction === "rules-out";
  return (
    <div className="bar-row">
      <div className="lab">
        <span>{reason.label}</span>
        <span style={{ color: isRulesOut ? "var(--teal)" : "var(--coral)" }}>
          {isRulesOut ? "rules out heat" : "pushes to risk"}
        </span>
      </div>
      <div className={`track${isRulesOut ? " right" : ""}`}>
        <motion.div
          className={`fill ${isRulesOut ? "teal" : "coral"}`}
          initial={{ width: 0 }}
          whileInView={{ width: `${reason.weight}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1], delay: 0.15 + index * 0.08 }}
        />
      </div>
    </div>
  );
}

/** Counts up to `to` over `duration` ms. */
export function CountUp({ to, suffix = "", duration = 1000 }: { to: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - k, 3);
      setVal(Math.round(to * e));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return (
    <>
      {val}
      {suffix}
    </>
  );
}

/** Hero device card that tilts toward the cursor in 3D. */
export function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg)`;
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = "perspective(900px) rotateY(0) rotateX(0)";
  };
  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={reset}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: EASE, delay: 0.45 }}
    >
      {children}
    </motion.div>
  );
}

/** Hero headline: three lines that rise in sequence, with one gold word. */
export function HeroHeading() {
  const lines = [
    <>Give every</>,
    <>
      cow a <span className="gold">voice</span>
    </>,
    <>and a reason.</>,
  ];
  return (
    <h1>
      {lines.map((ln, i) => (
        <span key={i} style={{ display: "block", overflow: "hidden" }}>
          <motion.span
            style={{ display: "block" }}
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.05 + i * 0.1 }}
          >
            {ln}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}
