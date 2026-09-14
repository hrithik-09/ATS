"use client";

import { useState } from "react";

export function DualRange({
  min,
  max,
  lo,
  hi,
  onChange,
  step = 1,
}: {
  min: number;
  max: number;
  lo: number;
  hi: number;
  onChange: (lo: number, hi: number) => void;
  step?: number;
}) {
  const span = max - min || 1;
  const left = ((Math.min(lo, hi) - min) / span) * 100;
  const right = ((Math.max(lo, hi) - min) / span) * 100;
  const [active, setActive] = useState<"lo" | "hi" | null>(null);

  return (
    <div className="dual-range">
      <div className="dual-range-track" />
      <div
        className="dual-range-fill"
        style={{ left: `${left}%`, width: `${Math.max(0, right - left)}%` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={lo}
        style={{ zIndex: active === "lo" || lo >= hi ? 5 : 3 }}
        onPointerDown={() => setActive("lo")}
        onChange={(e) => {
          const v = +e.target.value;
          onChange(Math.min(v, hi), hi);
        }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={hi}
        style={{ zIndex: active === "hi" || hi <= lo ? 5 : 4 }}
        onPointerDown={() => setActive("hi")}
        onChange={(e) => {
          const v = +e.target.value;
          onChange(lo, Math.max(v, lo));
        }}
      />
    </div>
  );
}

