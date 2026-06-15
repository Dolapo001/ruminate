"use client";

import { motion } from "framer-motion";
import { CountUp } from "./motion";

const R = 76;
const C = 2 * Math.PI * R; // ~478

export function HerdRing({ healthyPct }: { healthyPct: number }) {
  const offset = C - (C * healthyPct) / 100;
  return (
    <div className="wrapring">
      <svg width="186" height="186" viewBox="0 0 186 186">
        <circle cx="93" cy="93" r={R} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="15" />
        <motion.circle
          cx="93" cy="93" r={R} fill="none" stroke="url(#rg)" strokeWidth="15" strokeLinecap="round"
          strokeDasharray={C} transform="rotate(-90 93 93)"
          style={{ filter: "drop-shadow(0 0 8px var(--gold-glow))" }}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.2, 0.7, 0.2, 1] }}
        />
        <defs>
          <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F8D262" />
            <stop offset="1" stopColor="#3DD88C" />
          </linearGradient>
        </defs>
      </svg>
      <div className="center">
        <div className="big num"><CountUp to={healthyPct} suffix="%" /></div>
        <div className="lab">herd healthy</div>
      </div>
    </div>
  );
}
