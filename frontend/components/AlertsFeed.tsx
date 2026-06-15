"use client";

import { useState } from "react";
import { AlertCard } from "./cards";
import { Cow } from "@/lib/types";

const INITIAL_COUNT = 5;

export function AlertsFeed({ alerts }: { alerts: Cow[] }) {
  const [expanded, setExpanded] = useState(false);

  if (alerts.length === 0) {
    return (
      <div className="panel empty">
        <div className="big">All clear</div>
        Every animal is within her normal range. Nothing needs your attention right now.
      </div>
    );
  }

  const shownAlerts = expanded ? alerts : alerts.slice(0, INITIAL_COUNT);
  const hiddenCount = alerts.length - INITIAL_COUNT;

  return (
    <>
      {shownAlerts.map((cow) => (
        <AlertCard key={cow.id} cow={cow} />
      ))}
      {!expanded && hiddenCount > 0 && (
        <button
          className="btn btn-outline"
          style={{ width: "100%", justifyContent: "center", marginTop: 12 }}
          onClick={() => setExpanded(true)}
        >
          View all {alerts.length} alerts
        </button>
      )}
      {expanded && hiddenCount > 0 && (
        <button
          className="btn btn-outline"
          style={{ width: "100%", justifyContent: "center", marginTop: 12 }}
          onClick={() => setExpanded(false)}
        >
          Show less
        </button>
      )}
    </>
  );
}
