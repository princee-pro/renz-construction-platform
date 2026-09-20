import type { ReactNode } from "react";

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: Readonly<{
  id: string;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  children: ReactNode;
}>) {
  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? (
        <p className="field-help" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
