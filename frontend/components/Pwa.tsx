"use client";

import { useEffect, useState } from "react";
import { flushOutbox } from "@/lib/data";

/** Registers the service worker and shows an offline / back-online banner.
 *  On reconnect it flushes any vet diagnoses queued while offline. */
export function Pwa() {
  const [offline, setOffline] = useState(false);
  const [synced, setSynced] = useState(0);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const goOnline = async () => {
      setOffline(false);
      const n = await flushOutbox();
      if (n > 0) { setSynced(n); setTimeout(() => setSynced(0), 3500); }
    };
    const goOffline = () => setOffline(true);
    setOffline(typeof navigator !== "undefined" && !navigator.onLine);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (!offline && !synced) return null;
  return (
    <div className={`netbar ${offline ? "off" : "on"}`}>
      {offline
        ? "● Offline — showing last synced data"
        : `✓ Back online — synced ${synced} update${synced > 1 ? "s" : ""}`}
    </div>
  );
}
