"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { createFarm } from "@/lib/data";

export default function RegisterFarm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", owner: "", region: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const farm = await createFarm(form);
      document.cookie = `ruminate_role=farmer; path=/; max-age=86400; samesite=lax`;
      document.cookie = `ruminate_farm_id=${farm.id}; path=/; max-age=86400; samesite=lax`;
      // Route to the farm dashboard with the new farm's ID
      router.push(`/farm?farm_id=${farm.id}`);
    } catch (err) {
      alert("Error creating farm");
      setLoading(false);
    }
  };

  return (
    <>
      <AppNav />
      <div className="page" style={{ maxWidth: 500, margin: "0 auto" }}>
        <div className="pagehead">
          <div>
            <h1>Register Farm</h1>
            <div className="date">START MANAGING YOUR HERD TODAY</div>
          </div>
        </div>
        <form className="card panel brackets" onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontSize: 12, color: "var(--muted)", textTransform: "uppercase", fontFamily: "var(--mono)" }}>Farm Name</label>
            <input className="inp" required style={{ width: "100%", boxSizing: "border-box" }} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Sunny Dairy" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontSize: 12, color: "var(--muted)", textTransform: "uppercase", fontFamily: "var(--mono)" }}>Owner Name</label>
            <input className="inp" required style={{ width: "100%", boxSizing: "border-box" }} value={form.owner} onChange={e => setForm({...form, owner: e.target.value})} placeholder="e.g. Amina Bello" />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 8, fontSize: 12, color: "var(--muted)", textTransform: "uppercase", fontFamily: "var(--mono)" }}>Region / State</label>
            <input className="inp" required style={{ width: "100%", boxSizing: "border-box" }} value={form.region} onChange={e => setForm({...form, region: e.target.value})} placeholder="e.g. Kaduna" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
            {loading ? "Registering..." : "Register Farm"}
          </button>
        </form>
      </div>
    </>
  );
}
