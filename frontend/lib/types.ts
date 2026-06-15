export type Status = "healthy" | "risk" | "critical" | "estrus";

export interface Reason {
  label: string;
  weight: number; // 0..100 bar length
  direction: "risk" | "rules-out"; // coral vs teal
}

export interface Vital {
  label: string;
  value: string;
  tone: "bad" | "warn" | "good";
  trend: "up" | "down";
}

export interface TimelineEvent {
  label: string;
  when: string;
  status: Status;
}

export interface Cow {
  id: string;
  tag: string;
  name: string;
  breed: string;
  lactationDay: number;
  status: Status;
  statusLabel: string;
  sensorStatus?: "active" | "pending";
  /** plain-language banner shown on the profile */
  summary?: string;
  confidence?: number;
  vitals?: Vital[];
  reasons?: Reason[];
  timeline?: TimelineEvent[];
  /** present when this cow currently has an open alert */
  alert?: {
    title: string;
    cls: "crit" | "risk" | "estr";
    subtitle: string;
    when: string;
    recommendation: string;
  };
}

export interface ModelResult {
  model: string;
  accuracy: number;
  macro_f1: number;
  macro_auc: number;
}

export interface Metrics {
  classes: string[];
  n_train: number;
  n_test: number;
  results: ModelResult[];
  feature_importance: { feature: string; importance: number }[];
  confusion_matrix: number[][];
  cv_folds?: number;
  cv?: { model: string; accuracy_mean: number; accuracy_std: number; f1_mean: number; f1_std: number }[];
}

export interface History {
  days: number[];
  series: { rumination: number[]; body_temp: number[]; activity: number[]; conductivity: number[] };
  events: { day: number; status: string }[];
}
