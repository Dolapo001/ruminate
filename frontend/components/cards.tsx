import Link from "next/link";
import { Cow, TimelineEvent } from "@/lib/types";

export function CowCard({ cow }: { cow: Cow }) {
  return (
    <Link href={`/cows/${cow.id}`} className={`cowcard panel ${cow.status}`}>
      <div className="av">🐄</div>
      <div className="tag">{cow.tag}</div>
      <div className="nm">{cow.name}</div>
      <div className="st">{cow.statusLabel}</div>
    </Link>
  );
}

export function AlertCard({ cow }: { cow: Cow }) {
  const a = cow.alert!;
  return (
    <Link href={`/alerts/${cow.id}`} className={`alertcard panel ${a.cls}`}>
      <div className="av">🐄</div>
      <div>
        <div className="t1">{a.title}</div>
        <div className="t2">{cow.name} · {a.subtitle}</div>
      </div>
      <div className="meta">
        {cow.confidence != null && <div className="conf">{cow.confidence}%</div>}
        <div>{a.when}</div>
      </div>
    </Link>
  );
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="card panel timeline">
      <h3>Her story</h3>
      {events.map((e, i) => (
        <div className="ti" key={i}>
          <span className={`d s-${e.status}`} />
          <div>
            <div className="t1">{e.label}</div>
            <div className="t2">{e.when}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
