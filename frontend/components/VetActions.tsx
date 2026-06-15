"use client";

import { useState } from "react";
import { postDiagnosis } from "@/lib/data";

type Phase = "idle" | "loading" | "confirmed" | "rejected" | "error";

export function VetActions({ cowId }: { cowId: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [msg, setMsg] = useState("");
  const [activeBtn, setActiveBtn] = useState<"confirm" | "reject" | null>(null);

  const reset = () => { setPhase("idle"); setMsg(""); setActiveBtn(null); };

  const log = async (label: "confirmed" | "false_alarm") => {
    if (phase === "loading") return;
    setActiveBtn(label === "confirmed" ? "confirm" : "reject");
    setPhase("loading");
    try {
      const res = await postDiagnosis(cowId, { actual_label: label });
      const fallback = label === "confirmed"
        ? "Diagnosis confirmed — added to training data."
        : "Marked as false alarm — model will learn from this.";
      setMsg(res?.message ?? fallback);
      setPhase(label === "confirmed" ? "confirmed" : "rejected");
    } catch {
      setMsg("Something went wrong. Please try again.");
      setPhase("error");
    }
    // auto-reset after 6 s so the card returns to normal
    setTimeout(reset, 6000);
  };

  const isDone = phase === "confirmed" || phase === "rejected" || phase === "error";

  return (
    <div className="vetbox panel">
      <h3>Log the outcome</h3>
      <p>
        You&apos;re signed in as a vet. Confirming or rejecting teaches the
        model — your diagnosis becomes ground truth.
      </p>

      {/* ── Buttons (shown while idle or loading) ── */}
      {!isDone && (
        <div className="vetbtns">
          <button
            className={`btn btn-confirm${phase === "loading" && activeBtn === "confirm" ? " btn--busy" : ""}`}
            disabled={phase === "loading"}
            onClick={() => log("confirmed")}
          >
            {phase === "loading" && activeBtn === "confirm"
              ? <><span className="spinner-ring" /> Saving…</>
              : <>✓ Confirm</>}
          </button>

          <button
            className={`btn btn-reject${phase === "loading" && activeBtn === "reject" ? " btn--busy" : ""}`}
            disabled={phase === "loading"}
            onClick={() => log("false_alarm")}
          >
            {phase === "loading" && activeBtn === "reject"
              ? <><span className="spinner-ring" /> Saving…</>
              : <>✕ False alarm</>}
          </button>
        </div>
      )}

      {/* ── Result banner (shown after submission) ── */}
      {isDone && (
        <div className={`vet-result vet-result--${phase}`}>
          <span className="vet-result__icon">
            {phase === "confirmed" && "✓"}
            {phase === "rejected" && "✕"}
            {phase === "error" && "!"}
          </span>
          <span className="vet-result__msg">{msg}</span>
          <button className="vet-undo" onClick={reset}>Undo</button>
        </div>
      )}
    </div>
  );
}
