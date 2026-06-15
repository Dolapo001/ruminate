"use client";

import { useEffect, useState } from "react";

interface AnalyticsData {
  breed_health: Record<string, { total: number; healthy: number; risk: number; estrus: number }>;
  trend: { day: string; total: number; risk: number; estrus: number; healthy: number }[];
  alert_distribution: Record<string, number>;
  diagnoses: { total: number; confirmed: number; false_alarms: number };
}

export function HerdAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL || "";
    fetch(`${base}/api/analytics`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  if (!data) return <div className="panel skel" style={{ height: 200, marginTop: 24 }} />;

  const confPct = Math.round((data.diagnoses.confirmed / Math.max(1, data.diagnoses.total)) * 100);

  return (
    <div className="analytics-section">
      <h2 className="analytics-h2">Herd Analytics</h2>
      <div className="analytics-grid">
        
        {/* Model Accuracy Tracking */}
        <div className="panel card-metrics">
          <h3>Vet Feedback</h3>
          <div className="fb-big">{confPct}%</div>
          <div className="fb-sub">Alerts confirmed by vet</div>
          <div className="fb-bar">
            <div className="fb-bar-fill" style={{ width: `${confPct}%` }} />
          </div>
          <div className="fb-stats">
            <span>{data.diagnoses.confirmed} Confirmed</span>
            <span>{data.diagnoses.false_alarms} False Alarms</span>
          </div>
        </div>

        {/* Breed Comparison */}
        <div className="panel card-metrics">
          <h3>Breed Health</h3>
          <div className="breed-list">
            {Object.entries(data.breed_health).map(([breed, stats]) => (
              <div key={breed} className="breed-item">
                <div className="breed-name">{breed}</div>
                <div className="breed-bar">
                  <div className="breed-fill bg-green" style={{ width: `${(stats.healthy / stats.total) * 100}%` }} />
                  <div className="breed-fill bg-terra" style={{ width: `${(stats.risk / stats.total) * 100}%` }} />
                  <div className="breed-fill bg-violet" style={{ width: `${(stats.estrus / stats.total) * 100}%` }} />
                </div>
                <div className="breed-num">{stats.total}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
