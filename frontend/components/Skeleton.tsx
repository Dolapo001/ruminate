export function Block({ h = 120, mb = 18 }: { h?: number; mb?: number }) {
  return <div className="skel" style={{ height: h, marginBottom: mb }} />;
}

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="page">
      <div className="skel" style={{ height: 54, width: 280, marginBottom: 26 }} />
      {Array.from({ length: rows }).map((_, i) => <Block key={i} h={i === 0 ? 160 : 96} />)}
    </div>
  );
}
