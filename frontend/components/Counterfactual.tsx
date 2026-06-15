"use client";

import { useEffect, useState } from "react";

interface Scenario {
  thi: number;
  heat_load: number;
  label: string;
  probabilities: Record<string, number>;
}

interface CFData {
  available: boolean;
  current: Scenario;
  hot: Scenario;
  cool: Scenario;
  heat_ruled_out: boolean;
  insight: string;
}

export function Counterfactual({ cowId }: { cowId: string }) {
  const [data, setData] = useState<CFData | null>(null);
  const [active, setActive] = useState<"current" | "hot" | "cool">("current");

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL;
    if (!base) return;
    fetch(`${base}/api/cows/${cowId}/counterfactual`)
      .then((r) => r.json())
      .then((d) => { if (d.available) setData(d); })
      .catch(() => {});
  }, [cowId]);

  if (!data) return null;

  const scenarios: { key: "current" | "hot" | "cool"; label: string; icon: string; desc: string }[] = [
    { key: "current", label: "Actual", icon: "📍", desc: `THI ${data.current.thi}` },
    { key: "hot", label: "If hot", icon: "🔥", desc: "THI 90" },
    { key: "cool", label: "If cool", icon: "❄️", desc: "THI 72" },
  ];

  const scene = data[active];
  const statusColor = (label: string) =>
    label === "At Risk" ? "var(--terra)" : label === "In Estrus" ? "var(--violet)" : "var(--green)";

  return (
    <div className="cf-card panel brackets">
      <h3>
        <span style={{ marginRight: 8 }}>🔬</span>
        What-if: does weather change the diagnosis?
      </h3>
      <p className="cf-sub">
        The model re-runs the same animal under different weather. If the prediction
        holds, heat isn&apos;t the cause.
      </p>

      <div className="cf-tabs">
        {scenarios.map((s) => (
          <button
            key={s.key}
            className={`cf-tab${active === s.key ? " on" : ""}`}
            onClick={() => setActive(s.key)}
          >
            <span className="cf-tab-icon">{s.icon}</span>
            <span className="cf-tab-label">{s.label}</span>
            <span className="cf-tab-desc">{s.desc}</span>
          </button>
        ))}
      </div>

      <div className="cf-result">
        <div className="cf-pred">
          <div className="cf-pred-label" style={{ color: statusColor(scene.label) }}>
            {scene.label}
          </div>
          <div className="cf-pred-bars">
            {Object.entries(scene.probabilities).map(([cls, pct]) => (
              <div key={cls} className="cf-bar-row">
                <span className="cf-bar-label">{cls}</span>
                <div className="cf-bar-track">
                  <div
                    className="cf-bar-fill"
                    style={{
                      width: `${pct}%`,
                      background: cls === "At Risk" ? "var(--terra)" :
                        cls === "In Estrus" ? "var(--violet)" : "var(--green)",
                    }}
                  />
                </div>
                <span className="cf-bar-pct">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`cf-verdict ${data.heat_ruled_out ? "ruled-out" : "factor"}`}>
        <span className="cf-verdict-icon">{data.heat_ruled_out ? "✓" : "⚠"}</span>
        <span>{data.insight}</span>
      </div>
    </div>
  );
}
