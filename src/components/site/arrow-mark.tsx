type ArrowMarkProps = Readonly<{
  direction?: "forward" | "back";
}>;

export function ArrowMark({ direction = "forward" }: ArrowMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={direction === "back" ? "arrow-mark arrow-mark-back" : "arrow-mark"}
      viewBox="0 0 32 16"
      focusable="false"
    >
      <path d="M1 8h28M22 1l7 7-7 7" />
    </svg>
  );
}
