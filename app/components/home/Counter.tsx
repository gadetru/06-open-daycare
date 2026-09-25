"use client";

import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);

  function decrementCount() {
    setCount((currentCount) => Math.max(0, currentCount - 1));
  }

  function incrementCount() {
    setCount((currentCount) => currentCount + 1);
  }

  return (
    <section
      aria-labelledby="counter-title"
      className="mb-6 flex items-center justify-between rounded-[18px] border border-border bg-surface px-[18px] py-[14px] shadow-[0_4px_14px_-10px_rgba(120,90,60,.4)]"
    >
      <div>
        <h2 id="counter-title" className="font-heading text-[20px] font-semibold text-ink">
          Contador
        </h2>
        <p className="text-[13px] text-ink-muted">Valor actual: {count}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={decrementCount}
          aria-label="Restar uno"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-[20px] text-ink transition-colors hover:bg-accent-soft"
        >
          −
        </button>
        <output
          aria-live="polite"
          className="min-w-8 text-center font-heading text-[24px] font-semibold text-coral-deep"
        >
          {count}
        </output>
        <button
          type="button"
          onClick={incrementCount}
          aria-label="Sumar uno"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-[20px] text-ink transition-colors hover:bg-accent-soft"
        >
          +
        </button>
      </div>
    </section>
  );
}
