"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SearchBar({ initialQ }: { initialQ: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (q.trim()) {
      params.set("q", q.trim());
    } else {
      params.delete("q");
    }
    router.push(`/herd?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="inp" style={{ maxWidth: 300, width: "100%" }}>
      <span className="px">🔍</span>
      <input
        type="text"
        placeholder="Search tag or name..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
    </form>
  );
}
