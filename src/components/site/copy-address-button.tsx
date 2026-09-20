"use client";

import { useState } from "react";

export function CopyAddressButton({ address }: Readonly<{ address: string }>) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="location-copy-button"
      onClick={() => {
        navigator.clipboard
          .writeText(address)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          })
          .catch(() => setCopied(false));
      }}
      type="button"
    >
      {copied ? "Address copied" : "Copy Address"}
    </button>
  );
}
