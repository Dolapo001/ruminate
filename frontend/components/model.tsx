"use client";

import { motion } from "framer-motion";
import { Metrics } from "@/lib/types";

const EASE = [0.2, 0.8, 0.2, 1] as const;

function Bar({ value, gold, delay }: { value: number; gold: boolean; delay: number }) {
  return (
    <div className="mtrack">
      <motion.div
        className={`fill ${gold ? "gold" : "dim"}`}
        initial={{ width: 0 }}
        whileInView={{ width: `${Math.round(value * 100)}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: EASE, delay }}
      />
    </div>
  );
}

export function ModelComparison({ cv, folds }: { cv: NonNullable<Metrics["cv"]>; folds: number }) {
  return (
    <div className="mcard panel brackets">
      <h3>How good is it? · {folds}-fold CV (grouped by animal)</h3>
      {cv.map((r, i) => {
        const ours = r.model.includes("ours");
        const rows: [string, number, number][] = [
          ["ACC", r.accuracy_mean, r.accuracy_std],
          ["F1", r.f1_mean, r.f1_std],
        ];
        return (
          <div className={`mrow ${ours ? "ours" : ""}`} key={i}>
            <div className="mname">
              <span className="t">{r.model}</span>
              {ours && <span className="tag">interpretable</span>}
            </div>
            {rows.map(([label, mean, std], j) => (
              <div className="metric" key={j}>
                <span className="ml">{label}</span>
                <Bar value={mean} gold={ours} delay={i * 0.1 + j * 0.06} />
                <span className="mv" style={{ color: ours ? "var(--gold)" : "var(--muted)", width: 84 }}>
                  {mean.toFixed(3)}<span style={{ color: "var(--faint)" }}> ±{std.toFixed(3)}</span>
                </span>
              </div>
            ))}
          </div>
        );
      })}
      <p className="note">
        Averaged over {folds} folds, no cow shared between train and test. The{" "}
        <span className="gold">interpretable</span> model leads on both accuracy and F1 — beating the
        black-box neural net <em>and</em> the deep LSTM, so explainability costs nothing here.
      </p>
    </div>
  );
}

export function FeatureImportance({ items }: { items: Metrics["feature_importance"] }) {
  const max = Math.max(...items.map((d) => d.importance)) || 1;
  return (
    <div className="mcard panel">
      <h3>What the model looks at (global SHAP)</h3>
      {items.map((d, i) => (
        <div className="imp-row" key={i}>
          <span className="il">{d.feature}</span>
          <div className="mtrack">
            <motion.div
              className="fill gold"
              initial={{ width: 0 }}
              whileInView={{ width: `${Math.round((d.importance / max) * 100)}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: EASE, delay: 0.1 + i * 0.05 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ConfusionMatrix({ classes, matrix }: { classes: string[]; matrix: number[][] }) {
  const max = Math.max(...matrix.flat()) || 1;
  return (
    <div className="mcard panel">
      <h3>Where it&apos;s right and wrong</h3>
      <div className="cm">
        <div className="cmr">
          <span />
          {classes.map((c, i) => <span className="cmh" key={i}>{c}</span>)}
        </div>
        {matrix.map((row, i) => (
          <div className="cmr" key={i}>
            <span className="cmlabel">{classes[i]}</span>
            {row.map((v, j) => {
              const diag = i === j;
              const a = v / max;
              return (
                <span
                  className={`cell ${diag ? "diag" : ""}`}
                  key={j}
                  style={diag ? { background: `rgba(240,194,74,${0.25 + a * 0.7})` }
                              : { background: `rgba(234,106,64,${a * 0.5})` }}
                >
                  {v}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <p className="note">Rows = actual, columns = predicted. The bright gold diagonal is correct calls.</p>
    </div>
  );
}
