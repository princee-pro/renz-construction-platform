import Link from "next/link";

type Breadcrumb = Readonly<{ href?: string; label: string }>;

export function Breadcrumbs({ items }: Readonly<{ items: readonly Breadcrumb[] }>) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <ol>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {item.href ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
