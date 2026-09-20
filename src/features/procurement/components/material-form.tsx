"use client";

import { useSingleSubmit } from "@/features/admin-shared/single-submit";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { Field } from "@/components/admin/ui/field";
import {
  initialAdminActionState,
  type AdminActionState,
} from "@/features/admin-shared/action-state";
import { usePinnedEdit } from "@/features/admin-shared/use-pinned-edit";
import { PartnerPickerField } from "@/features/partners/components/partner-picker-field";
import {
  checkDuplicateMaterialsAction,
  createMaterialAction,
  updateMaterialAction,
} from "@/features/procurement/procurement-actions";
import {
  materialCategoryOptions,
  unitOptions,
  type DuplicateMaterial,
} from "@/features/procurement/procurement-contract";

export type MaterialFormInitial = Readonly<{
  name: string;
  unit: string;
  code: string;
  category: string;
  specification: string;
  supplierId: string;
  supplierLabel: string;
  active: boolean;
}>;

export const emptyMaterialForm: MaterialFormInitial = {
  name: "",
  unit: "",
  code: "",
  category: "",
  specification: "",
  supplierId: "",
  supplierLabel: "",
  active: true,
};

/**
 * Create/edit form for a catalog material. Duplicate awareness is bounded
 * (exact internal code or normalized name) and advisory; the internal code
 * uniqueness itself is enforced by the database.
 */
export function MaterialForm({
  mode,
  initial,
  materialId,
  version,
}: Readonly<{
  mode: "create" | "edit";
  initial: MaterialFormInitial;
  materialId?: string | undefined;
  version?: number | undefined;
}>) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    mode === "create" ? createMaterialAction : updateMaterialAction,
    initialAdminActionState,
  );
  const edit = usePinnedEdit(
    version ?? 1,
    state.status === "success" ? state.currentVersion : null,
  );
  useEffect(() => {
    if (state.status !== "success") return;
    const id = mode === "create" ? state.createdId : materialId;
    router.push(id ? `/admin/procurement/materials/${id}` : "/admin/procurement/materials");
  }, [state.status, state.createdId, mode, materialId, router]);
  return (
    <MaterialFormFields
      action={action}
      edit={edit}
      initial={initial}
      key={edit.formKey}
      materialId={materialId}
      mode={mode}
      pending={pending}
      state={state}
    />
  );
}

function MaterialFormFields({
  mode,
  initial,
  materialId,
  action,
  state,
  pending,
  edit,
}: Readonly<{
  mode: "create" | "edit";
  initial: MaterialFormInitial;
  materialId: string | undefined;
  action: (formData: FormData) => void;
  state: AdminActionState;
  pending: boolean;
  edit: ReturnType<typeof usePinnedEdit>;
}>) {
  const guard = useSingleSubmit(pending);
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [unit, setUnit] = useState(initial.unit);
  const [code, setCode] = useState(initial.code);
  const [category, setCategory] = useState(initial.category);
  const [specification, setSpecification] = useState(initial.specification);
  const [active, setActive] = useState(initial.active);
  const [duplicates, setDuplicates] = useState<readonly DuplicateMaterial[]>([]);
  const [, startDuplicateCheck] = useTransition();

  useEffect(() => {
    const timer = setTimeout(() => {
      startDuplicateCheck(async () => {
        setDuplicates(await checkDuplicateMaterialsAction(name, code, materialId));
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [name, code, materialId]);

  return (
    <form action={action} className="admin-form" noValidate onSubmit={guard.onSubmit}>
      {materialId ? <input name="materialId" type="hidden" value={materialId} /> : null}
      {mode === "edit" ? (
        <input name="expectedVersion" type="hidden" value={edit.pinnedVersion} />
      ) : null}
      <input name="active" type="hidden" value={active ? "true" : "false"} />

      {mode === "edit" && edit.outdated && state.status !== "conflict" ? (
        <Alert live tone="warning">
          <p>Another staff member updated this material while you were editing.</p>
          <Button
            disabled={edit.reloading}
            onClick={edit.reloadLatest}
            tone="secondary"
            type="button"
          >
            {edit.reloading ? "Reloading…" : "Reload latest"}
          </Button>
        </Alert>
      ) : null}

      <div className="field-grid field-grid-two">
        <Field error={state.fieldErrors["name"]} id="name" label="Material name">
          <input
            id="name"
            maxLength={200}
            name="name"
            onChange={(e) => setName(e.target.value)}
            required
            type="text"
            value={name}
          />
        </Field>
        <Field
          error={state.fieldErrors["code"]}
          hint="Optional. Must be unique across the catalog."
          id="code"
          label="Internal code"
        >
          <input
            id="code"
            maxLength={60}
            name="code"
            onChange={(e) => setCode(e.target.value)}
            type="text"
            value={code}
          />
        </Field>
      </div>
      <div className="field-grid field-grid-two">
        <Field error={state.fieldErrors["unit"]} id="unit" label="Default unit">
          <input
            id="unit"
            list="unit-options"
            maxLength={40}
            name="unit"
            onChange={(e) => setUnit(e.target.value)}
            required
            type="text"
            value={unit}
          />
          <datalist id="unit-options">
            {unitOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </Field>
        <Field error={state.fieldErrors["category"]} id="category" label="Category">
          <input
            id="category"
            list="category-options"
            maxLength={80}
            name="category"
            onChange={(e) => setCategory(e.target.value)}
            type="text"
            value={category}
          />
          <datalist id="category-options">
            {materialCategoryOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </Field>
      </div>
      <Field
        error={state.fieldErrors["specification"]}
        id="specification"
        label="Specification (optional)"
      >
        <textarea
          id="specification"
          maxLength={2000}
          name="specification"
          onChange={(e) => setSpecification(e.target.value)}
          rows={3}
          value={specification}
        />
      </Field>
      <PartnerPickerField
        capability="supplier"
        error={state.fieldErrors["supplierId"]}
        initialId={initial.supplierId}
        initialLabel={initial.supplierLabel}
        label="Preferred supplier (optional)"
        name="supplierId"
      />

      {duplicates.length > 0 ? (
        <section aria-labelledby="material-duplicates-heading" className="duplicate-panel">
          <p className="section-kicker" id="material-duplicates-heading">
            Possible existing materials
          </p>
          <ul>
            {duplicates.map((candidate) => (
              <li key={candidate.id}>
                <Link href={`/admin/procurement/materials/${candidate.id}`}>{candidate.name}</Link>
                <span>
                  {candidate.internal_code}
                  {candidate.category ? ` · ${candidate.category}` : ""} · matched by{" "}
                  {candidate.match}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {mode === "edit" ? (
        <Field id="activeToggle" label="Availability in pickers">
          <label className="checkbox-row" htmlFor="activeToggle">
            <input
              checked={active}
              id="activeToggle"
              onChange={(e) => setActive(e.target.checked)}
              type="checkbox"
            />
            <span>Active — offered when adding requirements and order lines</span>
          </label>
        </Field>
      ) : null}

      {state.status === "error" || state.status === "conflict" ? (
        <Alert live tone="danger">
          <p>{state.message}</p>
          {state.reauthHref ? (
            <Link className="button button-secondary" href={state.reauthHref}>
              Re-authenticate
            </Link>
          ) : null}
        </Alert>
      ) : null}
      <div className="form-actions">
        <Button
          onClick={() =>
            router.push(
              materialId
                ? `/admin/procurement/materials/${materialId}`
                : "/admin/procurement/materials",
            )
          }
          tone="quiet"
          type="button"
        >
          Cancel
        </Button>
        <Button disabled={pending} tone="primary" type="submit">
          {pending ? "Saving…" : mode === "create" ? "Create material" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
