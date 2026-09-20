import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = Readonly<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    tone?: "primary" | "secondary" | "quiet" | "danger";
  }
>;

export function Button({
  children,
  className = "",
  onClick,
  tone = "secondary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`button button-${tone} ${className}`.trim()}
      onClick={onClick}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
