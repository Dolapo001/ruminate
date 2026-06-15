import Link from "next/link";

export default function NotFound() {
  return (
    <div className="auth">
      <div className="authcard panel brackets" style={{ textAlign: "center" }}>
        <div className="brand" style={{ justifyContent: "center", marginBottom: 18 }}>
          <span className="mark">◐</span> RUMINATE
        </div>
        <h2>Not found</h2>
        <p className="s">That animal or alert isn&apos;t in the herd.</p>
        <Link className="btn btn-primary btn-full" href="/dashboard">Back to dashboard</Link>
      </div>
    </div>
  );
}
