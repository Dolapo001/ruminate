"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCow } from "@/lib/data";

export function AddCowForm({ farmId }: { farmId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ tag: "", name: "", breed: "White Fulani", lactation_day: "" as number | "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createCow({ ...form, lactation_day: Number(form.lactation_day) || 0, farm_id: farmId });
      setForm({ tag: "", name: "", breed: "White Fulani", lactation_day: "" });
      router.refresh();
    } catch (err) {
      alert("Error adding cow");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card panel brackets" onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
      <h3>Add a Cow to Your Herd</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginTop: 16 }}>
        <div>
          <label style={{ display: "block", marginBottom: 8, fontSize: 12, color: "var(--muted)", textTransform: "uppercase", fontFamily: "var(--mono)" }}>Tag ID</label>
          <input className="inp" required style={{ width: "100%", boxSizing: "border-box" }} value={form.tag} onChange={e => setForm({...form, tag: e.target.value})} placeholder="e.g. NG-042" />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 8, fontSize: 12, color: "var(--muted)", textTransform: "uppercase", fontFamily: "var(--mono)" }}>Name</label>
          <input className="inp" required style={{ width: "100%", boxSizing: "border-box" }} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Binta" />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 8, fontSize: 12, color: "var(--muted)", textTransform: "uppercase", fontFamily: "var(--mono)" }}>Breed</label>
          <select className="inp" required style={{ width: "100%", boxSizing: "border-box" }} value={form.breed} onChange={e => setForm({...form, breed: e.target.value})}>
            <option style={{ background: "#1a1304", color: "var(--cream)" }} value="White Fulani">White Fulani</option>
            <option style={{ background: "#1a1304", color: "var(--cream)" }} value="HF Cross">HF Cross</option>
            <option style={{ background: "#1a1304", color: "var(--cream)" }} value="Sokoto Gudali">Sokoto Gudali</option>
          </select>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 8, fontSize: 12, color: "var(--muted)", textTransform: "uppercase", fontFamily: "var(--mono)" }}>Lactation Day</label>
          <input className="inp" type="number" required min={0} max={365} style={{ width: "100%", boxSizing: "border-box" }} value={form.lactation_day} onChange={e => setForm({...form, lactation_day: e.target.value === "" ? "" : parseInt(e.target.value)})} />
        </div>
      </div>
      <button className="btn btn-outline" type="submit" disabled={loading} style={{ marginTop: 24, width: "100%", justifyContent: "center" }}>
        {loading ? "Adding..." : "+ Register Cow"}
      </button>
    </form>
  );
}
