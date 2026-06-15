import Link from "next/link";
import { notFound } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { ReasonBar } from "@/components/motion";
import { VetActions } from "@/components/VetActions";
import { Counterfactual } from "@/components/Counterfactual";
import { ExplainCard } from "@/components/ExplainCard";
import { getCow } from "@/lib/data";

export default async function AlertDetail({ params }: { params: { id: string } }) {
  const cow = await getCow(params.id);
  if (!cow || !cow.alert) notFound();
  const a = cow.alert;
  const reasons = cow.reasons ?? [];

  return (
    <>
      <AppNav />
      <div className="page">
        <Link className="back" href={`/cows/${cow.id}`}>← Back to {cow.name}</Link>
        <div className="alertpage">
          <div className="verdict panel brackets">
            <div className="row1">
              <div className="badge">▲</div>
              <div>
                <div className="ttl">{a.title}</div>
                <div className="who">{cow.tag} · {cow.name} · {cow.breed}</div>
                <div className="conf">
                  {cow.confidence != null ? `CONFIDENCE ${cow.confidence}% · ` : ""}FLAGGED {a.when.toUpperCase()} · XGBOOST + SHAP
                </div>
              </div>
            </div>
            <div className="action">
              <span className="ic">✓</span>
              <div>
                <div className="t1">Recommended next step</div>
                <div className="t2">{a.recommendation}</div>
              </div>
            </div>
          </div>

          <ExplainCard cowId={cow.id} />

          {reasons.length > 0 && (
            <div className="card panel" style={{ marginBottom: 20 }}>
              <h3>Technical Feature Drivers</h3>
              {reasons.map((r, i) => <ReasonBar key={i} reason={r} index={i} />)}
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <Counterfactual cowId={cow.id} />
            <Link
              className="btn btn-outline"
              style={{ marginTop: 12, fontSize: 13, padding: "10px 18px" }}
              href={`/cows/${cow.id}/counterfactual`}
            >
              🔬 Open full what-if analysis →
            </Link>
          </div>

          <VetActions cowId={cow.id} />
        </div>
      </div>
    </>
  );
}
