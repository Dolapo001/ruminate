import { Cow, Metrics } from "./types";

/**
 * Mock data layer. Every screen reads from here.
 * To go live: replace these exports with fetch() calls to the Django API
 * (e.g. GET /api/cows, GET /api/cows/:id, GET /api/alerts) — the component
 * props stay identical, so nothing else changes.
 */

const aminaReasons = [
  { label: "Rumination ↓ 22%", weight: 82, direction: "risk" as const },
  { label: "Body temp ↑ 0.7°C", weight: 64, direction: "risk" as const },
  { label: "Milk conductivity ↑", weight: 51, direction: "risk" as const },
  { label: "Nocturnal activity ↓", weight: 34, direction: "risk" as const },
  { label: "Weather (THI) normal", weight: 30, direction: "rules-out" as const },
];

const MOCK_HERD: Cow[] = [
  {
    id: "ng-014", tag: "NG-014", name: "Amina", breed: "White Fulani", lactationDay: 88,
    status: "risk", statusLabel: "Possible mastitis", confidence: 87,
    summary:
      "Her chewing dropped sharply and she's running a slight fever — and the weather's been mild, so this isn't just heat.",
    vitals: [
      { label: "Rumination", value: "−22%", tone: "bad", trend: "down" },
      { label: "Body temp", value: "+0.7°", tone: "bad", trend: "up" },
      { label: "Activity", value: "low", tone: "warn", trend: "down" },
      { label: "Conductivity", value: "high", tone: "bad", trend: "up" },
    ],
    reasons: aminaReasons,
    timeline: [
      { label: "Mastitis risk flagged", when: "Today, 06:15", status: "risk" },
      { label: "In estrus detected", when: "21 days ago · vet confirmed", status: "estrus" },
      { label: "Calved — lactation began", when: "88 days ago", status: "healthy" },
    ],
    alert: {
      title: "Possible mastitis", cls: "risk",
      subtitle: "Chewing down, slight fever — not heat", when: "06:15",
      recommendation:
        "Check the udder for heat or swelling and run a somatic cell test before milking. Early action protects yield.",
    },
  },
  {
    id: "ng-002", tag: "NG-002", name: "Zahra", breed: "HF Cross", lactationDay: 142,
    status: "estrus", statusLabel: "In estrus — breed now", confidence: 91,
    summary: "Activity spiked overnight right on her 21-day cycle — a strong, clean heat signal. Good window to inseminate.",
    timeline: [
      { label: "In estrus detected", when: "Today, 05:40", status: "estrus" },
      { label: "Previous heat", when: "21 days ago", status: "estrus" },
    ],
    alert: {
      title: "In estrus — breed now", cls: "estr",
      subtitle: "Activity spike, 21-day cycle on time", when: "05:40",
      recommendation: "Optimal insemination window is the next 12–18 hours. Confirm standing heat and schedule AI.",
    },
  },
  {
    id: "ng-021", tag: "NG-021", name: "Ngozi", breed: "White Fulani", lactationDay: 280,
    status: "critical", statusLabel: "Calving imminent", confidence: 94,
    summary: "Restlessness is climbing and her temperature has dipped — the classic pre-calving pattern. She needs eyes on her now.",
    alert: {
      title: "Calving imminent", cls: "crit",
      subtitle: "Restlessness + temp drop · act within hours", when: "12 min ago",
      recommendation: "Move her to a clean calving pen and monitor closely. Have assistance ready within the next few hours.",
    },
  },
  { id: "ng-008", tag: "NG-008", name: "Funmi", breed: "HF Cross", lactationDay: 60, status: "healthy", statusLabel: "Healthy" },
  { id: "ng-033", tag: "NG-033", name: "Aisha", breed: "White Fulani", lactationDay: 110, status: "healthy", statusLabel: "Healthy" },
  {
    id: "ng-017", tag: "NG-017", name: "Bisi", breed: "HF Cross", lactationDay: 95,
    status: "estrus", statusLabel: "In estrus — breed now", confidence: 84,
    alert: { title: "In estrus — breed now", cls: "estr", subtitle: "Rising activity, lying time down", when: "Today", recommendation: "Confirm heat and schedule insemination." },
  },
  { id: "ng-005", tag: "NG-005", name: "Hauwa", breed: "White Fulani", lactationDay: 200, status: "healthy", statusLabel: "Healthy" },
  {
    id: "ng-029", tag: "NG-029", name: "Chika", breed: "HF Cross", lactationDay: 73,
    status: "risk", statusLabel: "Watch — rumination dip", confidence: 68,
    summary: "A mild drop in chewing — not alarming yet. Worth keeping an eye on her through the day.",
    alert: { title: "Watch — rumination dip", cls: "risk", subtitle: "Mild drop, monitor through the day", when: "Yesterday", recommendation: "Re-check rumination this evening; escalate if it keeps falling." },
  },
  { id: "ng-011", tag: "NG-011", name: "Sade", breed: "White Fulani", lactationDay: 150, status: "healthy", statusLabel: "Healthy" },
  { id: "ng-040", tag: "NG-040", name: "Rukky", breed: "HF Cross", lactationDay: 40, status: "healthy", statusLabel: "Healthy" },
];

const MOCK_COUNTS = { healthy: 32, risk: 3, estrus: 2, total: 37 };
const MOCK_ALERTS = MOCK_HERD.filter((c) => c.alert).sort((a, b) => {
  const order = { crit: 0, risk: 1, estr: 2 } as const;
  return order[a.alert!.cls] - order[b.alert!.cls];
});

/* ---------------------------------------------------------------------------
   Live data layer. Set NEXT_PUBLIC_API_URL (e.g. http://localhost:8000) to read
   real model predictions from the Django backend. With no API configured — or
   if a request fails — every getter falls back to the mock above, so the UI
   always renders. The payload shapes are identical, so nothing downstream cares.
--------------------------------------------------------------------------- */
/* Server-side requests (inside the container) use INTERNAL_API_URL if set
   (e.g. http://backend:8000 in docker-compose); the browser always uses the
   public URL. Locally, both fall back to NEXT_PUBLIC_API_URL. */
function apiBase(): string | undefined {
  if (typeof window === "undefined") {
    return process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL;
  }
  return process.env.NEXT_PUBLIC_API_URL;
}

async function api<T>(path: string): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error(`API base URL not configured for ${path}`);
  const res = await fetch(`${base}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API request failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export async function getHerd(q?: string, farmId?: string): Promise<Cow[]> {
  try {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (farmId) params.set("farm_id", farmId);
    
    const qs = params.toString();
    const url = qs ? `/api/cows?${qs}` : "/api/cows";
    return await api<Cow[]>(url);
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function getHerdCounts(): Promise<typeof MOCK_COUNTS> {
  try {
    return await api<typeof MOCK_COUNTS>("/api/herd/summary");
  } catch (err) {
    console.error(err);
    return { healthy: 0, risk: 0, estrus: 0, total: 0 };
  }
}

export async function getAlerts(): Promise<Cow[]> {
  try {
    return await api<Cow[]>("/api/alerts");
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function getCow(id: string): Promise<Cow | undefined> {
  try {
    return await api<Cow>(`/api/cows/${id}`);
  } catch (err) {
    console.error(err);
    return undefined;
  }
}

export async function createFarm(data: { name: string; owner: string; region: string }) {
  const base = apiBase();
  if (!base) throw new Error("API base URL not configured");
  const res = await fetch(`${base}/api/farms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create farm");
  return res.json();
}

export async function createCow(data: { tag: string; name: string; breed: string; lactation_day: number; farm_id: string }) {
  const base = apiBase();
  if (!base) throw new Error("API base URL not configured");
  const res = await fetch(`${base}/api/cows/new`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create cow");
  return res.json();
}

export async function simulateSensor(cowId: string) {
  const base = apiBase();
  if (!base) throw new Error("API base URL not configured");
  const res = await fetch(`${base}/api/cows/${cowId}/simulate`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to simulate sensor");
  return res.json();
}

export async function postDiagnosis(id: string, body: { actual_label: string; notes?: string }) {
  const base = apiBase();
  if (!base) throw new Error("API base URL not configured");
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    queue({ id, body });
    return { ok: true, queued: true, message: "Saved offline — will sync when back online." };
  }
  try {
    const res = await fetch(`${base}/api/cows/${id}/diagnosis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch {
    queue({ id, body });
    return { ok: true, queued: true, message: "Network down — saved offline, will sync." };
  }
}

const MOCK_METRICS: Metrics = {
  classes: ["At Risk", "Healthy", "In Estrus"],
  n_train: 2100, n_test: 900,
  results: [
    { model: "Decision Tree (glass-box)", accuracy: 0.859, macro_f1: 0.659, macro_auc: 0.782 },
    { model: "Neural Net (black box)", accuracy: 0.946, macro_f1: 0.748, macro_auc: 0.713 },
    { model: "XGBoost + SHAP (ours)", accuracy: 0.954, macro_f1: 0.798, macro_auc: 0.814 },
  ],
  feature_importance: [
    { feature: "Lying time", importance: 0.47 }, { feature: "Rumination ↓", importance: 0.43 },
    { feature: "Milk conductivity ↑", importance: 0.36 }, { feature: "Activity", importance: 0.31 },
    { feature: "Nocturnal activity", importance: 0.30 }, { feature: "Body temp ↑", importance: 0.24 },
    { feature: "Milk yield ↓", importance: 0.21 }, { feature: "Weather (THI)", importance: 0.14 },
    { feature: "Temp variability", importance: 0.10 }, { feature: "Heat load", importance: 0.08 },
    { feature: "Rumination level", importance: 0.06 },
  ],
  confusion_matrix: [[16, 19, 0], [3, 798, 2], [0, 17, 45]],
  cv_folds: 5,
  cv: [
    { model: "Decision Tree (glass-box)", accuracy_mean: 0.909, accuracy_std: 0.025, f1_mean: 0.725, f1_std: 0.049 },
    { model: "Neural Net (black box)", accuracy_mean: 0.941, accuracy_std: 0.006, f1_mean: 0.759, f1_std: 0.014 },
    { model: "XGBoost + SHAP (ours)", accuracy_mean: 0.945, accuracy_std: 0.014, f1_mean: 0.784, f1_std: 0.038 },
    { model: "LSTM (deep temporal)", accuracy_mean: 0.913, accuracy_std: 0.009, f1_mean: 0.724, f1_std: 0.036 },
  ],
};

export async function getMetrics(): Promise<Metrics> {
  try {
    return await api<Metrics>("/api/metrics");
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function getCowHistory(id: string) {
  try {
    return await api<import("./types").History>(`/api/cows/${id}/history`);
  } catch (err) {
    console.error(err);
    return { days: [], series: { rumination: [], body_temp: [], activity: [], conductivity: [] }, events: [] };
  }
}

/* ---- offline outbox (client-side store-and-forward for vet diagnoses) ---- */
const OUTBOX = "ruminate_outbox";

function queue(item: { id: string; body: any }) {
  try {
    const q = JSON.parse(localStorage.getItem(OUTBOX) || "[]");
    q.push(item);
    localStorage.setItem(OUTBOX, JSON.stringify(q));
  } catch {}
}

export async function flushOutbox(): Promise<number> {
  const base = apiBase();
  if (!base || typeof window === "undefined") return 0;
  let q: { id: string; body: any }[] = [];
  try { q = JSON.parse(localStorage.getItem(OUTBOX) || "[]"); } catch { return 0; }
  if (!q.length) return 0;
  const remaining: typeof q = [];
  for (const it of q) {
    try {
      await fetch(`${base}/api/cows/${it.id}/diagnosis`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(it.body),
      });
    } catch { remaining.push(it); }
  }
  localStorage.setItem(OUTBOX, JSON.stringify(remaining));
  return q.length - remaining.length;
}
