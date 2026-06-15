"use client";

import { useState } from "react";
import { CowCard } from "./cards";
import { Cow } from "@/lib/types";

const FILTERS: [string, string][] = [
  ["all", "All"], ["healthy", "Healthy"], ["attention", "Needs attention"], ["estrus", "In estrus"],
];

const inGroup = (c: Cow, k: string) =>
  k === "all" ? true : k === "attention" ? c.status === "risk" || c.status === "critical" : c.status === k;

const PAGE_SIZE = 30;

export function HerdGrid({ cows }: { cows: Cow[] }) {
  const [f, setF] = useState("all");
  const [page, setPage] = useState(1);
  const shown = cows.filter((c) => inGroup(c, f));
  const totalPages = Math.ceil(shown.length / PAGE_SIZE);
  const pagedShown = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return (
    <>
      <div className="herdfilter">
        {FILTERS.map(([k, label]) => {
          const count = k === "all" ? cows.length : cows.filter((c) => inGroup(c, k)).length;
          return (
            <button key={k} className={f === k ? "on" : ""} onClick={() => { setF(k); setPage(1); }}>
              {label} · {count}
            </button>
          );
        })}
      </div>
      <div className="herdgrid">
        {pagedShown.map((c) => <CowCard key={c.id} cow={c} />)}
      </div>
      {shown.length === 0 && <div className="empty">No animals in this group.</div>}
      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Prev
          </button>
          <span className="page-info">
            Page {page} of {totalPages}
          </span>
          <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            Next
          </button>
        </div>
      )}
    </>
  );
}
