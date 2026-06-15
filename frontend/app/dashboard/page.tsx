import { AppNav } from "@/components/AppNav";
import { HerdRing } from "@/components/HerdRing";
import { AlertsFeed } from "@/components/AlertsFeed";
import { HerdAnalytics } from "@/components/HerdAnalytics";
import { getAlerts, getHerdCounts } from "@/lib/data";

export default async function Dashboard() {
  const [counts, alerts] = await Promise.all([getHerdCounts(), getAlerts()]);
  const pct = Math.round((counts.healthy / counts.total) * 100);
  return (
    <>
      <AppNav />
      <div className="page">
        <div className="pagehead">
          <div>
            <h1>Good morning</h1>
            <div className="date">FRI 13 JUN · HERD B · {counts.total} ANIMALS</div>
          </div>
          <span className="pill pill-gold">● All sensors reporting</span>
        </div>
        <div className="dash">
          <div className="ringcard panel brackets">
            <HerdRing healthyPct={pct} />
            <div className="legend">
              <div className="li"><span className="l"><span className="dot s-healthy" />Healthy</span><span className="v">{counts.healthy}</span></div>
              <div className="li"><span className="l"><span className="dot s-risk" />At risk</span><span className="v">{counts.risk}</span></div>
              <div className="li"><span className="l"><span className="dot s-estrus" />In estrus</span><span className="v">{counts.estrus}</span></div>
            </div>
          </div>
          <div className="feed">
            <h2>Today&apos;s alerts · sorted by urgency</h2>
            <AlertsFeed alerts={alerts} />
          </div>
        </div>
        <HerdAnalytics />
      </div>
    </>
  );
}
