"use client";

import { useEffect, useState } from "react";
import { Reveal } from "@/components/motion";

interface Factor {
  feature: string;
  importance: number;
  direction: string;
  friendly_label: string;
  sentence: string;
  value: number;
  normal_range: string;
  severity: "high" | "medium" | "low";
}

interface ExplainData {
  available: boolean;
  prediction: string;
  confidence: number;
  confidence_words: string;
  confidence_detail: string;
  plain_summary: string;
  factors: Factor[];
  heat_analysis: string;
  bottom_line: string;
  model_context: string;
}

export function ExplainCard({ cowId }: { cowId: string }) {
  const [data, setData] = useState<ExplainData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL;
    if (!base) return;
    fetch(`${base}/api/cows/${cowId}/explain`)
      .then((r) => {
        if (!r.ok) throw new Error("API Error");
        return r.json();
      })
      .then((d) => {
        if (d.available) setData(d);
      })
      .catch(() => setError(true));
  }, [cowId]);

  if (error || !data) return null;

  const getSeverityColor = (sev: string) => {
    if (sev === "high") return "var(--terra)";
    if (sev === "medium") return "var(--gold)";
    return "var(--green)";
  };

  return (
    <Reveal className="panel" style={{ padding: 28, marginBottom: 24 }}>
      <div className="eyebrow" style={{ marginBottom: 12 }}>
        🗣 In plain words
      </div>

      <h3
        style={{
          fontFamily: "var(--disp)",
          fontSize: 22,
          fontWeight: 700,
          textTransform: "uppercase",
          marginBottom: 16,
          lineHeight: 1.3,
        }}
      >
        Why did the system flag this?
      </h3>

      {/* Narrative Summary */}
      <p style={{ fontSize: 16, lineHeight: 1.6, color: "var(--cream)", marginBottom: 24 }}>
        {data.plain_summary}
      </p>

      {/* Heat Analysis Callout */}
      {data.heat_analysis && (
        <div
          style={{
            background: "rgba(240,194,74,.08)",
            border: "1px solid var(--gold-line)",
            borderRadius: "var(--r-sm)",
            padding: "16px 20px",
            marginBottom: 28,
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: 20 }}>🌤</span>
          <p style={{ fontSize: 14.5, color: "var(--gold)", lineHeight: 1.5, margin: 0 }}>
            {data.heat_analysis}
          </p>
        </div>
      )}

      {/* Detailed Factors Breakdown */}
      {data.factors.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h4
            style={{
              fontFamily: "var(--mono)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: ".1em",
              marginBottom: 16,
            }}
          >
            Key Drivers Breakdown
          </h4>
          <div style={{ display: "grid", gap: 12 }}>
            {data.factors.map((f, i) => (
              <div
                key={i}
                style={{
                  background: "var(--panel2)",
                  border: "1px solid var(--gold-line)",
                  borderRadius: "var(--r)",
                  padding: "16px 20px",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 20,
                  alignItems: "center",
                }}
                className="explain-factor-row"
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: getSeverityColor(f.severity),
                      }}
                    />
                    <strong style={{ fontSize: 15 }}>{f.friendly_label}</strong>
                  </div>
                  <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>
                    {f.sentence}
                  </p>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 20,
                      fontWeight: 600,
                      color: getSeverityColor(f.severity),
                      marginBottom: 4,
                    }}
                  >
                    {f.value}
                  </div>
                  {f.normal_range && (
                    <div
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        color: "var(--faint)",
                        textTransform: "uppercase",
                      }}
                    >
                      Normal: {f.normal_range}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confidence & Context */}
      <div
        style={{
          borderTop: "1px solid var(--gold-line)",
          paddingTop: 24,
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: ".06em",
              marginBottom: 6,
            }}
          >
            How confident is the system?
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: "var(--green)" }}>
              {data.confidence}%
            </span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{data.confidence_words}</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
            {data.confidence_detail} {data.model_context}
          </p>
        </div>

        {data.bottom_line && (
          <div style={{ flex: 1, minWidth: 200 }}>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: ".06em",
                marginBottom: 6,
              }}
            >
              Actionable Next Step
            </div>
            <p style={{ fontSize: 14.5, fontWeight: 500, lineHeight: 1.5 }}>{data.bottom_line}</p>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 600px) {
          .explain-factor-row {
            grid-template-columns: 1fr !important;
          }
          .explain-factor-row > div:last-child {
            text-align: left !important;
            margin-top: 8px;
          }
        }
      `}</style>
    </Reveal>
  );
}
