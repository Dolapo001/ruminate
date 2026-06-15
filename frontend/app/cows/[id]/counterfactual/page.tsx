import Link from "next/link";
import { notFound } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { ReasonBar } from "@/components/motion";
import { Counterfactual } from "@/components/Counterfactual";
import { getCow } from "@/lib/data";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const cow = await getCow(params.id);
  if (!cow) return { title: "Not Found — DairyXAI" };
  return {
    title: `What-If Analysis · ${cow.name} (${cow.tag}) — DairyXAI`,
    description: `Counterfactual weather analysis for ${cow.name}. Understand whether environmental conditions are driving the AI prediction.`,
  };
}

export default async function CounterfactualPage({ params }: { params: { id: string } }) {
  const cow = await getCow(params.id);
  if (!cow) notFound();

  const reasons = cow.reasons ?? [];
  const statusColor: Record<string, string> = {
    risk: "var(--gold)",
    critical: "var(--terra)",
    estrus: "var(--violet)",
    healthy: "var(--green)",
  };

  return (
    <>
      <AppNav />
      <div className="page">
        {/* ── breadcrumb ── */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
          <Link className="back" href={`/cows/${cow.id}`} style={{ margin: 0 }}>
            ← {cow.name}
          </Link>
          <span style={{ color: "var(--faint)", fontSize: 13 }}>/</span>
          <span style={{ fontSize: 13, color: "var(--gold)", fontFamily: "var(--mono)" }}>
            What-If Analysis
          </span>
        </div>

        {/* ── page header ── */}
        <div style={{ marginBottom: 28 }}>
          <div
            className="eyebrow"
            style={{ marginBottom: 8 }}
          >
            🔬 Counterfactual · Explainability
          </div>
          <h1
            style={{
              fontFamily: "var(--disp)",
              fontSize: "clamp(24px, 4vw, 38px)",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "-.02em",
              margin: 0,
              lineHeight: 1.06,
            }}
          >
            What if conditions were different?
          </h1>
          <p
            style={{
              color: "var(--muted)",
              fontSize: 15,
              marginTop: 10,
              maxWidth: "58ch",
            }}
          >
            The model re-runs {cow.name}&apos;s sensor data under altered weather scenarios. If
            the prediction is stable across conditions, heat is not the cause.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 340px",
            gap: 24,
            alignItems: "start",
          }}
          className="cf-layout"
        >
          {/* ── main: counterfactual widget ── */}
          <div>
            <Counterfactual cowId={cow.id} />
          </div>

          {/* ── sidebar: cow card + SHAP reasons ── */}
          <div>
            {/* cow identity card */}
            <div className="panel" style={{ padding: 22, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    border: `3px solid ${statusColor[cow.status]}`,
                    display: "grid",
                    placeItems: "center",
                    background: "var(--panel3)",
                    fontSize: 26,
                    flexShrink: 0,
                  }}
                >
                  🐄
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 11,
                      color: "var(--faint)",
                      letterSpacing: ".06em",
                    }}
                  >
                    {cow.tag}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--disp)",
                      fontSize: 22,
                      fontWeight: 800,
                      textTransform: "uppercase",
                    }}
                  >
                    {cow.name}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    <span className="pill pill-gold">{cow.breed}</span>
                    <span className="pill pill-soft">Day {cow.lactationDay}</span>
                  </div>
                </div>
              </div>

              {cow.confidence != null && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    background: "var(--panel3)",
                    borderRadius: "var(--r-sm)",
                    fontFamily: "var(--mono)",
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: "var(--muted)" }}>Model confidence</span>
                  <span style={{ color: statusColor[cow.status], fontWeight: 700, fontSize: 17 }}>
                    {cow.confidence}%
                  </span>
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <Link
                  href={`/cows/${cow.id}`}
                  className="btn btn-outline"
                  style={{ flex: 1, justifyContent: "center", fontSize: 13, padding: "10px 14px" }}
                >
                  Profile
                </Link>
                {cow.alert && (
                  <Link
                    href={`/alerts/${cow.id}`}
                    className="btn btn-primary"
                    style={{ flex: 1, justifyContent: "center", fontSize: 13, padding: "10px 14px" }}
                  >
                    Alert →
                  </Link>
                )}
              </div>
            </div>

            {/* SHAP reasons */}
            {reasons.length > 0 && (
              <div className="panel brackets" style={{ padding: 22 }}>
                <h3
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--muted)",
                    marginBottom: 14,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                  }}
                >
                  SHAP Feature Drivers
                </h3>
                {reasons.map((r, i) => (
                  <ReasonBar key={i} reason={r} index={i} />
                ))}
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--faint)",
                    marginTop: 14,
                    fontFamily: "var(--mono)",
                    lineHeight: 1.6,
                  }}
                >
                  Coral bars push toward <strong style={{ color: "var(--terra)" }}>At Risk</strong>.
                  Teal bars pull toward <strong style={{ color: "var(--teal)" }}>Healthy</strong>.
                </p>
              </div>
            )}

            {reasons.length === 0 && (
              <div
                className="panel"
                style={{ padding: 22, color: "var(--muted)", fontSize: 13, textAlign: "center" }}
              >
                No SHAP explanations available for {cow.name}.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* responsive override for the two-column layout */}
      <style>{`
        @media (max-width: 840px) {
          .cf-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}
