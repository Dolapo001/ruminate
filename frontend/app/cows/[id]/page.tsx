import Link from "next/link";
import { notFound } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { Reveal, ReasonBar } from "@/components/motion";
import { Timeline } from "@/components/cards";
import { TrendChart } from "@/components/TrendChart";
import { ExplainCard } from "@/components/ExplainCard";
import { EscalateButton } from "@/components/EscalateButton";
import { SimulateSensorButton } from "@/components/SimulateSensorButton";
import { getCow, getCowHistory } from "@/lib/data";
import { Vital } from "@/lib/types";
import { cookies } from "next/headers";

const bannerCls: Record<string, string> = { risk: "", critical: "crit", estrus: "estr", healthy: "" };
const sparkline: Record<string, string> = {
  up: "0,17 25,14 50,11 75,7 100,4",
  down: "0,5 25,6 50,9 75,13 100,18",
};
const strokeFor = (v: Vital) => (v.tone === "warn" ? "var(--gold)" : v.tone === "good" ? "var(--green)" : "var(--terra)");

export default async function CowProfile({ params }: { params: { id: string } }) {
  const role = cookies().get("ruminate_role")?.value;
  const cow = await getCow(params.id);
  if (!cow) notFound();
  const history = await getCowHistory(params.id);

  return (
    <>
      <AppNav />
      <div className="page">
        <Link className="back" href="/herd">← Back to herd</Link>
        <div className="prof">
          <div>
            <div className="hero-prof">
              <div className="av">🐄</div>
              <div>
                <div className="num" style={{ fontSize: 12, color: "var(--faint)" }}>{cow.tag}</div>
                <div className="nm">{cow.name}</div>
                <div className="badges">
                  <span className="pill pill-gold">{cow.breed}</span>
                  <span className="pill pill-soft">Lactation day {cow.lactationDay}</span>
                </div>
              </div>
            </div>

            {cow.sensorStatus === "pending" && (
              <div className="card panel brackets">
                <h3 style={{ color: "var(--gold)" }}>Sensor Connection Pending</h3>
                <p style={{ color: "var(--muted)", fontSize: 14 }}>
                  This animal is registered in the system, but we haven't received any data from her wearable sensor yet.
                </p>
                <SimulateSensorButton cowId={cow.id} />
              </div>
            )}

            {cow.summary && cow.sensorStatus !== "pending" && (
              <div className={`banner ${bannerCls[cow.status]}`}>
                <div className="top">
                  <span className="ic">▲</span>
                  <span className="tt">{cow.statusLabel}</span>
                  {cow.confidence != null && <span className="cf">{cow.confidence}% SURE</span>}
                </div>
                <div className="desc">{cow.summary}</div>
              </div>
            )}

            {cow.vitals && cow.sensorStatus !== "pending" && (
              <div className="card panel">
                <h3>Vitals today</h3>
                <div className="vitals">
                  {cow.vitals.map((v, i) => (
                    <div className={`vt ${v.tone}`} key={i}>
                      <div className="lab">{v.label}</div>
                      <div className="val">{v.value}<span>{v.trend === "up" ? "↑" : "↓"}</span></div>
                      <svg width="100%" height="22" viewBox="0 0 100 22" preserveAspectRatio="none">
                        <polyline points={sparkline[v.trend]} fill="none" stroke={strokeFor(v)} strokeWidth="2" />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cow.summary && cow.sensorStatus !== "pending" && <ExplainCard cowId={cow.id} />}

            {cow.reasons && cow.sensorStatus !== "pending" && (
              <div className="card panel brackets">
                <h3>Why the system flagged her</h3>
                {cow.reasons.slice(0, 4).map((r, i) => <ReasonBar key={i} reason={r} index={i} />)}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                  {cow.alert && role !== "farmer" && (
                    <Link className="btn btn-primary" style={{ fontSize: 14, padding: "11px 20px" }} href={`/alerts/${cow.id}`}>
                      Open full alert →
                    </Link>
                  )}
                  {cow.alert && role === "farmer" && (
                    <EscalateButton cowId={cow.id} />
                  )}
                  {role !== "farmer" && (
                    <Link className="btn btn-outline" style={{ fontSize: 14, padding: "11px 20px" }} href={`/cows/${cow.id}/counterfactual`}>
                      🔬 What-if analysis →
                    </Link>
                  )}
                </div>
              </div>
            )}

            {!cow.summary && cow.sensorStatus !== "pending" && (
              <Reveal className="card panel">
                <h3>Status</h3>
                <p style={{ color: "var(--muted)", fontSize: 15 }}>
                  {cow.name} is healthy. All signals sit within her normal range — no action needed.
                </p>
              </Reveal>
            )}
            {cow.sensorStatus !== "pending" && <TrendChart history={history} />}
          </div>

          <div>
            {cow.timeline && cow.sensorStatus !== "pending" && <Timeline events={cow.timeline} />}
          </div>
        </div>
      </div>
    </>
  );
}
