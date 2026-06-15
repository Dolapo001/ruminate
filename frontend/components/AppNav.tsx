"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function AppNav() {
  const path = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<"vet" | "farmer" | "">("");
  const [farmId, setFarmId] = useState("");

  useEffect(() => {
    const cookies = document.cookie.split("; ");
    const roleCookie = cookies.find(row => row.startsWith("ruminate_role="))?.split("=")[1];
    const farmIdCookie = cookies.find(row => row.startsWith("ruminate_farm_id="))?.split("=")[1];
    if (roleCookie) setRole(roleCookie as any);
    if (farmIdCookie) setFarmId(farmIdCookie);
  }, []);

  const inDash = path === "/dashboard" || path === "/farm";
  const inHerd = path.startsWith("/herd") || path.startsWith("/cows") || path.startsWith("/alerts");
  const inModel = path.startsWith("/model");

  const logout = () => {
    document.cookie = "ruminate_role=; path=/; max-age=0";
    document.cookie = "ruminate_farm_id=; path=/; max-age=0";
    router.push("/");
  };

  return (
    <div className="appbar">
      <div className="row">
        <Link href={role === "farmer" ? `/farm?farm_id=${farmId}` : "/dashboard"} className="brand">
          <span className="mark">◐</span> RUMINATE
        </Link>
        <nav>
          <Link href={role === "farmer" ? `/farm?farm_id=${farmId}` : "/dashboard"} className={inDash ? "on" : ""}>
            {role === "farmer" ? "My Farm" : "Dashboard"}
          </Link>
          <Link href="/herd" className={inHerd ? "on" : ""}>Herd</Link>
          {role !== "farmer" && <Link href="/model" className={inModel ? "on" : ""}>Model</Link>}
        </nav>
        <div className="me">
          {role === "farmer" ? (
            <>
              <span>Farmer</span>
              <span className="av" style={{ background: "var(--green)", color: "#000" }}>F</span>
            </>
          ) : (
            <>
              <span>Dr. Bello · Vet</span>
              <span className="av">B</span>
            </>
          )}
          <button className="logout" onClick={logout}>Sign out</button>
        </div>
      </div>
    </div>
  );
}
