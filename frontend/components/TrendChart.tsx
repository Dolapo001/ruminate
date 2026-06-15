"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { History } from "@/lib/types";

const METRICS = [
  { key: "rumination", label: "Rumination", unit: "min" },
  { key: "body_temp", label: "Body temp", unit: "°C" },
  { key: "activity", label: "Activity", unit: "" },
  { key: "conductivity", label: "Conductivity", unit: "mS" },
] as const;

const STATUS_COLOR: Record<string, string> = {
  risk: "var(--gold)", critical: "var(--terra)", estrus: "var(--violet)",
};

const W = 700, H = 220, PAD = 26;

export function TrendChart({ history }: { history: History }) {
  const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("rumination");
  const data = history.series[metric] ?? [];
  const n = data.length;
  if (n < 2) return null;

  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const x = (i: number) => PAD + (i / (n - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);

  const line = data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${H - PAD} L${x(0).toFixed(1)},${H - PAD} Z`;
  const latest = data[n - 1];

  return (
    <div className="card panel">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0 }}>Trends · last {n} days</h3>
        <div className="trend-switch">
          {METRICS.map((m) => (
            <button key={m.key} className={metric === m.key ? "on" : ""} onClick={() => setMetric(m.key)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 8, fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)" }}>
        <span>min <b style={{ color: "var(--cream)" }}>{min.toFixed(1)}</b></span>
        <span>max <b style={{ color: "var(--cream)" }}>{max.toFixed(1)}</b></span>
        <span>now <b style={{ color: "var(--gold)" }}>{latest.toFixed(1)}</b></span>
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
        <defs>
          <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F0C24A" stopOpacity="0.28" />
            <stop offset="1" stopColor="#F0C24A" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={PAD} x2={W - PAD} y1={PAD + g * (H - PAD * 2)} y2={PAD + g * (H - PAD * 2)}
            stroke="rgba(255,255,255,.05)" />
        ))}
        <motion.path d={area} fill="url(#tg)"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.3 }} />
        <motion.path d={line} fill="none" stroke="var(--gold)" strokeWidth="2.4" strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 6px var(--gold-glow))" }}
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: [0.2, 0.7, 0.2, 1] }} />
        {/* event markers */}
        {history.events.map((e, i) => (
          <g key={i}>
            <line x1={x(e.day)} x2={x(e.day)} y1={PAD} y2={H - PAD}
              stroke={STATUS_COLOR[e.status] ?? "var(--muted)"} strokeOpacity="0.25" strokeWidth="1.5" />
            <circle cx={x(e.day)} cy={H - PAD} r="4" fill={STATUS_COLOR[e.status] ?? "var(--muted)"} />
          </g>
        ))}
        <circle cx={x(n - 1)} cy={y(latest)} r="4.5" fill="var(--gold)"
          style={{ filter: "drop-shadow(0 0 8px var(--gold-glow))" }} />
      </svg>

      {history.events.length > 0 && (
        <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
          <span><span className="dot s-risk" style={{ marginRight: 6 }} />health event</span>
          <span><span className="dot s-estrus" style={{ marginRight: 6 }} />estrus</span>
        </div>
      )}
    </div>
  );
}
