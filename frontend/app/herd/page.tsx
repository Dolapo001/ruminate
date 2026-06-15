import { AppNav } from "@/components/AppNav";
import { HerdGrid } from "@/components/HerdGrid";
import { SearchBar } from "@/components/SearchBar";
import { getHerd } from "@/lib/data";

import { cookies } from "next/headers";

export default async function Herd({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams?.q || "";
  const role = cookies().get("ruminate_role")?.value;
  const farmId = cookies().get("ruminate_farm_id")?.value;
  
  const actualFarmId = role === "farmer" ? farmId : undefined;
  const herd = await getHerd(q, actualFarmId);
  return (
    <>
      <AppNav />
      <div className="page">
        <div className="pagehead" style={{ alignItems: "center" }}>
          <div>
            <h1>The herd</h1>
            <div className="date">TAP A COW TO SEE HER STORY</div>
          </div>
          <SearchBar initialQ={q} />
        </div>
        <HerdGrid cows={herd} />
      </div>
    </>
  );
}
