"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { simulateSensor } from "@/lib/data";

export function SimulateSensorButton({ cowId }: { cowId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSimulate = async () => {
    setLoading(true);
    try {
      await simulateSensor(cowId);
      router.refresh();
    } catch (e) {
      alert("Error simulating sensor data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button className="btn btn-primary" onClick={handleSimulate} disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "16px", marginTop: 16 }}>
      {loading ? "Establishing connection & crunching data..." : "🔌 Connect Sensor & Simulate Data"}
    </button>
  );
}
