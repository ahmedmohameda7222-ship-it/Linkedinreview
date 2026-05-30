"use client";

import { useState } from "react";
import { Button } from "@/components/Button";

export function CopyButton({ value, compact = false }: { value: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button type="button" variant="secondary" onClick={copy} className={compact ? "px-3 py-1.5 text-xs" : ""}>
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
