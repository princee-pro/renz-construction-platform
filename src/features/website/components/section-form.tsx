"use client";

import { useId } from "react";

import { Button } from "@/components/admin/ui/button";
import { MediaPicker } from "@/features/website/components/media-picker";
import {
  ctaDestinationLabels,
  ctaDestinationTypes,
  defaultsFromFields,
  type Cta,
  type FieldSpec,
} from "@/features/website/section-registry";
import { parseRichText, serializeRichText, type RichBlocks } from "@/lib/content/rich-text";

type ConfigValue = Record<string, unknown>;

/**
 * Renders a section's editor from its field declaration (one source of
 * truth with the zod schema). No CSS, HTML, JSON or coordinates are ever
 * exposed: text, lists, toggles, presets, links, images and repeatable
 * items only.
 */
export function SectionFields({
  fields,
  value,
  onChange,
  errors,
  prefix = "",
}: Readonly<{
  fields: readonly FieldSpec[];
  value: ConfigValue;
  onChange: (next: ConfigValue) => void;
  errors: Readonly<Record<string, string>>;
  prefix?: string;
}>) {
  const baseId = useId();
  const set = (key: string, next: unknown) => onChange({ ...value, [key]: next });
  return (
    <div className="section-fields">
      {fields.map((field) => {
        const id = `${baseId}-${field.key}`;
        const path = prefix ? `${prefix}.${field.key}` : field.key;
        const error = errors[path];
        const help = field.help ? <p className="field-help">{field.help}</p> : null;
        const errorNode = error ? <p className="field-error">{error}</p> : null;
        switch (field.kind) {
          case "text":
            return (
              <div className="field-group" key={field.key}>
                <label htmlFor={id}>{field.label}</label>
                <input
                  id={id}
                  maxLength={field.max ?? 300}
                  onChange={(event) =>
                    set(
                      field.key,
                      event.target.value === "" && !field.required ? null : event.target.value,
                    )
                  }
                  type="text"
                  value={typeof value[field.key] === "string" ? (value[field.key] as string) : ""}
                />
                {help}
                {errorNode}
              </div>
            );
          case "textarea":
            return (
              <div className="field-group" key={field.key}>
                <label htmlFor={id}>{field.label}</label>
                <textarea
                  id={id}
                  maxLength={field.max ?? 2000}
                  onChange={(event) =>
                    set(
                      field.key,
                      event.target.value === "" && !field.required ? null : event.target.value,
                    )
                  }
                  rows={4}
                  value={typeof value[field.key] === "string" ? (value[field.key] as string) : ""}
                />
                {help}
                {errorNode}
              </div>
            );
          case "rich":
            return (
              <RichTextField
                error={error}
                help={field.help}
                id={id}
                key={field.key}
                label={field.label}
                onChange={(blocks) => set(field.key, blocks)}
                value={Array.isArray(value[field.key]) ? (value[field.key] as RichBlocks) : []}
              />
            );
          case "lines":
            return (
              <div className="field-group" key={field.key}>
                <label htmlFor={id}>{field.label}</label>
                <textarea
                  id={id}
                  onChange={(event) =>
                    set(
                      field.key,
                      event.target.value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter((line) => line.length > 0)
                        .slice(0, field.max ?? 24),
                    )
                  }
                  rows={Math.min(
                    8,
                    Math.max(
                      3,
                      (Array.isArray(value[field.key])
                        ? (value[field.key] as unknown[]).length
                        : 0) + 1,
                    ),
                  )}
                  value={
                    Array.isArray(value[field.key]) ? (value[field.key] as string[]).join("\n") : ""
                  }
                />
                {help ?? <p className="field-help">One per line.</p>}
                {errorNode}
              </div>
            );
          case "boolean":
            return (
              <div className="field-group" key={field.key}>
                <label className="checkbox-row" htmlFor={id}>
                  <input
                    checked={value[field.key] === true}
                    id={id}
                    onChange={(event) => set(field.key, event.target.checked)}
                    type="checkbox"
                  />
                  <span>{field.label}</span>
                </label>
                {help}
              </div>
            );
          case "number":
            return (
              <div className="field-group" key={field.key}>
                <label htmlFor={id}>{field.label}</label>
                <input
                  id={id}
                  max={field.max}
                  min={field.min}
                  onChange={(event) => set(field.key, Number(event.target.value))}
                  type="number"
                  value={
                    typeof value[field.key] === "number" ? (value[field.key] as number) : field.min
                  }
                />
                {help}
                {errorNode}
              </div>
            );
          case "select":
            return (
              <div className="field-group" key={field.key}>
                <label htmlFor={id}>{field.label}</label>
                <select
                  id={id}
                  onChange={(event) => set(field.key, event.target.value)}
                  value={
                    typeof value[field.key] === "string"
                      ? (value[field.key] as string)
                      : field.options[0]?.value
                  }
                >
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {help}
                {errorNode}
              </div>
            );
          case "cta":
            return (
              <CtaField
                errors={errors}
                help={field.help}
                id={id}
                key={field.key}
                label={field.label}
                onChange={(cta) => set(field.key, cta)}
                optional={field.optional === true}
                path={path}
                value={(value[field.key] as Cta | null | undefined) ?? null}
              />
            );
          case "media":
            return (
              <div className="field-group" key={field.key}>
                <span className="field-label">{field.label}</span>
                <MediaPicker
                  kind={field.key.startsWith("video") ? "video" : "image"}
                  label={field.label}
                  onChange={(mediaId) => set(field.key, mediaId)}
                  value={typeof value[field.key] === "string" ? (value[field.key] as string) : null}
                />
                {help}
                {errorNode}
              </div>
            );
          case "items":
            return (
              <ItemsField
                errors={errors}
                field={field}
                key={field.key}
                onChange={(items) => set(field.key, items)}
                path={path}
                value={Array.isArray(value[field.key]) ? (value[field.key] as ConfigValue[]) : []}
              />
            );
        }
      })}
    </div>
  );
}

function RichTextField({
  id,
  label,
  help,
  error,
  value,
  onChange,
}: Readonly<{
  id: string;
  label: string;
  help?: string | undefined;
  error?: string | undefined;
  value: RichBlocks;
  onChange: (blocks: RichBlocks) => void;
}>) {
  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <textarea
        className="rich-text-input"
        defaultValue={serializeRichText(value)}
        id={id}
        onBlur={(event) => onChange(parseRichText(event.target.value, { allowQuote: true }))}
        onChange={(event) => onChange(parseRichText(event.target.value, { allowQuote: true }))}
        rows={12}
        spellCheck
      />
      <p className="field-help">
        {help ??
          "Paragraphs separated by a blank line. ## Heading, ### Sub-heading, - list item, > quote, **bold**, *italic*, [link label](/page or https://…). No code or HTML."}
      </p>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

function CtaField({
  id,
  label,
  help,
  value,
  onChange,
  optional,
  errors,
  path,
}: Readonly<{
  id: string;
  label: string;
  help?: string | undefined;
  value: Cta | null;
  onChange: (cta: Cta | null) => void;
  optional: boolean;
  errors: Readonly<Record<string, string>>;
  path: string;
}>) {
  const enabled = value !== null;
  const needsDestination =
    value?.destination_type === "internal" || value?.destination_type === "external";
  const destinationError = errors[`${path}.destination`] ?? errors[`${path}.label`] ?? errors[path];
  return (
    <fieldset className="field-group cta-field">
      <legend className="field-label">{label}</legend>
      {optional ? (
        <label className="checkbox-row" htmlFor={`${id}-enabled`}>
          <input
            checked={enabled}
            id={`${id}-enabled`}
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? { label: "", destination_type: "start_project", destination: null }
                  : null,
              )
            }
            type="checkbox"
          />
          <span>Show this button</span>
        </label>
      ) : null}
      {enabled && value ? (
        <div className="cta-field-grid">
          <label htmlFor={`${id}-label`}>
            <span className="field-label">Label</span>
            <input
              id={`${id}-label`}
              maxLength={80}
              onChange={(event) => onChange({ ...value, label: event.target.value })}
              type="text"
              value={value.label}
            />
          </label>
          <label htmlFor={`${id}-type`}>
            <span className="field-label">Goes to</span>
            <select
              id={`${id}-type`}
              onChange={(event) =>
                onChange({
                  ...value,
                  destination_type: event.target.value as Cta["destination_type"],
                  destination: null,
                })
              }
              value={value.destination_type}
            >
              {ctaDestinationTypes.map((type) => (
                <option key={type} value={type}>
                  {ctaDestinationLabels[type]}
                </option>
              ))}
            </select>
          </label>
          {needsDestination ? (
            <label htmlFor={`${id}-destination`}>
              <span className="field-label">
                {value.destination_type === "internal" ? "Page address" : "Web address"}
              </span>
              <input
                id={`${id}-destination`}
                maxLength={2000}
                onChange={(event) =>
                  onChange({ ...value, destination: event.target.value || null })
                }
                placeholder={value.destination_type === "internal" ? "/about" : "https://…"}
                type="text"
                value={value.destination ?? ""}
              />
            </label>
          ) : value.destination_type === "whatsapp" ? (
            <label htmlFor={`${id}-destination`}>
              <span className="field-label">Prefilled message (optional)</span>
              <input
                id={`${id}-destination`}
                maxLength={300}
                onChange={(event) =>
                  onChange({ ...value, destination: event.target.value || null })
                }
                type="text"
                value={value.destination ?? ""}
              />
            </label>
          ) : null}
        </div>
      ) : null}
      {help ? <p className="field-help">{help}</p> : null}
      {destinationError ? <p className="field-error">{destinationError}</p> : null}
    </fieldset>
  );
}

function ItemsField({
  field,
  value,
  onChange,
  errors,
  path,
}: Readonly<{
  field: Extract<FieldSpec, { kind: "items" }>;
  value: readonly ConfigValue[];
  onChange: (items: readonly ConfigValue[]) => void;
  errors: Readonly<Record<string, string>>;
  path: string;
}>) {
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target] as ConfigValue, next[index] as ConfigValue];
    onChange(next);
  };
  return (
    <fieldset className="field-group items-field">
      <legend className="field-label">{field.label}</legend>
      {field.help ? <p className="field-help">{field.help}</p> : null}
      {errors[path] ? <p className="field-error">{errors[path]}</p> : null}
      <ol className="items-field-list">
        {value.map((item, index) => (
          <li className="items-field-item" key={index}>
            <div className="items-field-head">
              <strong>
                {field.itemLabel} {index + 1}
              </strong>
              <div className="items-field-actions">
                <Button
                  aria-label={`Move ${field.itemLabel.toLowerCase()} ${index + 1} up`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  tone="quiet"
                >
                  ↑
                </Button>
                <Button
                  aria-label={`Move ${field.itemLabel.toLowerCase()} ${index + 1} down`}
                  disabled={index === value.length - 1}
                  onClick={() => move(index, 1)}
                  tone="quiet"
                >
                  ↓
                </Button>
                <Button
                  aria-label={`Remove ${field.itemLabel.toLowerCase()} ${index + 1}`}
                  onClick={() => onChange(value.filter((_, position) => position !== index))}
                  tone="quiet"
                >
                  Remove
                </Button>
              </div>
            </div>
            <SectionFields
              errors={errors}
              fields={field.fields}
              onChange={(next) =>
                onChange(value.map((entry, position) => (position === index ? next : entry)))
              }
              prefix={`${path}.${index}`}
              value={item}
            />
          </li>
        ))}
      </ol>
      {value.length < field.max ? (
        <Button
          onClick={() => onChange([...value, defaultsFromFields(field.fields)])}
          tone="secondary"
        >
          Add {field.itemLabel.toLowerCase()}
        </Button>
      ) : (
        <p className="field-help">
          Up to {field.max} {field.itemLabel.toLowerCase()}s.
        </p>
      )}
    </fieldset>
  );
}
