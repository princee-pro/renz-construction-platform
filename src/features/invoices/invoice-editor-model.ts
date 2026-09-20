/**
 * Editor-side draft line model shared by the client editor and the server
 * pages that seed it. Keys are local only; the server never sees them.
 */
export type InvoiceEditorLine = Readonly<{
  key: string;
  description: string;
  quantity: string;
  unit_label: string;
  unit_price: string;
}>;

export type InvoiceEditorInitial = Readonly<{
  clientId: string;
  clientLabel: string;
  projectId: string;
  currency: string;
  taxRate: string;
  reference: string;
  notes: string;
  paymentTerms: string;
  issueDate: string;
  dueDate: string;
  lines: readonly InvoiceEditorLine[];
}>;

let lineKeySeed = 0;
export function newLine(partial: Partial<InvoiceEditorLine> = {}): InvoiceEditorLine {
  lineKeySeed += 1;
  return {
    key: `line-${lineKeySeed}-${Date.now()}`,
    description: "",
    quantity: "1",
    unit_label: "",
    unit_price: "",
    ...partial,
  };
}
