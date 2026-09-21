"use client";

import { useSyncExternalStore, type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonProps = Readonly<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    tone?: "primary" | "secondary" | "quiet" | "danger";
  }
>;

const subscribe = () => () => {};

/**
 * R1 §3: a `type="button"` with an `onClick` does nothing until React has
 * hydrated the page — on a slow phone (or a loaded test machine) a click
 * that lands first is silently lost. Such buttons render disabled in the
 * server HTML and enable at hydration. Submit buttons stay enabled: a form
 * with a server action works before hydration (progressive enhancement).
 */
export function Button({
  children,
  className = "",
  disabled,
  onClick,
  tone = "secondary",
  type = "button",
  ...props
}: ButtonProps) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const waitingForHydration = type === "button" && Boolean(onClick) && !hydrated;
  return (
    <button
      className={`button button-${tone} ${className}`.trim()}
      disabled={disabled || waitingForHydration}
      onClick={onClick}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
