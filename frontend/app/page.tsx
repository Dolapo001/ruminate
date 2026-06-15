import Link from "next/link";
import { HeroHeading, Reveal, ReasonBar, TiltCard } from "@/components/motion";

const heroReasons = [
  { label: "Rumination ↓", weight: 82, direction: "risk" as const },
  { label: "Body temp ↑", weight: 64, direction: "risk" as const },
  { label: "Weather (THI) normal", weight: 30, direction: "rules-out" as const },
];

export default function Landing() {
  return (
    <>
      <header className="lnav">
        <div className="wrap row">
          <div className="brand"><span className="mark">◐</span> RUMINATE</div>
          <nav>
            <a className="hide-sm" href="#how">How it works</a>
            <a className="hide-sm" href="#why">The difference</a>
            <Link className="btn btn-outline" style={{ padding: "9px 18px", fontSize: 14 }} href="/register">Register Farm</Link>
            <Link className="btn btn-primary" style={{ padding: "9px 18px", fontSize: 14 }} href="/login">Vet Login</Link>
          </nav>
        </div>
      </header>

      <div className="wrap">
        <section className="hero">
          <div className="hero-grid">
            <div>
              <div className="eyebrow" style={{ marginBottom: 20 }}>Explainable AI · Nigerian dairy</div>
              <HeroHeading />
              <p className="lead">
                Wearable sensors read each animal&apos;s behaviour. Our models predict illness and heat early — and tell
                you <strong>why</strong>, in plain language you can act on.
              </p>
              <div className="cta-row">
                <Link className="btn btn-primary" href="/login">Open Vet Dashboard <span>→</span></Link>
                <Link className="btn btn-outline" href="/register">Register a Farm</Link>
              </div>
            </div>
            <TiltCard className="device panel brackets">
              <div className="topline">
                <span className="devtitle">NG-014 · AMINA</span>
                <span className="pill pill-soft">White Fulani</span>
              </div>
              <div className="alertchip">
                <div className="ic">!</div>
                <div>
                  <div className="t1">At risk · possible mastitis</div>
                  <div className="t2">Chewing down, slight fever — not heat</div>
                </div>
              </div>
              {heroReasons.map((r, i) => <ReasonBar key={i} reason={r} index={i} />)}
            </TiltCard>
          </div>

          <div className="statstrip">
            {[
              ["~50%", "of heats missed by eye in big herds"],
              [">80%", "detection once sensors + AI assist"],
              ["95%", "of Nigeria's milk from low-input herds"],
            ].map(([big, lab], i) => (
              <Reveal key={i} className="cell" delay={i * 0.08}>
                <div className="big">{big}</div>
                <div className="lab">{lab}</div>
              </Reveal>
            ))}
          </div>
        </section>
      </div>

      <div className="chev" />
      <section className="section" id="how">
        <div className="wrap">
          <Reveal>
            <div className="eyebrow" style={{ marginBottom: 16 }}>The pipeline</div>
            <h2>From a silent animal to an <span className="gold">explained decision</span>.</h2>
            <p className="sub">Four tiers carry the signal from the cow to your phone — and the explanation layer is what makes the alert trustworthy.</p>
          </Reveal>
          <div className="tiers">
            {[
              ["01", "📡", "Sense", "Wearables read activity, rumination, temperature and milk traits every 15 minutes."],
              ["02", "🛰️", "Relay", "A farm gateway stores and forwards data, so a dropped network never loses a reading."],
              ["03", "🧠", "Predict + explain", "Models flag health and heat; SHAP attributes every alert to specific signals."],
              ["04", "📱", "Act", "Farmers and vets see the reason, confirm the outcome, and the model learns."],
            ].map(([n, ic, h, p], i) => (
              <Reveal key={i} className="tier panel" delay={i * 0.06}>
                <div className="n">{n}</div>
                <div className="ic">{ic}</div>
                <h3>{h}</h3>
                <p>{p}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="chev" />
      <section className="section" id="why">
        <div className="wrap">
          <Reveal>
            <div className="eyebrow" style={{ marginBottom: 16 }}>The difference</div>
            <h2>A black box says &quot;sick.&quot; We say <span className="gold">why</span>.</h2>
            <p className="sub">Models trained on temperate Holstein data mistake tropical heat stress for disease. Ours is built for White Fulani and crossbreds — and it shows its reasoning.</p>
          </Reveal>
          <div className="diff">
            <Reveal className="c panel">
              <div className="pill pill-soft" style={{ marginBottom: 18 }}>Typical black box</div>
              <div style={{ fontFamily: "var(--disp)", fontSize: 24, fontWeight: 700 }}>&quot;Cow 14: high risk.&quot;</div>
              <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 10 }}>No reason. The farmer either ignores it or spends money on a guess. Trust erodes.</p>
            </Reveal>
            <Reveal className="c panel brackets" delay={0.08}>
              <div className="pill pill-gold" style={{ marginBottom: 18 }}>Ruminate</div>
              {heroReasons.map((r, i) => <ReasonBar key={i} reason={r} index={i} />)}
              <p style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 8 }}>Now the farmer knows it&apos;s real, and acts.</p>
            </Reveal>
          </div>
        </div>
      </section>

      <div className="wrap">
        <Reveal className="cta-band">
          <h2>Walk the herd.</h2>
          <p>Choose your role: register your own farm or log in as a vet to see all alerts.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24 }}>
            <Link className="btn btn-primary" href="/login">Vet Dashboard <span>→</span></Link>
            <Link className="btn btn-outline" href="/register">Farm Portal <span>→</span></Link>
          </div>
        </Reveal>
        <div className="foot">
          <span>RUMINATE — final-year project · synthetic data</span>
          <span>Lagos · Kaduna · Plateau</span>
        </div>
      </div>
    </>
  );
}
