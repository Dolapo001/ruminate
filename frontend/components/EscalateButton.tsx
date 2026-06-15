"use client";

import { useState } from "react";

export function EscalateButton({ cowId }: { cowId: string }) {
  const [escalated, setEscalated] = useState(false);

  const handleEscalate = () => {
    // In a real app, this would make an API call to notify the vet.
    setEscalated(true);
    alert("✅ Alert escalated to Dr. Bello. The vet has been notified and will review the data.");
  };

  return (
    <button 
      className="btn btn-primary" 
      onClick={handleEscalate} 
      disabled={escalated}
      style={{ fontSize: 14, padding: "11px 20px" }}
    >
      {escalated ? "✓ Escalated to Vet" : "📞 Escalate to Vet"}
    </button>
  );
}
