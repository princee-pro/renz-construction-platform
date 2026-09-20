"use client";

import { Button } from "@/components/admin/ui/button";

export function PrintButton() {
  return (
    <Button onClick={() => window.print()} tone="primary" type="button">
      Print
    </Button>
  );
}
