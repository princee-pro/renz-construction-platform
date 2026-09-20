import Link from "next/link";

import type { ContentBlocks } from "@/lib/content/schemas";

type StructuredContentProps = Readonly<{
  blocks: ContentBlocks;
}>;

export function StructuredContent({ blocks }: StructuredContentProps) {
  if (blocks.length === 0) return null;

  return (
    <div className="structured-content">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        switch (block.type) {
          case "heading":
            return block.level === 2 ? (
              <h2 key={key}>{block.text}</h2>
            ) : (
              <h3 key={key}>{block.text}</h3>
            );
          case "paragraph":
            return <p key={key}>{block.text}</p>;
          case "list":
            return (
              <ul key={key}>
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          case "link":
            return block.href.startsWith("/") ? (
              <p key={key}>
                <Link href={block.href}>{block.label}</Link>
              </p>
            ) : (
              <p key={key}>
                <a href={block.href} rel="noreferrer">
                  {block.label}
                </a>
              </p>
            );
        }
      })}
    </div>
  );
}
