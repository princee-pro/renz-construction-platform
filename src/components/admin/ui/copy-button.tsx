"use client";

import { useState } from "react";

export function CopyButton({ value, label }: Readonly<{ value: string; label: string }>) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className="button button-quiet" onClick={() => void handleCopy()} type="button">
      {copied ? "Copied" : label}
    </button>
  );
}
