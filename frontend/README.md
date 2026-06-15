# Ruminate — frontend (Next.js)

Explainable-AI dashboard for sensor-based prediction of health & reproductive
traits in Nigerian dairy cows. **Savanna Futurism** visual identity: molten gold
on roasted-earth black, `Unbounded` display type, HUD brackets, and an explanation
layer that shows *why* behind every alert.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

Build for production: `npm run build && npm start`.

## Tech

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** for layout utilities + design tokens (`tailwind.config.ts`)
- **Framer Motion** for the kinetic headline, scroll reveals, page transitions,
  bar-grow, and ring-fill
- Identity lives in `app/globals.css`; the palette is mirrored in Tailwind tokens

## Routes

| Path | Screen |
|------|--------|
| `/` | Landing (story → pipeline → the difference → CTA) |
| `/login` | Phone + OTP sign-in (any code works in the demo) |
| `/dashboard` | Herd-health ring + today's alerts, sorted by urgency |
| `/herd` | Grid of cow cards, status-coloured |
| `/cows/[id]` | One cow: banner, vitals, SHAP "why" panel, timeline |
| `/alerts/[id]` | Full alert: verdict, reasoning, vet confirm/reject |

## Building blocks (`/components`)

- `motion.tsx` — `Reveal`, `ReasonBar`, `CountUp`, `TiltCard`, `HeroHeading`
- `HerdRing.tsx` — animated health ring with count-up
- `AppNav.tsx` — top bar with active-route highlight
- `cards.tsx` — `CowCard`, `AlertCard`, `Timeline`
- `VetActions.tsx` — confirm/reject with toast

## Going live (wire to Django + AI)

Everything reads from `lib/data.ts`. To connect the real backend, replace those
exports with `fetch()` calls — the component props are unchanged:

```ts
// lib/data.ts
export async function getCow(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API}/api/cows/${id}`, { cache: "no-store" });
  return res.json();
}
```

The `reasons` array on each cow is exactly the SHAP output the Django inference
endpoint returns, so the gold/teal reason-bars will render real model attributions
(including the "rules out heat" THI bar) with no UI changes.

## Status colour language (never reused for anything else)

- green = healthy · gold = at risk / watch · terra = critical / act now
- violet = in estrus · coral = SHAP pushes-to-risk · teal = SHAP rules-out-heat
