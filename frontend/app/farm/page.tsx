import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { AddCowForm } from "@/components/AddCowForm";
import { CowCard } from "@/components/cards";
import { getHerd } from "@/lib/data";

export default async function FarmDashboard({
  searchParams,
}: {
  searchParams: { farm_id?: string };
}) {
  const farmId = searchParams.farm_id;
  if (!farmId) {
    redirect("/register");
  }

  const herd = await getHerd("", farmId);
  
  const pendingCows = herd.filter(c => c.sensorStatus === "pending");
  const activeCows = herd.filter(c => c.sensorStatus !== "pending");

  return (
    <>
      <AppNav />
      <div className="page">
        <div className="pagehead">
          <div>
            <h1>Farm Management Dashboard</h1>
            <div className="date">MANAGE YOUR HERD & SENSORS</div>
          </div>
        </div>

        <AddCowForm farmId={farmId} />

        {pendingCows.length > 0 && (
          <div className="card panel" style={{ marginBottom: 24, border: "1px solid var(--gold-line)" }}>
            <h3 style={{ color: "var(--gold)" }}>Pending Sensor Connections ({pendingCows.length})</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
              These animals have been registered but their wearables are not yet transmitting.
              Click the button on their profile to simulate a connection for the demo.
            </p>
            <div className="herdgrid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
              {pendingCows.map((cow) => (
                <CowCard key={cow.id} cow={cow} />
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Active Herd ({activeCows.length})</h2>
          {activeCows.length > 5 && (
            <Link href="/herd" className="btn btn-outline" style={{ fontSize: 13, padding: "8px 16px" }}>
              View full herd →
            </Link>
          )}
        </div>

        {activeCows.length > 0 ? (
          <div className="herdgrid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            {activeCows.slice(0, 5).map((cow) => (
              <CowCard key={cow.id} cow={cow} />
            ))}
          </div>
        ) : (
          <div className="panel empty">
            <div className="big">No active cows yet</div>
            Add a cow above and connect her sensor to get started.
          </div>
        )}
      </div>
    </>
  );
}
