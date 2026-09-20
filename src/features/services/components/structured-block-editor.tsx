"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/admin/ui/button";
import type { ContentBlock, ContentBlocks } from "@/lib/content/schemas";

type StructuredBlockEditorProps = Readonly<{
  blocks: ContentBlocks;
  error?: string | undefined;
  onChange: (blocks: ContentBlocks) => void;
}>;

function newBlock(type: ContentBlock["type"]): ContentBlock {
  if (type === "heading") return { type: "heading", level: 2, text: "" };
  if (type === "list") return { type: "list", items: [""] };
  if (type === "link") return { type: "link", label: "", href: "" };
  return { type: "paragraph", text: "" };
}

export function StructuredBlockEditor({ blocks, error, onChange }: StructuredBlockEditorProps) {
  const nextKey = useRef(blocks.length);
  const [keys, setKeys] = useState(() => blocks.map((_, index) => `block-${index}`));

  const replace = (index: number, block: ContentBlock) => {
    const next = [...blocks];
    next[index] = block;
    onChange(next);
  };

  const add = (type: ContentBlock["type"]) => {
    onChange([...blocks, newBlock(type)]);
    setKeys((current) => [...current, `block-${nextKey.current++}`]);
  };

  const remove = (index: number) => {
    onChange(blocks.filter((_, blockIndex) => blockIndex !== index));
    setKeys((current) => current.filter((_, blockIndex) => blockIndex !== index));
  };

  const move = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= blocks.length) return;
    const nextBlocks = [...blocks];
    const nextKeys = [...keys];
    const sourceBlock = nextBlocks[index];
    const destinationBlock = nextBlocks[destination];
    const sourceKey = nextKeys[index];
    const destinationKey = nextKeys[destination];
    if (!sourceBlock || !destinationBlock || !sourceKey || !destinationKey) return;
    nextBlocks[index] = destinationBlock;
    nextBlocks[destination] = sourceBlock;
    nextKeys[index] = destinationKey;
    nextKeys[destination] = sourceKey;
    onChange(nextBlocks);
    setKeys(nextKeys);
  };

  return (
    <div
      aria-describedby={error ? "bodyBlocks-error" : undefined}
      aria-invalid={Boolean(error)}
      aria-labelledby="service-content-heading"
      className="block-editor"
      id="bodyBlocks"
      role="group"
      tabIndex={error ? -1 : undefined}
    >
      <div aria-label="Add content block" className="block-toolbar" role="group">
        <span>Add block</span>
        <Button onClick={() => add("heading")} tone="quiet" type="button">
          Heading
        </Button>
        <Button onClick={() => add("paragraph")} tone="quiet" type="button">
          Paragraph
        </Button>
        <Button onClick={() => add("list")} tone="quiet" type="button">
          List
        </Button>
        <Button onClick={() => add("link")} tone="quiet" type="button">
          Link
        </Button>
      </div>
      {blocks.length === 0 ? (
        <div className="block-empty">
          <p>No structured content yet.</p>
          <span>Choose one of the four approved block types above.</span>
        </div>
      ) : (
        <ol className="block-list">
          {blocks.map((block, index) => {
            const key = keys[index] ?? `fallback-${index}`;
            return (
              <li className="block-item" key={key}>
                <div className="block-item-header">
                  <div>
                    <span className="block-number">{String(index + 1).padStart(2, "0")}</span>
                    <strong>{block.type}</strong>
                  </div>
                  <div
                    aria-label={`Reorder ${block.type} block`}
                    className="block-actions"
                    role="group"
                  >
                    <Button
                      aria-label={`Move ${block.type} block up`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      tone="quiet"
                      type="button"
                    >
                      ↑
                    </Button>
                    <Button
                      aria-label={`Move ${block.type} block down`}
                      disabled={index === blocks.length - 1}
                      onClick={() => move(index, 1)}
                      tone="quiet"
                      type="button"
                    >
                      ↓
                    </Button>
                    <Button onClick={() => remove(index)} tone="danger" type="button">
                      Remove
                    </Button>
                  </div>
                </div>
                {block.type === "heading" ? (
                  <div className="field-grid field-grid-heading">
                    <div className="field-group">
                      <label htmlFor={`${key}-level`}>Level</label>
                      <select
                        id={`${key}-level`}
                        onChange={(event) =>
                          replace(index, {
                            ...block,
                            level: event.target.value === "3" ? 3 : 2,
                          })
                        }
                        value={block.level}
                      >
                        <option value="2">Heading 2</option>
                        <option value="3">Heading 3</option>
                      </select>
                    </div>
                    <div className="field-group">
                      <label htmlFor={`${key}-text`}>Heading text</label>
                      <input
                        id={`${key}-text`}
                        maxLength={4_000}
                        onChange={(event) => replace(index, { ...block, text: event.target.value })}
                        type="text"
                        value={block.text}
                      />
                    </div>
                  </div>
                ) : null}
                {block.type === "paragraph" ? (
                  <div className="field-group">
                    <label htmlFor={`${key}-text`}>Paragraph</label>
                    <textarea
                      className="resize-none"
                      id={`${key}-text`}
                      maxLength={4_000}
                      onChange={(event) => replace(index, { ...block, text: event.target.value })}
                      rows={5}
                      value={block.text}
                    />
                  </div>
                ) : null}
                {block.type === "list" ? (
                  <div className="field-group">
                    <label htmlFor={`${key}-items`}>List items</label>
                    <textarea
                      aria-describedby={`${key}-items-hint`}
                      className="resize-none"
                      id={`${key}-items`}
                      maxLength={16_000}
                      onChange={(event) =>
                        replace(index, {
                          ...block,
                          items: event.target.value.split("\n").slice(0, 32),
                        })
                      }
                      rows={5}
                      value={block.items.join("\n")}
                    />
                    <p className="field-help" id={`${key}-items-hint`}>
                      One item per line; maximum 32.
                    </p>
                  </div>
                ) : null}
                {block.type === "link" ? (
                  <div className="field-grid field-grid-two">
                    <div className="field-group">
                      <label htmlFor={`${key}-label`}>Link label</label>
                      <input
                        id={`${key}-label`}
                        maxLength={4_000}
                        onChange={(event) =>
                          replace(index, { ...block, label: event.target.value })
                        }
                        type="text"
                        value={block.label}
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor={`${key}-href`}>Public destination</label>
                      <input
                        id={`${key}-href`}
                        maxLength={2_000}
                        onChange={(event) => replace(index, { ...block, href: event.target.value })}
                        placeholder="/path or https://"
                        spellCheck={false}
                        type="text"
                        value={block.href}
                      />
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
      {error ? (
        <p className="field-error" id="bodyBlocks-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
