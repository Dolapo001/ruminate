"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  return (
    <div className="auth">
      <div className="authcard panel brackets">
        <Link className="back" href="/">← Back</Link>
        <div className="brand" style={{ marginBottom: 24 }}><span className="mark">◐</span> RUMINATE</div>
        <h2>Welcome back</h2>
        <p className="s">We&apos;ll text a code to your phone.</p>
        <div className="field">
          <label>Phone number</label>
          <div className="inp"><span className="px">+234</span><input defaultValue="801 234 5678" /></div>
        </div>
        <div className="field">
          <label>Verification code</label>
          <div className="otp">
            {["4", "2", "9", "1"].map((d, i) => (
              <input key={i} maxLength={1} defaultValue={d} />
            ))}
          </div>
        </div>
        <button className="btn btn-primary btn-full" onClick={() => {
          document.cookie = "ruminate_role=vet; path=/; max-age=86400; samesite=lax";
          router.push("/dashboard");
        }}>
          Sign in as Vet <span>→</span>
        </button>
        <button className="btn btn-outline btn-full" style={{ marginTop: 12 }} onClick={() => {
          document.cookie = "ruminate_role=farmer; path=/; max-age=86400; samesite=lax";
          document.cookie = "ruminate_farm_id=4; path=/; max-age=86400; samesite=lax";
          router.push("/farm?farm_id=4");
        }}>
          Sign in as Farmer (Demo) <span>→</span>
        </button>
        <p style={{ fontSize: 12.5, color: "var(--faint)", textAlign: "center", marginTop: 18, fontFamily: "var(--mono)" }}>
          Demo — any code works
        </p>
      </div>
    </div>
  );
}
